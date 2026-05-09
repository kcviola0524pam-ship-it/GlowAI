import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const router = express.Router();

// Fix database AUTO_INCREMENT issue - deletes user with id: 0 and sets correct AUTO_INCREMENT
const fixAutoIncrement = () => {
  // First, delete any user with id: 0
  db.query('DELETE FROM users WHERE id = 0', (delErr) => {
    if (delErr) {
      console.error('❌ Error deleting user with id: 0:', delErr);
    } else {
      console.log('✅ Cleaned up any users with id: 0');
    }
    
    // Get max ID and set AUTO_INCREMENT
    db.query('SELECT MAX(id) as maxId FROM users', (err, rows) => {
      if (err) {
        console.error('❌ Error checking max ID:', err);
        return;
      }
      
      const maxId = rows[0]?.maxId || 0;
      const nextId = Math.max(maxId + 1, 1);
      
      db.query(`ALTER TABLE users AUTO_INCREMENT = ${nextId}`, (alterErr) => {
        if (alterErr) {
          console.warn('⚠️ Could not set AUTO_INCREMENT:', alterErr.message);
        } else {
          console.log(`✅ Set users AUTO_INCREMENT to ${nextId}`);
        }
      });
    });
  });
};

// Run fix on module load
fixAutoIncrement();

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'spa_secret',
    { expiresIn: '1d' }
  );

const auditLog = (userId, action) => {
  if (!userId) return;
  db.query(
    'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
    [userId, action],
    () => {}
  );
};

const sanitizeUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Validate password length (minimum 6 characters for barebone)
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Default role to 'customer' if not provided
  const userRole = role || 'customer';

  // First, check if email already exists (case-insensitive check)
  db.query('SELECT id, email FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail], (checkErr, checkRows) => {
    if (checkErr) {
      console.error('❌ Email check error:', checkErr);
      return res.status(500).json({ error: 'Unable to verify email. Please try again.' });
    }

    if (checkRows && checkRows.length > 0) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    // Email doesn't exist, proceed with signup
    // Ensure AUTO_INCREMENT is correct before inserting
    db.query('SELECT MAX(id) as maxId FROM users', (maxErr, maxRows) => {
      if (maxErr) {
        console.error('❌ Error checking max ID before insert:', maxErr);
        return res.status(500).json({ error: 'Unable to verify database state.' });
      }
      
      const maxId = maxRows[0]?.maxId || 0;
      const nextId = Math.max(maxId + 1, 1);
      
      // Delete any user with id: 0 if it exists
      db.query('DELETE FROM users WHERE id = 0', (delErr) => {
        if (delErr) {
          console.warn('⚠️ Could not delete user with id: 0:', delErr.message);
        }
        
        // Set AUTO_INCREMENT to ensure next insert gets correct ID
        db.query(`ALTER TABLE users AUTO_INCREMENT = ${nextId}`, (alterErr) => {
          if (alterErr) {
            console.warn('⚠️ Could not set AUTO_INCREMENT before insert:', alterErr.message);
          } else {
            console.log(`✅ Set AUTO_INCREMENT to ${nextId} before insert`);
          }
          
          // Now proceed with insert
          // Hash password
          let hashedPassword;
          try {
            hashedPassword = bcrypt.hashSync(password, 10);
          } catch (hashErr) {
            console.error('❌ Password hashing error:', hashErr);
            return res.status(500).json({ error: 'Unable to process password.' });
          }

          // Insert user into database
          db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name.trim(), normalizedEmail, hashedPassword, userRole],
            (err, result) => {
              if (err) {
                // Log the full error for debugging
                console.error('❌ Signup error details:', {
                  code: err.code,
                  errno: err.errno,
                  sqlMessage: err.sqlMessage,
                  sql: err.sql,
                  message: err.message
                });
                
                // Check for duplicate entry errors
                if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || err.code === 1062) {
                  // Check if it's a PRIMARY KEY duplicate (id: 0 issue) or email duplicate
                  if (err.sqlMessage && err.sqlMessage.includes("Duplicate entry '0' for key 'PRIMARY'")) {
                    console.error('⚠️ Database issue: User with id: 0 exists. This breaks AUTO_INCREMENT.');
                    console.error('💡 Run this SQL to fix: DELETE FROM users WHERE id = 0; ALTER TABLE users AUTO_INCREMENT = 1;');
                    
                    return res.status(500).json({ 
                      error: 'Database configuration issue. The user with id: 0 needs to be removed. Please contact administrator or run: DELETE FROM users WHERE id = 0; ALTER TABLE users AUTO_INCREMENT = 1;' 
                    });
                  }
                  // Email duplicate
                  return res.status(409).json({ error: 'Email already exists.' });
                }
                
                return res.status(500).json({ error: 'Unable to sign up user. Please try again.' });
              }

              // Success - user inserted
              const userId = result.insertId;
              console.log(`✅ User created with ID: ${userId}`);
              
              const user = {
                id: userId,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role: userRole,
              };

              // Try to create customer record (non-blocking - if it fails, user is still created)
              if (userRole === 'customer') {
                // Try with user_id first
                db.query(
                  'INSERT INTO customer (name, user_id, service, walked_in, visits, status) VALUES (?, ?, ?, ?, ?, ?)',
                  [name.trim(), userId, 'Nail Care', new Date(), 0, 'Active'],
                  (custErr) => {
                    if (custErr) {
                      // If user_id column doesn't exist or other error, try without it
                      db.query(
                        'INSERT INTO customer (name, service, walked_in, visits, status) VALUES (?, ?, ?, ?, ?)',
                        [name.trim(), 'Nail Care', new Date(), 0, 'Active'],
                        (custErr2) => {
                          if (custErr2) {
                            // Log but don't fail - customer record creation is optional
                            console.warn('⚠️ Customer record creation failed (non-critical):', custErr2.message || custErr2);
                          } else {
                            console.log('✅ Customer record created (without user_id)');
                          }
                        }
                      );
                    } else {
                      console.log('✅ Customer record created (with user_id)');
                    }
                  }
                );
              }

              // Log audit (non-blocking)
              try {
                auditLog(user.id, 'Created an account');
              } catch (auditErr) {
                console.warn('⚠️ Audit log failed (non-critical):', auditErr.message);
              }

              // Return success response
              res.status(201).json({
                token: signToken(user),
                user,
              });
            }
          );
        });
      });
    });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Normalize email (same as signup) to ensure case-insensitive matching
  const normalizedEmail = email.trim().toLowerCase();

  // Use case-insensitive email matching (LOWER(TRIM(email))) to match signup behavior
  db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail], (err, rows) => {
    if (err) {
      console.error('❌ Login error:', err);
      return res.status(500).json({ error: 'Unable to login.' });
    }

    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const safeUser = sanitizeUser(user);
    auditLog(user.id, 'Logged in');

    res.json({
      token: signToken(user),
      user: safeUser,
    });
  });
});

// GET all users (for admin to filter audit trail)
router.get('/users', (req, res) => {
  db.query('SELECT id, name, email, role FROM users ORDER BY name', (err, rows) => {
    if (err) {
      console.error('❌ Get users error:', err);
      return res.status(500).json({ error: 'Unable to fetch users.' });
    }
    res.json(rows || []);
  });
});

// GET all staff users (users with role='staff')
router.get('/users/staff', (req, res) => {
  db.query("SELECT id, name, email, role FROM users WHERE role = 'staff' ORDER BY name", (err, rows) => {
    if (err) {
      console.error('❌ Get staff users error:', err);
      return res.status(500).json({ error: 'Unable to fetch staff users.' });
    }
    res.json(rows || []);
  });
});

// GET user by ID
router.get('/user/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT id, name, email, role FROM users WHERE id = ?', [id], (err, rows) => {
    if (err) {
      console.error('❌ Get user error:', err);
      return res.status(500).json({ error: 'Unable to fetch user.' });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(rows[0]);
  });
});

// PUT: Update user profile
router.put('/user/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, password, currentPassword } = req.body;

  // First verify current password if changing password
  if (password) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change password.' });
    }

    db.query('SELECT password FROM users WHERE id = ?', [id], (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (!bcrypt.compareSync(currentPassword, rows[0].password)) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      // Password is correct, proceed with update
      const hashedPassword = bcrypt.hashSync(password, 10);
      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email) {
        updates.push('email = ?');
        values.push(email);
      }
      updates.push('password = ?');
      values.push(hashedPassword);
      values.push(id);

      db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        (updateErr) => {
          if (updateErr) {
            if (updateErr.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ error: 'Email already exists.' });
            }
            console.error('❌ Update user error:', updateErr);
            return res.status(500).json({ error: 'Unable to update user.' });
          }
          auditLog(parseInt(id), 'Updated password and profile');
          res.json({ message: 'Profile updated successfully.' });
        }
      );
    });
  } else {
    // No password change, just update name/email
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);

    db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values,
      (updateErr) => {
        if (updateErr) {
          if (updateErr.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists.' });
          }
          console.error('❌ Update user error:', updateErr);
          return res.status(500).json({ error: 'Unable to update user.' });
        }
        auditLog(parseInt(id), `Updated profile: ${updates.join(', ')}`);
        res.json({ message: 'Profile updated successfully.' });
      }
    );
  }
});

// DELETE: Delete user account
router.delete('/user/:id', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to delete account.' });
  }

  // Verify password
  db.query('SELECT password FROM users WHERE id = ?', [id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!bcrypt.compareSync(password, rows[0].password)) {
      return res.status(401).json({ error: 'Password is incorrect.' });
    }

    // Delete user
    db.query('DELETE FROM users WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) {
        console.error('❌ Delete user error:', deleteErr);
        return res.status(500).json({ error: 'Unable to delete user.' });
      }
      auditLog(parseInt(id), 'Deleted user account');
      res.json({ message: 'Account deleted successfully.' });
    });
  });
});

export default router;
