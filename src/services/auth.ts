import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "../types/auth";

const TOKEN_KEY = "authToken";
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutos en milisegundos

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function removeToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * Verifica si el token está cerca de expirar (dentro de 5 minutos)
 */
export function isTokenNearExpiry(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    const decoded: DecodedToken = jwtDecode(token);
    const currentTime = Date.now();
    const expiryTime = decoded.exp * 1000;
    
    // True si expira en los próximos 5 minutos
    return (expiryTime - currentTime) <= TOKEN_EXPIRY_BUFFER;
  } catch (error) {
    console.error("Error al verificar expiración del token:", error);
    return true; // Si no se puede decodificar, asumir que está expirado
  }
}

/**
 * Verifica si el token está completamente expirado
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  try {
    const decoded: DecodedToken = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    console.error("Error al verificar si el token está expirado:", error);
    return true;
  }
}

export function getUserSession(): DecodedToken | null {
  if (typeof window === "undefined") {
    return null; // No se puede acceder a localStorage en el servidor
  }

  const token = getToken();
  if (!token) {
    return null; // No hay usuario logueado
  }

  try {
    // Decodificar el token para acceder a sus datos (payload)
    const decoded: DecodedToken = jwtDecode(token);

    // Opcional: Comprobar si el token ha expirado
    if (decoded.exp * 1000 < Date.now()) {
      removeToken(); // Limpiar token expirado
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    return null; // El token es inválido o malformado
  }
}

/**
 * Redirige al usuario a la página de login
 */
export function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    // Limpiar token antes de redirigir
    removeToken();
    
    // Redirigir a login preservando la URL actual para redirigir después del login
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    } else {
      window.location.href = '/login';
    }
  }
}

/**
 * Cierra la sesión del usuario completamente
 */
export function logout(): void {
  if (typeof window !== "undefined") {
    // Limpiar todos los datos de sesión
    removeToken();
    localStorage.removeItem('user_info');
    
    // Detener monitoreo de token si está activo
    import('./token-manager').then(({ default: tokenManager }) => {
      tokenManager.stopTokenMonitoring();
    });
    
    console.log('👋 Sesión cerrada exitosamente');
    
    // Redirigir a login
    window.location.href = '/login';
  }
}
