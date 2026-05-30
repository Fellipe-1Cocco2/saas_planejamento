// models/Team.js
const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  // O ID do Patrão (dono do Workspace)
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['pending', 'ativo'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', TeamSchema);