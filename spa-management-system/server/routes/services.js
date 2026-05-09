import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Services ${action} error:`, err);
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

// GET all services
router.get('/', (req, res) => {
  db.query(
    'SELECT * FROM services WHERE is_active = TRUE ORDER BY name',
    (err, results) => {
      if (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return res.status(500).json({ 
            error: 'Services table does not exist. Please run the services_schema.sql file to create it.' 
          });
        }
        return handleDbError(res, err, 'GET');
      }
      res.json(results || []);
    }
  );
});

// GET all services (including inactive) - for admin
router.get('/all', (req, res) => {
  db.query(
    'SELECT * FROM services ORDER BY name',
    (err, results) => {
      if (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return res.status(500).json({ 
            error: 'Services table does not exist. Please run the services_schema.sql file to create it.' 
          });
        }
        return handleDbError(res, err, 'GET all');
      }
      res.json(results || []);
    }
  );
});

// GET single service
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM services WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET');
      if (results.length === 0) return res.status(404).json({ error: 'Service not found' });
      res.json(results[0]);
    }
  );
});

// POST: Create new service
router.post('/', (req, res) => {
  const { name, description, category, price, duration_minutes, is_active = true, userId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  db.query(
    'INSERT INTO services (name, description, category, price, duration_minutes, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || '', category || 'General', price || 0, duration_minutes || 60, is_active],
    (err, result) => {
      if (err) return handleDbError(res, err, 'POST');
      auditLog(userId, `Created service: ${name}`);
      res.status(201).json({
        id: result.insertId,
        name,
        description: description || '',
        category: category || 'General',
        price: price || 0,
        duration_minutes: duration_minutes || 60,
        is_active,
      });
    }
  );
});

// PUT: Update service
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, duration_minutes, is_active, userId } = req.body;

  db.query(
    'UPDATE services SET name = ?, description = ?, category = ?, price = ?, duration_minutes = ?, is_active = ? WHERE id = ?',
    [name, description, category, price, duration_minutes, is_active, id],
    (err, result) => {
      if (err) return handleDbError(res, err, 'PUT');
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' });
      auditLog(userId, `Updated service ID: ${id}`);
      res.json({ message: 'Service updated successfully' });
    }
  );
});

// DELETE: Delete service
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  db.query(
    'DELETE FROM services WHERE id = ?',
    [id],
    (err, result) => {
      if (err) return handleDbError(res, err, 'DELETE');
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' });
      auditLog(userId, `Deleted service ID: ${id}`);
      res.json({ message: 'Service deleted successfully' });
    }
  );
});

export default router;

