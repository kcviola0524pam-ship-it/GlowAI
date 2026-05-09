import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// Fetch latest audit logs with pagination and sorting
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  
  // Filter by user if provided
  const userId = req.query.userId ? parseInt(req.query.userId) : null;
  // Filter by staff if provided (filter by users with role='staff')
  const staffId = req.query.staffId ? parseInt(req.query.staffId) : null;
  
  // Sort options: 'action', 'user_name', 'created_at'
  const sortBy = req.query.sortBy || 'created_at';
  const sortOrder = req.query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  
  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['action', 'user_name', 'created_at'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  
  // Build ORDER BY clause
  let orderBy = `ORDER BY a.${validSortBy} ${sortOrder}`;
  if (validSortBy === 'user_name') {
    orderBy = `ORDER BY u.name ${sortOrder}`;
  }
  
  // Build WHERE clause for user/staff filter
  let whereClause = '';
  const whereConditions = [];
  const countParams = [];
  const queryParams = [];
  
  if (userId) {
    whereConditions.push('a.user_id = ?');
    countParams.push(userId);
    queryParams.push(userId);
  } else if (staffId) {
    // Filter by specific staff user
    whereConditions.push('a.user_id = ? AND u.role = ?');
    countParams.push(staffId, 'staff');
    queryParams.push(staffId, 'staff');
  }
  
  if (whereConditions.length > 0) {
    whereClause = 'WHERE ' + whereConditions.join(' AND ');
  }
  
  // Add limit and offset to query params
  queryParams.push(limit, offset);
  
  // Get total count
  const countSql = `
    SELECT COUNT(*) as total
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ${whereClause}
  `;
  
  // Get paginated results
  const sql = `
    SELECT a.id, a.action, a.created_at, u.name AS user_name, u.role AS user_role
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ${whereClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, countParams, (countErr, countRows) => {
    if (countErr) {
      console.error('❌ Audit count error:', countErr);
      return res.status(500).json({ error: 'Unable to load audit logs.' });
    }
    
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    db.query(sql, queryParams, (err, rows) => {
      if (err) {
        console.error('❌ Audit GET error:', err);
        return res.status(500).json({ error: 'Unable to load audit logs.' });
      }
      res.json({
        logs: rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit
        }
      });
    });
  });
});

// GET audit logs for a specific user with pagination and sorting
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  
  // Sort options: 'action', 'created_at'
  const sortBy = req.query.sortBy || 'created_at';
  const sortOrder = req.query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  
  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['action', 'created_at'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  
  // Build ORDER BY clause
  const orderBy = `ORDER BY a.${validSortBy} ${sortOrder}`;
  
  // Get total count
  const countSql = `
    SELECT COUNT(*) as total
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.user_id = ?
  `;
  
  // Get paginated results
  const sql = `
    SELECT a.id, a.action, a.created_at, u.name AS user_name, u.role AS user_role
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.user_id = ?
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, [userId], (countErr, countRows) => {
    if (countErr) {
      console.error('❌ Audit count error:', countErr);
      return res.status(500).json({ error: 'Unable to load audit logs.' });
    }
    
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    db.query(sql, [userId, limit, offset], (err, rows) => {
      if (err) {
        console.error('❌ Audit GET error:', err);
        return res.status(500).json({ error: 'Unable to load audit logs.' });
      }
      res.json({
        logs: rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit
        }
      });
    });
  });
});

// Allow manual insertion of audit events (e.g., settings changes)
router.post('/', (req, res) => {
  const { userId, action } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required.' });
  }

  db.query(
    'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
    [userId || null, action],
    (err, result) => {
      if (err) {
        console.error('❌ Audit POST error:', err);
        return res.status(500).json({ error: 'Unable to record audit log.' });
      }

      res.status(201).json({
        id: result.insertId,
        action,
        user_id: userId || null,
      });
    }
  );
});

export default router;

