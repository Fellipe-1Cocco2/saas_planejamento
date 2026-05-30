const express = require('express');
const router = express.Router();
const Team = require('../models/Team'); 
const emailService = require('../utils/emailService'); 

// 🔐 IMPORTAÇÃO CORRETA: Sem chaves, pois seu arquivo exporta a função direto!
const authMiddleware = require('../middlewares/authMiddleware'); 

// =========================================
// ROTAS DE EQUIPE GLOBAL (WORKSPACE)
// =========================================

// 1. Buscar a equipe do Workspace (GET /api/team)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Ajustado para req.user._id (padrão do MongoDB injetado pelo seu middleware)
    const equipe = await Team.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    
    const equipeFormatada = equipe.map(m => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
      status: m.status
    }));

    res.json(equipeFormatada);
  } catch (err) {
    console.error('Erro ao buscar equipe:', err);
    res.status(500).json({ error: 'Erro ao buscar equipe.' });
  }
});

// 2. Convidar novo membro (POST /api/team/invite)
router.post('/invite', authMiddleware, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

  try {
    // Ajustado para req.user._id
    const jaExiste = await Team.findOne({ ownerId: req.user._id, email: email });
    if (jaExiste) return res.status(400).json({ error: 'Membro já está na equipe.' });

    const nomeProvisorio = email.split('@')[0].replace('.', ' ');

    const novoMembro = new Team({
      ownerId: req.user._id,
      name: nomeProvisorio,
      email: email,
      status: 'pending' 
    });
    
    await novoMembro.save();

    // Dispara o e-mail pegando o nome do patrão direto do req.user preenchido pelo middleware
    try {
      await emailService.enviarConviteWorkspace(email, req.user.name || 'O Administrador');
    } catch (emailErr) {
      console.log('Aviso: Membro salvo, mas e-mail falhou.', emailErr.message);
    }

    res.status(201).json(novoMembro);
  } catch (err) {
    console.error('Erro ao convidar:', err);
    res.status(500).json({ error: 'Erro ao processar o convite.' });
  }
});

// 3. Remover membro da equipe (DELETE /api/team/:id)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Ajustado para req.user._id
    await Team.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    res.status(200).json({ message: 'Acesso revogado com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover membro:', err);
    res.status(500).json({ error: 'Erro ao remover membro.' });
  }
});

module.exports = router;