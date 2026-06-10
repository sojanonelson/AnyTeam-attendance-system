import mongoose, { Schema } from 'mongoose';

const AdminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['system_admin', 'team_admin'], default: 'team_admin' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
