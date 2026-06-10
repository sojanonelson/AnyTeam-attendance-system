import mongoose, { Schema } from 'mongoose';

const TeamSchema = new Schema({
  name: { type: String, required: true, trim: true },
  inviteCode: { type: String, required: true, unique: true },
  invitePassword: { type: String, required: true }, // Simple join password
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
