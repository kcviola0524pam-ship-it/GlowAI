import express from 'express';
import db from '../config/db.js';

const router = express.Router();

const handleDbError = (res, err, action) => {
  console.error(`❌ Recommendations ${action} error:`, err);
  res.status(500).json({ error: `Database error (${action})` });
};
//business recommendations
function handleBusinessRecommendations(res, salesData, appointmentData, customerData, inventoryData) {
  try {
    // Calculate peak hours
    const hourStats = {};
    (salesData || []).forEach(sale => {
      try {
        const hour = sale?.hour;
        if (hour !== null && hour !== undefined && !isNaN(hour)) {
          if (!hourStats[hour]) {
            hourStats[hour] = { transactions: 0, revenue: 0, appointments: 0 };
          }
          hourStats[hour].transactions += parseInt(sale.transaction_count || 0, 10);
          hourStats[hour].revenue += parseFloat(sale.revenue || 0) || 0;
        }
      } catch (err) {
        console.error('Error processing sale data:', err);
      }
    });

    (appointmentData || []).forEach(apt => {
      try {
        const hour = apt?.hour;
        if (hour !== null && hour !== undefined && !isNaN(hour)) {
          if (!hourStats[hour]) {
            hourStats[hour] = { transactions: 0, revenue: 0, appointments: 0 };
          }
          hourStats[hour].appointments += parseInt(apt.appointment_count || 0, 10);
        }
      } catch (err) {
        console.error('Error processing appointment data:', err);
      }
    });

    const peakHours = Object.entries(hourStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour, 10),
        ...stats,
        totalActivity: (stats.transactions || 0) + (stats.appointments || 0),
      }))
      .sort((a, b) => (b.totalActivity || 0) - (a.totalActivity || 0))
      .slice(0, 5);

    // Generate AI recommendations
    const recommendations = [];

    // Recommendation 1: Staffing
    if (peakHours.length > 0) {
      const topHour = peakHours[0];
      recommendations.push({
        category: 'Staffing',
        priority: 'High',
        title: 'Optimize Staffing During Peak Hours',
        description: `Peak activity occurs at ${topHour.hour}:00 with ${topHour.totalActivity} transactions/appointments. Consider scheduling more staff during ${peakHours.map(h => `${h.hour}:00`).join(', ')}.`,
        impact: 'High',
      });
    }

    // Recommendation 2: Inventory
    if (inventoryData && inventoryData[0] && inventoryData[0].low_stock_count > 0) {
      recommendations.push({
        category: 'Inventory',
        priority: 'High',
        title: 'Restock Low Inventory Items',
        description: `${inventoryData[0].low_stock_count} products are below minimum stock levels. Review and restock to avoid stockouts.`,
        impact: 'Medium',
      });
    }

    // Recommendation 3: Customer Retention
    const avgVisits = customerData && customerData[0] ? (parseFloat(customerData[0].avg_visits_per_customer) || 0) : 0;
    if (avgVisits < 3 && avgVisits > 0) {
      recommendations.push({
        category: 'Customer Retention',
        priority: 'Medium',
        title: 'Improve Customer Retention',
        description: `Average visits per customer is ${avgVisits.toFixed(1)}. Consider loyalty programs or promotional offers to encourage repeat visits.`,
        impact: 'High',
      });
    }

    // Recommendation 4: Service Popularity
    const serviceStats = {};
    (appointmentData || []).forEach(apt => {
      try {
        if (apt?.service) {
          if (!serviceStats[apt.service]) {
            serviceStats[apt.service] = 0;
          }
          serviceStats[apt.service] += parseInt(apt.appointment_count || 0, 10);
        }
      } catch (err) {
        console.error('Error processing service stats:', err);
      }
    });

    const popularServices = Object.entries(serviceStats)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 3);

    if (popularServices.length > 0) {
      recommendations.push({
        category: 'Marketing',
        priority: 'Medium',
        title: 'Promote Popular Services',
        description: `Top services: ${popularServices.map(([service]) => service).join(', ')}. Consider creating service packages or promotions around these popular services.`,
        impact: 'Medium',
      });
    }

    // Recommendation 5: Revenue Optimization
    const totalRevenue = (salesData || []).reduce((sum, s) => {
      try {
        return sum + (parseFloat(s?.revenue || 0) || 0);
      } catch {
        return sum;
      }
    }, 0);
    const totalTransactions = (salesData || []).reduce((sum, s) => {
      try {
        return sum + (parseInt(s?.transaction_count || 0, 10) || 0);
      } catch {
        return sum;
      }
    }, 0);
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    if (avgTransaction < 50 && totalTransactions > 0) {
      recommendations.push({
        category: 'Revenue',
        priority: 'Medium',
        title: 'Increase Average Transaction Value',
        description: `Average transaction is $${avgTransaction.toFixed(2)}. Consider upselling complementary services or products to increase revenue per customer.`,
        impact: 'High',
      });
    }

    res.json({
      peakHours: peakHours || [],
      recommendations: recommendations || [],
      statistics: {
        totalRevenue: (totalRevenue || 0).toFixed(2),
        averageTransaction: (avgTransaction || 0).toFixed(2),
        activeCustomers: customerData && customerData[0] ? (parseInt(customerData[0].active_customers, 10) || 0) : 0,
        averageVisits: (avgVisits || 0).toFixed(1),
        lowStockItems: inventoryData && inventoryData[0] ? (parseInt(inventoryData[0].low_stock_count, 10) || 0) : 0,
        popularServices: popularServices.map(([service, count]) => ({ service, count: parseInt(count, 10) || 0 })),
      },
    });
  } catch (error) {
    console.error('Error in handleBusinessRecommendations:', error);
    res.status(500).json({
      error: 'Error generating business recommendations',
      message: error.message,
      peakHours: [],
      recommendations: [],
      statistics: {
        totalRevenue: '0.00',
        averageTransaction: '0.00',
        activeCustomers: 0,
        averageVisits: '0.0',
        lowStockItems: 0,
        popularServices: [],
      },
    });
  }
}

// AI-powered customer service recommendations
router.get('/customer/:customerId', (req, res) => {
  const { customerId } = req.params;

  // Get customer data
  db.query(
    'SELECT * FROM customer WHERE id = ?',
    [customerId],
    (customerErr, customerResults) => {
      if (customerErr) return handleDbError(res, customerErr, 'GET customer');
      if (customerResults.length === 0) return res.status(404).json({ error: 'Customer not found' });

      const customer = customerResults[0];

      // Get customer's appointment history with service categories
      db.query(
        `SELECT a.service, COUNT(*) as frequency, MAX(a.appointment_date) as last_visit,
         s.category as service_category
         FROM appointments a
         LEFT JOIN services s ON a.service = s.name
         WHERE a.customer_id = ? AND a.status = 'Completed'
         GROUP BY a.service, s.category
         ORDER BY frequency DESC`,
        [customerId],
        (apptErr, appointmentHistory) => {
          const safeAppointmentHistory = apptErr ? [] : (appointmentHistory || []);

          // Determine preferred category from actual booking history
          const categoryCounts = {};
          safeAppointmentHistory.forEach(apt => {
            const category = apt.service_category || 'General';
            categoryCounts[category] = (categoryCounts[category] || 0) + (apt.frequency || 0);
          });
          const mostBookedCategory = Object.keys(categoryCounts).reduce((a, b) => 
            categoryCounts[a] > categoryCounts[b] ? a : b, 'General'
          );
          
          // Update customer's preferred service if booking history suggests different category
          const actualPreferredCategory = mostBookedCategory || customer.service || 'General';
          if (actualPreferredCategory !== customer.service && safeAppointmentHistory.length > 0) {
            db.query(
              'UPDATE customer SET service = ? WHERE id = ?',
              [actualPreferredCategory, customerId],
              () => {} // Silent update, don't fail if it errors
            );
          }

          // Get customer's purchase history
          db.query(
            `SELECT p.category, COUNT(*) as purchase_count
             FROM sale_items si
             JOIN sales s ON si.sale_id = s.id
             JOIN products p ON si.product_id = p.id
             WHERE s.customer_id = ?
             GROUP BY p.category
             ORDER BY purchase_count DESC`,
            [customerId],
            (purchaseErr, purchaseHistory) => {
              // Handle purchase history error - continue with empty array if error
              const safePurchaseHistory = purchaseErr ? [] : (purchaseHistory || []);

              // Get customer analysis if available
              getCustomerAnalysis(customerId, (customerAnalysis) => {
                // Get all available services
                db.query(
                  'SELECT * FROM services WHERE is_active = TRUE',
                  (serviceErr, allServices) => {
                    if (serviceErr) {
                      if (serviceErr.code === 'ER_NO_SUCH_TABLE') {
                        return res.status(500).json({ 
                          error: 'Services table does not exist. Please run the services_schema.sql file to create it.' 
                        });
                      }
                      return handleDbError(res, serviceErr, 'GET services');
                    }
                    
                    // If no services exist, return empty recommendations
                    if (!allServices || allServices.length === 0) {
                      return res.json({
                        customer: {
                          id: customer.id,
                          name: customer.name,
                          service: actualPreferredCategory,
                          visits: customer.visits,
                        },
                        recommendations: [],
                        insights: {
                          totalAppointments: safeAppointmentHistory.reduce((sum, h) => sum + (h.frequency || 0), 0),
                          favoriteService: safeAppointmentHistory && safeAppointmentHistory[0] ? safeAppointmentHistory[0].service : 'None',
                          purchaseCategories: safePurchaseHistory.map(p => p.category),
                        },
                        message: 'No services available. Please add services in the admin panel.',
                      });
                    }

                    // Helper function to extract keywords from description
                    const extractKeywords = (text) => {
                      if (!text) return [];
                      const commonWords = ['the', 'and', 'or', 'for', 'with', 'care', 'service', 'services', 'treatment', 'professional', 'deep', 'full', 'precision', 'relaxing'];
                      return text.toLowerCase()
                        .replace(/[^\w\s]/g, ' ')
                        .split(/\s+/)
                        .filter(word => word.length > 3 && !commonWords.includes(word));
                    };

                    // Helper function to analyze service similarity using descriptions
                    const calculateServiceSimilarity = (service1Desc, service2Desc, category1, category2) => {
                      if (!service1Desc || !service2Desc) return 0;
                      
                      const keywords1 = extractKeywords(service1Desc);
                      const keywords2 = extractKeywords(service2Desc);
                      
                      // Count matching keywords
                      const matchingKeywords = keywords1.filter(kw => keywords2.includes(kw)).length;
                      const totalUniqueKeywords = new Set([...keywords1, ...keywords2]).size;
                      
                      // Also check category exact match
                      const categoryMatch = category1.toLowerCase() === category2.toLowerCase() ? 1 : 0;
                      
                      // Weighted similarity: 70% keywords, 30% category
                      return (matchingKeywords / Math.max(totalUniqueKeywords, 1) * 0.7) + (categoryMatch * 0.3);
                    };

                    // Get customer gender from analysis
                    const customerGender = customerAnalysis?.gender_preference || null;

                    // AI Recommendation Algorithm
                    const recommendations = allServices.map(service => {
                      let score = 35; // Base score
                      const reasons = [];
                      const serviceDescription = (service.description || '').toLowerCase();
                      const serviceName = service.name.toLowerCase();

                      // Gender-based filtering and scoring
                      const malePreferredKeywords = ['haircut', 'barber', 'facial', 'massage', 'hair color'];
                      const femalePreferredKeywords = ['manicure', 'pedicure', 'nail', 'facial', 'waxing', 'eyebrow', 'hair color'];
                      const genderNeutralKeywords = ['massage', 'facial', 'spa', 'therapy', 'wellness'];
                      
                      if (customerGender) {
                        const serviceText = (serviceName + ' ' + serviceDescription).toLowerCase();
                        
                        if (customerGender === 'Male') {
                          // Boost male-preferred services
                          if (malePreferredKeywords.some(kw => serviceText.includes(kw))) {
                            score += 8;
                          } else if (femalePreferredKeywords.some(kw => serviceText.includes(kw)) && 
                                     !genderNeutralKeywords.some(kw => serviceText.includes(kw))) {
                            // Reduce score for heavily female-oriented services
                            score -= 12;
                          }
                        } else if (customerGender === 'Female') {
                          // Boost female-preferred services
                          if (femalePreferredKeywords.some(kw => serviceText.includes(kw))) {
                            score += 8;
                          } else if (malePreferredKeywords.filter(kw => kw !== 'haircut' && kw !== 'facial' && kw !== 'massage').some(kw => serviceText.includes(kw))) {
                            // Slightly reduce for male-only services
                            score -= 4;
                          }
                        }
                      }

                      // Factor 1: EXACT preferred category match from booking history
                      if (service.category === actualPreferredCategory && actualPreferredCategory !== 'General') {
                        score += 40;
                        reasons.push(`Matches your preferred ${actualPreferredCategory} category`);
                      }
                      
                      // Use stored analysis if available (more accurate) - only exact category matches
                      if (customerAnalysis && customerAnalysis.preferred_categories[service.category]) {
                        const categoryFreq = customerAnalysis.preferred_categories[service.category];
                        score += Math.min(categoryFreq * 8, 30);
                        if (!reasons.some(r => r.includes('preferred') || r.includes('frequently'))) {
                          reasons.push(`You frequently book ${service.category} services (${categoryFreq} times)`);
                        }
                      }
                      
                      // Description similarity with previously booked services
                      if (customerAnalysis && customerAnalysis.preferred_services && serviceDescription) {
                        const bookedServiceNames = Object.keys(customerAnalysis.preferred_services);
                        let maxDescSimilarity = 0;
                        bookedServiceNames.forEach(bookedSvcName => {
                          const bookedSvc = allServices.find(s => s.name === bookedSvcName);
                          if (bookedSvc && bookedSvc.description) {
                            const similarity = calculateServiceSimilarity(
                              bookedSvc.description,
                              serviceDescription,
                              bookedSvc.category,
                              service.category
                            );
                            maxDescSimilarity = Math.max(maxDescSimilarity, similarity);
                          }
                        });
                        
                        if (maxDescSimilarity > 0.35) {
                          score += Math.round(maxDescSimilarity * 18);
                          if (!reasons.some(r => r.includes('similar'))) {
                            reasons.push('Similar service type to what you usually book');
                          }
                        }
                      }

                      // Factor 2: Appointment history - same service
                      const serviceHistory = safeAppointmentHistory.find(h => h.service === service.name);
                      if (serviceHistory) {
                        score += serviceHistory.frequency * 20;
                        reasons.push(`You've booked this ${serviceHistory.frequency} time${serviceHistory.frequency > 1 ? 's' : ''} before`);
                      }

                      // Use stored analysis for specific services
                      if (customerAnalysis && customerAnalysis.preferred_services[service.name]) {
                        const serviceFreq = customerAnalysis.preferred_services[service.name];
                        score += Math.min(serviceFreq * 10, 25);
                        if (!reasons.some(r => r.includes('booked'))) {
                          reasons.push(`Your frequently booked service (${serviceFreq} times)`);
                        }
                      }

                      // Factor 3: Purchase history - related category
                      const relatedPurchase = safePurchaseHistory.find(p => p.category === service.category);
                      if (relatedPurchase) {
                        score += relatedPurchase.purchase_count * 10;
                        reasons.push(`You frequently purchase ${service.category} products`);
                      }

                      // Factor 4: Visit frequency - suggest complementary services
                      if (customer.visits >= 10 && service.category !== actualPreferredCategory) {
                        score += 15;
                        reasons.push('Try something new based on your loyalty');
                      }

                      // Factor 5: Popular services (if customer has no history)
                      if (!safeAppointmentHistory || safeAppointmentHistory.length === 0) {
                        score += 20;
                        reasons.push('Popular choice for new customers');
                      }

                      // Factor 6: Price consideration
                      if (parseFloat(service.price || 0) <= 50) {
                        score += 8;
                        reasons.push('Affordable option');
                      }

                      // Match price/duration from analysis
                      if (customerAnalysis) {
                        if (customerAnalysis.average_price_range) {
                          const avgPrice = parseFloat(customerAnalysis.average_price_range);
                          const priceDiff = Math.abs(parseFloat(service.price || 0) - avgPrice);
                          if (priceDiff <= avgPrice * 0.3) {
                            score += 10;
                          }
                        }
                        if (customerAnalysis.average_duration) {
                          const avgDuration = parseInt(customerAnalysis.average_duration);
                          const durationDiff = Math.abs(parseInt(service.duration_minutes || 60) - avgDuration);
                          if (durationDiff <= 20) {
                            score += 8;
                          }
                        }
                      }

                      return {
                        service,
                        score: Math.min(Math.round(score), 100), // Cap at 100
                        reasons: reasons.length > 0 ? reasons : ['Recommended based on your profile'],
                        confidence: score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low',
                      };
                    });

                    // Sort by score and return top 5
                    const topRecommendations = recommendations
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5);

                    // Update customer analysis
                    analyzeCustomerBookings(customerId, null, () => {});

                    res.json({
                      customer: {
                        id: customer.id,
                        name: customer.name,
                        service: actualPreferredCategory,
                        visits: customer.visits,
                      },
                      recommendations: topRecommendations,
                      insights: {
                        totalAppointments: safeAppointmentHistory.reduce((sum, h) => sum + (h.frequency || 0), 0),
                        favoriteService: safeAppointmentHistory && safeAppointmentHistory[0] ? safeAppointmentHistory[0].service : 'None',
                        purchaseCategories: safePurchaseHistory.map(p => p.category),
                        preferredCategory: actualPreferredCategory,
                      },
                    });
                  }
                );
              });
            }
          );
        }
      );
    }
  );
});

// AI-powered business recommendations for admin
router.get('/business', (req, res) => {
  try {
    // Get sales data
    db.query(
      `SELECT 
        DATE(created_at) as date,
        HOUR(created_at) as hour,
        COUNT(*) as transaction_count,
        SUM(total_amount) as revenue
       FROM sales
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at), HOUR(created_at)
       ORDER BY transaction_count DESC`,
      (salesErr, salesData) => {
        const safeSalesData = salesErr ? [] : (salesData || []);
        if (salesErr) {
          console.error('Sales query error (continuing with empty data):', salesErr.message);
        }

        // Get appointment data
        db.query(
          `SELECT 
            DATE(appointment_date) as date,
            HOUR(appointment_time) as hour,
            COUNT(*) as appointment_count,
            service
           FROM appointments
           WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             AND status = 'Completed'
             AND appointment_time IS NOT NULL
           GROUP BY DATE(appointment_date), HOUR(appointment_time), service`,
          (apptErr, appointmentData) => {
            const safeAppointmentData = apptErr ? [] : (appointmentData || []);
            if (apptErr) {
              console.error('Appointment query error (continuing with empty data):', apptErr.message);
            }

            // Get customer retention data
            db.query(
              `SELECT 
                COUNT(DISTINCT id) as active_customers,
                COUNT(*) as total_visits,
                AVG(visits) as avg_visits_per_customer
               FROM customer
               WHERE status = 'Active'`,
              (customerErr, customerData) => {
                const safeCustomerData = customerErr ? null : (customerData || null);
                if (customerErr) {
                  console.error('Customer query error (continuing with null data):', customerErr.message);
                }

                // Get inventory data
                db.query(
                  `SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count
                   FROM products`,
                  (inventoryErr, inventoryData) => {
                    const safeInventoryData = inventoryErr ? null : (inventoryData || null);
                    if (inventoryErr) {
                      console.error('Inventory query error (continuing with null data):', inventoryErr.message);
                    }

                    try {
                      handleBusinessRecommendations(
                        res, 
                        safeSalesData, 
                        safeAppointmentData, 
                        safeCustomerData, 
                        safeInventoryData
                      );
                    } catch (handleErr) {
                      console.error('Error in handleBusinessRecommendations:', handleErr);
                      res.status(500).json({ 
                        error: 'Error generating recommendations',
                        message: handleErr.message 
                      });
                    }
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Business recommendations route error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Helper function to analyze and store customer booking patterns
function analyzeCustomerBookings(customerId, userId, callback) {
  // Get customer's appointment history
  db.query(
    `SELECT a.service, a.appointment_date, 
     COALESCE(s.category, 'General') as category, 
     COALESCE(s.price, 0) as price, 
     COALESCE(s.duration_minutes, 60) as duration_minutes
     FROM appointments a
     LEFT JOIN services s ON a.service = s.name
     WHERE a.customer_id = ? AND a.status = 'Completed'
     ORDER BY a.appointment_date DESC`,
    [customerId],
    (err, appointments) => {
      if (err) {
        console.error('Error analyzing appointments:', err);
        return callback(null);
      }

      if (!appointments || appointments.length === 0) {
        return callback(null);
      }

      const analysis = {
        preferred_categories: {},
        preferred_services: {},
        total_appointments: appointments.length,
        prices: [],
        durations: [],
        services: []
      };

      // Analyze booking patterns
      appointments.forEach(apt => {
        const serviceName = apt.service;
        const category = apt.category || 'General';
        const price = parseFloat(apt.price || 0);
        const duration = parseInt(apt.duration_minutes || 60);

        // Count category preferences
        analysis.preferred_categories[category] = (analysis.preferred_categories[category] || 0) + 1;
        
        // Count service preferences
        analysis.preferred_services[serviceName] = (analysis.preferred_services[serviceName] || 0) + 1;
        
        // Collect prices and durations
        if (price > 0) analysis.prices.push(price);
        if (duration > 0) analysis.durations.push(duration);
        
        analysis.services.push(serviceName);
      });

      // Calculate averages
      const avgPrice = analysis.prices.length > 0 
        ? analysis.prices.reduce((a, b) => a + b, 0) / analysis.prices.length 
        : 0;
      const avgDuration = analysis.durations.length > 0
        ? analysis.durations.reduce((a, b) => a + b, 0) / analysis.durations.length
        : 60;

      // Determine booking frequency
      let bookingFrequency = 'New';
      if (appointments.length >= 10) bookingFrequency = 'Frequent';
      else if (appointments.length >= 5) bookingFrequency = 'Regular';
      else if (appointments.length >= 1) bookingFrequency = 'Occasional';

      // Try to infer gender from name (basic heuristic)
      db.query(
        'SELECT name FROM customer WHERE id = ?',
        [customerId],
        (nameErr, nameResults) => {
          let genderPreference = null;
          if (!nameErr && nameResults.length > 0) {
            const name = nameResults[0].name.toLowerCase();
            // Very basic gender inference - can be enhanced
            const commonFemaleNames = ['maria', 'marie', 'anna', 'anna', 'lisa', 'sarah', 'emily', 'jennifer'];
            const commonMaleNames = ['john', 'james', 'michael', 'david', 'robert', 'william'];
            if (commonFemaleNames.some(n => name.includes(n))) {
              genderPreference = 'Female';
            } else if (commonMaleNames.some(n => name.includes(n))) {
              genderPreference = 'Male';
            }
          }

          // Store or update analysis
          const analysisData = {
            preferred_categories: JSON.stringify(analysis.preferred_categories),
            preferred_services: JSON.stringify(analysis.preferred_services),
            average_price_range: avgPrice.toFixed(2),
            average_duration: Math.round(avgDuration),
            gender_preference: genderPreference,
            booking_frequency: bookingFrequency,
            analysis_metadata: JSON.stringify({
              total_bookings: appointments.length,
              last_booking: appointments.length > 0 ? appointments[0].appointment_date : null,
              price_range: analysis.prices.length > 0 
                ? { min: Math.min(...analysis.prices), max: Math.max(...analysis.prices) }
                : null
            })
          };

          // Check if analysis exists
          db.query(
            'SELECT id FROM ai_customer_analysis WHERE customer_id = ?',
            [customerId],
            (checkErr, checkResults) => {
              if (checkErr) {
                console.error('Error checking analysis:', checkErr);
                return callback(null);
              }

              if (checkResults && checkResults.length > 0) {
                // Update existing
                db.query(
                  `UPDATE ai_customer_analysis SET 
                   preferred_categories = ?, preferred_services = ?, average_price_range = ?,
                   average_duration = ?, gender_preference = ?, booking_frequency = ?,
                   analysis_metadata = ?, last_analyzed_at = NOW()
                   WHERE customer_id = ?`,
                  [
                    analysisData.preferred_categories,
                    analysisData.preferred_services,
                    analysisData.average_price_range,
                    analysisData.average_duration,
                    analysisData.gender_preference,
                    analysisData.booking_frequency,
                    analysisData.analysis_metadata,
                    customerId
                  ],
                  (updateErr) => {
                    if (updateErr) console.error('Error updating analysis:', updateErr);
                    callback({
                      ...analysisData,
                      preferred_categories: analysis.preferred_categories,
                      preferred_services: analysis.preferred_services,
                      average_price: avgPrice,
                      average_duration: Math.round(avgDuration),
                      booking_frequency: bookingFrequency,
                      gender_preference: genderPreference
                    });
                  }
                );
              } else {
                // Insert new
                db.query(
                  `INSERT INTO ai_customer_analysis 
                   (customer_id, user_id, preferred_categories, preferred_services, 
                    average_price_range, average_duration, gender_preference, booking_frequency, analysis_metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    customerId,
                    userId,
                    analysisData.preferred_categories,
                    analysisData.preferred_services,
                    analysisData.average_price_range,
                    analysisData.average_duration,
                    analysisData.gender_preference,
                    analysisData.booking_frequency,
                    analysisData.analysis_metadata
                  ],
                  (insertErr) => {
                    if (insertErr) {
                      // Table might not exist, that's okay
                      if (insertErr.code !== 'ER_NO_SUCH_TABLE') {
                        console.error('Error inserting analysis:', insertErr);
                      }
                    }
                    callback({
                      ...analysisData,
                      preferred_categories: analysis.preferred_categories,
                      preferred_services: analysis.preferred_services,
                      average_price: avgPrice,
                      average_duration: Math.round(avgDuration),
                      booking_frequency: bookingFrequency,
                      gender_preference: genderPreference
                    });
                  }
                );
              }
            }
          );
        }
      );
    }
  );
}

// Helper function to get customer analysis
function getCustomerAnalysis(customerId, callback) {
  db.query(
    'SELECT * FROM ai_customer_analysis WHERE customer_id = ?',
    [customerId],
    (err, results) => {
      if (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          return callback(null);
        }
        console.error('Error getting analysis:', err);
        return callback(null);
      }

      if (results.length === 0) {
        return callback(null);
      }

      const analysis = results[0];
      try {
        analysis.preferred_categories = JSON.parse(analysis.preferred_categories || '{}');
        analysis.preferred_services = JSON.parse(analysis.preferred_services || '{}');
        analysis.analysis_metadata = JSON.parse(analysis.analysis_metadata || '{}');
      } catch (parseErr) {
        console.error('Error parsing analysis JSON:', parseErr);
      }

      callback(analysis);
    }
  );
}

// AI Chat endpoints for interactive service recommendations
// GET or create chat session
router.get('/chat/session/:userId', (req, res) => {
  const { userId } = req.params;

  // First, get customer by user_id
  db.query(
    'SELECT id FROM customer WHERE user_id = ?',
    [userId],
    (customerErr, customerResults) => {
      if (customerErr) return handleDbError(res, customerErr, 'GET customer');
      if (customerResults.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customerId = customerResults[0].id;

      // Try to get existing session
      db.query(
        `SELECT id, session_data FROM ai_chat_sessions 
         WHERE (user_id = ? OR customer_id = ?) 
         ORDER BY updated_at DESC LIMIT 1`,
        [userId, customerId],
        (sessionErr, sessionResults) => {
          if (sessionErr) {
            // If table doesn't exist, create new session (will fail gracefully)
            console.error('Error fetching session:', sessionErr);
          }

          if (sessionResults && sessionResults.length > 0) {
            const session = sessionResults[0];
            try {
              const sessionData = session.session_data ? JSON.parse(session.session_data) : null;
              if (sessionData) {
                return res.json({
                  id: session.id,
                  data: sessionData
                });
              }
            } catch (parseErr) {
              console.error('Error parsing session data:', parseErr);
            }
          }

          // Create new session
          const initialData = {
            messages: [],
            preferences: {},
            currentQuestionIndex: 0,
            completed: false
          };

          db.query(
            'INSERT INTO ai_chat_sessions (customer_id, user_id, session_data) VALUES (?, ?, ?)',
            [customerId, userId, JSON.stringify(initialData)],
            (insertErr, insertResult) => {
              if (insertErr) {
                // If table doesn't exist, return error with helpful message
                if (insertErr.code === 'ER_NO_SUCH_TABLE') {
                  return res.status(500).json({ 
                    error: 'AI chat sessions table does not exist. Please run the ai_chat_schema.sql file to create it.' 
                  });
                }
                return handleDbError(res, insertErr, 'CREATE chat session');
              }
              res.json({
                id: insertResult.insertId,
                data: initialData
              });
            }
          );
        }
      );
    }
  );
});

// POST: Handle user message and get AI response
router.post('/chat/message', (req, res) => {
  const { sessionId, userId, message, customerId } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Session ID and message are required' });
  }

  // Get current session
  const queryParams = [sessionId];
  let query = 'SELECT * FROM ai_chat_sessions WHERE id = ?';
  
  if (userId) {
    query += ' AND (user_id = ?';
    queryParams.push(userId);
    if (customerId) {
      query += ' OR customer_id = ?';
      queryParams.push(customerId);
    }
    query += ')';
  } else if (customerId) {
    query += ' AND customer_id = ?';
    queryParams.push(customerId);
  } else {
    return res.status(400).json({ error: 'User ID or Customer ID is required' });
  }

  db.query(
    query,
    queryParams,
    (err, results) => {
      if (err) return handleDbError(res, err, 'GET session');
      if (results.length === 0) return res.status(404).json({ error: 'Session not found' });

      const session = results[0];
      let sessionData = session.session_data ? JSON.parse(session.session_data) : {
        messages: [],
        preferences: {},
        currentQuestionIndex: 0,
        completed: false
      };

      // Add user message
      sessionData.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Get all active services for recommendations
      db.query(
        'SELECT * FROM services WHERE is_active = TRUE ORDER BY name',
        (serviceErr, services) => {
          if (serviceErr) {
            console.error('Error fetching services:', serviceErr);
            return handleDbError(res, serviceErr, 'GET services');
          }

          // Define question flow
          const questions = [
            {
              question: "Hi! I'm your AI spa assistant. What brings you here today? Are you looking for relaxation, beauty treatments, or something specific?",
              key: 'purpose',
              type: 'text'
            },
            {
              question: "What type of service interests you most? (e.g., Nail Care, Hair Care, Skincare, Wellness, Beauty)",
              key: 'category',
              type: 'category'
            },
            {
              question: "What's your budget range? (e.g., Under $50, $50-$100, $100+)",
              key: 'budget',
              type: 'budget'
            },
            {
              question: "How much time do you have available? (e.g., Quick (under 1 hour), Standard (1-2 hours), Extended (2+ hours))",
              key: 'duration',
              type: 'duration'
            },
            {
              question: "Any specific concerns or preferences? (e.g., sensitive skin, relaxation, anti-aging, maintenance)",
              key: 'concerns',
              type: 'text'
            }
          ];

          let aiResponse = '';
          let recommendations = null;
          const currentQIndex = sessionData.currentQuestionIndex || 0;

          // Check if session is already completed
          if (sessionData.completed) {
            aiResponse = "I've already provided recommendations. Would you like to start a new consultation?";
            
            // Add AI response to messages
            sessionData.messages.push({
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date().toISOString()
            });
            
            // Update session in database
            db.query(
              'UPDATE ai_chat_sessions SET session_data = ?, updated_at = NOW() WHERE id = ?',
              [JSON.stringify(sessionData), sessionId],
              (updateErr) => {
                if (updateErr) return handleDbError(res, updateErr, 'UPDATE session');

                res.json({
                  message: aiResponse,
                  recommendations: null,
                  completed: sessionData.completed,
                  preferences: sessionData.preferences,
                  nextQuestionIndex: sessionData.currentQuestionIndex
                });
              }
            );
            return;
          }

          // Process answer and extract preferences
          if (currentQIndex < questions.length) {
            const currentQuestion = questions[currentQIndex];
            
            // Extract preferences from message
            if (currentQuestion.key === 'category') {
              const categories = ['Nail Care', 'Hair Care', 'Skincare', 'Wellness', 'Beauty', 'Massage', 'Facial'];
              const matchedCategory = categories.find(cat => 
                message.toLowerCase().includes(cat.toLowerCase().split(' ')[0])
              );
              if (matchedCategory) {
                sessionData.preferences.category = matchedCategory;
              } else if (message.length > 0) {
                sessionData.preferences.category = message;
              }
            } else if (currentQuestion.key === 'budget') {
              if (message.toLowerCase().includes('under') || message.toLowerCase().includes('<$')) {
                sessionData.preferences.maxPrice = 50;
              } else if (message.toLowerCase().includes('50') && message.toLowerCase().includes('100')) {
                sessionData.preferences.minPrice = 50;
                sessionData.preferences.maxPrice = 100;
              } else if (message.toLowerCase().includes('100+') || message.toLowerCase().includes('>$')) {
                sessionData.preferences.minPrice = 100;
              }
            } else if (currentQuestion.key === 'duration') {
              if (message.toLowerCase().includes('quick') || message.toLowerCase().includes('under 1')) {
                sessionData.preferences.maxDuration = 60;
              } else if (message.toLowerCase().includes('standard') || message.toLowerCase().includes('1-2')) {
                sessionData.preferences.minDuration = 60;
                sessionData.preferences.maxDuration = 120;
              } else if (message.toLowerCase().includes('extended') || message.toLowerCase().includes('2+')) {
                sessionData.preferences.minDuration = 120;
              }
            } else {
              sessionData.preferences[currentQuestion.key] = message;
            }

            sessionData.currentQuestionIndex = currentQIndex + 1;

            // Check if we have enough info or if all questions are answered
            if (sessionData.currentQuestionIndex >= questions.length) {
              // Get customer analysis (booking patterns, preferences)
              getCustomerAnalysis(customerId || session.customer_id, (customerAnalysis) => {
                // Get customer gender from analysis
                const customerGender = customerAnalysis?.gender_preference || null;
                
                // Helper function to extract keywords from description
                const extractKeywords = (text) => {
                  if (!text) return [];
                  const commonWords = ['the', 'and', 'or', 'for', 'with', 'care', 'service', 'services', 'treatment', 'professional', 'deep', 'full', 'precision', 'relaxing'];
                  return text.toLowerCase()
                    .replace(/[^\w\s]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 3 && !commonWords.includes(word));
                };

                // Helper function to analyze service similarity using descriptions
                const calculateServiceSimilarity = (service1Desc, service2Desc, category1, category2) => {
                  if (!service1Desc || !service2Desc) return 0;
                  
                  const keywords1 = extractKeywords(service1Desc);
                  const keywords2 = extractKeywords(service2Desc);
                  
                  // Count matching keywords
                  const matchingKeywords = keywords1.filter(kw => keywords2.includes(kw)).length;
                  const totalUniqueKeywords = new Set([...keywords1, ...keywords2]).size;
                  
                  // Also check category exact match
                  const categoryMatch = category1.toLowerCase() === category2.toLowerCase() ? 1 : 0;
                  
                  // Weighted similarity: 70% keywords, 30% category
                  return (matchingKeywords / Math.max(totalUniqueKeywords, 1) * 0.7) + (categoryMatch * 0.3);
                };

                // Generate recommendations by scoring ALL services (not filtering)
                // This ensures we always return recommendations even if preferences don't match exactly
                const scoredServices = services.map(service => {
                  let score = 30; // Lower base score - require better matches
                  const reasons = [];
                  const servicePrice = parseFloat(service.price || 0);
                  const serviceDuration = parseInt(service.duration_minutes || 60);
                  const serviceCategory = (service.category || 'General');
                  const serviceName = service.name;
                  const serviceDescription = (service.description || '').toLowerCase();

                  // Gender-based filtering and scoring
                  // Define gender-preferred keywords and services
                  const malePreferredKeywords = ['haircut', 'barber', 'facial', 'massage', 'hair color', 'haircut'];
                  const femalePreferredKeywords = ['manicure', 'pedicure', 'nail', 'facial', 'waxing', 'eyebrow', 'hair color', 'haircut'];
                  const genderNeutralKeywords = ['massage', 'facial', 'spa', 'therapy', 'wellness'];
                  
                  if (customerGender) {
                    const serviceText = (serviceName + ' ' + serviceDescription).toLowerCase();
                    
                    if (customerGender === 'Male') {
                      // Boost male-preferred services
                      if (malePreferredKeywords.some(kw => serviceText.includes(kw))) {
                        score += 10;
                      } else if (femalePreferredKeywords.some(kw => serviceText.includes(kw)) && 
                                 !genderNeutralKeywords.some(kw => serviceText.includes(kw))) {
                        // Reduce score for heavily female-oriented services
                        score -= 15;
                      }
                    } else if (customerGender === 'Female') {
                      // Boost female-preferred services
                      if (femalePreferredKeywords.some(kw => serviceText.includes(kw))) {
                        score += 10;
                      } else if (malePreferredKeywords.filter(kw => kw !== 'haircut' && kw !== 'facial' && kw !== 'massage').some(kw => serviceText.includes(kw))) {
                        // Slightly reduce for male-only services
                        score -= 5;
                      }
                    }
                  }

                  // Category matching (STRICT - only exact or very close matches)
                  if (sessionData.preferences.category) {
                    const userCategory = sessionData.preferences.category.toLowerCase().trim();
                    const serviceCatLower = serviceCategory.toLowerCase().trim();
                  
                    // EXACT category match (highest priority)
                    if (serviceCatLower === userCategory) {
                      score += 40;
                      reasons.push(`Perfect match for ${sessionData.preferences.category} category`);
                    }
                    // Very close category match (e.g., "Hair" matches "Hair Care")
                    else if ((serviceCatLower.includes(userCategory) && userCategory.length > 4) || 
                             (userCategory.includes(serviceCatLower) && serviceCatLower.length > 4)) {
                      score += 25;
                      reasons.push(`Matches ${sessionData.preferences.category} category`);
                    }
                    // Only allow word matches for multi-word categories where it's a primary word
                    else {
                      const userWords = userCategory.split(' ').filter(w => w.length > 3);
                      const serviceWords = serviceCatLower.split(' ').filter(w => w.length > 3);
                      
                      // Check if primary words match (first word is important)
                      if (userWords.length > 0 && serviceWords.length > 0) {
                        if (userWords[0] === serviceWords[0]) {
                          score += 15;
                          reasons.push(`Related ${serviceCategory} service`);
                        }
                        // Don't give points for just "Care" or other common words
                      }
                    }
                } else {
                  // If no category preference, give small bonus for popular categories
                  score += 5;
                }

                // Service Description Analysis
                // Analyze service descriptions to find semantic similarity
                if (sessionData.preferences.category && customerAnalysis && customerAnalysis.preferred_services) {
                  // Find user's most booked services in the preferred category
                  const preferredServicesInCategory = Object.keys(customerAnalysis.preferred_services)
                    .filter(svcName => {
                      const svc = services.find(s => s.name === svcName);
                      return svc && svc.category && svc.category.toLowerCase() === sessionData.preferences.category.toLowerCase();
                    });
                  
                  if (preferredServicesInCategory.length > 0) {
                    // Compare description with preferred services
                    let maxSimilarity = 0;
                    preferredServicesInCategory.forEach(prefSvcName => {
                      const prefSvc = services.find(s => s.name === prefSvcName);
                      if (prefSvc && prefSvc.description) {
                        const similarity = calculateServiceSimilarity(
                          prefSvc.description,
                          serviceDescription,
                          prefSvc.category,
                          serviceCategory
                        );
                        maxSimilarity = Math.max(maxSimilarity, similarity);
                      }
                    });
                    
                    if (maxSimilarity > 0.3) {
                      score += Math.round(maxSimilarity * 20);
                      reasons.push(`Similar service type to what you usually book`);
                    }
                  }
                }

                // Analyze description for user's purpose/concerns
                if (sessionData.preferences.purpose || sessionData.preferences.concerns) {
                  const userText = ((sessionData.preferences.purpose || '') + ' ' + (sessionData.preferences.concerns || '')).toLowerCase();
                  const userKeywords = extractKeywords(userText);
                  const serviceKeywords = extractKeywords(serviceDescription);
                  
                  const matchingKeywords = userKeywords.filter(kw => serviceKeywords.includes(kw)).length;
                  if (matchingKeywords > 0) {
                    score += matchingKeywords * 8;
                    reasons.push(`Addresses your specific needs`);
                  }
                }

                // Use stored customer analysis (historical booking patterns)
                if (customerAnalysis) {
                  // Boost score for previously booked services (exact match)
                  if (customerAnalysis.preferred_services[service.name]) {
                    const frequency = customerAnalysis.preferred_services[service.name];
                    score += Math.min(frequency * 10, 35); // Max 35 points boost
                    reasons.push(`You've booked this ${frequency} time${frequency > 1 ? 's' : ''} before`);
                  }

                  // Boost score for preferred categories (exact category match only)
                  if (customerAnalysis.preferred_categories[serviceCategory]) {
                    const categoryFreq = customerAnalysis.preferred_categories[serviceCategory];
                    score += Math.min(categoryFreq * 6, 25); // Max 25 points boost
                    if (!reasons.some(r => r.includes('preferred') || r.includes('category'))) {
                      reasons.push(`Matches your preferred ${serviceCategory} category`);
                    }
                  }

                  // Description similarity with previously booked services
                  const bookedServiceNames = Object.keys(customerAnalysis.preferred_services || {});
                  if (bookedServiceNames.length > 0 && serviceDescription) {
                    let maxDescSimilarity = 0;
                    bookedServiceNames.forEach(bookedSvcName => {
                      const bookedSvc = services.find(s => s.name === bookedSvcName);
                      if (bookedSvc && bookedSvc.description) {
                        const similarity = calculateServiceSimilarity(
                          bookedSvc.description,
                          serviceDescription,
                          bookedSvc.category,
                          serviceCategory
                        );
                        maxDescSimilarity = Math.max(maxDescSimilarity, similarity);
                      }
                    });
                    
                    if (maxDescSimilarity > 0.4) {
                      score += Math.round(maxDescSimilarity * 15);
                      if (!reasons.some(r => r.includes('similar'))) {
                        reasons.push('Similar service type to what you usually book');
                      }
                    }
                  }

                  // Match price range preference
                  if (customerAnalysis.average_price_range) {
                    const avgPrice = parseFloat(customerAnalysis.average_price_range);
                    const priceDiff = Math.abs(servicePrice - avgPrice);
                    const priceRatio = priceDiff / (avgPrice || 1);
                    if (priceRatio <= 0.2) {
                      score += 12;
                      reasons.push('Matches your typical price range');
                    } else if (priceRatio <= 0.5) {
                      score += 6;
                    }
                  }

                  // Match duration preference
                  if (customerAnalysis.average_duration) {
                    const avgDuration = parseInt(customerAnalysis.average_duration);
                    const durationDiff = Math.abs(serviceDuration - avgDuration);
                    if (durationDiff <= 15) {
                      score += 8;
                      reasons.push('Fits your typical appointment duration');
                    } else if (durationDiff <= 30) {
                      score += 4;
                    }
                  }

                  // Consider booking frequency
                  if (customerAnalysis.booking_frequency === 'Frequent' && customerAnalysis.preferred_categories[serviceCategory]) {
                    score += 5; // Frequent customers get bonus for trying new things in familiar categories
                  }
                }

                // Penalize services that don't match category at all (if category preference exists)
                if (sessionData.preferences.category) {
                  const userCategory = sessionData.preferences.category.toLowerCase().trim();
                  const serviceCatLower = serviceCategory.toLowerCase().trim();
                  
                  // If categories are completely different and no similarity, reduce score
                  if (serviceCatLower !== userCategory && 
                      !serviceCatLower.includes(userCategory) && 
                      !userCategory.includes(serviceCatLower)) {
                    // Check if they share any meaningful words
                    const userWords = userCategory.split(' ').filter(w => w.length > 3);
                    const serviceWords = serviceCatLower.split(' ').filter(w => w.length > 3);
                    const sharedWords = userWords.filter(w => serviceWords.includes(w));
                    
                    // Only penalize if they share no meaningful words AND description doesn't help
                    if (sharedWords.length === 0) {
                      // Check description for similarity
                      const userCategoryInDesc = serviceDescription.includes(userCategory.split(' ')[0]);
                      if (!userCategoryInDesc) {
                        score -= 15; // Penalize unrelated services
                      }
                    }
                  }
                }

                // Price matching (flexible scoring, not hard filter)
                if (sessionData.preferences.maxPrice) {
                  if (servicePrice <= sessionData.preferences.maxPrice) {
                    score += 20;
                    reasons.push(`Within your budget (PHP${servicePrice.toFixed(2)})`);
                  } else if (servicePrice <= sessionData.preferences.maxPrice * 1.5) {
                    // Allow slightly over budget
                    score += 10;
                    reasons.push(`Slightly over budget but great value`);
                  } else {
                    // Don't penalize too much, just reduce score
                    score -= 5;
                  }
                }
                
                if (sessionData.preferences.minPrice && servicePrice >= sessionData.preferences.minPrice) {
                  score += 10;
                }

                // Duration matching (flexible scoring, not hard filter)
                if (sessionData.preferences.maxDuration) {
                  if (serviceDuration <= sessionData.preferences.maxDuration) {
                    score += 15;
                    reasons.push(`Fits your time (${serviceDuration} minutes)`);
                  } else if (serviceDuration <= sessionData.preferences.maxDuration * 1.5) {
                    // Allow slightly longer
                    score += 8;
                    reasons.push(`Slightly longer but worthwhile`);
                  } else {
                    // Don't penalize too much
                    score -= 3;
                  }
                }
                
                if (sessionData.preferences.minDuration && serviceDuration >= sessionData.preferences.minDuration) {
                  score += 8;
                }

                // Bonus for services with detailed descriptions (helps with matching)
                if (service.description && service.description.length > 30) {
                  score += 3;
                }

                // Ensure minimum score
                score = Math.max(score, 25);

                return {
                  service,
                  score: Math.min(Math.round(score), 100),
                  reasons: reasons.length > 0 ? reasons : ['Recommended based on your preferences'],
                  confidence: score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low'
                };
              }).sort((a, b) => b.score - a.score).slice(0, 5);

                sessionData.completed = true;
                recommendations = scoredServices;

                // Update/analyze customer bookings after generating recommendations
                if (customerId || session.customer_id) {
                  analyzeCustomerBookings(customerId || session.customer_id, userId, () => {
                    // Analysis updated in background
                  });
                }

                if (scoredServices.length > 0) {
                  const historyNote = customerAnalysis && customerAnalysis.total_appointments > 0
                    ? ` Based on your booking history, `
                    : ` `;
                  aiResponse = `Perfect!${historyNote}I've found ${scoredServices.length} great service${scoredServices.length > 1 ? 's' : ''} for you. Here are my top recommendations:`;
                } else {
                  // Fallback: if somehow no services, suggest all available
                  const fallbackServices = services.slice(0, 5).map(service => ({
                    service,
                    score: 50,
                    reasons: ['Available service that might interest you'],
                    confidence: 'Medium'
                  }));
                  recommendations = fallbackServices;
                  aiResponse = `I've selected some of our popular services for you:`;
                }

                // Update session in database
                db.query(
                  'UPDATE ai_chat_sessions SET session_data = ?, updated_at = NOW() WHERE id = ?',
                  [JSON.stringify(sessionData), sessionId],
                  (updateErr) => {
                    if (updateErr) return handleDbError(res, updateErr, 'UPDATE session');

                    res.json({
                      message: aiResponse,
                      recommendations: recommendations,
                      completed: sessionData.completed,
                      preferences: sessionData.preferences,
                      nextQuestionIndex: sessionData.currentQuestionIndex
                    });
                  }
                );
              });
            } else {
              // Ask next question
              const nextQuestion = questions[sessionData.currentQuestionIndex];
              aiResponse = nextQuestion.question;

              // Update session in database
              db.query(
                'UPDATE ai_chat_sessions SET session_data = ?, updated_at = NOW() WHERE id = ?',
                [JSON.stringify(sessionData), sessionId],
                (updateErr) => {
                  if (updateErr) return handleDbError(res, updateErr, 'UPDATE session');

                  res.json({
                    message: aiResponse,
                    recommendations: recommendations,
                    completed: sessionData.completed,
                    preferences: sessionData.preferences,
                    nextQuestionIndex: sessionData.currentQuestionIndex
                  });
                }
              );
            }
          }
        }
      );
    }
  );
});

// POST: Start new chat session
router.post('/chat/new', (req, res) => {
  const { userId, customerId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const initialData = {
    messages: [],
    preferences: {},
    currentQuestionIndex: 0,
    completed: false
  };

  db.query(
    'INSERT INTO ai_chat_sessions (customer_id, user_id, session_data) VALUES (?, ?, ?)',
    [customerId || null, userId, JSON.stringify(initialData)],
    (err, result) => {
      if (err) return handleDbError(res, err, 'CREATE new session');
      
      res.json({
        id: result.insertId,
        data: initialData,
        message: "Hi! I'm your AI spa assistant. What brings you here today? Are you looking for relaxation, beauty treatments, or something specific?"
      });
    }
  );
});

export default router;


