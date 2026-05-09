import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Customer ${action} error:`, err);
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

// GET all customers
router.get('/', (_req, res) => {
  const sql = `
    SELECT id, name, service, walked_in, visits, status, 
           COALESCE(booking_disabled, FALSE) as booking_disabled
    FROM customer 
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    res.json(results);
  });
});

// GET customer by user_id
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  // First check if user_id column exists
  db.query('SHOW COLUMNS FROM customer LIKE "user_id"', (colErr, colRows) => {
    if (colRows && colRows.length > 0) {
      // user_id column exists, query by user_id
      db.query('SELECT * FROM customer WHERE user_id = ?', [userId], (err, results) => {
        if (err) return handleDbError(res, err, 'GET');
        if (results.length === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json(results[0]);
      });
    } else {
      // user_id column doesn't exist, get user name and match by name
      db.query('SELECT name FROM users WHERE id = ?', [userId], (userErr, userRows) => {
        if (userErr || !userRows || userRows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        const userName = userRows[0].name;
        db.query('SELECT * FROM customer WHERE name = ?', [userName], (err, results) => {
          if (err) return handleDbError(res, err, 'GET');
          if (results.length === 0) return res.status(404).json({ error: 'Customer not found' });
          res.json(results[0]);
        });
      });
    }
  });
});

// GET single customer by customer id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM customer WHERE id = ?', [id], (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    if (results.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(results[0]);
  });
});

// POST: Add new customer
router.post('/', (req, res) => {
  const { name, service, walked_in, visits, status = 'Active', user_id, userId } = req.body;

  if (!name) return res.status(400).json({ error: 'Name is required' });

  // Check if user_id column exists
  db.query('SHOW COLUMNS FROM customer LIKE "user_id"', (colErr, colRows) => {
    if (colRows && colRows.length > 0 && user_id) {
      // user_id column exists and user_id provided
      db.query(
        'INSERT INTO customer (name, user_id, service, walked_in, visits, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name, user_id, service || '', walked_in || new Date(), visits || 0, status],
        (err, result) => {
          if (err) return handleDbError(res, err, 'POST');

          auditLog(userId, `Added customer: ${name}`);
          res.status(201).json({
            id: result.insertId,
            name,
            user_id,
            service: service || '',
            walked_in: walked_in || new Date(),
            visits: visits || 0,
            status,
          });
        }
      );
    } else {
      // user_id column doesn't exist or user_id not provided
      db.query(
        'INSERT INTO customer (name, service, walked_in, visits, status) VALUES (?, ?, ?, ?, ?)',
        [name, service || '', walked_in || new Date(), visits || 0, status],
        (err, result) => {
          if (err) return handleDbError(res, err, 'POST');

          auditLog(userId, `Added customer: ${name}`);
          res.status(201).json({
            id: result.insertId,
            name,
            service: service || '',
            walked_in: walked_in || new Date(),
            visits: visits || 0,
            status,
          });
        }
      );
    }
  });
});

// PUT: Update customer
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, service, walked_in, visits, status, booking_disabled, userId } = req.body;

  // Check if booking_disabled column exists
  db.query('SHOW COLUMNS FROM customer LIKE "booking_disabled"', (colErr, colRows) => {
    let updateSql;
    let updateParams;
    
    if (colRows && colRows.length > 0) {
      // booking_disabled column exists
      updateSql = 'UPDATE customer SET name = ?, service = ?, walked_in = ?, visits = ?, status = ?, booking_disabled = ? WHERE id = ?';
      updateParams = [name, service, walked_in, visits, status, booking_disabled !== undefined ? booking_disabled : false, id];
    } else {
      // booking_disabled column doesn't exist yet
      updateSql = 'UPDATE customer SET name = ?, service = ?, walked_in = ?, visits = ?, status = ? WHERE id = ?';
      updateParams = [name, service, walked_in, visits, status, id];
    }

    db.query(updateSql, updateParams, (err) => {
      if (err) return handleDbError(res, err, 'PUT');
      auditLog(userId, `Updated customer: ${name} (ID: ${id})${booking_disabled !== undefined ? ` - Booking ${booking_disabled ? 'disabled' : 'enabled'}` : ''}`);
      res.json({ message: 'Customer updated' });
    });
  });
});

// PUT: Toggle booking disabled status
router.put('/:id/toggle-booking', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  // First check if booking_disabled column exists
  db.query('SHOW COLUMNS FROM customer LIKE "booking_disabled"', (colErr, colRows) => {
    if (colErr) {
      console.error('Error checking booking_disabled column:', colErr);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!colRows || colRows.length === 0) {
      return res.status(400).json({ error: 'Booking disabled feature not available' });
    }

    // Get current booking_disabled status and customer name
    db.query('SELECT name, COALESCE(booking_disabled, FALSE) as booking_disabled FROM customer WHERE id = ?', [id], (err, rows) => {
      if (err) {
        console.error('Error fetching customer:', err);
        return handleDbError(res, err, 'GET');
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customerName = rows[0].name;
      const currentStatus = rows[0].booking_disabled;
      const newStatus = !currentStatus;

      // Toggle the booking_disabled status
      db.query(
        'UPDATE customer SET booking_disabled = ? WHERE id = ?',
        [newStatus, id],
        (updateErr) => {
          if (updateErr) {
            console.error('Error toggling booking status:', updateErr);
            return handleDbError(res, updateErr, 'PUT');
          }

          // Audit log
          auditLog(userId, `${newStatus ? 'Disabled' : 'Enabled'} booking for customer: ${customerName} (ID: ${id})`);

          res.json({ 
            message: `Booking ${newStatus ? 'disabled' : 'enabled'} successfully`,
            booking_disabled: newStatus
          });
        }
      );
    });
  });
});

// DELETE: Remove customer
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  // Get customer name before deleting
  db.query('SELECT name FROM customer WHERE id = ?', [id], (err, rows) => {
    if (err) return handleDbError(res, err, 'DELETE');
    if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

    const customerName = rows[0].name;

    db.query('DELETE FROM customer WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) return handleDbError(res, deleteErr, 'DELETE');
      auditLog(userId, `Deleted customer: ${customerName} (ID: ${id})`);
      res.json({ message: 'Customer deleted' });
    });
  });
});

export default router;