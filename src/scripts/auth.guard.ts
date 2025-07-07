import { isLoggedIn } from "../services/auth";

/**
 * Esta función comprueba si un usuario está autenticado.
 * Si no lo está, lo redirige a la página de login.
 * Se usa para proteger las rutas del dashboard.
 */
function protectRoute(): void {
  // Solo ejecuta en el navegador, no durante la compilación en el servidor
  if (typeof window !== "undefined") {
    if (!isLoggedIn()) {
      // Redirige a la página de login.
      // Se usa .replace() para que el historial del navegador no permita
      // volver a la página protegida con el botón "atrás".
      window.location.replace("/login");
    }
  }
}

// Ejecuta la protección inmediatamente cuando se carga el script.
protectRoute();
