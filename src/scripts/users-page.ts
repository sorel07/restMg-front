// src/scripts/users-page.ts
import { createUser, updateUser } from "../services/api";
import type { CreateUserData, UpdateUserData, User } from "../types/user";

// --- Selección de Elementos del DOM ---
const modal = document.getElementById("user-modal");
const modalTitle = document.getElementById("user-modal-title");
const addUserButton = document.getElementById("add-user-button");
const editButtons = document.querySelectorAll(".edit-user-button");
const userForm = document.getElementById("user-form") as HTMLFormElement;
const modalMessageDiv = document.getElementById("modal-form-message");

// Campos del formulario
const userIdField = document.getElementById("userId") as HTMLInputElement;
const fullNameField = document.getElementById("fullName") as HTMLInputElement;
const emailField = document.getElementById("email") as HTMLInputElement;
const passwordField = document.getElementById("password") as HTMLInputElement;
const passwordContainer = document.getElementById("password-field");
const roleField = document.getElementById("role") as HTMLSelectElement;
const isActiveField = document.getElementById("isActive") as HTMLInputElement;

// --- Funciones para Abrir/Cerrar el Modal ---
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

// --- Funciones para Preparar el Modal (Crear vs. Editar) ---
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
  passwordField.required = false; // La contraseña es opcional al editar
  if (passwordContainer) passwordContainer.style.display = "block"; // O podrías ocultarlo si prefieres
  openModal();
}

// --- Manejador del Envío del Formulario ---
async function handleFormSubmit(event: SubmitEvent) {
  event.preventDefault();
  const formData = new FormData(userForm);

  const id = formData.get("id") as string;
  const isEditing = !!id;

  try {
    if (isEditing) {
      // Lógica de Actualización
      const data: UpdateUserData = {
        fullName: formData.get("fullName") as string,
        email: formData.get("email") as string,
        role: formData.get("role") as "Admin" | "Kitchen",
        isActive: formData.get("isActive") === "on",
      };
      await updateUser(id, data);
    } else {
      // Lógica de Creación
      const data: CreateUserData = {
        fullName: formData.get("fullName") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        role: formData.get("role") as "Admin" | "Kitchen",
      };
      await createUser(data);
    }
    closeModal();
    window.location.reload(); // Recargar para ver los cambios
  } catch (error) {
    if (modalMessageDiv && error instanceof Error) {
      modalMessageDiv.textContent = error.message;
    }
  }
}

// --- Asignación de Event Listeners ---
addUserButton?.addEventListener("click", setupModalForCreate);

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

userForm?.addEventListener("submit", handleFormSubmit);

// Cerrar el modal al hacer clic en el backdrop o en el botón de cerrar
modal?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (
    target.classList.contains("modal-backdrop") ||
    target.closest(".modal-close")
  ) {
    closeModal();
  }
});
