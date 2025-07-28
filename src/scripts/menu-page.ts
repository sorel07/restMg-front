import { getMenuByRestaurant } from "../services/api";
import { getUserSession } from "../services/auth";
import type { MenuCategory } from "../types/menu";

// Selección de elementos del DOM
const menuContainer = document.getElementById("menu-container");
const loadingMessage = document.getElementById("loading-message");

/**
 * Carga los datos del menú desde la API usando el ID de restaurante de la sesión
 * y luego llama a la función para renderizarlos.
 */
async function loadMenu() {
  const session = getUserSession();

  if (!session) {
    if (loadingMessage)
      loadingMessage.textContent =
        "No se pudo verificar la sesión. Por favor, inicia sesión de nuevo.";
    return;
  }

  const restaurantId = session.restaurantId;

  try {
    const categories = await getMenuByRestaurant(restaurantId);
    renderMenu(categories);
  } catch (e) {
    if (loadingMessage) loadingMessage.textContent = "Error al cargar el menú.";
  }
}

/**
 * Renderiza el HTML del menú dentro del contenedor principal.
 * @param categories - La lista de categorías y platos obtenida de la API.
 */
function renderMenu(categories: MenuCategory[]) {
  if (!menuContainer || !loadingMessage) return;

  if (categories.length === 0) {
    loadingMessage.textContent =
      "No has creado ninguna categoría o plato todavía.";
    return;
  }

  loadingMessage.style.display = "none"; // Ocultar mensaje de carga

  let html = "";
  for (const category of categories) {
    html += `
          <section class="bg-surface rounded-lg p-6 mb-10">
              <div class="flex justify-between items-center mb-4">
                  <h2 class="font-heading text-2xl font-semibold">${
                    category.name
                  }</h2>
                  <button class="text-text-secondary hover:text-accent">Editar Categoría</button>
              </div>
              <div class="divide-y divide-white/10">
                  ${category.items
                    .map(
                      (item) => `
                      <div class="flex items-center justify-between py-3">
                          <div class="flex items-center gap-x-4">
                              <img src="${
                                item.imageUrl || "/placeholder-image.jpg"
                              }" alt="${
                        item.name
                      }" class="w-16 h-16 object-cover rounded-md"/>
                              <div>
                                  <h3 class="font-semibold text-text-primary">${
                                    item.name
                                  }</h3>
                                  <p class="text-sm text-text-secondary">$${item.price.toFixed(
                                    2
                                  )}</p>
                              </div>
                          </div>
                          <div>
                              <span class="px-2 py-1 text-xs rounded-full ${
                                item.isAvailable
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }">
                                  ${item.isAvailable ? "Disponible" : "Agotado"}
                              </span>
                              <button class="ml-4 text-text-secondary hover:text-accent">Editar Plato</button>
                          </div>
                      </div>
                  `
                    )
                    .join("")}
              </div>
          </section>
      `;
  }
  menuContainer.innerHTML = html;
}

// Escuchador de eventos para ejecutar la carga de datos
// cuando el contenido de la página esté listo.
document.addEventListener("DOMContentLoaded", loadMenu);
