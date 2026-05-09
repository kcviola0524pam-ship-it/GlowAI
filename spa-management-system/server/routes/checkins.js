import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Checkins ${action} error:`, err);
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

// Get all check-ins with customer
router.get('/', (_req, res) => {
  const sql = `
    SELECT 
      checkins.id,
      customer.name AS name,
      customer.status AS status,
      checkins.checkin_time
    FROM checkins
    LEFT JOIN customer ON customer.id = checkins.customer_id
    ORDER BY checkins.checkin_time DESC
    LIMIT 10
  `;

  db.query(sql, (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    res.json(results);
  });
});

// Weekly summary for dashboard charts
router.get('/summary', (_req, res) => {
  const sql = `
    SELECT DATE(checkin_time) AS day, COUNT(*) AS checkins
    FROM checkins
    WHERE checkin_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(checkin_time)
    ORDER BY day ASC
  `;

  db.query(sql, (err, results) => {
    if (err) return handleDbError(res, err, 'SUMMARY');
    res.json(results);
  });
});

// Dashboard stats
router.get('/stats', (_req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM customer WHERE status = 'Active') AS active_customers,
      (SELECT COUNT(*) FROM checkins) AS total_visits,
      (SELECT COUNT(DISTINCT DATE(checkin_time)) FROM checkins WHERE checkin_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS total_services
  `;

  db.query(sql, (err, results) => {
    if (err) return handleDbError(res, err, 'STATS');
    res.json(results[0] || { active_customers: 0, total_visits: 0, total_services: 0 });
  });
});

// Add new check-in 
router.post('/', (req, res) => {
  const { customer_id, userId } = req.body;

  // Accept customer_id 
  if (!customer_id) {
    return res.status(400).json({ error: 'customer_id required' });
  }

  // First, verify that the customer exists in the database
  db.query(
    'SELECT id, name FROM customer WHERE id = ?',
    [customer_id],
    (err, results) => {
      if (err) return handleDbError(res, err, 'POST');
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Customer ID not found in database' });
      }

      const customerName = results[0].name;

      // Customer exists, proceed with check-in
      db.query(
        'INSERT INTO checkins (customer_id) VALUES (?)',
        [customer_id],
        (insertErr, result) => {
          if (insertErr) return handleDbError(res, insertErr, 'POST');

          auditLog(userId, `Added check-in for customer: ${customerName} (ID: ${customer_id})`);
          res.status(201).json({
            id: result.insertId,
            customer_id: customer_id,
            checkin_time: new Date(),
          });
        }
      );
    }
  );
});

export default router;
