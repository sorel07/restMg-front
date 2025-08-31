import { getMyRestaurant, updateMyRestaurant, uploadLogo } from "../services/api";
import notificationManager from "../services/notifications";
import type { RestaurantDetails } from "../types/restaurant";
import { handleFormSubmit } from "./utils/form-handler";

class SettingsPageManager {
  private form: HTMLFormElement;
  private logoUpload: HTMLInputElement;
  private logoPreview: HTMLImageElement;
  private nameField: HTMLInputElement;
  private originalLogoUrl: string | null = null;

  constructor() {
    this.form = document.getElementById("settings-form") as HTMLFormElement;
    this.logoUpload = document.getElementById("logo-upload") as HTMLInputElement;
    this.logoPreview = document.getElementById("logo-preview") as HTMLImageElement;
    this.nameField = document.getElementById("name") as HTMLInputElement;

    this.initializePage();
  }

  private async initializePage() {
    this.setupEventListeners();
    await this.loadAndPopulateForm();
  }

  private setupEventListeners() {
    this.form.addEventListener("submit", (e) => this.onFormSubmit(e));
    this.logoUpload.addEventListener("change", () => this.handleLogoPreview());
    
    const resetLogoBtn = document.getElementById("reset-logo-btn");
    resetLogoBtn?.addEventListener("click", () => this.resetImageToPlaceholder());
  }

  private async loadAndPopulateForm() {
    const loadingState = document.getElementById("loading-state");
    const formContainer = document.getElementById("form-container");

    try {
      const restaurant = await getMyRestaurant();
      
      this.nameField.value = restaurant.name || "";
      (this.form.elements.namedItem("subdomain") as HTMLInputElement).value = restaurant.subdomain || "";
      (this.form.elements.namedItem("brandingColor") as HTMLInputElement).value = restaurant.brandingColor || "#E55959";
      
      this.originalLogoUrl = restaurant.logoUrl || null;
      this.logoPreview.src = this.originalLogoUrl || "/profile_placeholder-image.jpg";

      loadingState?.style.setProperty("display", "none");
      formContainer?.classList.remove("hidden");

    } catch (error) {
      console.error("Error loading settings:", error);
      if (loadingState) {
        loadingState.innerHTML = `<p class="text-red-500">Error al cargar la configuración.</p>`;
      }
    }
  }

  private handleLogoPreview() {
    const file = this.logoUpload.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        notificationManager.error("Por favor, selecciona un archivo de imagen.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        notificationManager.error("La imagen no puede pesar más de 5MB.");
        return;
      }
      this.logoPreview.src = URL.createObjectURL(file);
    }
  }

  private resetImageToPlaceholder() {
    this.logoPreview.src = "/profile_placeholder-image.jpg";
    this.logoUpload.value = "";
    this.originalLogoUrl = null; // Marcar para eliminación
    notificationManager.info("Se usará la imagen por defecto.");
  }

  private customValidation(): boolean {
    if (!this.nameField.value.trim()) {
      notificationManager.error("El nombre del restaurante es obligatorio.");
      this.nameField.focus();
      return false;
    }
    return true;
  }

  private async onFormSubmit(event: SubmitEvent) {
    event.preventDefault();

    await handleFormSubmit({
      form: this.form,
      apiCall: async (data: Partial<RestaurantDetails>) => {
        const file = this.logoUpload.files?.[0];
        if (file) {
          const uploadResult = await uploadLogo(file);
          data.logoUrl = uploadResult.url;
        } else {
          data.logoUrl = this.originalLogoUrl;
        }
        return updateMyRestaurant(data);
      },
      onSuccess: () => {
        notificationManager.success("Ajustes guardados. La página se recargará.");
        setTimeout(() => window.location.reload(), 2000);
      },
      getFormData: (formData) => ({
        name: formData.get("name") as string,
        brandingColor: formData.get("brandingColor") as string,
        subdomain: formData.get("subdomain") as string,
      }),
      customValidation: () => this.customValidation(),
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new SettingsPageManager());