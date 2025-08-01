export interface OnboardResult {
  restaurantId: string;
  adminUserId: string;
}

export interface OnboardingData {
  restaurantName: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface RestaurantDetails {
  id: string;
  name: string;
  brandingColor?: string;
  logoUrl?: string;
  clientUrl?: string;
}
