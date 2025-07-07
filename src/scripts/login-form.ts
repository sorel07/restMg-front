import { loginUser } from "../services/api";
import { saveToken } from "../services/auth";
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
    saveToken(authResult.token); // Guardar el token en localStorage

    messageDiv.className = "text-center text-green-500";
    messageDiv.textContent = "¡Inicio de sesión exitoso! Redirigiendo...";

    // Redirigir al dashboard principal de administración
    window.location.href = "/admin";
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
