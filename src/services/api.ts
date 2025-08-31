import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type { Table } from "../types/table";
import { getToken, redirectToLogin, removeToken, saveToken } from "./auth";

import type { AuthResult, LoginData } from "../types/auth";
import type { MenuBySubdomainResponse, MenuCategory } from "../types/menu";
import type {
  OnboardingData,
  OnboardResult,
  RestaurantDetails,
} from "../types/restaurant";
import type { CreateUserData, UpdateUserData, User } from "../types/user";

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? 'http://localhost:5095/api' : 'https://restmg.runasp.net/api');

console.log('🌐 API Base URL configurada:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (error?: any) => void; }> = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// Interceptor de peticiones para añadir token, excepto en endpoints públicos
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const isPublic = (config.headers as any)['X-Public-Request'];
    if (isPublic) {
      delete (config.headers as any)['X-Public-Request'];
      delete config.headers.Authorization;
      return config;
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas para manejar el refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // No intentar refresh para peticiones públicas marcadas explícitamente
    const isPublic = (originalRequest.headers as any)['X-Public-Request'];

    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/refresh') && !originalRequest._retry && !isPublic) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Token expirado, intentando renovar...');
        const { data } = await apiClient.post<AuthResult>('/auth/refresh');
        saveToken(data.token);
        console.log('✅ Token renovado exitosamente');
        processQueue(null, data.token);
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.log('❌ Error al renovar token, redirigiendo al login');
        processQueue(refreshError, null);
        removeToken();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// --- Funciones de API ---

export async function onboardRestaurant(data: OnboardingData): Promise<OnboardResult> {
  const response = await apiClient.post("/restaurants/onboard", data);
  return response.data;
}

export async function loginUser(data: LoginData): Promise<AuthResult> {
  const response = await apiClient.post("/auth/login", data);
  if (response.data.token) {
    saveToken(response.data.token);
  }
  return response.data;
}

export async function refreshToken(): Promise<AuthResult> {
  console.log('🔄 Llamando a /auth/refresh...');
  const response = await apiClient.post("/auth/refresh");
  if (response.data.token) {
    saveToken(response.data.token);
  }
  return response.data;
}

export async function getMenuByRestaurant(restaurantId: string): Promise<MenuCategory[]> {
  const response = await apiClient.get(`/menu?restaurantId=${restaurantId}`);
  return response.data;
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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

export async function updateUser(userId: string, data: UpdateUserData): Promise<void> {
  await apiClient.put(`/users/${userId}`, data);
}

export async function getMyRestaurant(): Promise<RestaurantDetails> {
  const response = await apiClient.get("/restaurants/me");
  return response.data;
}

export async function updateMyRestaurant(data: Partial<RestaurantDetails>): Promise<void> {
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

export async function updateTable(tableId: string, data: { code: string; status: number }): Promise<void> {
  await apiClient.put(`/tables/${tableId}`, data);
}

export async function getRestaurantBySubdomain(subdomain: string): Promise<RestaurantDetails> {
  const response = await apiClient.get(`/restaurants/by-subdomain/${subdomain}`);
  return response.data;
}

export async function getMenuBySubdomain(subdomain: string): Promise<MenuBySubdomainResponse> {
  const response = await apiClient.get<MenuBySubdomainResponse>(
    `/menu/by-subdomain/${subdomain}`,
    { headers: { 'X-Public-Request': 'true' } }
  );
  return response.data;
}

// ========== FUNCIONES DEL CARRITO Y PEDIDOS ==========

export async function createOrder(orderData: {
  restaurantId: string;
  tableId: string;
  items: { menuItemId: string; quantity: number }[];
}): Promise<{ orderId: string; orderCode: string }> {
  console.log('[api.ts] Intentando crear orden con:', orderData);
  try {
    const response = await apiClient.post('/orders', orderData);
    console.log('[api.ts] Orden creada exitosamente:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[api.ts] Error al crear la orden:', error.response?.data || error.message);
    throw error; // Relanzar para que el llamador lo maneje
  }
}

export async function getOrderByCode(code: string, restaurantId: string): Promise<any> {
  const response = await apiClient.get(`/orders/${code}?restaurantId=${restaurantId}`, { headers: { 'X-Public-Request': 'true' } });
  return response.data;
}

export async function getPendingPaymentOrders(): Promise<any[]> {
  const response = await apiClient.get('/kitchen/orders?status=AwaitingPayment');
  return response.data;
}

export async function getPendingOrdersByRestaurant(restaurantId: string): Promise<any[]> {
  const response = await apiClient.get(`/orders/restaurant/${restaurantId}`);
  return (response.data || []).filter((order: any) => order.status === 'AwaitingPayment');
}

export async function confirmOrderPayment(orderId: string): Promise<void> {
  await apiClient.put(`/kitchen/orders/${orderId}/confirm-payment`);
}

export async function markOrderAsDelivered(orderId: string): Promise<void> {
  await apiClient.post(`/orders/${orderId}/deliver`);
}

export { apiClient };