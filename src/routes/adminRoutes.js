const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware: Um "segurança" que verifica se a senha do Admin está correta
const adminAuth = (req, res, next) => {
  const senhaFornecida = req.headers['admin-senha'];
  if (senhaFornecida !== '123') {
    return res.status(401).json({ message: 'Acesso negado. Senha incorreta.' });
  }
  next(); // Se a senha for 123, pode passar!
};

// Rota para listar quem está aguardando aprovação
router.get('/pendentes', adminAuth, async (req, res) => {
  try {
    const usuarios = await User.find({ status: 'pendente' });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Rota para aprovar um usuário específico
router.post('/aprovar/:id', adminAuth, async (req, res) => {
  try {
    // Atualiza o status e nos devolve o usuário atualizado com { new: true }
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'aprovado' }, { new: true });
    
    if (user) {
      // DISPARAR E-MAIL DE CONFIRMAÇÃO
      const emailService = require('../utils/emailService');
      emailService.enviarEmailAprovado(user.email, user.name);
    }

    res.json({ message: 'Usuário aprovado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
});


// Rota provisória para limpar testes antigos
router.get('/resetarBD', async (req, res) => {
  await User.deleteMany({});
  res.send('Banco de usuários zerado! Volte lá e tente logar com o Google de novo.');
});

module.exports = router;