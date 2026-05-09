import express from "express";
import bcrypt from "bcryptjs";
import db from "../config/db.js";

const router = express.Router();

const auditLog = (userId, action) => {
  if (!userId) return;
  db.query(
    'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
    [userId, action],
    () => {}
  );
};

// GET all staff
router.get("/", (req, res) => {
  db.query(
    "SELECT id, name, role, username, email, password FROM staff ORDER BY id DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database GET error" });
      res.json(results);
    }
  );
});

// ADD staff
router.post("/", (req, res) => {
  const { name, role, username, email, password, userId } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  // Normalize email (same as auth.js)
  const normalizedEmail = email.trim().toLowerCase();

  // Hash password for users table
  const hashedPassword = bcrypt.hashSync(password, 10);

  // First, check if email already exists in users table
  db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail], (checkErr, checkRows) => {
    if (checkErr) {
      console.error('❌ Email check error:', checkErr);
      return res.status(500).json({ error: "Database error: Unable to verify email" });
    }

    if (checkRows && checkRows.length > 0) {
      return res.status(409).json({ error: "Email already exists in users table" });
    }

    // Insert into staff table (with plain text password for legacy compatibility)
    db.query(
      "INSERT INTO staff (name, role, username, email, password) VALUES (?, ?, ?, ?, ?)",
      [name, role, username, email, password],
      (err, result) => {
        if (err) {
          console.error('❌ Staff insert error:', err);
          return res.status(500).json({ error: "Database POST error" });
        }

        const staffId = result.insertId;

        // Also create user account for login
        db.query(
          'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          [name.trim(), normalizedEmail, hashedPassword, 'staff'],
          (userErr) => {
            if (userErr) {
              console.error('❌ User creation error:', userErr);
              // If user creation fails, rollback staff creation
              db.query('DELETE FROM staff WHERE id = ?', [staffId], () => {});
              return res.status(500).json({ error: "Failed to create user account for staff" });
            }

            auditLog(userId, `Added staff member: ${name} (${role})`);
            res.status(201).json({
              id: staffId,
              name,
              role,
              username,
              email,
              password,
            });
          }
        );
      }
    );
  });
});

// GET staff bookings (appointments for a specific staff member)
// IMPORTANT: These specific routes must come BEFORE generic /:id routes to avoid route conflicts
router.get("/:id/bookings", (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      a.id,
      a.appointment_date,
      a.appointment_time,
      a.service,
      a.status,
      a.notes,
      c.id as customer_id,
      c.name as customer_name
    FROM appointments a
    INNER JOIN customer c ON a.customer_id = c.id
    WHERE a.staff_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results || []);
  });
});

// GET staff ratings and reviews
router.get("/:id/ratings", (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      sr.id,
      sr.rating,
      sr.review,
      sr.created_at,
      sr.updated_at,
      c.id as customer_id,
      c.name as customer_name,
      a.appointment_date,
      a.service
    FROM staff_ratings sr
    INNER JOIN customer c ON sr.customer_id = c.id
    LEFT JOIN appointments a ON sr.appointment_id = a.id
    WHERE sr.staff_id = ?
    ORDER BY sr.created_at DESC
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    
    // Calculate average rating
    const ratings = results || [];
    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0;
    
    res.json({
      ratings,
      averageRating: parseFloat(avgRating),
      totalRatings: ratings.length
    });
  });
});

// POST staff rating (only for customers who booked that staff)
// IMPORTANT: This route must come BEFORE /:id routes to avoid route conflicts
router.post("/:id/ratings", (req, res) => {
  const { id: staffId } = req.params;
  const { customer_id, appointment_id, rating, review } = req.body;
  
  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }
  
  // Validate staffId
  if (!staffId) {
    return res.status(400).json({ error: "Staff ID is required" });
  }

  // Verify customer has booked this staff
  // If appointment_id is provided, verify that specific appointment
  // Otherwise, verify any appointment with this customer and staff
  const verifyQuery = appointment_id
    ? `SELECT id FROM appointments 
       WHERE id = ? AND customer_id = ? AND staff_id = ? 
       LIMIT 1`
    : `SELECT id FROM appointments 
       WHERE customer_id = ? AND staff_id = ? 
       LIMIT 1`;
  
  const verifyParams = appointment_id
    ? [appointment_id, customer_id, staffId]
    : [customer_id, staffId];

  db.query(verifyQuery, verifyParams, (err, appointments) => {
    if (err) {
      console.error('Error verifying appointment:', err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    
    if (!appointments || appointments.length === 0) {
      return res.status(403).json({ 
        error: "You can only rate staff members you have booked. Please ensure the appointment is completed and has an assigned staff member." 
      });
    }
      
      // Check if rating already exists for this customer-staff-appointment combination
      const checkQuery = appointment_id
        ? `SELECT id FROM staff_ratings 
           WHERE staff_id = ? AND customer_id = ? AND appointment_id = ?`
        : `SELECT id FROM staff_ratings 
           WHERE staff_id = ? AND customer_id = ? AND appointment_id IS NULL`;
      
      const checkParams = appointment_id
        ? [staffId, customer_id, appointment_id]
        : [staffId, customer_id];

      db.query(checkQuery, checkParams, (checkErr, existing) => {
        if (checkErr) {
          console.error('Error checking existing rating:', checkErr);
          return res.status(500).json({ error: "Database error: " + checkErr.message });
        }
          
          if (existing && existing.length > 0) {
            // Update existing rating
            db.query(
              `UPDATE staff_ratings 
               SET rating = ?, review = ?, updated_at = NOW() 
               WHERE id = ?`,
              [rating, review || null, existing[0].id],
              (updateErr) => {
                if (updateErr) {
                  console.error('Error updating rating:', updateErr);
                  return res.status(500).json({ error: "Database error: " + updateErr.message });
                }
                res.json({ message: "Rating updated successfully" });
              }
            );
          } else {
            // Create new rating
            db.query(
              `INSERT INTO staff_ratings (staff_id, customer_id, appointment_id, rating, review) 
               VALUES (?, ?, ?, ?, ?)`,
              [staffId, customer_id, appointment_id || null, rating, review || null],
              (insertErr, result) => {
                if (insertErr) {
                  console.error('Error inserting rating:', insertErr);
                  return res.status(500).json({ error: "Database error: " + insertErr.message });
                }
                res.status(201).json({ 
                  message: "Rating submitted successfully",
                  id: result.insertId
                });
              }
            );
          }
        }
      );
    }
  );
});

// UPDATE staff
// IMPORTANT: Generic /:id routes must come AFTER specific routes like /:id/bookings and /:id/ratings
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, role, username, email, password, userId } = req.body;

  // Get current staff email to find corresponding user
  db.query("SELECT email FROM staff WHERE id=?", [id], (getErr, staffRows) => {
    if (getErr) return res.status(500).json({ error: "Database GET error" });
    if (staffRows.length === 0) return res.status(404).json({ error: "Staff not found" });

    const oldEmail = staffRows[0].email;
    const normalizedOldEmail = oldEmail.trim().toLowerCase();
    const normalizedNewEmail = email ? email.trim().toLowerCase() : normalizedOldEmail;

    // If email is changing, check if new email already exists in users table
    if (email && normalizedNewEmail !== normalizedOldEmail) {
      db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedNewEmail], (emailCheckErr, emailCheckRows) => {
        if (emailCheckErr) {
          console.error('❌ Email check error:', emailCheckErr);
          return res.status(500).json({ error: "Database error" });
        }
        if (emailCheckRows && emailCheckRows.length > 0) {
          return res.status(409).json({ error: "New email already exists in users table" });
        }

        // Proceed with update
        performUpdate();
      });
    } else {
      // No email change, proceed directly
      performUpdate();
    }

    function performUpdate() {
      // Update staff table (with plain text password for legacy compatibility)
      db.query(
        "UPDATE staff SET name=?, role=?, username=?, email=?, password=? WHERE id=?",
        [name, role, username, email, password, id],
        (err) => {
          if (err) {
            console.error('❌ Staff update error:', err);
            return res.status(500).json({ error: "Database PUT error" });
          }

          // Also update corresponding user account
          // Find user by old email
          db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedOldEmail], (userFindErr, userRows) => {
            if (userFindErr) {
              console.error('❌ User find error:', userFindErr);
            } else if (userRows && userRows.length > 0) {
              const userIdToUpdate = userRows[0].id;
              const updates = [];
              const values = [];

              if (name) {
                updates.push('name = ?');
                values.push(name.trim());
              }
              if (email && normalizedNewEmail !== normalizedOldEmail) {
                updates.push('email = ?');
                values.push(normalizedNewEmail);
              }

              if (updates.length > 0) {
                values.push(userIdToUpdate);
                db.query(
                  `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                  values,
                  (userUpdateErr) => {
                    if (userUpdateErr) {
                      console.error('❌ User update error:', userUpdateErr);
                      // Continue even if user update fails
                    }
                  }
                );
              }
            }

            auditLog(userId, `Updated staff member: ${name} (ID: ${id})`);
            res.json({ message: "Staff updated", name, role, username, email, password });
          });
        }
      );
    }
  });
});

// DELETE staff
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  // Get staff info before deleting
  db.query("SELECT name, email FROM staff WHERE id=?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database DELETE error" });
    if (rows.length === 0) return res.status(404).json({ error: "Staff not found" });

    const staffName = rows[0].name;
    const staffEmail = rows[0].email;
    const normalizedEmail = staffEmail.trim().toLowerCase();

    // Delete from staff table
    db.query("DELETE FROM staff WHERE id=?", [id], (deleteErr) => {
      if (deleteErr) {
        console.error('❌ Staff delete error:', deleteErr);
        return res.status(500).json({ error: "Database DELETE error" });
      }

      // Also delete corresponding user account (if exists)
      db.query('DELETE FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail], (userDeleteErr) => {
        if (userDeleteErr) {
          console.error('❌ User delete error:', userDeleteErr);
          // Continue even if user delete fails (might not exist)
        }

        auditLog(userId, `Deleted staff member: ${staffName} (ID: ${id})`);
        res.json({ message: "Staff deleted" });
      });
    });
  });
});

export default router;
