import { getUserSession } from './auth';

export type UserRole = 'Admin' | 'Kitchen' | 'Awaiter';

export interface UserInfo {
  userId: string;
  restaurantId: string;
  fullName: string;
  email: string;
  role: UserRole;
}

/**
 * Obtiene la información del usuario desde el token
 */
export function getCurrentUser(): UserInfo | null {
  try {
    const userSession = getUserSession();
    if (!userSession) return null;

    // Intentar obtener información adicional del localStorage
    const savedInfo = localStorage.getItem('user_info');
    const infoFromStorage = savedInfo ? JSON.parse(savedInfo) : {};

    return {
      ...infoFromStorage,
      userId: userSession.sub,
      email: userSession.email,
      // Dar prioridad al rol del token, pero usar el de localStorage si no existe
      role: (userSession.role || infoFromStorage?.role) as UserRole,
      // Dar prioridad al restaurantId del token, pero usar el de localStorage si no existe
      restaurantId: userSession.restaurantId || infoFromStorage?.restaurantId,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Verifica si el usuario tiene el rol requerido
 */
export function hasRole(requiredRole: UserRole): boolean {
  const user = getCurrentUser();
  return user?.role === requiredRole;
}

/**
 * Verifica si el usuario puede acceder a una ruta específica
 */
export function canAccessRoute(path: string): boolean {
  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/login', '/onboarding'];
  if (publicPaths.includes(path) || path.startsWith('/r/') || path.startsWith('/order/status')) {
    return true;
  }

  const user = getCurrentUser();
  if (!user) {
    // Si no es una ruta pública y no hay usuario, denegar acceso
    return false;
  }

  // Rutas específicas para cada rol
  if (path.startsWith('/kitchen')) {
    return user.role === 'Kitchen' || user.role === 'Admin';
  }

  if (path.startsWith('/admin')) {
    return user.role === 'Admin';
  }

  if (path.startsWith('/awaiter')) {
    return user.role === 'Awaiter' || user.role === 'Admin';
  }

  // Permitir acceso a otras rutas si el usuario está logueado (ej. /)
  return true;
}

/**
 * Redirige al usuario a la página correcta según su rol
 */
export function redirectToRolePage(): void {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return;
  }

  const currentPath = window.location.pathname;

  // Si el usuario de cocina está en admin, redirigir a cocina
  if (user.role === 'Kitchen' && currentPath.startsWith('/admin')) {
    window.location.href = '/kitchen';
    return;
  }

  if (user.role === 'Awaiter' && !currentPath.startsWith('/awaiter')) {
    window.location.href = '/awaiter';
    return;
  }

  // Si el admin está en cocina, permitir (los admins pueden ver todo)
  // No redirigir automáticamente para admins
}

/**
 * Guardar información adicional del usuario
 */
export function saveUserInfo(userInfo: Partial<UserInfo>): void {
  const existing = getCurrentUser();
  if (existing) {
    const updated = { ...existing, ...userInfo };
    localStorage.setItem('user_info', JSON.stringify(updated));
  }
}
