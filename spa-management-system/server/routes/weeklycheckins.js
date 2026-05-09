import express from 'express';
import db from '../config/db.js';

const router = express.Router();
router.get('/api/checkins/summary', (req, res) => {
  const sql = `
    SELECT DATE(checkin_time) AS day, COUNT(*) AS checkins
    FROM checkins
    WHERE checkin_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(checkin_time)
    ORDER BY day ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Summary error:', err);
      return res.status(500).json({ error: 'Database summary error' });
    }

    res.json(results);
  });
});

export default router;