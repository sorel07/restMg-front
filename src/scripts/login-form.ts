import { loginUser } from "../services/api";
import tokenManager from "../services/token-manager";
import notificationManager from "../services/notifications";
import { handleFormSubmit } from "./utils/form-handler";

const form = document.getElementById("login-form") as HTMLFormElement;

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleFormSubmit({
      form,
      apiCall: loginUser,
      onSuccess: (authResult) => {
        notificationManager.success("¡Inicio de sesión exitoso! Redirigiendo...");

        const userInfo = {
          userId: authResult.userId,
          restaurantId: authResult.restaurantId,
          fullName: authResult.fullName,
          email: authResult.email,
          role: authResult.role
        };
        localStorage.setItem('user_info', JSON.stringify(userInfo));

        tokenManager.startTokenMonitoring();

        setTimeout(() => {
          const userRole = authResult.role || 'Admin';
          if (userRole === 'Kitchen') {
            window.location.href = "/kitchen";
          } else if (userRole === 'Awaiter') {
            window.location.href = "/awaiter";
          } else {
            window.location.href = "/admin";
          }
        }, 1000);
      },
    });
  });
}