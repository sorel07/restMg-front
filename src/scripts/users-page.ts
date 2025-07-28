// src/scripts/users-page.ts
import { getUsers, createUser, updateUser } from "../services/api";
import type { CreateUserData, UpdateUserData, User } from "../types/user";

// --- Selección de Elementos del DOM ---
// Obtenemos todos los elementos que necesitaremos manipular.
const modal = document.getElementById("user-modal");
const modalTitle = document.getElementById("user-modal-title");
const addUserButton = document.getElementById("add-user-button");
const userForm = document.getElementById("user-form") as HTMLFormElement;
const modalMessageDiv = document.getElementById("modal-form-message");
const usersTableBody = document.getElementById("users-table-body");

// Campos del formulario
const userIdField = document.getElementById("userId") as HTMLInputElement;
const fullNameField = document.getElementById("fullName") as HTMLInputElement;
const emailField = document.getElementById("email") as HTMLInputElement;
const passwordField = document.getElementById("password") as HTMLInputElement;
const passwordContainer = document.getElementById("password-field");
const roleField = document.getElementById("role") as HTMLSelectElement;
const isActiveField = document.getElementById("isActive") as HTMLInputElement;

// --- Funciones de Renderizado ---
function renderUsersTable(users: User[]) {
  if (!usersTableBody) return;

  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-text-secondary">No se encontraron usuarios.</td></tr>`;
    return;
  }

  // Construimos el HTML de la tabla y lo insertamos
  usersTableBody.innerHTML = users
    .map(
      (user) => `
    <tr class="border-b border-white/10 last:border-b-0 hover:bg-white/5">
      <td class="p-4">${user.fullName}</td>
      <td class="p-4 text-text-secondary">${user.email}</td>
      <td class="p-4">
        <span class="px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === "Admin"
            ? "bg-accent/20 text-accent"
            : "bg-blue-500/20 text-blue-400"
        }">${user.role}</span>
      </td>
      <td class="p-4">
        <span class="font-bold ${
          user.isActive ? "text-green-400" : "text-red-400"
        }">${user.isActive ? "Activo" : "Inactivo"}</span>
      </td>
      <td class="p-4">
        <button class="edit-user-button text-text-secondary hover:text-accent cursor-pointer" data-user-id="${
          user.id
        }" data-full-name="${user.fullName}" data-email="${
        user.email
      }" data-role="${user.role}" data-is-active="${
        user.isActive
      }">Editar</button>
      </td>
    </tr>
  `
    )
    .join("");

  // ¡IMPORTANTE! Ahora que los botones "Editar" existen en el DOM, asignamos sus listeners.
  assignEditButtonListeners();
}

// --- Asignación de Event Listeners ---
function assignEditButtonListeners() {
  const editButtons = document.querySelectorAll(".edit-user-button");
  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const btn = button as HTMLElement;
      const user: User = {
        id: btn.dataset.userId!,
        fullName: btn.dataset.fullName!,
        email: btn.dataset.email!,
        role: btn.dataset.role!,
        isActive: btn.dataset.isActive === "true",
      };
      setupModalForEdit(user);
    });
  });
}

// --- Punto de Entrada de la Página ---
async function initializePage() {
  // Asignamos los listeners a los elementos que ya existen al cargar la página
  addUserButton?.addEventListener("click", setupModalForCreate);
  userForm?.addEventListener("submit", handleFormSubmit);
  modal?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (
      target.classList.contains("modal-backdrop") ||
      target.closest(".modal-close")
    ) {
      closeModal();
    }
  });

  // Ahora, intentamos cargar los datos
  try {
    const users = await getUsers();
    renderUsersTable(users);
  } catch (error) {
    if (usersTableBody) {
      usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500">Error al cargar los usuarios. Revisa la consola para más detalles.</td></tr>`;
    }
    console.error(error); // Muestra el error real en la consola del navegador
  }
}

// Iniciar todo cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", initializePage);

// --- Implementaciones completas de las funciones del modal ---
function openModal() {
  modal?.classList.remove("hidden");
  modal?.classList.add("flex");
}

function closeModal() {
  modal?.classList.add("hidden");
  modal?.classList.remove("flex");
  userForm.reset();
  if (modalMessageDiv) modalMessageDiv.textContent = "";
}

function setupModalForCreate() {
  if (modalTitle) modalTitle.textContent = "Añadir Nuevo Usuario";
  userForm.reset();
  userIdField.value = "";
  passwordField.required = true;
  if (passwordContainer) passwordContainer.style.display = "block";
  openModal();
}

function setupModalForEdit(user: User) {
  if (modalTitle) modalTitle.textContent = `Editar Usuario: ${user.fullName}`;
  userIdField.value = user.id;
  fullNameField.value = user.fullName;
  emailField.value = user.email;
  roleField.value = user.role;
  isActiveField.checked = user.isActive;
  passwordField.required = false;
  if (passwordContainer) passwordContainer.style.display = "block";
  openModal();
}

async function handleFormSubmit(event: SubmitEvent) {
  event.preventDefault();
  const formData = new FormData(userForm);
  const id = formData.get("id") as string;
  const isEditing = !!id;

  try {
    if (isEditing) {
      const data: UpdateUserData = {
        fullName: formData.get("fullName") as string,
        email: formData.get("email") as string,
        role: formData.get("role") as "Admin" | "Kitchen",
        isActive: formData.get("isActive") === "on",
      };
      await updateUser(id, data);
    } else {
      const data: CreateUserData = {
        fullName: formData.get("fullName") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        role: formData.get("role") as "Admin" | "Kitchen",
      };
      await createUser(data);
    }
    closeModal();
    window.location.reload();
  } catch (error) {
    if (modalMessageDiv && error instanceof Error) {
      modalMessageDiv.textContent = error.message;
    }
  }
}
