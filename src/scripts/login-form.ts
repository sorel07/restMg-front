import { loginUser } from "../services/api";
import tokenManager from "../services/token-manager";
import type { LoginData } from "../types/auth";

const form = document.getElementById("login-form") as HTMLFormElement;
const messageDiv = document.getElementById("form-message") as HTMLDivElement;
const submitButton = form.querySelector(
  'button[type="submit"]'
) as HTMLButtonElement;

/**
 * Maneja el evento de envío del formulario de inicio de sesión.
 * @param event - El evento de envío del formulario.
 */
async function handleLoginSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  submitButton.disabled = true;
  submitButton.textContent = "Iniciando...";
  messageDiv.textContent = "";
  messageDiv.className = "";

  const formData = new FormData(form);
  const rawData = Object.fromEntries(formData.entries());

  const data: LoginData = {
    email: (rawData.email as string) ?? "",
    password: (rawData.password as string) ?? "",
  };

  try {
    const authResult = await loginUser(data);
    // El token ya se guarda automáticamente en loginUser()
    
    // Guardar información adicional del usuario
    const userInfo = {
      userId: authResult.userId,
      restaurantId: authResult.restaurantId,
      fullName: authResult.fullName,
      email: authResult.email,
      role: authResult.role
    };
    localStorage.setItem('user_info', JSON.stringify(userInfo));

    // Iniciar monitoreo automático del token
    tokenManager.startTokenMonitoring();

    messageDiv.className = "text-center text-green-500";
    messageDiv.textContent = "¡Inicio de sesión exitoso! Redirigiendo...";

    // Redirigir según el rol del usuario
    const userRole = authResult.role || 'Admin';
    
    if (userRole === 'Kitchen') {
      // Usuario de cocina va directamente a la vista de cocina
      window.location.href = "/kitchen";
    } else {
      // Administradores van al dashboard principal
      window.location.href = "/admin";
    }
  } catch (error) {
    if (error instanceof Error) {
      messageDiv.textContent = error.message;
    } else {
      messageDiv.textContent = "Ha ocurrido un error inesperado.";
    }
    messageDiv.className = "text-center text-red-500";

    submitButton.disabled = false;
    submitButton.textContent = "Iniciar Sesión";
  }
}

if (form) {
  form.addEventListener("submit", handleLoginSubmit);
}
