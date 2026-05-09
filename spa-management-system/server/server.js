import express from 'express';
import cors from 'cors';

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



const app = express();
app.use(cors());
app.use(express.json());

// REGISTER ROUTES
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


// START SERVER
app.listen(5000, () => console.log('Server running on port 5000'));
