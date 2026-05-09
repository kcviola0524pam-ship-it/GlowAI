import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Appointment ${action} error:`, err);
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

// Enhanced helper function to format date to YYYY-MM-DD (avoids unwanted date shifts)
const formatDate = (dateInput) => {
  if (!dateInput) return null;
  
  // If already in YYYY-MM-DD format, return as is
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // If contains time component, extract date part
  if (typeof dateInput === 'string' && dateInput.includes('T')) {
    return dateInput.split('T')[0];
  }
  
  // Convert to Date object and format using LOCAL date parts.
  // Using local getters avoids the "minus one day" issue when the incoming
  // value is a JS Date created in the user's local timezone.
  const date = new Date(dateInput);
  
  // Use local methods so that the calendar day the user picked is preserved.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const isAppointmentDateTimeInPast = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr);
  if (!dateMatch || !timeMatch) return false;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);

  const appointmentDateTime = new Date(year, month, day, hour, minute, second, 0);
  if (Number.isNaN(appointmentDateTime.getTime())) return false;

  return appointmentDateTime.getTime() < Date.now();
};

// Increment customer.visits ONLY when the customer is linked to a user with role='customer'
// Requires BOTH customer_id and customer.user_id (no name matching).
const incrementCustomerVisitsIfLinkedCustomerUser = (customerId, reason = 'Completed appointment') => {
  if (!customerId) return;

  db.query('SHOW COLUMNS FROM customer LIKE "user_id"', (colErr, colRows) => {
    if (colErr) {
      console.warn('⚠️ Unable to check customer.user_id column:', colErr.message || colErr);
      return;
    }

    if (!colRows || colRows.length === 0) {
      return;
    }

    db.query(
      `UPDATE customer c
       INNER JOIN users u ON u.id = c.user_id
       SET c.visits = COALESCE(c.visits, 0) + 1
       WHERE c.id = ? AND u.role = 'customer'`,
      [customerId],
      (updErr, updRes) => {
        if (updErr) {
          console.warn('⚠️ Failed to increment customer visits:', updErr.message || updErr);
          return;
        }
        if (updRes.affectedRows > 0) {
          console.log(`✅ Incremented visits for customer_id=${customerId} (${reason})`);
        }
      }
    );
  });
};

// Helper function to auto-update past scheduled appointments to Cancelled
function updatePastAppointmentsToNoShow() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const now = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM

  // Update appointments that are past their date/time and still scheduled
  db.query(
    `UPDATE appointments 
     SET status = 'Cancelled', updated_at = NOW()
     WHERE status = 'Scheduled' 
     AND (
       appointment_date < ? 
       OR (appointment_date = ? AND appointment_time < ?)
     )`,
    [today, today, now],
    (err, result) => {
      if (err) {
        console.error('Error updating past appointments to Cancelled:', err);
      } else if (result.affectedRows > 0) {
        console.log(`Updated ${result.affectedRows} past appointments to Cancelled`);

        // Disable booking for customers with No-Show appointments
        // First check if booking_disabled column exists
        db.query('SHOW COLUMNS FROM customer LIKE "booking_disabled"', (colErr, colRows) => {
          if (colErr) {
            console.error('Error checking booking_disabled column:', colErr);
            return;
          }

          if (colRows && colRows.length > 0) {
            // Column exists, update it
            db.query(
              `UPDATE customer c
               INNER JOIN appointments a ON c.id = a.customer_id
               SET c.booking_disabled = TRUE
               WHERE a.status = 'No-Show' 
               AND (c.booking_disabled IS NULL OR c.booking_disabled = FALSE)`,
              (updateErr) => {
                if (updateErr) {
                  console.error('Error disabling booking for No-Show customers:', updateErr);
                }
              }
            );
          }
        });
      }
    }
  );
}

// Run the update function periodically (every time appointments are fetched)
updatePastAppointmentsToNoShow();

// Also run it every 5 minutes
setInterval(updatePastAppointmentsToNoShow, 5 * 60 * 1000);

// GET all appointments
router.get('/', (req, res) => {
  // Update past appointments before fetching
  updatePastAppointmentsToNoShow();

  const sql = `
    SELECT 
      a.*, 
      a.staff_id,
      c.name as customer_name, 
      s.name as staff_name
    FROM appointments a
    LEFT JOIN customer c ON a.customer_id = c.id
    LEFT JOIN staff s ON a.staff_id = s.id
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    res.json(results);
  });
});

// GET appointments by customer_id
router.get('/customer/:customerId', (req, res) => {
  const { customerId } = req.params;

  const sql = `
    SELECT 
      a.*, 
      s.name as staff_name,
      a.staff_id
    FROM appointments a
    LEFT JOIN staff s ON a.staff_id = s.id
    WHERE a.customer_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;

  db.query(sql, [customerId], (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    res.json(results);
  });
});

// GET appointments by user_id (for customer portal)
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  // First get customer_id from user_id
  db.query('SHOW COLUMNS FROM customer LIKE "user_id"', (colErr, colRows) => {
    if (colRows && colRows.length > 0) {
      // user_id column exists
      db.query('SELECT id FROM customer WHERE user_id = ?', [userId], (userErr, userRows) => {
        if (userErr || !userRows || userRows.length === 0) {
          return res.status(404).json({ error: 'Customer not found' });
        }

        const customerId = userRows[0].id;

        const sql = `
          SELECT 
            a.*, 
            s.name as staff_name,
            a.staff_id
          FROM appointments a
          LEFT JOIN staff s ON a.staff_id = s.id
          WHERE a.customer_id = ?
          ORDER BY a.appointment_date ASC, a.appointment_time ASC
        `;

        db.query(sql, [customerId], (err, results) => {
          if (err) return handleDbError(res, err, 'GET');
          res.json(results || []);
        });
      });
    } else {
      // user_id column doesn't exist, get user name and match by name
      db.query('SELECT name FROM users WHERE id = ?', [userId], (userErr, userRows) => {
        if (userErr || !userRows || userRows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const userName = userRows[0].name;

        db.query('SELECT id FROM customer WHERE name = ?', [userName], (custErr, custRows) => {
          if (custErr || !custRows || custRows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
          }

          const customerId = custRows[0].id;

          const sql = `
            SELECT 
              a.*, 
              s.name as staff_name,
              a.staff_id
            FROM appointments a
            LEFT JOIN staff s ON a.staff_id = s.id
            WHERE a.customer_id = ?
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
          `;

          db.query(sql, [customerId], (err, results) => {
            if (err) return handleDbError(res, err, 'GET');
            res.json(results || []);
          });
        });
      });
    }
  });
});

// GET single appointment
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      a.*, 
      c.name as customer_name, 
      s.name as staff_name
    FROM appointments a
    LEFT JOIN customer c ON a.customer_id = c.id
    LEFT JOIN staff s ON a.staff_id = s.id
    WHERE a.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) return handleDbError(res, err, 'GET');
    if (results.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json(results[0]);
  });
});

// POST: Create new appointment
router.post('/', (req, res) => {
  let { customer_id, staff_id, service, appointment_date, appointment_time, notes, status = 'Scheduled', userId } = req.body;

  // Format appointment_date to prevent timezone issues
  appointment_date = formatDate(appointment_date);

  if (!customer_id || !service || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Customer ID, service, date, and time are required' });
  }

  // Validate appointment time is between 8am and 8pm
  const timeParts = appointment_time.split(':');
  const hour = parseInt(timeParts[0], 10);
  if (hour < 8 || hour >= 20) {
    return res.status(400).json({ error: 'Appointment time must be between 8:00 AM and 8:00 PM' });
  }

  if (isAppointmentDateTimeInPast(appointment_date, appointment_time)) {
    return res.status(400).json({ error: 'Cannot book an appointment in the past' });
  }

  // Check if customer has booking disabled
  db.query('SELECT booking_disabled FROM customer WHERE id = ?', [customer_id], (checkErr, checkRows) => {
    if (checkErr) return handleDbError(res, checkErr, 'POST');
    if (checkRows.length === 0) return res.status(404).json({ error: 'Customer not found' });

    if (checkRows[0].booking_disabled) {
      return res.status(403).json({
        error: 'Booking is temporarily disabled. Please contact the admin to re-enable booking.'
      });
    }

    // Check for duplicate appointments: same time, date, service, and staff
    let checkDuplicateSql;
    let checkParams;

    if (staff_id) {
      // If staff is specified, check for conflicts with that specific staff
      checkDuplicateSql = `
        SELECT id FROM appointments 
        WHERE appointment_date = ? 
        AND appointment_time = ? 
        AND service = ? 
        AND staff_id = ? 
        AND status != 'Cancelled'
      `;
      checkParams = [appointment_date, appointment_time, service, staff_id];
    } else {
      // If no staff specified, check for any appointment at that time/date/service
      checkDuplicateSql = `
        SELECT id FROM appointments 
        WHERE appointment_date = ? 
        AND appointment_time = ? 
        AND service = ? 
        AND status != 'Cancelled'
      `;
      checkParams = [appointment_date, appointment_time, service];
    }

    db.query(checkDuplicateSql, checkParams, (checkErr, checkResults) => {
      if (checkErr) return handleDbError(res, checkErr, 'POST');

      // If duplicate found
      if (checkResults.length > 0) {
        if (staff_id) {
          return res.status(409).json({
            error: 'An appointment already exists for this staff member at the selected date and time. Please choose a different time or staff member.'
          });
        } else {
          return res.status(409).json({
            error: 'An appointment already exists for this service at the selected date and time. Please choose a different time or service.'
          });
        }
      }

      // No duplicate found, proceed with insertion
      const sql = `
        INSERT INTO appointments (customer_id, staff_id, service, appointment_date, appointment_time, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [customer_id, staff_id || null, service, appointment_date, appointment_time, notes || '', status],
        (err, result) => {
          if (err) return handleDbError(res, err, 'POST');

          auditLog(userId, `Created appointment: ${service} on ${appointment_date} at ${appointment_time}`);

          res.status(201).json({
            id: result.insertId,
            customer_id,
            staff_id,
            service,
            appointment_date,
            appointment_time,
            notes: notes || '',
            status,
          });
        }
      );
    });
  });
});

// PUT: Update appointment
router.put('/:id', (req, res) => {
  const { id } = req.params;
  let { customer_id, staff_id, service, appointment_date, appointment_time, notes, status, userId } = req.body;

  // Format appointment_date ONLY if present, and avoid changing it when it's already YYYY-MM-DD.
  // This prevents unintended date shifts when only the status is being updated.
  if (appointment_date) {
    appointment_date = formatDate(appointment_date);
  }

  // Validate appointment time is between 8am and 8pm (if time is being updated)
  if (appointment_time) {
    const timeParts = appointment_time.split(':');
    const hour = parseInt(timeParts[0], 10);
    if (hour < 8 || hour >= 20) {
      return res.status(400).json({ error: 'Appointment time must be between 8:00 AM and 8:00 PM' });
    }
  }

  // Fetch previous status first so we only count a visit when transitioning -> Completed
  db.query('SELECT status FROM appointments WHERE id = ?', [id], (prevErr, prevRows) => {
    if (prevErr) return handleDbError(res, prevErr, 'PUT');
    if (!prevRows || prevRows.length === 0) return res.status(404).json({ error: 'Appointment not found' });

    const prevStatus = prevRows[0]?.status;

    // Check for duplicate appointments (excluding the current appointment being updated).
    // If no new date/time was sent (e.g. only status changed), use the existing values from DB to avoid
    // any accidental date mutation.
    let checkDuplicateSql;
    let checkParams;

    // If date/time not provided in the body, load them from DB and then perform checks + update
    const proceedWithUpdate = (finalDate, finalTime) => {
      if (!finalDate || !finalTime) {
        return res.status(400).json({ error: 'Appointment date and time are required' });
      }

      if (staff_id) {
      // If staff is specified, check for conflicts with that specific staff
      checkDuplicateSql = `
        SELECT id FROM appointments 
        WHERE appointment_date = ? 
        AND appointment_time = ? 
        AND service = ? 
        AND staff_id = ? 
        AND status != 'Cancelled' 
        AND id != ?
      `;
      checkParams = [finalDate, finalTime, service, staff_id, id];
    } else {
      // If no staff specified, check for any appointment at that time/date/service
      checkDuplicateSql = `
        SELECT id FROM appointments 
        WHERE appointment_date = ? 
        AND appointment_time = ? 
        AND service = ? 
        AND status != 'Cancelled' 
        AND id != ?
      `;
      checkParams = [finalDate, finalTime, service, id];
    }

      db.query(checkDuplicateSql, checkParams, (checkErr, checkResults) => {
        if (checkErr) return handleDbError(res, checkErr, 'PUT');

        // If duplicate found
        if (checkResults.length > 0) {
          if (staff_id) {
            return res.status(409).json({
              error: 'An appointment already exists for this staff member at the selected date and time. Please choose a different time or staff member.'
            });
          } else {
            return res.status(409).json({
              error: 'An appointment already exists for this service at the selected date and time. Please choose a different time or service.'
            });
          }
        }

        // No duplicate found, proceed with update
        const sql = `
        UPDATE appointments 
        SET customer_id = ?, 
            staff_id = ?, 
            service = ?, 
            appointment_date = ?, 
            appointment_time = ?, 
            notes = ?, 
            status = ?
        WHERE id = ?
        `;

        db.query(
          sql,
          [customer_id, staff_id || null, service, finalDate, finalTime, notes || '', status, id],
          (err) => {
            if (err) return handleDbError(res, err, 'PUT');

            auditLog(userId, `Updated appointment: ${service} (ID: ${id}) - Status: ${status}`);

            // Increment visits ONLY when status transitions into Completed
            if (customer_id && status === 'Completed' && prevStatus !== 'Completed') {
              incrementCustomerVisitsIfLinkedCustomerUser(customer_id, `Completed appointment ID ${id}`);
            }

            // If appointment is completed, update customer's preferred service based on booking history
            if (status === 'Completed' && customer_id) {
              // Get the service category from services table
              db.query(
                'SELECT category FROM services WHERE name = ? AND is_active = TRUE',
                [service],
                (serviceErr, serviceResults) => {
                  if (!serviceErr && serviceResults.length > 0) {
                    const serviceCategory = serviceResults[0].category;

                    // Get most booked category for this customer
                    db.query(
                      `SELECT s.category, COUNT(*) as frequency 
                       FROM appointments a
                       LEFT JOIN services s ON a.service = s.name
                       WHERE a.customer_id = ? AND a.status = 'Completed'
                       GROUP BY s.category
                       ORDER BY frequency DESC
                       LIMIT 1`,
                      [customer_id],
                      (categoryErr, categoryResults) => {
                        if (!categoryErr && categoryResults.length > 0) {
                          const mostBookedCategory = categoryResults[0].category || serviceCategory;

                          // Update customer's preferred service
                          db.query(
                            'UPDATE customer SET service = ? WHERE id = ?',
                            [mostBookedCategory, customer_id],
                            () => {} // Silent update
                          );
                        }
                      }
                    );
                  }
                }
              );
            }

            res.json({ message: 'Appointment updated' });
          }
        );
      });
    };

    // If date or time missing from body, fetch them from DB so we don't accidentally
    // shift the stored values when only status is being changed.
    if (!appointment_date || !appointment_time) {
      db.query(
        'SELECT appointment_date, appointment_time FROM appointments WHERE id = ?',
        [id],
        (dateErr, dateRows) => {
          if (dateErr) return handleDbError(res, dateErr, 'PUT');
          if (!dateRows || dateRows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
          }

          const current = dateRows[0];
          const finalDate = appointment_date || formatDate(current.appointment_date);
          const finalTime = appointment_time || current.appointment_time;

          proceedWithUpdate(finalDate, finalTime);
        }
      );
    } else {
      // We have both date and time in the request; proceed as normal
      proceedWithUpdate(appointment_date, appointment_time);
    }
  });
});

// DELETE: Remove appointment
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  // Get appointment details before deleting
  db.query('SELECT service, appointment_date, appointment_time FROM appointments WHERE id = ?', [id], (err, rows) => {
    if (err) return handleDbError(res, err, 'DELETE');
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });

    const appointment = rows[0];

    db.query('DELETE FROM appointments WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) return handleDbError(res, deleteErr, 'DELETE');

      auditLog(userId, `Deleted appointment: ${appointment.service} on ${appointment.appointment_date} (ID: ${id})`);

      res.json({ message: 'Appointment deleted' });
    });
  });
});

export default router;