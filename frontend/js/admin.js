let senhaAtual = '';

async function acessarAdmin() {
  const senhaInput = document.getElementById('senha-admin').value;
  if (!senhaInput) return alert('Digite a senha!');

  senhaAtual = senhaInput;
  await carregarPendentes();
}

async function carregarPendentes() {
  try {
    const res = await fetch('/api/admin/pendentes', {
      method: 'GET',
      headers: { 'admin-senha': senhaAtual }
    });

    if (res.status === 401) {
      showToast('Senha incorreta!', 'error')
      return;
    }

    const usuarios = await res.json();
    
    // Se a senha estiver certa, esconde o login e mostra o painel
    document.getElementById('tela-senha').style.display = 'none';
    document.getElementById('tela-dashboard').style.display = 'block';

    renderizarLista(usuarios);
  } catch (err) {
    console.error(err);
    showToast('Erro ao conectar com o servidor Backend.', 'error')
  }
}

function renderizarLista(usuarios) {
  const container = document.getElementById('lista-pendentes');
  
  if (usuarios.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--tm); font-size:13px; border:1px dashed var(--bm); border-radius:var(--r);">Nenhuma solicitação pendente no momento.</div>';
    return;
  }

  container.innerHTML = usuarios.map(user => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--s2); padding:12px 15px; border-radius:var(--r); border:1px solid var(--b);">
      <div>
        <div style="font-size:14px; font-weight:500; margin-bottom:4px;">${user.name}</div>
        <div style="font-size:12px; color:var(--tm);">${user.email}</div>
      </div>
      <button class="btn sm" style="background:#0a2a1e; color:#4ec99a; border-color:#1a5a3a;" onclick="aprovarUsuario('${user._id}')">
        ✓ Aprovar
      </button>
    </div>
  `).join('');
}

async function aprovarUsuario(id) {
  if (!confirm('Tem certeza que deseja aprovar este usuário como Patrão?')) return;

  try {
    const res = await fetch(`/api/admin/aprovar/${id}`, {
      method: 'POST',
      headers: { 'admin-senha': senhaAtual }
    });

    if (res.ok) {
      showToast('Usuário aprovado com sucesso!', 'success')
      carregarPendentes(); // Atualiza a lista
    } else {
      showToast('Erro ao aprovar usuário.', 'error')
    }
  } catch (err) {
    console.error(err);
    showToast('Erro de conexão.', 'error')
  }
}

function sairAdmin() {
  senhaAtual = '';
  document.getElementById('senha-admin').value = '';
  document.getElementById('tela-dashboard').style.display = 'none';
  document.getElementById('tela-senha').style.display = 'block';
}