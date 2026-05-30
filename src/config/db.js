const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Tenta conectar usando a URL que está no arquivo .env
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1); // Derruba o servidor se não conseguir conectar
  }
};

module.exports = connectDB;