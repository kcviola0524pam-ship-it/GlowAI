import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Inventory ${action} error:`, err);
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

// Middleware to extract user ID from request (you may need to add JWT verification)
const getUserId = (req) => {
  // For now, get from query or body - in production, extract from JWT token
  return req.body.userId || req.query.userId || null;
};

// GET all products
router.get('/', (_req, res) => {
  db.query(
    'SELECT * FROM products ORDER BY name ASC',
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET');
      res.json(results);
    }
  );
});

// GET single product
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(results[0]);
  });
});

// POST: Add new product
router.post('/', (req, res) => {
  const {
    name,
    description,
    category = 'General',
    price,
    cost = 0,
    stock_quantity = 0,
    min_stock_level = 10,
    sku,
    userId,
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  db.query(
    'INSERT INTO products (name, description, category, price, cost, stock_quantity, min_stock_level, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || '', category, price, cost, stock_quantity, min_stock_level, sku || null],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'SKU already exists' });
        }
        return handleDbError(res, err, 'POST');
      }

      auditLog(userId, `Added product: ${name} (SKU: ${sku || 'N/A'})`);
      res.status(201).json({
        id: result.insertId,
        name,
        description: description || '',
        category,
        price,
        cost,
        stock_quantity,
        min_stock_level,
        sku: sku || null,
      });
    }
  );
});

// PUT: Update product
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, cost, stock_quantity, min_stock_level, sku, userId } = req.body;

  db.query(
    'UPDATE products SET name = ?, description = ?, category = ?, price = ?, cost = ?, stock_quantity = ?, min_stock_level = ?, sku = ? WHERE id = ?',
    [name, description, category, price, cost, stock_quantity, min_stock_level, sku, id],
    (err) => {
      if (err) return handleDbError(res, err, 'PUT');
      auditLog(userId, `Updated product: ${name} (ID: ${id})`);
      res.json({ message: 'Product updated' });
    }
  );
});

// DELETE: Remove product
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  // Get product name before deleting for audit log
  db.query('SELECT name FROM products WHERE id = ?', [id], (err, rows) => {
    if (err) return handleDbError(res, err, 'DELETE');
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const productName = rows[0].name;

    db.query('DELETE FROM products WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) return handleDbError(res, deleteErr, 'DELETE');
      auditLog(userId, `Deleted product: ${productName} (ID: ${id})`);
      res.json({ message: 'Product deleted' });
    });
  });
});

// GET low stock products
router.get('/alerts/low-stock', (_req, res) => {
  db.query(
    'SELECT * FROM products WHERE stock_quantity <= min_stock_level ORDER BY stock_quantity ASC',
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET low stock');
      res.json(results);
    }
  );
});

export default router;

