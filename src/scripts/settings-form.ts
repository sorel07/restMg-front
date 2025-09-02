import { getMyRestaurant, updateMyRestaurant, uploadBanner, uploadLogo } from "../services/api";
import notificationManager from "../services/notifications";
import type { RestaurantDetails } from "../types/restaurant";
import { handleFormSubmit } from "./utils/form-handler";

class SettingsPageManager {
  private form: HTMLFormElement;
  private logoUpload: HTMLInputElement;
  private logoPreview: HTMLImageElement;
  private bannerUpload: HTMLInputElement;
  private bannerPreview: HTMLImageElement;
  private nameField: HTMLInputElement;
  private brandingColorInput: HTMLInputElement;
  private colorHexInput: HTMLInputElement;
  private originalLogoUrl: string | null = null;
  private originalBannerUrl: string | null = null;

  constructor() {
    this.form = document.getElementById("settings-form") as HTMLFormElement;
    this.logoUpload = document.getElementById("logo-upload") as HTMLInputElement;
    this.logoPreview = document.getElementById("logo-preview") as HTMLImageElement;
    this.bannerUpload = document.getElementById("banner-upload") as HTMLInputElement;
    this.bannerPreview = document.getElementById("banner-preview") as HTMLImageElement;
    this.nameField = document.getElementById("name") as HTMLInputElement;
    this.brandingColorInput = document.getElementById("brandingColor") as HTMLInputElement;
    this.colorHexInput = document.getElementById("colorHex") as HTMLInputElement;

    this.initializePage();
  }

  private async initializePage() {
    this.setupEventListeners();
    await this.loadAndPopulateForm();
  }

  private setupEventListeners() {
    this.form.addEventListener("submit", (e) => this.onFormSubmit(e));
    this.logoUpload.addEventListener("change", () => this.handleLogoPreview());
    this.bannerUpload.addEventListener("change", () => this.handleBannerPreview());
    
    // Sincronización entre color picker y input de texto
    this.brandingColorInput.addEventListener("input", () => this.syncColorInputs("picker"));
    this.colorHexInput.addEventListener("input", () => this.syncColorInputs("text"));
    
    // Botones de colores sugeridos
    const colorButtons = document.querySelectorAll("[data-color]");
    colorButtons.forEach(button => {
      button.addEventListener("click", () => {
        const color = (button as HTMLElement).getAttribute("data-color");
        if (color) {
          this.setColor(color);
        }
      });
    });
    
    const resetLogoBtn = document.getElementById("reset-logo-btn");
    resetLogoBtn?.addEventListener("click", () => this.resetLogoToPlaceholder());

    const resetBannerBtn = document.getElementById("reset-banner-btn");
    resetBannerBtn?.addEventListener("click", () => this.resetBannerToPlaceholder());
  }

  private async loadAndPopulateForm() {
    const loadingState = document.getElementById("loading-state");
    const formContainer = document.getElementById("form-container");

    try {
      const restaurant = await getMyRestaurant();
      
      this.nameField.value = restaurant.name || "";
      (this.form.elements.namedItem("subdomain") as HTMLInputElement).value = restaurant.subdomain || "";
      
      const brandingColor = restaurant.brandingColor || "#E55959";
      this.setColor(brandingColor);
      
      this.originalLogoUrl = restaurant.logoUrl || null;
      this.logoPreview.src = this.originalLogoUrl || "/profile_placeholder-image.jpg";

      this.originalBannerUrl = restaurant.bannerUrl || null;
      this.bannerPreview.src = this.originalBannerUrl || "/profile_placeholder-image.jpg";

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

  private handleBannerPreview() {
    const file = this.bannerUpload.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        notificationManager.error("Por favor, selecciona un archivo de imagen.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        notificationManager.error("La imagen no puede pesar más de 5MB.");
        return;
      }
      this.bannerPreview.src = URL.createObjectURL(file);
    }
  }

  private resetLogoToPlaceholder() {
    this.logoPreview.src = "/profile_placeholder-image.jpg";
    this.logoUpload.value = "";
    this.originalLogoUrl = null; // Marcar para eliminación
    notificationManager.info("Se usará la imagen por defecto para el logo.");
  }

  private resetBannerToPlaceholder() {
    this.bannerPreview.src = "/profile_placeholder-image.jpg";
    this.bannerUpload.value = "";
    this.originalBannerUrl = null; // Marcar para eliminación
    notificationManager.info("Se usará la imagen por defecto para el banner.");
  }

  private setColor(color: string) {
    this.brandingColorInput.value = color;
    this.colorHexInput.value = color;
  }

  private syncColorInputs(source: "picker" | "text") {
    if (source === "picker") {
      this.colorHexInput.value = this.brandingColorInput.value;
    } else if (source === "text") {
      const hexValue = this.colorHexInput.value;
      if (this.isValidHexColor(hexValue)) {
        this.brandingColorInput.value = hexValue;
      }
    }
  }

  private isValidHexColor(hex: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
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
        const logoFile = this.logoUpload.files?.[0];
        if (logoFile) {
          const uploadResult = await uploadLogo(logoFile);
          data.logoUrl = uploadResult.url;
        } else {
          data.logoUrl = this.originalLogoUrl;
        }

        const bannerFile = this.bannerUpload.files?.[0];
        if (bannerFile) {
          const uploadResult = await uploadBanner(bannerFile);
          data.bannerUrl = uploadResult.url;
        } else {
          data.bannerUrl = this.originalBannerUrl;
        }

        return updateMyRestaurant(data);
      },
      onSuccess: () => {
        notificationManager.success("Ajustes guardados. La página se recargará.");
        setTimeout(() => window.location.reload(), 2000);
      },
      getFormData: (formData) => ({
        name: formData.get("name") as string,
        brandingColor: this.brandingColorInput.value,
        subdomain: formData.get("subdomain") as string,
      }),
      customValidation: () => this.customValidation(),
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new SettingsPageManager());