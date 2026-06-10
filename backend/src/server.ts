import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin';
import adminRouter from './routes/admin';
import memberRouter from './routes/member';
import qrRouter from './routes/qr';
import reportsRouter from './routes/reports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/anyteam-attendance';

// Middleware
app.use(cors());
// Increase limit to handle base64 profile image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/admin', adminRouter);
app.use('/api/member', memberRouter);
app.use('/api/qr', qrRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Seed default System Admin user if not exists
const seedSystemAdmin = async () => {
  try {
    // Delete old default sysadmin if exists
    await Admin.deleteOne({ username: 'sysadmin' });

    const existing = await Admin.findOne({ username: 'sojan@admin.com' });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('sojan#54', salt);
      const sysAdmin = new Admin({
        username: 'sojan@admin.com',
        password: hashedPassword,
        role: 'system_admin'
      });
      await sysAdmin.save();
      console.log('Seeded default System Admin account: sojan@admin.com / sojan#54');
    }
  } catch (err) {
    console.error('Failed to seed System Admin:', err);
  }
};

// Database connection & start server
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedSystemAdmin();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    console.log('Starting server anyway (in offline mode)...');
    app.listen(PORT, () => {
      console.log(`Server running without database on port ${PORT}`);
    });
  });
