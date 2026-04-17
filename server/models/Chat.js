import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  role: { type: String, required: true, enum: ['user', 'model'] },
  content: { type: String, required: true },
  spokenSummary: { type: String }, // Optional, for the AI's spoken version
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Chat', ChatSchema);
