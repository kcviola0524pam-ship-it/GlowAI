import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Sales ${action} error:`, err);
  res.status(500).json({ error: `Database error (${action})` });
};

const auditLog = (userId, action) => {
  if (!userId) return;
  db.query(
    'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
    [userId, action],
    () => {}
  );
};

// Increment customer.visits ONLY when the customer is linked to a user with role='customer'
// Requires BOTH customer_id and customer.user_id (no name matching).
const incrementCustomerVisitsIfLinkedCustomerUser = (customerId, reason = 'Completed sale') => {
  if (!customerId) return;

  // Ensure customer table has user_id column (migration_add_user_id.sql)
  db.query('SHOW COLUMNS FROM customer LIKE "user_id"', (colErr, colRows) => {
    if (colErr) {
      console.warn('⚠️ Unable to check customer.user_id column:', colErr.message || colErr);
      return;
    }
    if (!colRows || colRows.length === 0) {
      // Can't safely update "based on user id and customer id"
      return;
    }

    // Update visits only if the customer row is linked to a user row whose role is customer
    db.query(
      `UPDATE customer c
       INNER JOIN users u ON u.id = c.user_id
       SET c.visits = COALESCE(c.visits, 0) + 1
       WHERE c.id = ? AND u.role = 'customer'`,
      [customerId],
      (updErr, updRes) => {
        if (updErr) {
          console.warn('⚠️ Failed to increment customer visits:', updErr.message || updErr);
          return;
        }
        if (updRes.affectedRows > 0) {
          console.log(`✅ Incremented visits for customer_id=${customerId} (${reason})`);
        }
      }
    );
  });
};

// Generate unique transaction number
const generateTransactionNumber = () => {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// GET all sales
router.get('/', (_req, res) => {
  db.query(
    `SELECT s.*, c.name as customer_name, st.name as staff_name 
     FROM sales s 
     LEFT JOIN customer c ON s.customer_id = c.id 
     LEFT JOIN staff st ON s.staff_id = st.id 
     ORDER BY s.created_at DESC 
     LIMIT 100`,
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET');
      res.json(results);
    }
  );
});

// GET single sale with items
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.query(
    `SELECT s.*, c.name as customer_name, st.name as staff_name 
     FROM sales s 
     LEFT JOIN customer c ON s.customer_id = c.id 
     LEFT JOIN staff st ON s.staff_id = st.id 
     WHERE s.id = ?`,
    [id],
    (err, saleResults) => {
      if (err) return handleDbError(res, err, 'GET');
      if (saleResults.length === 0) return res.status(404).json({ error: 'Sale not found' });

      db.query(
        `SELECT si.*, p.name as product_name, p.sku 
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         WHERE si.sale_id = ?`,
        [id],
        (itemErr, itemResults) => {
          if (itemErr) return handleDbError(res, itemErr, 'GET items');
          res.json({
            ...saleResults[0],
            items: itemResults,
          });
        }
      );
    }
  );
});

// POST: Create new sale/transaction
router.post('/', (req, res) => {
  const { customer_id, staff_id, items, payment_method = 'Cash', total_amount, userId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' });
  }

  if (!total_amount) {
    return res.status(400).json({ error: 'Total amount is required' });
  }

  // Validate stock availability before processing
  const stockCheckPromises = items.map((item) => {
    return new Promise((resolve, reject) => {
      db.query(
        'SELECT stock_quantity, name FROM products WHERE id = ?',
        [item.product_id],
        (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) {
            return reject(new Error(`Product with ID ${item.product_id} not found`));
          }
          const product = results[0];
          if (product.stock_quantity < item.quantity) {
            return reject(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`));
          }
          resolve();
        }
      );
    });
  });

  Promise.all(stockCheckPromises)
    .then(() => {
      const transactionNumber = generateTransactionNumber();

      // Get a connection from the pool for transaction
      db.getConnection((connErr, connection) => {
        if (connErr) {
          return handleDbError(res, connErr, 'GET CONNECTION');
        }

        // Start transaction
        connection.beginTransaction((beginErr) => {
          if (beginErr) {
            connection.release();
            return handleDbError(res, beginErr, 'BEGIN TRANSACTION');
          }

          // Insert sale
          connection.query(
            'INSERT INTO sales (transaction_number, customer_id, staff_id, total_amount, payment_method) VALUES (?, ?, ?, ?, ?)',
            [transactionNumber, customer_id || null, staff_id || null, total_amount, payment_method],
            (saleErr, saleResult) => {
              if (saleErr) {
                return connection.rollback(() => {
                  connection.release();
                  handleDbError(res, saleErr, 'POST sale');
                });
              }

              const saleId = saleResult.insertId;
              const itemPromises = [];

              // Insert sale items and update product stock
              items.forEach((item) => {
                const itemPromise = new Promise((resolve, reject) => {
                  // Insert sale item
                  connection.query(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [saleId, item.product_id, item.quantity, item.unit_price, item.subtotal],
                    (itemErr) => {
                      if (itemErr) return reject(itemErr);

                      // Update product stock
                      connection.query(
                        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
                        [item.quantity, item.product_id, item.quantity],
                        (stockErr, updateResult) => {
                          if (stockErr) return reject(stockErr);
                          if (updateResult.affectedRows === 0) {
                            return reject(new Error(`Failed to update stock for product ID ${item.product_id}`));
                          }
                          resolve();
                        }
                      );
                    }
                  );
                });
                itemPromises.push(itemPromise);
              });

              Promise.all(itemPromises)
                .then(() => {
                  connection.commit((commitErr) => {
                    if (commitErr) {
                      return connection.rollback(() => {
                        connection.release();
                        handleDbError(res, commitErr, 'COMMIT');
                      });
                    }
                    
                    // Log audit trail
                    const auditUserId = userId || staff_id;
                    auditLog(auditUserId, `Completed sale ${transactionNumber} for customer ${customer_id || 'N/A'} with total ${total_amount}`);

                    // Update customer visits for linked customer users only (customer role)
                    // This is a product purchase completion event.
                    if (customer_id) {
                      incrementCustomerVisitsIfLinkedCustomerUser(customer_id, `Completed sale ${transactionNumber}`);
                    }
                    
                    // Fetch complete sale data for receipt using the pool (not the transaction connection)
                    db.query(
                      `SELECT s.*, c.name as customer_name, st.name as staff_name 
                       FROM sales s 
                       LEFT JOIN customer c ON s.customer_id = c.id 
                       LEFT JOIN staff st ON s.staff_id = st.id 
                       WHERE s.id = ?`,
                      [saleId],
                      (fetchErr, saleData) => {
                        connection.release(); // Release connection after commit
                        
                        if (fetchErr) {
                          // Still return success even if fetch fails
                          return res.status(201).json({
                            id: saleId,
                            transaction_number: transactionNumber,
                            message: 'Sale completed successfully',
                          });
                        }

                        db.query(
                          `SELECT si.*, p.name as product_name, p.sku 
                           FROM sale_items si 
                           JOIN products p ON si.product_id = p.id 
                           WHERE si.sale_id = ?`,
                          [saleId],
                          (itemFetchErr, itemData) => {
                            if (itemFetchErr) {
                              return res.status(201).json({
                                id: saleId,
                                transaction_number: transactionNumber,
                                message: 'Sale completed successfully',
                                sale: saleData[0],
                              });
                            }

                            res.status(201).json({
                              id: saleId,
                              transaction_number: transactionNumber,
                              message: 'Sale completed successfully',
                              sale: {
                                ...saleData[0],
                                items: itemData,
                              },
                            });
                          }
                        );
                      }
                    );
                  });
                })
                .catch((error) => {
                  connection.rollback(() => {
                    connection.release();
                    console.error('Transaction rollback error:', error);
                    res.status(500).json({ error: error.message || 'Error processing sale items' });
                  });
                });
            }
          );
        });
      });
    })
    .catch((error) => {
      res.status(400).json({ error: error.message || 'Stock validation failed' });
    });
});

// GET sales summary/stats
router.get('/stats/summary', (_req, res) => {
  db.query(
    `SELECT 
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_sale,
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END) as today_revenue,
      COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_sales
     FROM sales 
     WHERE status = 'Completed'`,
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET stats');
      res.json(results[0] || {});
    }
  );
});

export default router;

