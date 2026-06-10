import mongoose, { Schema } from 'mongoose';

const AttendanceLogSchema = new Schema({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date, default: null }, // Null if not checked out yet
  status: { type: String, enum: ['present', 'absent'], default: 'present' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.AttendanceLog || mongoose.model('AttendanceLog', AttendanceLogSchema);
