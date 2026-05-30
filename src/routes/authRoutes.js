const express = require('express');
const router = express.Router();
const { googleLogin } = require('../controllers/authController');
const Team = require('../models/Team');
const authMiddleware = require('../middlewares/authMiddleware'); // Importando o Segurança

// Rota de Login
router.post('/google', googleLogin);

// Rota para o frontend perguntar: "Eu ainda sou válido?"
router.get('/me', authMiddleware, (req, res) => {
  // Se passou pelo middleware, o token é válido e o usuário existe no BD!
  res.json({ user: req.user });
});

module.exports = router;