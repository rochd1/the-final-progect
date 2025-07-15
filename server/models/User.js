import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  passwordHash: String,
  username: String,
  vibeCode: {
    type: String,
    required: true,
    index: true, // helps query faster
    trim: true
  },
  avatarUrl: String,
  theme: { type: String, default: 'light' }
});

export default mongoose.model('User', userSchema);
