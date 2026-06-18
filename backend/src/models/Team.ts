import mongoose, { Schema } from 'mongoose';

const TeamSchema = new Schema({
  name: { type: String, required: true, trim: true },
  inviteCode: { type: String, required: true, unique: true },
  invitePassword: { type: String, required: true }, // Simple join password
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  checkInQuestions: {
    type: [{
      questionText: { type: String, required: true },
      questionType: { type: String, enum: ['rating', 'short_answer'], default: 'short_answer' },
      options: [String]
    }],
    default: []
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
