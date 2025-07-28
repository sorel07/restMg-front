import { updateMyRestaurant, uploadLogo } from "../services/api";
import type { RestaurantDetails } from "../types/restaurant";

const form = document.getElementById("settings-form") as HTMLFormElement;
const messageDiv = document.getElementById("form-message") as HTMLDivElement;
const logoUpload = document.getElementById("logo-upload") as HTMLInputElement;
const logoPreview = document.getElementById("logo-preview") as HTMLImageElement;

// Vista previa de la imagen al seleccionarla
logoUpload?.addEventListener("change", () => {
  const file = logoUpload.files?.[0];
  if (file) {
    logoPreview.src = URL.createObjectURL(file);
  }
});

async function handleSettingsSubmit(event: SubmitEvent) {
  event.preventDefault();
  // ... (lógica de UI para loading)
  const formData = new FormData(form);
  const data: Partial<RestaurantDetails> = {
    name: formData.get("name") as string,
    brandingColor: formData.get("brandingColor") as string,
  };

  try {
    const file = logoUpload.files?.[0];
    if (file) {
      const uploadResult = await uploadLogo(file);
      data.logoUrl = uploadResult.url; // Añadir la nueva URL del logo
    }

    await updateMyRestaurant(data);

    // ... (lógica de UI para éxito y recargar la página para ver cambios)
    window.location.reload();
  } catch (error) {
    // ... (lógica de UI para error)
  }
}

if (form) form.addEventListener("submit", handleSettingsSubmit);
