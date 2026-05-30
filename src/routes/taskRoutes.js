const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Team = require('../models/Team');
const authMiddleware = require('../middlewares/authMiddleware');

// 1. Buscar TODAS as tarefas (Sincronizado entre Patrão e Funcionário)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'patrao') {
      query.assignedTo = req.user._id;
    } 
    else if (req.user.role === 'empregado') {
      const emailBusca = (req.user.email || '').trim();
      console.log(`🔍 [Tarefas] Empregado a pedir tarefas. Email: ${emailBusca}`);
      
      const convites = await Team.find({ 
        email: { $regex: new RegExp(`^${emailBusca}$`, 'i') } 
      });
      const patroesIds = convites.map(c => c.ownerId);
      
      console.log(`🔗 [Tarefas] ID dos Patrões associados:`, patroesIds);
      query.assignedTo = { $in: patroesIds };
    }

    const tasks = await Task.find(query).populate('companyId').sort({ dia: 1 });
    console.log(`📝 [Tarefas] Foram encontradas ${tasks.length} tarefas globais.`);
    res.json(tasks);
  } catch (err) {
    console.error('Erro ao carregar tarefas:', err);
    res.status(500).json({ error: 'Erro ao carregar tarefas.' });
  }
});

// 2. Buscar tarefas por Empresa Ativa
router.get('/:companyId', authMiddleware, async (req, res) => {
  try {
    let query = { companyId: req.params.companyId };

    if (req.user.role === 'patrao') {
      query.assignedTo = req.user._id;
    } 
    else if (req.user.role === 'empregado') {
      const emailBusca = (req.user.email || '').trim();
      const convites = await Team.find({ 
        email: { $regex: new RegExp(`^${emailBusca}$`, 'i') } 
      });
      const patroesIds = convites.map(c => c.ownerId);
      
      query.assignedTo = { $in: patroesIds };
    }

    const tasks = await Task.find(query).populate('companyId').sort({ dia: 1 });
    res.json(tasks);
  } catch (err) {
    console.error('Erro ao carregar tarefas da empresa:', err);
    res.status(500).json({ error: 'Erro ao carregar tarefas da empresa.' });
  }
});

// 3. Criar tarefa
router.post('/', authMiddleware, async (req, res) => {
  try {
    let donoId = req.user._id;

    if (req.user.role === 'empregado') {
      const emailBusca = (req.user.email || '').trim();
      const convite = await Team.findOne({ 
        email: { $regex: new RegExp(`^${emailBusca}$`, 'i') } 
      });
      if (convite) donoId = convite.ownerId;
    }

    const novaTarefa = new Task({
      ...req.body,
      assignedTo: donoId 
    });

    await novaTarefa.save();
    res.status(201).json(novaTarefa);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ error: 'Erro ao criar tarefa.' });
  }
});

// 4. Editar tarefa
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

    Object.assign(task, req.body);
    await task.save();
    res.json(task);
  } catch (err) {
    console.error('Erro ao editar tarefa:', err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

// 5. Deletar tarefa
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tarefa deletada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar tarefa.' });
  }
});

module.exports = router;