import mongoose from 'mongoose';

const BuilderSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  idea: { type: String, required: true },
  workflows: {
    prd: { type: String, default: '' },
    architecture: { type: String, default: '' },
    scrum: { type: String, default: '' },
    risk: { type: String, default: '' },
    timeline: { type: String, default: '' }
  },
  lastUpdated: { type: Date, default: Date.now },
});

export default mongoose.model('BuilderSession', BuilderSessionSchema);
