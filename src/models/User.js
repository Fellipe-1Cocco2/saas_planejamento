const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['patrao', 'empregado'], default: 'patrao' },
  // NOVO: Controle de acesso
  status: { type: String, enum: ['pendente', 'aprovado'], default: 'pendente' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);