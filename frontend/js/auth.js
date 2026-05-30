const GOOGLE_CLIENT_ID = "170566306205-mesjp20nf05b3ilkbl67jpvmfig4qgon.apps.googleusercontent.com";

window.onload = function () {
  // Se o usuário já estiver logado (tiver o token), manda direto pro App
  if (localStorage.getItem('saas_token')) {
    window.location.href = '/app';
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin
  });
  
  google.accounts.id.renderButton(
    document.getElementById("google-button-container"),
    { theme: "filled_black", size: "large", shape: "pill" }
  );
};

async function handleGoogleLogin(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    
    const data = await res.json();
    
    if(data.token) {
      localStorage.setItem('saas_token', data.token);
      localStorage.setItem('saas_user', JSON.stringify(data.user));
      
      // Login com sucesso! Redireciona para o painel principal
      window.location.href = '/app';
    } else {
      showToast(data.message || 'Erro desconhecido.', 'warning', 8000);
    }
  } catch (err) {
    console.error(err);
    showToast('Erro de conexão com o servidor.', 'error');
  }
} 