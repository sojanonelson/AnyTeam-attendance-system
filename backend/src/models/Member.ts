import mongoose, { Schema } from 'mongoose';

const MemberSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // Encrypted
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  profileImage: { type: String, default: '' }, // Can be base64 string or url
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Member || mongoose.model('Member', MemberSchema);
