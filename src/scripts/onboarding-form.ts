import { onboardRestaurant } from "../services/api";
import notificationManager from "../services/notifications";
import { handleFormSubmit } from "./utils/form-handler";

const form = document.getElementById("onboarding-form") as HTMLFormElement;

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleFormSubmit({
      form,
      apiCall: onboardRestaurant,
      onSuccess: () => {
        notificationManager.success("¡Restaurante registrado con éxito! Redirigiendo al login...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
      },
    });
  });
}