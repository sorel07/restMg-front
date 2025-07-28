import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "../types/auth";

const TOKEN_KEY = "authToken";

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
