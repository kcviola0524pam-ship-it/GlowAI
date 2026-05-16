import express from 'express';
import db from '../config/db.js';
import { getGroqResponse, formatMessagesForGroq } from '../services/groq.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Chat ${action} error:`, {
    code: err.code,
    errno: err.errno,
    sqlMessage: err.sqlMessage,
    message: err.message,
    sql: err.sql
  });
  
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({
      error: `Database table does not exist. Please run the ai_chat_schema.sql file to create it.`,
      details: err.sqlMessage,
      action: action
    });
  }
  
  res.status(500).json({
    error: `Database error (${action})`,
    details: err.sqlMessage || err.message,
    code: err.code
  });
};

/**
 * Get or create chat session for user
 * Returns the most recent active session or creates a new one
 */
router.get('/session/:userId', (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Get the most recent session for this user
  db.query(
    `SELECT id, user_id, customer_id, context_summary, created_at, updated_at
     FROM ai_chat_sessions
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId],
    (err, sessions) => {
      if (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return res.status(500).json({
            error: 'Chat sessions table does not exist. Please run the ai_chat_schema.sql file to create it.'
          });
        }
        return handleDbError(res, err, 'GET session');
      }

      let sessionId;
      let session;

      if (sessions && sessions.length > 0) {
        // Use existing session
        session = sessions[0];
        sessionId = session.id;

        // Get messages for this session
        db.query(
          `SELECT id, role, content, created_at
           FROM ai_chat_messages
           WHERE session_id = ? AND user_id = ?
           ORDER BY created_at ASC`,
          [sessionId, userId],
          (msgErr, messages) => {
            if (msgErr && msgErr.code !== 'ER_NO_SUCH_TABLE') {
              console.error('Error fetching messages:', msgErr);
            }

            const formattedMessages = (messages || []).map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.created_at
            }));

            // If no messages, add initial greeting
            if (formattedMessages.length === 0) {
              formattedMessages.push({
                role: 'assistant',
                content: "Hi! I'm your AI spa assistant. How can I help you today?",
                timestamp: new Date().toISOString()
              });
            }

            res.json({
              id: sessionId,
              messages: formattedMessages,
              contextSummary: session.context_summary || null
            });
          }
        );
      } else {
        // Create new session
        db.query(
          `INSERT INTO ai_chat_sessions (user_id, customer_id, context_summary)
           VALUES (?, NULL, NULL)`,
          [userId],
          (insertErr, result) => {
            if (insertErr) {
              if (insertErr.code === 'ER_NO_SUCH_TABLE') {
                return res.status(500).json({
                  error: 'Chat sessions table does not exist. Please run the ai_chat_schema.sql file to create it.'
                });
              }
              return handleDbError(res, insertErr, 'CREATE session');
            }

            sessionId = result.insertId;

            // Create initial greeting message
            const initialMessage = {
              role: 'assistant',
              content: "Hi! I'm your AI spa assistant. How can I help you today?",
              timestamp: new Date().toISOString()
            };

            db.query(
              `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
               VALUES (?, ?, 'assistant', ?)`,
              [sessionId, userId, initialMessage.content],
              (msgErr) => {
                if (msgErr && msgErr.code !== 'ER_NO_SUCH_TABLE') {
                  console.error('Error creating initial message:', msgErr);
                }

                res.json({
                  id: sessionId,
                  messages: [initialMessage],
                  contextSummary: null
                });
              }
            );
          }
        );
      }
    }
  );
});

/**
 * Send a message and get AI response
 */
router.post('/message', async (req, res) => {
  const { sessionId, userId, message } = req.body;

  if (!sessionId || !userId || !message) {
    return res.status(400).json({ error: 'Session ID, User ID, and message are required' });
  }

  try {
    // Verify session belongs to user
    db.query(
      'SELECT * FROM ai_chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId],
      async (sessionErr, sessions) => {
        if (sessionErr) {
          return handleDbError(res, sessionErr, 'GET session');
        }

        if (sessions.length === 0) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions[0];

        // Save user message to database
        db.query(
          `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
           VALUES (?, ?, 'user', ?)`,
          [sessionId, userId, message],
          async (msgErr) => {
            if (msgErr && msgErr.code !== 'ER_NO_SUCH_TABLE') {
              return handleDbError(res, msgErr, 'SAVE user message');
            }

            // Get conversation history
            db.query(
              `SELECT role, content FROM ai_chat_messages
               WHERE session_id = ? AND user_id = ?
               ORDER BY created_at ASC`,
              [sessionId, userId],
              async (historyErr, historyMessages) => {
                if (historyErr && historyErr.code !== 'ER_NO_SUCH_TABLE') {
                  return handleDbError(res, historyErr, 'GET history');
                }

                // Get user information
                db.query(
                  'SELECT id, name, email, role FROM users WHERE id = ?',
                  [userId],
                  async (userErr, users) => {
                    if (userErr) {
                      return handleDbError(res, userErr, 'GET user');
                    }

                    const userInfo = users[0] || null;

                    // Get customer information if available
                    let customerId = session.customer_id;

                    // Helper function to fetch customer data
                    const fetchCustomerData = (callback) => {
                      if (!customerId && userInfo) {
                        // Try to find customer by user_id
                        db.query(
                          'SELECT id FROM customer WHERE user_id = ? LIMIT 1',
                          [userId],
                          (custErr, customers) => {
                            if (!custErr && customers && customers.length > 0) {
                              customerId = customers[0].id;
                              getCustomerDetails(customerId, callback);
                            } else {
                              callback(null, null);
                            }
                          }
                        );
                      } else if (customerId) {
                        getCustomerDetails(customerId, callback);
                      } else {
                        callback(null, null);
                      }
                    };

                    // Helper function to get customer details and analysis
                    const getCustomerDetails = (custId, callback) => {
                      db.query(
                        'SELECT * FROM customer WHERE id = ?',
                        [custId],
                        (custErr, customers) => {
                          let customerInfo = null;
                          if (!custErr && customers && customers.length > 0) {
                            customerInfo = customers[0];
                          }

                          // Get customer analysis
                          db.query(
                            `SELECT preferred_categories, preferred_services, average_price_range,
                                    average_duration, gender_preference, booking_frequency
                             FROM ai_customer_analysis
                             WHERE customer_id = ?`,
                            [custId],
                            (analysisErr, analyses) => {
                              let customerAnalysis = null;
                              if (!analysisErr && analyses && analyses.length > 0) {
                                const analysis = analyses[0];
                                try {
                                  customerAnalysis = {
                                    preferred_categories: JSON.parse(analysis.preferred_categories || '{}'),
                                    preferred_services: JSON.parse(analysis.preferred_services || '{}'),
                                    average_price_range: analysis.average_price_range,
                                    average_duration: analysis.average_duration,
                                    gender_preference: analysis.gender_preference,
                                    booking_frequency: analysis.booking_frequency
                                  };
                                } catch (parseErr) {
                                  console.error('Error parsing customer analysis:', parseErr);
                                }
                              }
                              callback(customerInfo, customerAnalysis);
                            }
                          );
                        }
                      );
                    };

                    // Fetch customer data, then get system data and process message
                    const isAdmin = userInfo && userInfo.role === 'admin';
                    
                    fetchCustomerData((customerInfo, customerAnalysis) => {
                      if (isAdmin) {
                        // For admin, fetch business analytics data
                        fetchBusinessData((businessData) => {
                          fetchSystemData(userId, customerId, (systemData) => {
                            processMessageWithGroq(
                              res,
                              sessionId,
                              userId,
                              message,
                              historyMessages || [],
                              {
                                userInfo,
                                customerInfo,
                                customerAnalysis,
                                isAdmin: true,
                                businessData,
                                ...systemData
                              }
                            );
                          });
                        });
                      } else {
                        // For regular users, use standard data
                        fetchSystemData(userId, customerId, (systemData) => {
                          processMessageWithGroq(
                            res,
                            sessionId,
                            userId,
                            message,
                            historyMessages || [],
                            {
                              userInfo,
                              customerInfo,
                              customerAnalysis,
                              isAdmin: false,
                              ...systemData
                            }
                          );
                        });
                      }
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Error in chat message handler:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Fetch system data (services, appointments, staff, etc.)
 */
function fetchSystemData(userId, customerId, callback) {
  const systemData = {
    services: [],
    appointments: [],
    staff: []
  };

  // Get available services
  db.query(
    'SELECT * FROM services WHERE is_active = TRUE ORDER BY name LIMIT 50',
    (serviceErr, services) => {
      if (!serviceErr && services) {
        systemData.services = services;
      }

      // Get available staff
      db.query(
        'SELECT id, name FROM staff ORDER BY name',
        (staffErr, staff) => {
          if (!staffErr && staff) {
            systemData.staff = staff;
          }

          // Get recent appointments if customer ID is available
          if (customerId) {
            db.query(
              `SELECT service, appointment_date, status
               FROM appointments
               WHERE customer_id = ?
               ORDER BY appointment_date DESC
               LIMIT 10`,
              [customerId],
              (apptErr, appointments) => {
                if (!apptErr && appointments) {
                  systemData.appointments = appointments;
                }
                callback(systemData);
              }
            );
          } else {
            callback(systemData);
          }
        }
      );
    }
  );
}

/**
 * Fetch business analytics data for admin users
 */
function fetchBusinessData(callback) {
  const businessData = {
    salesData: {},
    appointmentData: {},
    customerData: {},
    inventoryData: {},
    servicePerformance: {},
    staffPerformance: {},
    revenueTrends: {}
  };

  let completedQueries = 0;
  const totalQueries = 7;

  const checkComplete = () => {
    completedQueries++;
    if (completedQueries === totalQueries) {
      callback(businessData);
    }
  };

  // 1. Sales Data (last 30 days)
  db.query(
    `SELECT 
      SUM(total_amount) as totalRevenue,
      COUNT(*) as totalTransactions,
      AVG(total_amount) as averageTransaction
     FROM sales
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND status = 'Completed'`,
    (err, results) => {
      if (!err && results && results.length > 0) {
        const sales = results[0];
        businessData.salesData = {
          totalRevenue: parseFloat(sales.totalRevenue || 0).toFixed(2),
          totalTransactions: parseInt(sales.totalTransactions || 0),
          averageTransaction: parseFloat(sales.averageTransaction || 0).toFixed(2)
        };
      }
      checkComplete();
    }
  );

  // 2. Appointment Data
  db.query(
    `SELECT 
      COUNT(*) as totalAppointments,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedAppointments,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledAppointments,
      SUM(CASE WHEN status = 'No-Show' THEN 1 ELSE 0 END) as noShows
     FROM appointments
     WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    (err, results) => {
      if (!err && results && results.length > 0) {
        const apts = results[0];
        const total = parseInt(apts.totalAppointments || 0);
        const noShows = parseInt(apts.noShows || 0);
        businessData.appointmentData = {
          totalAppointments: total,
          completedAppointments: parseInt(apts.completedAppointments || 0),
          cancelledAppointments: parseInt(apts.cancelledAppointments || 0),
          noShowRate: total > 0 ? ((noShows / total) * 100).toFixed(1) : '0.0'
        };
      }
      checkComplete();
    }
  );

  // 3. Peak Hours
  db.query(
    `SELECT HOUR(created_at) as hour, COUNT(*) as count
     FROM sales
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND status = 'Completed'
     GROUP BY HOUR(created_at)
     ORDER BY count DESC
     LIMIT 5`,
    (err, results) => {
      if (!err && results) {
        businessData.appointmentData.peakHours = results.map(r => `${r.hour}:00`);
      }
      checkComplete();
    }
  );

  // 4. Customer Data
  db.query(
    `SELECT 
      COUNT(*) as totalCustomers,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as activeCustomers,
      SUM(CASE WHEN walked_in >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as newCustomers,
      AVG(visits) as averageVisits
     FROM customer`,
    (err, results) => {
      if (!err && results && results.length > 0) {
        const cust = results[0];
        const total = parseInt(cust.totalCustomers || 0);
        const active = parseInt(cust.activeCustomers || 0);
        businessData.customerData = {
          totalCustomers: total,
          activeCustomers: active,
          newCustomers: parseInt(cust.newCustomers || 0),
          averageVisits: parseFloat(cust.averageVisits || 0).toFixed(1),
          retentionRate: total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
        };
      }
      checkComplete();
    }
  );

  // 5. Inventory Data
  db.query(
    `SELECT 
      COUNT(*) as totalProducts,
      SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as lowStockItems,
      SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as outOfStockItems
     FROM products`,
    (err, results) => {
      if (!err && results && results.length > 0) {
        const inv = results[0];
        businessData.inventoryData = {
          totalProducts: parseInt(inv.totalProducts || 0),
          lowStockItems: parseInt(inv.lowStockItems || 0),
          outOfStockItems: parseInt(inv.outOfStockItems || 0)
        };
      }
      checkComplete();
    }
  );

  // 6. Service Performance
  db.query(
    `SELECT 
      a.service,
      COUNT(*) as bookings,
      SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) as completed
     FROM appointments a
     WHERE a.appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY a.service
     ORDER BY bookings DESC
     LIMIT 10`,
    (err, results) => {
      if (!err && results) {
        businessData.servicePerformance.topServices = results.map(r => ({
          name: r.service,
          bookings: parseInt(r.bookings || 0),
          completed: parseInt(r.completed || 0)
        }));
      }
      checkComplete();
    }
  );

  // 7. Revenue Trends
  db.query(
    `SELECT 
      AVG(daily_revenue) as dailyAverage,
      AVG(weekly_revenue) as weeklyAverage,
      AVG(monthly_revenue) as monthlyAverage
     FROM (
       SELECT 
         DATE(created_at) as date,
         SUM(total_amount) as daily_revenue
       FROM sales
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
         AND status = 'Completed'
       GROUP BY DATE(created_at)
     ) as daily
     CROSS JOIN (
       SELECT 
         WEEK(created_at) as week,
         SUM(total_amount) as weekly_revenue
       FROM sales
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
         AND status = 'Completed'
       GROUP BY WEEK(created_at)
     ) as weekly
     CROSS JOIN (
       SELECT 
         MONTH(created_at) as month,
         SUM(total_amount) as monthly_revenue
       FROM sales
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         AND status = 'Completed'
       GROUP BY MONTH(created_at)
     ) as monthly`,
    (err, results) => {
      if (!err && results && results.length > 0) {
        const trends = results[0];
        businessData.revenueTrends = {
          dailyAverage: parseFloat(trends.dailyAverage || 0).toFixed(2),
          weeklyAverage: parseFloat(trends.weeklyAverage || 0).toFixed(2),
          monthlyAverage: parseFloat(trends.monthlyAverage || 0).toFixed(2)
        };
      }
      checkComplete();
    }
  );
}

/**
 * Extract booking information from AI response
 */
function extractBookingInfo(aiResponse) {
  try {
    // Look for JSON booking action in the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*"action"\s*:\s*"book_appointment"[\s\S]*\}/);
    if (jsonMatch) {
      const bookingData = JSON.parse(jsonMatch[0]);
      if (bookingData.action === 'book_appointment') {
        return {
          service: bookingData.service,
          date: bookingData.date,
          time: bookingData.time,
          staff_id: bookingData.staff_id || null,
          notes: bookingData.notes || ''
        };
      }
    }
  } catch (err) {
    console.error('Error extracting booking info:', err);
  }
  return null;
}

/**
 * Create appointment booking
 */
function createAppointmentBooking(customerId, bookingInfo, userId, callback) {
  const { service, date, time, staff_id, notes } = bookingInfo;

  // Validate required fields
  if (!service || !date || !time) {
    return callback({ error: 'Missing required booking information: service, date, and time are required.' });
  }

  // Validate appointment time is between 8am and 8pm
  const timeParts = time.split(':');
  const hour = parseInt(timeParts[0], 10);
  if (hour < 8 || hour >= 20) {
    return callback({ error: 'Appointment time must be between 8:00 AM and 8:00 PM' });
  }

  // Format date to YYYY-MM-DD
  const formatDate = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    if (typeof dateInput === 'string' && dateInput.includes('T')) {
      return dateInput.split('T')[0];
    }
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formattedDate = formatDate(date);

  // Check if customer has booking disabled
  db.query('SELECT booking_disabled FROM customer WHERE id = ?', [customerId], (checkErr, checkRows) => {
    if (checkErr) {
      return callback({ error: 'Error checking customer status' });
    }
    if (checkRows.length === 0) {
      return callback({ error: 'Customer not found' });
    }

    if (checkRows[0].booking_disabled) {
      return callback({ error: 'Booking is temporarily disabled. Please contact the admin to re-enable booking.' });
    }

    // Check for duplicate appointments
    let checkDuplicateSql;
    let checkParams;

    if (staff_id) {
      checkDuplicateSql = `
        SELECT id FROM appointments 
        WHERE appointment_date = ? 
        AND appointment_time = ? 
        AND service = ? 
        AND staff_id = ? 
        AND status != 'Cancelled'
      `;
      checkParams = [formattedDate, time, service, staff_id];
    } else {
      checkDuplicateSql = `
        SELECT id FROM appointments 
        WHERE appointment_date = ? 
        AND appointment_time = ? 
        AND service = ? 
        AND status != 'Cancelled'
      `;
      checkParams = [formattedDate, time, service];
    }

    db.query(checkDuplicateSql, checkParams, (checkErr, checkResults) => {
      if (checkErr) {
        return callback({ error: 'Error checking for duplicate appointments' });
      }

      if (checkResults.length > 0) {
        if (staff_id) {
          return callback({ error: 'An appointment already exists for this staff member at the selected date and time. Please choose a different time or staff member.' });
        } else {
          return callback({ error: 'An appointment already exists for this service at the selected date and time. Please choose a different time or service.' });
        }
      }

      // Verify service exists and is active
      db.query('SELECT id, name FROM services WHERE name = ? AND is_active = TRUE', [service], (serviceErr, serviceRows) => {
        if (serviceErr) {
          return callback({ error: 'Error verifying service' });
        }
        if (serviceRows.length === 0) {
          return callback({ error: `Service "${service}" not found or is not available. Please choose from available services.` });
        }

        // Create the appointment
        const sql = `
          INSERT INTO appointments (customer_id, staff_id, service, appointment_date, appointment_time, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')
        `;

        db.query(
          sql,
          [customerId, staff_id || null, service, formattedDate, time, notes || ''],
          (err, result) => {
            if (err) {
              console.error('Error creating appointment:', err);
              return callback({ error: 'Failed to create appointment. Please try again.' });
            }

            // Log audit trail
            db.query(
              'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
              [userId, `Created appointment via AI chat: ${service} on ${formattedDate} at ${time}`],
              () => {}
            );

            callback(null, {
              id: result.insertId,
              customer_id: customerId,
              staff_id: staff_id || null,
              service,
              appointment_date: formattedDate,
              appointment_time: time,
              notes: notes || '',
              status: 'Scheduled'
            });
          }
        );
      });
    });
  });
}

/**
 * Process message with Groq and save response
 */
async function processMessageWithGroq(res, sessionId, userId, userMessage, historyMessages, systemContext) {
  try {
    const conversationHistory = formatMessagesForGroq(
      historyMessages.filter(msg => msg.role !== 'system'),
      20
    );

    const messagesForGroq = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    const aiResponse = await getGroqResponse(messagesForGroq, systemContext);

    // Check if AI response contains booking action (only for non-admin users)
    if (!systemContext.isAdmin && systemContext.customerInfo) {
      const bookingInfo = extractBookingInfo(aiResponse);
      
      if (bookingInfo) {
        // Create the appointment
        createAppointmentBooking(
          systemContext.customerInfo.id,
          bookingInfo,
          userId,
          (error, appointment) => {
            if (error) {
              // Booking failed, send error message
              const errorMessage = `Sorry, I couldn't complete the booking: ${error.error}. Please try again with different details.`;
              
              db.query(
                `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
                 VALUES (?, ?, 'assistant', ?)`,
                [sessionId, userId, errorMessage],
                (saveErr) => {
                  if (saveErr && saveErr.code !== 'ER_NO_SUCH_TABLE') {
                    console.error('Error saving error message:', saveErr);
                  }
                }
              );

              res.json({
                message: errorMessage,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                bookingError: true
              });
            } else {
              // Booking successful
              const successMessage = `✅ Appointment booked successfully!\n\nService: ${appointment.service}\nDate: ${appointment.appointment_date}\nTime: ${appointment.appointment_time}\nStatus: Scheduled\n\nYour appointment has been confirmed and will appear in your appointments list.`;
              
              db.query(
                `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
                 VALUES (?, ?, 'assistant', ?)`,
                [sessionId, userId, successMessage],
                (saveErr) => {
                  if (saveErr && saveErr.code !== 'ER_NO_SUCH_TABLE') {
                    console.error('Error saving success message:', saveErr);
                  }
                }
              );

              res.json({
                message: successMessage,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                appointment: appointment,
                bookingSuccess: true
              });
            }
          }
        );
        return; // Exit early, booking handled
      }
    }

    // No booking action, proceed with normal response
    // Save AI response to database
    db.query(
      `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
       VALUES (?, ?, 'assistant', ?)`,
      [sessionId, userId, aiResponse],
      (saveErr) => {
        if (saveErr && saveErr.code !== 'ER_NO_SUCH_TABLE') {
          console.error('Error saving AI response:', saveErr);
        }

        // Update session timestamp
        db.query(
          'UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = ?',
          [sessionId],
          (updateErr) => {
            if (updateErr) {
              console.error('Error updating session:', updateErr);
            }
          }
        );

        // Return response
        res.json({
          message: aiResponse,
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        });
      }
    );
  } catch (error) {
    console.error('Error processing message with Groq:', error);

    // Fallback response if Groq fails
    const fallbackResponse = "I apologize, but I'm having trouble connecting to the AI service right now. Please try again later or contact support.";

    // Save fallback response
    db.query(
      `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
       VALUES (?, ?, 'assistant', ?)`,
      [sessionId, userId, fallbackResponse],
      (saveErr) => {
        if (saveErr && saveErr.code !== 'ER_NO_SUCH_TABLE') {
          console.error('Error saving fallback response:', saveErr);
        }
      }
    );

    res.status(500).json({
      error: 'AI service unavailable',
      message: fallbackResponse,
      details: error.message
    });
  }
}

/**
 * Start a new chat session
 */
router.post('/new', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Create new session
  db.query(
    `INSERT INTO ai_chat_sessions (user_id, customer_id, context_summary)
     VALUES (?, NULL, NULL)`,
    [userId],
    (err, result) => {
      if (err) {
        console.error('❌ Error creating chat session:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage,
          message: err.message
        });
        
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return res.status(500).json({
            error: 'Chat sessions table does not exist. Please run the ai_chat_schema.sql file to create it.',
            details: err.sqlMessage
          });
        }
        
        return res.status(500).json({
          error: 'Failed to create chat session',
          details: err.sqlMessage || err.message,
          code: err.code
        });
      }

      const sessionId = result.insertId;
      const initialMessage = {
        role: 'assistant',
        content: "Hi! I'm your AI spa assistant. How can I help you today?",
        timestamp: new Date().toISOString()
      };

      // Create initial greeting message
      db.query(
        `INSERT INTO ai_chat_messages (session_id, user_id, role, content)
         VALUES (?, ?, 'assistant', ?)`,
        [sessionId, userId, initialMessage.content],
        (msgErr) => {
          if (msgErr) {
            console.error('❌ Error creating initial message:', {
              code: msgErr.code,
              errno: msgErr.errno,
              sqlMessage: msgErr.sqlMessage,
              message: msgErr.message
            });
            
            if (msgErr.code === 'ER_NO_SUCH_TABLE') {
              return res.status(500).json({
                error: 'Chat messages table does not exist. Please run the ai_chat_schema.sql file to create it.',
                details: msgErr.sqlMessage
              });
            }
            
            // Still return the session even if message creation fails
            return res.status(500).json({
              error: 'Session created but failed to create initial message',
              sessionId: sessionId,
              details: msgErr.sqlMessage || msgErr.message
            });
          }

          res.json({
            id: sessionId,
            message: initialMessage.content,
            messages: [initialMessage]
          });
        }
      );
    }
  );
});

export default router;

