import axios from 'axios';

// Ollama API configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'; // Default model, can be changed

/**
 * Get response from Ollama with context
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} systemContext - System data to provide context
 * @returns {Promise<string>} - AI response
 */
export async function getOllamaResponse(messages, systemContext = {}) {
  try {
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(systemContext);
    
    // Prepare messages for Ollama API
    const ollamaMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages
    ];

    // Call Ollama API
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false
      },
      {
        timeout: 60000 // 60 second timeout
      }
    );

    if (response.data && response.data.message && response.data.message.content) {
      return response.data.message.content;
    }

    throw new Error('Invalid response from Ollama');
  } catch (error) {
    console.error('Ollama API Error:', error.message);
    
    // Fallback response if Ollama is not available
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error('Ollama service is not available. Please ensure Ollama is running on ' + OLLAMA_BASE_URL);
    }
    
    throw error;
  }
}

/**
 * Build system prompt with system context
 * @param {Object} systemContext - Context data from the system
 * @returns {string} - Formatted system prompt
 */
function buildSystemPrompt(systemContext) {
  const {
    userInfo,
    customerInfo,
    services = [],
    appointments = [],
    customerAnalysis = null,
    businessData = null,
    isAdmin = false
  } = systemContext;

  // Admin users get business-focused, concise prompts
  if (isAdmin && userInfo?.role === 'admin') {
    return buildAdminPrompt(systemContext);
  }

  // Customer-facing prompt
  let prompt = `You are a helpful AI assistant for a spa management system in the Philippines. Your role is to assist users with:
- Answering questions about spa services
- Providing recommendations based on customer history
- General spa-related inquiries
- Never invent prices, services or durations, always use the prices, services, and durations from the database
- prices should be in Philippine Pesos (PHP)

Be friendly, professional, and concise, also use a Filipino accent.`;

  // Add user context
  if (userInfo) {
    prompt += `\n\nCurrent User: ${userInfo.name} (${userInfo.role})`;
  }

  // Add customer context
  if (customerInfo) {
    prompt += `\n\nCustomer Information:
- Name: ${customerInfo.name}
- Preferred Service Category: ${customerInfo.service || 'Not specified'}
- Total Visits: ${customerInfo.visits || 0}
- Status: ${customerInfo.status || 'Active'}`;
  }

  // Add customer analysis
  if (customerAnalysis) {
    prompt += `\n\nCustomer Preferences:
- Preferred Categories: ${JSON.stringify(customerAnalysis.preferred_categories || {})}
- Preferred Services: ${JSON.stringify(customerAnalysis.preferred_services || {})}
- Average Price Range: $${customerAnalysis.average_price_range || 'N/A'}
- Booking Frequency: ${customerAnalysis.booking_frequency || 'N/A'}`;
  }

  // Add available services
  if (services && services.length > 0) {
    prompt += `\n\nAvailable Services (use exact names when booking):`;
    services.slice(0, 20).forEach(service => {
      prompt += `\n- ${service.name} (${service.category}): PHP ${service.price} - ${service.duration_minutes} minutes`;
      if (service.description) {
        prompt += ` - ${service.description.substring(0, 100)}`;
      }
    });
  }

  // Add available staff if provided
  if (systemContext.staff && systemContext.staff.length > 0) {
    prompt += `\n\nAvailable Staff:`;
    systemContext.staff.forEach(staff => {
      prompt += `\n- ${staff.name} (ID: ${staff.id})`;
    });
  }

  // Add recent appointments
  if (appointments && appointments.length > 0) {
    prompt += `\n\nRecent Appointments:`;
    appointments.slice(0, 10).forEach(apt => {
      prompt += `\n- ${apt.service} on ${apt.appointment_date} (${apt.status})`;
    });
  }

  prompt += `\n\n=== APPOINTMENT BOOKING ===
You can help customers book appointments. When a customer wants to book:
1. Extract the following information from their message:
   - Service name (must match exactly with available services)
   - Date (format: YYYY-MM-DD)
   - Time (format: HH:MM in 24-hour format)
   - Staff name with ID (must match exactly with available staff with ID)
   - Optional: Staff preference, notes

2. If any required information is missing, ask the customer for it clearly.

3. When you have all required information, respond with a JSON object in this exact format:
   {"action": "book_appointment", "service": "Service Name", "date": "YYYY-MM-DD", "time": "HH:MM", "staff_name": "Staff Name with ID", "notes": ""}

4. Important booking rules:
   - Service name must match exactly with available services from the database
   - Date must be in YYYY-MM-DD format
   - Time must be in HH:MM format (24-hour, e.g., "14:30" for 2:30 PM)
   - Staff name with ID must match exactly with available staff with ID from the database
   - Only use services that are listed in the available services
   - If customer mentions a date like "tomorrow" or "next week", calculate the actual date
   - If customer mentions time like "2pm" or "afternoon", convert to 24-hour format

5. After booking is confirmed, provide a friendly confirmation message.

Remember to:
- Use the customer's history and preferences when making recommendations
- Be specific about service details when asked
- Help users understand pricing and duration
- Maintain context from previous messages in the conversation
- Always verify service names match exactly with available services`;

  return prompt;
}

/**
 * Build admin-focused system prompt for business analysis
 * @param {Object} systemContext - Context data from the system
 * @returns {string} - Formatted system prompt for admin
 */
function buildAdminPrompt(systemContext) {
  const {
    userInfo,
    businessData = {},
    services = [],
    appointments = []
  } = systemContext;

  let prompt = `You are a business intelligence AI assistant for a spa management system. Your role is to:
- Analyze business data and provide actionable insights
- Identify trends, patterns, and opportunities for improvement
- Suggest specific actions to optimize operations and increase revenue
- Be concise, professional, and data-driven in all responses
- Never invent prices, services or durations, always use the prices, services, and durations from the database
- prices should be in Philippine Pesos (PHP)

Communication Style:
- Use bullet points for clarity
- Provide specific metrics and numbers
- Focus on actionable recommendations
- Keep responses brief and to the point
- Use business terminology appropriately`;

  // Add business analytics data
  if (businessData) {
    prompt += `\n\n=== BUSINESS ANALYTICS DATA ===\n`;

    if (businessData.salesData) {
      const sales = businessData.salesData;
      prompt += `\nSales Performance:\n`;
      if (sales.totalRevenue) prompt += `- Total Revenue: $${sales.totalRevenue}\n`;
      if (sales.totalTransactions) prompt += `- Total Transactions: ${sales.totalTransactions}\n`;
      if (sales.averageTransaction) prompt += `- Average Transaction Value: $${sales.averageTransaction}\n`;
      if (sales.revenueGrowth) prompt += `- Revenue Growth: ${sales.revenueGrowth}%\n`;
    }

    if (businessData.appointmentData) {
      const apts = businessData.appointmentData;
      prompt += `\nAppointment Metrics:\n`;
      if (apts.totalAppointments) prompt += `- Total Appointments: ${apts.totalAppointments}\n`;
      if (apts.completedAppointments) prompt += `- Completed: ${apts.completedAppointments}\n`;
      if (apts.cancelledAppointments) prompt += `- Cancelled: ${apts.cancelledAppointments}\n`;
      if (apts.noShowRate) prompt += `- No-Show Rate: ${apts.noShowRate}%\n`;
      if (apts.peakHours) {
        prompt += `- Peak Hours: ${apts.peakHours.join(', ')}\n`;
      }
    }

    if (businessData.customerData) {
      const customers = businessData.customerData;
      prompt += `\nCustomer Metrics:\n`;
      if (customers.totalCustomers) prompt += `- Total Customers: ${customers.totalCustomers}\n`;
      if (customers.activeCustomers) prompt += `- Active Customers: ${customers.activeCustomers}\n`;
      if (customers.newCustomers) prompt += `- New Customers (this period): ${customers.newCustomers}\n`;
      if (customers.averageVisits) prompt += `- Average Visits per Customer: ${customers.averageVisits}\n`;
      if (customers.retentionRate) prompt += `- Customer Retention Rate: ${customers.retentionRate}%\n`;
    }

    if (businessData.inventoryData) {
      const inventory = businessData.inventoryData;
      prompt += `\nInventory Status:\n`;
      if (inventory.lowStockItems) prompt += `- Low Stock Items: ${inventory.lowStockItems}\n`;
      if (inventory.totalProducts) prompt += `- Total Products: ${inventory.totalProducts}\n`;
      if (inventory.outOfStockItems) prompt += `- Out of Stock: ${inventory.outOfStockItems}\n`;
    }

    if (businessData.servicePerformance) {
      const services = businessData.servicePerformance;
      prompt += `\nService Performance:\n`;
      if (services.topServices && services.topServices.length > 0) {
        prompt += `- Top Performing Services:\n`;
        services.topServices.forEach((svc, idx) => {
          prompt += `  ${idx + 1}. ${svc.name}: ${svc.bookings} bookings, $${svc.revenue} revenue\n`;
        });
      }
      if (services.underperformingServices && services.underperformingServices.length > 0) {
        prompt += `- Underperforming Services:\n`;
        services.underperformingServices.forEach((svc, idx) => {
          prompt += `  ${idx + 1}. ${svc.name}: ${svc.bookings} bookings\n`;
        });
      }
    }

    if (businessData.staffPerformance) {
      const staff = businessData.staffPerformance;
      prompt += `\nStaff Performance:\n`;
      if (staff.topPerformers && staff.topPerformers.length > 0) {
        prompt += `- Top Performers:\n`;
        staff.topPerformers.forEach((member, idx) => {
          prompt += `  ${idx + 1}. ${member.name}: ${member.appointments} appointments, ${member.rating || 'N/A'} rating\n`;
        });
      }
    }

    if (businessData.revenueTrends) {
      const trends = businessData.revenueTrends;
      prompt += `\nRevenue Trends:\n`;
      if (trends.dailyAverage) prompt += `- Daily Average: $${trends.dailyAverage}\n`;
      if (trends.weeklyAverage) prompt += `- Weekly Average: $${trends.weeklyAverage}\n`;
      if (trends.monthlyAverage) prompt += `- Monthly Average: $${trends.monthlyAverage}\n`;
      if (trends.growthTrend) prompt += `- Growth Trend: ${trends.growthTrend}\n`;
    }
  }

  // Add available services summary
  if (services && services.length > 0) {
    prompt += `\n\nAvailable Services: ${services.length} total services`;
    const categories = {};
    services.forEach(svc => {
      categories[svc.category] = (categories[svc.category] || 0) + 1;
    });
    prompt += `\nService Categories: ${Object.keys(categories).join(', ')}`;
  }

  prompt += `\n\n=== ANALYSIS GUIDELINES ===
When analyzing data:
1. Identify the most critical issues first
2. Provide specific, actionable recommendations
3. Quantify potential impact where possible
4. Prioritize recommendations by impact and feasibility
5. Use data to support all conclusions
6. Be concise - aim for 3-5 key points per response`;

  return prompt;
}

/**
 * Get conversation history for context
 * @param {Array} messages - Array of message objects from database
 * @param {number} maxMessages - Maximum number of messages to include
 * @returns {Array} - Formatted messages for Ollama
 */
export function formatMessagesForOllama(messages, maxMessages = 20) {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Get the most recent messages
  const recentMessages = messages.slice(-maxMessages);

  return recentMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
}

