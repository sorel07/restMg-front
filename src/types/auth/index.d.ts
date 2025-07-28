export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  userId: string;
  restaurantId: string;
  fullName: string;
  email: string;
  role: string;
  token: string;
}

export interface DecodedToken {
  sub: string; // 'sub' es el estándar para el ID del usuario
  email: string;
  restaurantId: string;
  role: string;
  exp: number; // Tiempo de expiración en formato Unix
}
