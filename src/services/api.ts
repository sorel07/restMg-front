import axios, { type AxiosResponse } from "axios";
import type { Table } from "../types/table";
import { getToken } from "./auth";

import type { AuthResult, LoginData } from "../types/auth";
import type { MenuCategory } from "../types/menu";
import type {
  OnboardingData,
  OnboardResult,
  RestaurantDetails,
} from "../types/restaurant";
import type { CreateUserData, UpdateUserData, User } from "../types/user";

const apiClient = axios.create({
  baseURL: import.meta.env.PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Funciones de API
export async function onboardRestaurant(
  data: OnboardingData
): Promise<OnboardResult> {
  const response = await apiClient.post("/restaurants/onboard", data);
  return response.data;
}

export async function loginUser(data: LoginData): Promise<AuthResult> {
  const response = await apiClient.post("/auth/login", data);
  return response.data;
}

export async function getMenuByRestaurant(
  restaurantId: string
): Promise<MenuCategory[]> {
  const response = await apiClient.get(`/menu?restaurantId=${restaurantId}`);
  return response.data;
}

// Función para subir imágenes
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/upload', formData, {
    headers: { 
      'Content-Type': 'multipart/form-data' 
    },
  });
  
  return response.data;
}

export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get("/users");
  return response.data;
}

export async function createUser(data: CreateUserData): Promise<User> {
  const response = await apiClient.post("/users", data);
  return response.data;
}

export async function updateUser(
  userId: string,
  data: UpdateUserData
): Promise<void> {
  await apiClient.put(`/users/${userId}`, data);
}

export async function getMyRestaurant(): Promise<RestaurantDetails> {
  const response = await apiClient.get("/restaurants/me");
  return response.data;
}

export async function updateMyRestaurant(
  data: Partial<RestaurantDetails>
): Promise<void> {
  await apiClient.put("/restaurants/me", data);
}

export async function uploadLogo(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/branding/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getTables(): Promise<Table[]> {
  const response = await apiClient.get("/tables");
  return response.data;
}

export async function getMenuBySubdomain(
  subdomain: string
): Promise<MenuCategory[]> {
  try {
    // Esta petición no necesita token de autenticación.
    const response: AxiosResponse<MenuCategory[]> = await apiClient.get(
      `/menu/by-subdomain/${subdomain}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Si el backend devuelve 404, significa que el subdominio no existe.
      console.warn(
        `No se encontró un restaurante con el subdominio: ${subdomain}`
      );
      return [];
    }
    // Para otros errores (ej. de red), lanzar el error para que la página lo capture.
    console.error("Error al obtener el menú por subdominio:", error);
    throw error;
  }
}

// Exportar la instancia del cliente API para uso directo
export { apiClient };

