function showToast(message, type = 'info', duration = 5000) {
  // Cria o container se não existir
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // Ícones dependendo do tipo
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  // Monta o Popup
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${message}</div>
    <div class="toast-progress"><div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div></div>
  `;

  container.appendChild(toast);

  // Faz ele sumir quando a barra acabar
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300); // Remove do HTML após animação de saída
  }, duration);
}