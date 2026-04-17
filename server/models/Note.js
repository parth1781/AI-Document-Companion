import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  highlightedText: { type: String, required: true },
  noteText: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Note', NoteSchema);
