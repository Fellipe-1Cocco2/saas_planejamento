const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa o Banco de Dados
connectDB();

// =========================================
// MIDDLEWARES DE ARQUIVOS ESTÁTICOS
// =========================================
// Libera o acesso público aos arquivos da pasta frontend (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, '../frontend')));

// =========================================
// ROTAS DE PAGINAÇÃO (ENTREGA DOS HTMLs)
// =========================================

// Rota raiz (localhost:5000) e /login - entrega o login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// localhost:5000/admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// localhost:5000/app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/app.html'));
});

// localhost:5000/register
// ✨ CORRIGIDO: O caminho correto para achar os arquivos HTML na raiz voltando uma pasta do 'src'
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// =========================================
// ENDPOINTS OFICIAIS DA API (PROCESSAMENTO)
// =========================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));

// =========================================
// INICIALIZAÇÃO DO SERVIDOR
// =========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👉 Acesse a aplicação em: http://localhost:${PORT}`);
});