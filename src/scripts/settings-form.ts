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
  console.log('Inicializando página de ajustes...'); // Debug

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
  const colorHexField = document.getElementById("colorHex") as HTMLInputElement;
  const cancelBtn = document.getElementById("cancel-btn") as HTMLButtonElement;
  const resetLogoBtn = document.getElementById("reset-logo-btn") as HTMLButtonElement;
  const submitButton = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  if (!form || !loadingState || !formContainer) {
    console.error("Faltan elementos esenciales en la página de ajustes.");
    return;
  }

  console.log('Elementos encontrados, continuando inicialización...'); // Debug

  // Inicializar la imagen placeholder desde el principio
  initializeImage();

  // Función para sincronizar el color picker con el input de texto
  function syncColorInputs(color: string) {
    colorField.value = color;
    colorHexField.value = color;
  }

  // Función para resetear la imagen al placeholder
  function resetImageToPlaceholder() {
    logoPreview.src = "/profile_placeholder-image.jpg";
    logoUpload.value = ''; // Limpiar el input de archivo
  }

  // Función para inicializar la imagen correctamente
  function initializeImage() {
    console.log('Inicializando imagen, src actual:', logoPreview.src); // Debug
    
    // Forzar la carga de la imagen placeholder si no se ha cargado
    if (!logoPreview.src || logoPreview.src === window.location.href || logoPreview.src === '') {
      console.log('Asignando imagen placeholder...'); // Debug
      logoPreview.src = "/profile_placeholder-image.jpg";
    }
    
    // Agregar un pequeño delay para asegurar que se procese
    setTimeout(() => {
      console.log('Imagen después del timeout:', logoPreview.src, 'Complete:', logoPreview.complete); // Debug
    }, 100);
  }

  // --- 1. Cargar los Datos Iniciales ---
  try {
    const restaurant = await getMyRestaurant();
    console.log('Datos del restaurante recibidos:', restaurant); // Debug

    // --- 2. Poblar el Formulario con los Datos ---
    // Asegurar que el nombre del restaurante se llene si existe
    if (restaurant.name && restaurant.name.trim() !== '') {
      nameField.value = restaurant.name.trim();
      console.log('Nombre del restaurante asignado:', restaurant.name); // Debug
    } else {
      console.log('No hay nombre de restaurante o está vacío'); // Debug
    }
    
    // Manejar brandingColor que puede ser null
    const brandingColor = restaurant.brandingColor || "#E55959";
    syncColorInputs(brandingColor);
    
    // Solo cambiar la imagen si existe una URL válida del backend
    // Si logoUrl es null o vacío, mantener el placeholder por defecto
    if (restaurant.logoUrl && restaurant.logoUrl.trim() !== '') {
      logoPreview.src = restaurant.logoUrl;
      console.log('Logo URL asignada:', restaurant.logoUrl); // Debug
    } else {
      // Asegurar que se use el placeholder si logoUrl es null
      logoPreview.src = "/profile_placeholder-image.jpg";
      console.log('Usando imagen placeholder por defecto'); // Debug
    }

    // --- 3. Mostrar el Formulario y Ocultar el "Cargando..." ---
    loadingState.style.display = "none";
    formContainer.classList.remove("hidden");
  } catch (error) {
    if (loadingState) {
      loadingState.innerHTML = `<div class="bg-red-100 text-red-600 p-4 rounded-xl border border-red-200"><p class="font-medium">Error al cargar los ajustes del restaurante</p><p class="text-sm mt-1">Por favor, recarga la página o intenta nuevamente</p></div>`;
    }
    console.error(error);
    return; // Detener la ejecución si no se pueden cargar los datos
  }

  // --- 4. Event Listeners para la nueva UI ---
  
  // Asegurar que la imagen placeholder se cargue correctamente
  logoPreview.onerror = function() {
    console.error('Error cargando imagen:', (this as HTMLImageElement).src);
    const imgElement = this as HTMLImageElement;
    imgElement.style.backgroundColor = '#f3f4f6'; // Fondo gris como fallback
    imgElement.style.display = 'flex';
    imgElement.style.alignItems = 'center';
    imgElement.style.justifyContent = 'center';
    imgElement.innerHTML = '<span class="text-gray-400 text-xs">Sin imagen</span>';
  };

  logoPreview.onload = function() {
    console.log('Imagen cargada correctamente:', (this as HTMLImageElement).src);
  };
  
  // Preview de imagen cuando se selecciona un archivo
  logoUpload.addEventListener("change", () => {
    const file = logoUpload.files?.[0];
    if (file) {
      // Validar tipo y tamaño de archivo
      if (!file.type.startsWith('image/')) {
        showMessage("Por favor selecciona un archivo de imagen válido", "error");
        logoUpload.value = ''; // Limpiar el input
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        showMessage("La imagen debe ser menor a 5MB", "error");
        logoUpload.value = ''; // Limpiar el input
        return;
      }
      
      // Crear preview de la nueva imagen
      const imageUrl = URL.createObjectURL(file);
      logoPreview.src = imageUrl;
      
      // Limpiar mensaje de error si había uno
      if (messageDiv.textContent && messageDiv.className.includes('red')) {
        messageDiv.textContent = '';
      }
    }
  });

  // Sincronizar color picker con input de texto
  colorField.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    colorHexField.value = target.value;
  });

  // Sincronizar input de texto con color picker
  colorHexField.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    
    // Validar formato hexadecimal
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      colorField.value = value;
    }
  });

  // Botones de paleta de colores sugeridos
  const colorButtons = document.querySelectorAll('[data-color]');
  colorButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const color = (e.target as HTMLElement).getAttribute('data-color');
      if (color) {
        syncColorInputs(color);
        
        // Animación visual
        button.classList.add('scale-125');
        setTimeout(() => button.classList.remove('scale-125'), 200);
      }
    });
  });

  // Botón cancelar
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("¿Estás seguro de que quieres descartar los cambios?")) {
      window.location.reload();
    }
  });

  // Botón para resetear logo al placeholder
  resetLogoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetImageToPlaceholder();
    showMessage("Se ha restablecido la imagen por defecto", "info");
  });

  // Función para mostrar mensajes
  function showMessage(text: string, type: "success" | "error" | "info" = "info") {
    const baseClasses = "mt-6 text-center p-4 rounded-xl font-medium";
    let typeClasses = "";
    
    switch (type) {
      case "success":
        typeClasses = "bg-green-100 text-green-700 border border-green-200";
        break;
      case "error":
        typeClasses = "bg-red-100 text-red-700 border border-red-200";
        break;
      case "info":
        typeClasses = "bg-blue-100 text-blue-700 border border-blue-200";
        break;
    }
    
    messageDiv.className = `${baseClasses} ${typeClasses}`;
    messageDiv.textContent = text;
  }

  // Envío del formulario
  form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();

    // Validaciones del cliente
    if (!nameField.value.trim()) {
      showMessage("El nombre del restaurante es obligatorio", "error");
      nameField.focus();
      return;
    }

    if (nameField.value.trim().length < 2) {
      showMessage("El nombre del restaurante debe tener al menos 2 caracteres", "error");
      nameField.focus();
      return;
    }

    // Deshabilitar el botón y mostrar estado de carga
    submitButton.disabled = true;
    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = `
      <span class="flex items-center justify-center space-x-2">
        <svg class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Guardando...</span>
      </span>
    `;
    
    messageDiv.textContent = "";

    const formData = new FormData(form);
    const data: Partial<RestaurantDetails> = {
      name: formData.get("name") as string,
      brandingColor: formData.get("brandingColor") as string,
    };

    try {
      // Subir logo si se seleccionó uno nuevo
      const file = logoUpload.files?.[0];
      if (file) {
        try {
          const uploadResult = await uploadLogo(file);
          data.logoUrl = uploadResult.url;
        } catch (uploadError) {
          throw new Error("Error al subir el logo. Intenta con una imagen más pequeña.");
        }
      }

      await updateMyRestaurant(data);

      showMessage("¡Ajustes guardados exitosamente! La página se actualizará en unos segundos...", "success");

      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error inesperado al guardar los ajustes";
      showMessage(errorMessage, "error");
      
      // Restaurar el botón
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonContent;
    }
  });
}

// Punto de entrada: ejecutar la inicialización cuando el DOM esté listo.
document.addEventListener("DOMContentLoaded", initializeSettingsPage);
