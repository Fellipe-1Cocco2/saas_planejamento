const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Team = require('../models/Team'); 
const authMiddleware = require('../middlewares/authMiddleware');

// Buscar Empresas do Workspace do Patrão (Sincronizado com o Empregado)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    
    console.log(`👤 [Acesso] Utilizador a solicitar empresas: ${req.user.email} | Cargo: ${req.user.role}`);

    // 1. SE FOR PATRÃO
    if (req.user.role === 'patrao') {
      query.ownerId = req.user._id;
    } 
    // 2. SE FOR EMPREGADO: Procura blindada contra espaços ocultos e letras maiúsculas
    else if (req.user.role === 'empregado') {
      const emailBusca = (req.user.email || '').trim();
      
      // Procura o convite na tabela Team ignorando espaços e case
      const convites = await Team.find({ 
        email: { $regex: new RegExp(`^\\s*${emailBusca}\\s*$`, 'i') } 
      });
      
      console.log(`🔍 [Empresas] Convites encontrados na tabela Team: ${convites.length}`);
      
      const patroesIds = convites.map(c => c.ownerId).filter(Boolean);
      console.log(`🔗 [Empresas] IDs dos Patrões para este empregado:`, patroesIds);
      
      if (patroesIds.length > 0) {
        query.ownerId = { $in: patroesIds };
      } else {
        console.log(`⚠️ [Aviso] Empregado sem patrão associado! A retornar 0 empresas.`);
        return res.json([]); 
      }
    }

    const companies = await Company.find(query).sort({ name: 1 });
    console.log(`🏢 [Empresas] Total de empresas devolvidas: ${companies.length}`);
    
    res.json(companies);
  } catch (err) {
    console.error('Erro ao buscar empresas:', err);
    res.status(500).json({ error: 'Erro ao buscar empresas do workspace.' });
  }
});

// Criar Empresa (Apenas Patrões)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'patrao') {
    return res.status(403).json({ error: 'Apenas administradores podem criar empresas.' });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da empresa é obrigatório.' });

  try {
    const novaEmpresa = new Company({
      name,
      ownerId: req.user._id 
    });
    await novaEmpresa.save();
    res.status(201).json(novaEmpresa);
  } catch (err) {
    console.error('Erro ao criar empresa:', err);
    res.status(500).json({ error: 'Erro ao criar empresa.' });
  }
});

module.exports = router;