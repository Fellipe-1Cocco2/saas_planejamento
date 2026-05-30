// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  // 1. Pega a "pulseira" (token) que o frontend enviou no cabeçalho
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    // 2. Confere se a pulseira é verdadeira
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. VERIFICA SE O USUÁRIO AINDA EXISTE NO BANCO (Isso mata o bug do reset!)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado. Faça login novamente.' });
    }

    // Se o usuário foi rebaixado para pendente, bloqueia também
    if (user.status === 'pendente') {
      return res.status(403).json({ message: 'Conta em análise.' });
    }

    // 4. Salva as infos do usuário na requisição e libera a passagem
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
};