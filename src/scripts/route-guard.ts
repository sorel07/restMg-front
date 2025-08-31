import { canAccessRoute, getCurrentUser } from '../services/role-guard';

// Verificar si el usuario puede acceder a esta ruta
function checkRouteAccess(): void {
  const currentPath = window.location.pathname;
  
  if (!canAccessRoute(currentPath)) {
    // Si no puede acceder, redirigir según el rol
    const user = getCurrentUser();
    
    if (!user) {
      // No hay usuario logueado, ir al login
      window.location.href = '/login';
      return;
    }
    
    // Redirigir según el rol
    if (user.role === 'Kitchen') {
      window.location.href = '/kitchen';
    } else if (user.role === 'Awaiter') {
      window.location.href = '/awaiter';
    } else {
      window.location.href = '/admin';
    }
  }
}

export { checkRouteAccess };
