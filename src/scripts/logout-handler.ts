import { logout } from '../services/auth';

/**
 * Ejemplo de implementación de logout
 * Este código puede ser usado en cualquier página que tenga un botón de logout
 */

// Función para manejar logout
function handleLogout() {
  // Mostrar confirmación opcional
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    logout();
  }
}

// Auto-configurar botones de logout cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Buscar todos los botones de logout
  const logoutButtons = document.querySelectorAll('[data-logout-btn], .logout-btn, #logout-btn');
  
  logoutButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
});

// Exportar para uso manual si es necesario
export { handleLogout };
