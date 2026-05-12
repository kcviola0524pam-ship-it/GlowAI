import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import customerRoutes from './routes/customer.js';
import checkinRoutes from './routes/checkins.js';
import staffRoutes from './routes/staff.js';
import paymentRoutes from './routes/payments.js';
import authRoutes from './routes/auth.js';
import auditRoutes from './routes/audit.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import appointmentRoutes from './routes/appointments.js';
import servicesRoutes from './routes/services.js';
import recommendationsRoutes from './routes/recommendations.js';
import reportsRoutes from './routes/reports.js';
import chatRoutes from './routes/chat.js';

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
app.use(cors());
app.use(express.json());

// ROOT ROUTE (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.json({ message: "GlowAI API is running 🚀" });
});

// ROUTES
app.use('/api/customer', customerRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);

// START SERVER (FIXED FOR RENDER)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});