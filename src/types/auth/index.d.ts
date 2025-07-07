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
