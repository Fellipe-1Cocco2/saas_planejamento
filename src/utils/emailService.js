const nodemailer = require('nodemailer');

// Configura o "transportador" de e-mail (usando Gmail como padrão de teste)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 1. E-mail enviado quando o usuário se cadastra e fica PENDENTE
exports.enviarEmailAguardar = async (emailDestino, nomeUsuario) => {
  const mailOptions = {
    from: `"Planner SaaS" <${process.env.EMAIL_USER}>`,
    to: emailDestino,
    subject: 'Sua solicitação de acesso está em análise! ⏳',
    text: `Olá, ${nomeUsuario}!\n\nCaro usuário, sua conta é nova na plataforma. Sua solicitação de login será analisada pelo administrador da ferramenta (prazo de 1 a 3 dias úteis para liberação).\n\nAssim que sua conta for liberada, você receberá um novo e-mail de confirmação por aqui.\n\nAtenciosamente,\nEquipe Planner SaaS`
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Credenciais de e-mail não configuradas no .env. Pulando envio de e-mail.');
      return;
    }
    await transporter.sendMail(mailOptions);
    console.log(`📧 E-mail de espera enviado com sucesso para: ${emailDestino}`);
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de espera:', error.message);
  }
};

// 2. E-mail enviado quando o Admin clica em APROVAR
exports.enviarEmailAprovado = async (emailDestino, nomeUsuario) => {
  const mailOptions = {
    from: `"Planner SaaS" <${process.env.EMAIL_USER}>`,
    to: emailDestino,
    subject: 'Sua conta foi liberada! 🎉',
    text: `Olá, ${nomeUsuario}!\n\nBoas notícias! Sua conta foi analisada e aprovada pelo administrador do sistema.\n\nAgora você já tem acesso total à plataforma de planejamento. Você pode entrar normalmente utilizando o seu login do Google.\n\nAcesse agora: http://localhost:5000\n\nSeja muito bem-vindo(a)!\nEquipe Planner SaaS`
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    await transporter.sendMail(mailOptions);
    console.log(`📧 E-mail de aprovação enviado com sucesso para: ${emailDestino}`);
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de aprovação:', error.message);
  }
};

// 3. E-mail enviado PARA VOCÊ (O Admin) quando alguém novo tentar entrar
exports.enviarEmailNovaSolicitacaoAdmin = async (nomeNovoUsuario, emailNovoUsuario) => {
  const mailOptions = {
    from: `"Sistema Planner" <${process.env.EMAIL_USER}>`,
    to: 'aparecidofellipe905@gmail.com', // O seu e-mail direto aqui!
    subject: `🚨 Novo pedido de acesso: ${nomeNovoUsuario}`,
    text: `Fala chefe!\n\nUm novo usuário acabou de tentar acessar o sistema e está na fila aguardando sua aprovação.\n\n👤 Nome: ${nomeNovoUsuario}\n📧 E-mail: ${emailNovoUsuario}\n\nAcesse o painel para liberar a entrada: http://localhost:5000/admin\n\nBora trabalhar!`
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    await transporter.sendMail(mailOptions);
    console.log(`📧 Alerta de novo usuário enviado para o Admin (você)!`);
  } catch (error) {
    console.error('❌ Erro ao enviar alerta para o Admin:', error.message);
  }
};

// 4. E-mail enviado para o funcionário convidado pelo Patrão
exports.enviarConviteWorkspace = async (emailFuncionario, nomePatrao) => {
  const mailOptions = {
    from: `"Planner SaaS" <${process.env.EMAIL_USER}>`,
    to: emailFuncionario,
    subject: `Convite de Trabalho: ${nomePatrao} te chamou para a equipe! 🚀`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; color: #333333;">
        <h2 style="color: #3b71ca; margin-top: 0;">Você foi convocado! 🎉</h2>
        <p>Olá!</p>
        <p>O administrador <strong>${nomePatrao}</strong> acabou de adicionar o seu e-mail à equipe do Workspace global.</p>
        <p>A partir de agora, as tarefas que ele delegar para você aparecerão no seu painel de controle. Clique no botão abaixo para concluir o seu cadastro e acessar o sistema:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5000/register?email=${emailFuncionario}" style="background-color: #6daa40; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Aceitar Convite e Acessar</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <p style="font-size: 12px; color: #888888; margin-bottom: 0;">Se você não esperava por este e-mail, pode ignorá-lo com segurança.</p>
      </div>
    `
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Credenciais de e-mail não configuradas no .env. Pulando envio de convite.');
      return;
    }
    await transporter.sendMail(mailOptions);
    console.log(`📧 E-mail de convite enviado com sucesso para: ${emailFuncionario}`);
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de convite:', error.message);
  }
};