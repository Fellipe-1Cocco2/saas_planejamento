const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team'); 
const emailService = require('../utils/emailService');

const GOOGLE_CLIENT_ID = "170566306205-mesjp20nf05b3ilkbl67jpvmfig4qgon.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  const { credential } = req.body; 

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, name, email } = payload;

    // Procura no MongoDB se o usuário já existe
    let user = await User.findOne({ email });

    // --- CASO ESPECIAL: Usuário pendente que bate com um convite de equipe ---
    if (user && user.status === 'pendente') {
      // ✨ CORREÇÃO: Busca Case-Insensitive (Ignora Maiúsculas/Minúsculas)
      const convite = await Team.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      if (convite) {
        user.status = 'aprovado'; 
        user.role = 'empregado';
        if (!user.googleId) user.googleId = googleId;
        await user.save();

        convite.status = 'ativo';
        convite.name = name;
        await convite.save();
        console.log(`✨ Usuário pendente liberado como Empregado Ativo: ${email}`);
      }
    }

    // --- CASO 1: SE O USUÁRIO NÃO EXISTIR NO BANCO ---
    if (!user) {
  
      // ✨ CORREÇÃO: Busca Case-Insensitive (Ignora Maiúsculas/Minúsculas)
      const convite = await Team.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      
      if (convite) {
        user = new User({
          googleId: googleId, 
          name: name,
          email: email,
          status: 'aprovado', 
          role: 'empregado' 
        });
        await user.save();

        convite.status = 'ativo';
        convite.name = name;
        await convite.save();
        
        console.log(`👥 Funcionário ${email} registrado e aprovado via convite Google.`);
      } 
      // 2. CHANCE DO PATRÃO: Se for um usuário desconhecido tentando entrar
      else {
        user = new User({
          googleId: googleId, 
          name: name,
          email: email,
          status: 'pendente',
          role: 'patrao' // Seu enum aceita 'patrao' por padrão
        });
        await user.save();

        emailService.enviarEmailAguardar(email, name).catch(err => console.error("Erro email background:", err));
        emailService.enviarEmailNovaSolicitacaoAdmin(name, email).catch(err => console.error("Erro email background:", err));
        
        console.log(`⏳ Novo patrão ${email} retido na fila de análise. E-mails disparados em background.`);
        
        return res.status(403).json({ message: 'Conta em análise.' });
      }
    }

    // Se continuar pendente e sem convite, bloqueia direto (sem delay de e-mail)
    if (user.status === 'pendente') {
      return res.status(403).json({ message: 'Conta em análise.' });
    }

    // 4. Gera o seu token JWT normal
    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.json({ 
      token, 
      user: { name: user.name, email: user.email, role: user.role } 
    });

  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(401).json({ message: 'Falha na autenticação com o Google' });
  }
};