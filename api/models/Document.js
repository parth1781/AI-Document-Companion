import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  extractedText: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Document', DocumentSchema);
