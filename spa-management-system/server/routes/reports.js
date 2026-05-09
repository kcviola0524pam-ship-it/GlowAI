import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Reports ${action} error:`, err);
  res.status(500).json({ error: `Database error (${action})` });
};

// GET Sales Report
router.get('/sales', (req, res) => {
  const { start, end } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  db.query(
    `SELECT 
      DATE(created_at) as date,
      SUM(total_amount) as revenue,
      COUNT(*) as transactions
     FROM sales
     WHERE DATE(created_at) BETWEEN ? AND ?
       AND status = 'Completed'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [start, end],
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET sales report');
      res.json(results || []);
    }
  );
});

// GET Peak Days Report
router.get('/peak-days', (req, res) => {
  const { start, end } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  db.query(
    `SELECT 
      DAYNAME(created_at) as day,
      COUNT(*) as activity
     FROM sales
     WHERE DATE(created_at) BETWEEN ? AND ?
       AND status = 'Completed'
     GROUP BY DAYNAME(created_at)
     ORDER BY activity DESC`,
    [start, end],
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET peak days');
      
      // Also include appointments
      db.query(
        `SELECT 
          DAYNAME(appointment_date) as day,
          COUNT(*) as activity
         FROM appointments
         WHERE DATE(appointment_date) BETWEEN ? AND ?
           AND status = 'Completed'
         GROUP BY DAYNAME(appointment_date)`,
        [start, end],
        (apptErr, apptResults) => {
          if (apptErr) {
            return res.json(results || []);
          }
          
          // Merge sales and appointments by day
          const dayMap = {};
          (results || []).forEach(item => {
            dayMap[item.day] = (dayMap[item.day] || 0) + (item.activity || 0);
          });
          (apptResults || []).forEach(item => {
            dayMap[item.day] = (dayMap[item.day] || 0) + (item.activity || 0);
          });
          
          const merged = Object.entries(dayMap).map(([day, activity]) => ({
            day,
            activity
          })).sort((a, b) => b.activity - a.activity);
          
          res.json(merged);
        }
      );
    }
  );
});

// GET Peak Hours Report
router.get('/peak-hours', (req, res) => {
  const { start, end } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  db.query(
    `SELECT 
      HOUR(created_at) as hour,
      COUNT(*) as activity
     FROM sales
     WHERE DATE(created_at) BETWEEN ? AND ?
       AND status = 'Completed'
     GROUP BY HOUR(created_at)
     ORDER BY hour ASC`,
    [start, end],
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET peak hours');
      
      // Also include appointments
      db.query(
        `SELECT 
          HOUR(appointment_time) as hour,
          COUNT(*) as activity
         FROM appointments
         WHERE DATE(appointment_date) BETWEEN ? AND ?
           AND status = 'Completed'
           AND appointment_time IS NOT NULL
         GROUP BY HOUR(appointment_time)`,
        [start, end],
        (apptErr, apptResults) => {
          if (apptErr) {
            return res.json(results || []);
          }
          
          // Merge sales and appointments by hour
          const hourMap = {};
          (results || []).forEach(item => {
            hourMap[item.hour] = (hourMap[item.hour] || 0) + (item.activity || 0);
          });
          (apptResults || []).forEach(item => {
            hourMap[item.hour] = (hourMap[item.hour] || 0) + (item.activity || 0);
          });
          
          const merged = Object.entries(hourMap).map(([hour, activity]) => ({
            hour: parseInt(hour, 10),
            activity
          })).sort((a, b) => a.hour - b.hour);
          
          res.json(merged);
        }
      );
    }
  );
});

// GET Preferred Services Report
router.get('/preferred-services', (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'Start and end dates are required' });
  }

  db.query(
    `SELECT
      service,
      COUNT(*) as bookings,
      COUNT(DISTINCT customer_id) as customers
     FROM appointments
     WHERE DATE(appointment_date) BETWEEN ? AND ?
       AND status = 'Completed'
       AND service IS NOT NULL
       AND service != ''
     GROUP BY service
     ORDER BY customers DESC, bookings DESC, service ASC`,
    [start, end],
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET preferred services');
      res.json(results || []);
    }
  );
});

// POST Save Report
router.post('/save', async (req, res) => {
  const { week_number, start_date, end_date } = req.body;
  
  if (week_number === undefined || !start_date || !end_date) {
    return res.status(400).json({ error: 'Week number, start date, and end date are required' });
  }

  try {
    // Fetch all data for this week
    const salesData = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as revenue,
          COUNT(*) as transactions
         FROM sales
         WHERE DATE(created_at) BETWEEN ? AND ?
           AND status = 'Completed'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [start_date, end_date],
        (err, results) => err ? reject(err) : resolve(results || [])
      );
    });

    const peakDaysData = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
          DAYNAME(created_at) as day,
          COUNT(*) as activity
         FROM sales
         WHERE DATE(created_at) BETWEEN ? AND ?
           AND status = 'Completed'
         GROUP BY DAYNAME(created_at)
         ORDER BY activity DESC`,
        [start_date, end_date],
        (err, results) => err ? reject(err) : resolve(results || [])
      );
    });

    const peakHoursData = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
          HOUR(created_at) as hour,
          COUNT(*) as activity
         FROM sales
         WHERE DATE(created_at) BETWEEN ? AND ?
           AND status = 'Completed'
         GROUP BY HOUR(created_at)
         ORDER BY hour ASC`,
        [start_date, end_date],
        (err, results) => err ? reject(err) : resolve(results || [])
      );
    });

    const totalRevenue = salesData.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
    const totalTransactions = salesData.reduce((sum, item) => sum + (item.transactions || 0), 0);
    const peakDay = peakDaysData.length > 0 ? peakDaysData[0].day : null;
    const peakHour = peakHoursData.length > 0 ? `${peakHoursData.sort((a, b) => b.activity - a.activity)[0].hour}:00` : null;

    const weekLabel = week_number === 0 ? 'Current Week' : week_number === 1 ? 'Last Week' : `${week_number} Weeks Ago`;

    db.query(
      `INSERT INTO weekly_reports 
       (week_number, week_label, start_date, end_date, total_revenue, total_transactions, peak_day, peak_hour, sales_data, peak_days_data, peak_hours_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_revenue = VALUES(total_revenue),
         total_transactions = VALUES(total_transactions),
         peak_day = VALUES(peak_day),
         peak_hour = VALUES(peak_hour),
         sales_data = VALUES(sales_data),
         peak_days_data = VALUES(peak_days_data),
         peak_hours_data = VALUES(peak_hours_data),
         created_at = NOW()`,
      [
        week_number,
        weekLabel,
        start_date,
        end_date,
        totalRevenue,
        totalTransactions,
        peakDay,
        peakHour,
        JSON.stringify(salesData),
        JSON.stringify(peakDaysData),
        JSON.stringify(peakHoursData)
      ],
      (err) => {
        if (err) return handleDbError(res, err, 'POST save report');
        res.json({ message: 'Report saved successfully' });
      }
    );
  } catch (err) {
    return handleDbError(res, err, 'POST save report');
  }
});

// GET Saved Reports
router.get('/saved', (req, res) => {
  db.query(
    `SELECT * FROM weekly_reports ORDER BY week_number ASC, created_at DESC`,
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET saved reports');
      res.json(results || []);
    }
  );
});

export default router;
