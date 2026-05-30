// src/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nome: { type: String, required: true },
  cat: { type: String, required: true }, // CLIENTE, COMERCIAL, ESTUDO, etc.
  cliente: { type: String, default: '' },
  min: { type: Number, required: true }, // Tempo total em minutos
  prio: { type: String, enum: ['P1', 'P2', 'P3'], default: 'P2' },
  obs: { type: String, default: '' },
  
  // Controle do Planejamento Semanal (Arrebanhado pelo Drag and Drop futuramente)
  done: { type: Boolean, default: false },
  pct: { type: Number, default: null },
  dia: { type: String, default: '' }, // Segunda, Terça...
  blocoId: { type: String, default: '' }, // manha, tarde, noite...
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);