import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type { Table } from "../types/table";
import { getToken, redirectToLogin, removeToken, saveToken } from "./auth";

import type { AuthResult, LoginData } from "../types/auth";
import type { MenuCategory } from "../types/menu";
import type {
  OnboardingData,
  OnboardResult,
  RestaurantDetails,
} from "../types/restaurant";
import type { CreateUserData, UpdateUserData, User } from "../types/user";

// Configuración de URLs por entorno
const getApiBaseUrl = (): string => {
  let apiUrl: string;
  
  // En desarrollo, usar la variable de entorno o localhost
  if (import.meta.env.DEV) {
    apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:5095/api';
    console.log('🔧 Entorno de desarrollo detectado');
  } else {
    // En producción, usar proxy interno para evitar Mixed Content
    // El proxy se encarga de hacer la petición HTTP al backend
    apiUrl = '/api-proxy';
    console.log('🚀 Entorno de producción detectado - usando proxy');
  }
  
  console.log('🌐 API Base URL configurada:', apiUrl);
  return apiUrl;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

// Variables para controlar el proceso de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

/**
 * Procesa la cola de peticiones que fallaron durante el refresh
 */
const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor de peticiones - añade el token a todas las peticiones
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas - maneja el refresh token automáticamente
apiClient.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa, simplemente la devolvemos
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Solo intentar refresh si:
    // 1. El error es 401
    // 2. La petición no es al endpoint de refresh (evitar bucles infinitos)
    // 3. No hemos intentado ya hacer refresh en esta petición
    if (
      error.response?.status === 401 && 
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest._retry
    ) {
      // Si ya estamos en proceso de refresh, añadir a la cola
      if (isRefreshing) {
        try {
          await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          
          // Una vez que el refresh termine, reintentar la petición original
          const token = getToken();
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      // Marcar que estamos haciendo refresh y que esta petición ya lo ha intentado
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Token expirado, intentando renovar...');
        
        // Intentar renovar el token
        const refreshResponse = await apiClient.post<AuthResult>('/auth/refresh');
        const newToken = refreshResponse.data.token;
        
        // Guardar el nuevo token
        saveToken(newToken);
        console.log('✅ Token renovado exitosamente');
        
        // Procesar la cola de peticiones pendientes
        processQueue(null, newToken);
        
        // Actualizar la petición original con el nuevo token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        
        // Reintentar la petición original
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // El refresh falló, la sesión es inválida
        console.log('❌ Error al renovar token, redirigiendo al login');
        
        // Procesar la cola con error
        processQueue(refreshError, null);
        
        // Limpiar token y redirigir
        removeToken();
        redirectToLogin();
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Para cualquier otro error, simplemente lo rechazamos
    return Promise.reject(error);
  }
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
  
  // Guardar automáticamente el token al hacer login exitoso
  if (response.data.token) {
    saveToken(response.data.token);
    console.log('✅ Token guardado automáticamente después del login');
  }
  
  return response.data;
}

/**
 * Función para renovar el token JWT
 */
export async function refreshToken(): Promise<AuthResult> {
  console.log('🔄 Llamando a /auth/refresh...');
  const response = await apiClient.post("/auth/refresh");
  
  // Guardar automáticamente el nuevo token
  if (response.data.token) {
    saveToken(response.data.token);
    console.log('✅ Nuevo token guardado después del refresh');
  }
  
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

