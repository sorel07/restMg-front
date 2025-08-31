import { logout } from '../services/auth';

/**
 * Ejemplo de implementación de logout
 * Este código puede ser usado en cualquier página que tenga un botón de logout
 */

// Función para manejar logout
function handleLogout() {
  console.log('handleLogout called');
  const modal = document.getElementById('logout-confirmation-modal') as HTMLElement;
  console.log('Modal found:', modal);
  if (!modal) {
    // Fallback to confirm if modal is not found
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
    }
    return;
  }

  const titleEl = modal.querySelector('#logout-confirmation-modal-title') as HTMLElement;
  const messageEl = modal.querySelector('#logout-confirmation-modal-message') as HTMLElement;
  const confirmBtn = modal.querySelector('#logout-confirmation-modal-confirm-btn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#logout-confirmation-modal-cancel-btn') as HTMLButtonElement;

  if (titleEl) titleEl.textContent = 'Cerrar Sesión';
  if (messageEl) messageEl.textContent = '¿Estás seguro de que deseas cerrar sesión?';

  modal.style.display = 'flex';

  const onConfirm = () => {
    logout();
    closeModal();
  };

  const closeModal = () => {
    modal.style.display = 'none';
    confirmBtn.removeEventListener('click', onConfirm);
    cancelBtn.removeEventListener('click', closeModal);
  };

  confirmBtn.addEventListener('click', onConfirm);
  cancelBtn.addEventListener('click', closeModal);
}

// Auto-configurar botones de logout cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  // Buscar todos los botones de logout
  const logoutButtons = document.querySelectorAll('[data-logout-btn], .logout-btn, #logout-btn');
  console.log('Logout buttons found:', logoutButtons);
  
  logoutButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Logout button clicked');
      handleLogout();
    });
  });
});

// Exportar para uso manual si es necesario
export { handleLogout };
