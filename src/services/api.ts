import axios, { type AxiosResponse } from "axios";
import { getToken } from "./auth";

import type {
  OnboardingData,
  OnboardResult,
  RestaurantDetails,
} from "../types/restaurant";
import type { MenuCategory } from "../types/menu";
import type { LoginData, AuthResult } from "../types/auth";
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
