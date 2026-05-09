import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Payments ${action} error:`, err);
  res.status(500).json({ error: `Database error (${action})` });
};

// GET all payments
router.get('/', (_req, res) => {
  const sql = `
    SELECT payments.id, customer.name, payments.amount, payments.payment_date
    FROM payments
    JOIN customer ON customer.id = payments.customer_id
    ORDER BY payments.payment_date DESC`;

  db.query(sql, (err, rows) => {
    if (err) return handleDbError(res, err, 'GET');
    res.json(rows);
  });
});

// POST new customer payment
router.post('/', (req, res) => {
  const { customer_id, amount } = req.body;

  db.query(
    'INSERT INTO payments (customer_id, amount, payment_date) VALUES (?, ?, CURDATE())',
    [customer_id, amount],
    (err, result) => {
      if (err) return handleDbError(res, err, 'POST');

      res.status(201).json({
        id: result.insertId,
        customer_id,
        amount,
        payment_date: new Date(),
      });
    }
  );
});

export default router;
