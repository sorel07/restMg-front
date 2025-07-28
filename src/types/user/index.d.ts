// Para listar usuarios
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Para el formulario de creación de usuario
export interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  role: "Admin" | "Kitchen";
}

// Para el formulario de edición de usuario
export interface UpdateUserData {
  fullName?: string;
  email?: string;
  role?: "Admin" | "Kitchen";
  isActive?: boolean;
}
