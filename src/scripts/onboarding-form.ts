import { onboardRestaurant } from "../services/api";
import type { OnboardingData } from "../types/restaurant";

// Selección de elementos del DOM con tipado para seguridad
const form = document.getElementById("onboarding-form") as HTMLFormElement;
const messageDiv = document.getElementById("form-message") as HTMLDivElement;
const submitButton = form.querySelector(
  'button[type="submit"]'
) as HTMLButtonElement;

/**
 * Maneja el evento de envío del formulario de registro.
 * @param event - El evento de envío del formulario.
 */
async function handleOnboardingSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  // Lógica de UI para el estado de carga
  submitButton.disabled = true;
  submitButton.textContent = "Registrando...";
  messageDiv.textContent = "";
  messageDiv.className = "";

  const formData = new FormData(form);
  const rawData = Object.fromEntries(formData.entries());

  // Construcción explícita y segura del objeto de datos
  const data: OnboardingData = {
    restaurantName: (rawData.restaurantName as string) ?? "",
    adminFullName: (rawData.adminFullName as string) ?? "",
    adminEmail: (rawData.adminEmail as string) ?? "",
    adminPassword: (rawData.adminPassword as string) ?? "",
  };

  try {
    // Llamada a la API
    await onboardRestaurant(data);

    // Lógica de UI para el estado de éxito
    messageDiv.className = "text-center text-green-500";
    messageDiv.textContent =
      "¡Restaurante registrado con éxito! Serás redirigido al login.";

    // Redirección tras un breve retraso
    setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
  } catch (error) {
    // Lógica de UI para el estado de error
    if (error instanceof Error) {
      messageDiv.textContent = error.message;
    } else {
      messageDiv.textContent = "Ha ocurrido un error inesperado.";
    }
    messageDiv.className = "text-center text-red-500";

    submitButton.disabled = false;
    submitButton.textContent = "Registrar Restaurante";
  }
}

// Asignar el event listener solo si el formulario existe en la página
if (form) {
  form.addEventListener("submit", handleOnboardingSubmit);
}
