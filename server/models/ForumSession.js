import mongoose from 'mongoose';

const ForumSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  history: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
    isHidden: { type: Boolean, default: false }
  }],
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model('ForumSession', ForumSessionSchema);
