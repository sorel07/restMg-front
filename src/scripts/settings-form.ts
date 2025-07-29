import {
  getMyRestaurant,
  updateMyRestaurant,
  uploadLogo,
} from "../services/api";
import type { RestaurantDetails } from "../types/restaurant";

/**
 * Función principal que se ejecuta cuando el DOM está listo.
 */
async function initializeSettingsPage() {
  // Selección de elementos de la UI
  const loadingState = document.getElementById("loading-state");
  const formContainer = document.getElementById("form-container");
  const form = document.getElementById("settings-form") as HTMLFormElement;
  const messageDiv = document.getElementById("form-message") as HTMLDivElement;
  const logoUpload = document.getElementById("logo-upload") as HTMLInputElement;
  const logoPreview = document.getElementById(
    "logo-preview"
  ) as HTMLImageElement;
  const nameField = document.getElementById("name") as HTMLInputElement;
  const colorField = document.getElementById(
    "brandingColor"
  ) as HTMLInputElement;
  const submitButton = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  if (!form || !loadingState || !formContainer) {
    console.error("Faltan elementos esenciales en la página de ajustes.");
    return;
  }

  // --- 1. Cargar los Datos Iniciales ---
  try {
    const restaurant = await getMyRestaurant();

    // --- 2. Poblar el Formulario con los Datos ---
    nameField.value = restaurant.name;
    colorField.value = restaurant.brandingColor || "#E55959";
    if (restaurant.logoUrl) {
      logoPreview.src = restaurant.logoUrl;
    }

    // --- 3. Mostrar el Formulario y Ocultar el "Cargando..." ---
    loadingState.style.display = "none";
    formContainer.classList.remove("hidden");
  } catch (error) {
    if (loadingState) {
      loadingState.innerHTML = `<div class="bg-red-500/10 text-red-400 p-4 rounded-md"><p>Error al cargar los ajustes.</p></div>`;
    }
    console.error(error);
    return; // Detener la ejecución si no se pueden cargar los datos
  }

  // --- 4. Asignar Event Listeners (ahora que sabemos que los elementos existen) ---
  logoUpload.addEventListener("change", () => {
    const file = logoUpload.files?.[0];
    if (file) {
      logoPreview.src = URL.createObjectURL(file);
    }
  });

  form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = "Guardando...";
    messageDiv.textContent = "";

    const formData = new FormData(form);
    const data: Partial<RestaurantDetails> = {
      name: formData.get("name") as string,
      brandingColor: formData.get("brandingColor") as string,
    };

    try {
      const file = logoUpload.files?.[0];
      if (file) {
        const uploadResult = await uploadLogo(file);
        data.logoUrl = uploadResult.url;
      }

      await updateMyRestaurant(data);

      messageDiv.className = "mt-4 text-center text-green-500";
      messageDiv.textContent = "¡Ajustes guardados con éxito!";

      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      messageDiv.className = "mt-4 text-center text-red-500";
      messageDiv.textContent =
        error instanceof Error ? error.message : "Error inesperado.";
      submitButton.disabled = false;
      submitButton.textContent = "Guardar Cambios";
    }
  });
}

// Punto de entrada: ejecutar la inicialización cuando el DOM esté listo.
document.addEventListener("DOMContentLoaded", initializeSettingsPage);
