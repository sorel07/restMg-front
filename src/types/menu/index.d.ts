export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isActive: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

// Request types para la API
export interface CreateCategoryRequest {
  name: string;
  displayOrder: number;
}

export interface UpdateCategoryRequest {
  name: string;
  displayOrder: number;
}

export interface CreateMenuItemRequest {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export interface UpdateMenuItemRequest {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface CreateResponse {
  id: string;
}

export interface ErrorResponse {
  message: string;
}

export interface MenuBySubdomainResponse {
  restaurantId: string;
  categories: MenuCategory[];
}
