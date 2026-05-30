// src/models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ID do Patrão
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array com IDs dos empregados
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);