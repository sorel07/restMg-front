import { getUsers, createUser, updateUser } from "../services/api";
import notificationManager from "../services/notifications";
import type { CreateUserData, UpdateUserData, User } from "../types/user";
import { handleFormSubmit } from "./utils/form-handler";

class UsersPageManager {
  private modal: HTMLElement | null;
  private modalTitle: HTMLElement | null;
  private userForm: HTMLFormElement | null;
  private usersTableBody: HTMLElement | null;
  private userIdField: HTMLInputElement | null;
  private passwordField: HTMLInputElement | null;

  constructor() {
    this.modal = document.getElementById("user-modal");
    this.modalTitle = document.getElementById("user-modal-title");
    this.userForm = document.getElementById("user-form") as HTMLFormElement;
    this.usersTableBody = document.getElementById("users-table-body");
    this.userIdField = document.getElementById("userId") as HTMLInputElement;
    this.passwordField = document.getElementById("password") as HTMLInputElement;
    this.initializePage();
  }

  private async initializePage() {
    this.setupEventListeners();
    try {
      const users = await getUsers();
      this.renderUsersTable(users);
    } catch (error) {
      console.error(error);
      if (this.usersTableBody) {
        this.usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500">Error al cargar los usuarios.</td></tr>`;
      }
    }
  }

  private setupEventListeners() {
    document.getElementById("add-user-button")?.addEventListener("click", () => this.setupModalForCreate());
    this.userForm?.addEventListener("submit", (e) => this.onFormSubmit(e));
    this.modal?.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".modal-close")) {
        this.closeModal();
      }
    });
  }

  private renderUsersTable(users: User[]) {
    if (!this.usersTableBody) return;
    if (users.length === 0) {
      this.usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-text-secondary">No se encontraron usuarios.</td></tr>`;
      return;
    }
    this.usersTableBody.innerHTML = users.map(user => `
      <tr class="border-b border-white/10 last:border-b-0 hover:bg-white/5">
        <td class="p-4">${user.fullName}</td>
        <td class="p-4 text-text-secondary">${user.email}</td>
        <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${this.getRoleBadgeClass(user.role)}">${user.role}</span></td>
        <td class="p-4"><span class="font-bold ${user.isActive ? "text-green-400" : "text-red-400"}">${user.isActive ? "Activo" : "Inactivo"}</span></td>
        <td class="p-4"><button class="edit-user-button text-text-secondary hover:text-accent cursor-pointer" data-user-id="${user.id}">Editar</button></td>
      </tr>
    `).join("");
    this.assignEditButtonListeners(users);
  }

  private getRoleBadgeClass(role: string): string {
    switch (role) {
      case "Admin":
        return "bg-accent/20 text-accent";
      case "Kitchen":
        return "bg-blue-500/20 text-blue-400";
      case "Awaiter":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  }

  private assignEditButtonListeners(users: User[]) {
    this.usersTableBody?.querySelectorAll(".edit-user-button").forEach(button => {
      button.addEventListener("click", (e) => {
        const userId = (e.target as HTMLElement).dataset.userId;
        const user = users.find(u => u.id === userId);
        if (user) {
          this.setupModalForEdit(user);
        }
      });
    });
  }

  private openModal() {
    this.modal?.classList.remove("hidden");
  }

  private closeModal() {
    this.modal?.classList.add("hidden");
    this.userForm?.reset();
  }

  private setupModalForCreate() {
    if (this.modalTitle) this.modalTitle.textContent = "Añadir Nuevo Usuario";
    if (this.userForm) this.userForm.reset();
    if (this.userIdField) this.userIdField.value = "";
    if (this.passwordField) this.passwordField.required = true;
    this.openModal();
  }

  private setupModalForEdit(user: User) {
    if (this.modalTitle) this.modalTitle.textContent = `Editar Usuario: ${user.fullName}`;
    if (this.userForm) {
      (this.userForm.elements.namedItem("id") as HTMLInputElement).value = user.id;
      (this.userForm.elements.namedItem("fullName") as HTMLInputElement).value = user.fullName;
      (this.userForm.elements.namedItem("email") as HTMLInputElement).value = user.email;
      (this.userForm.elements.namedItem("role") as HTMLSelectElement).value = user.role;
      (this.userForm.elements.namedItem("isActive") as HTMLInputElement).checked = user.isActive;
    }
    if (this.passwordField) this.passwordField.required = false;
    this.openModal();
  }

  private onFormSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!this.userForm) return;

    const id = this.userIdField?.value;
    const isEditing = !!id;

    handleFormSubmit({
      form: this.userForm,
      apiCall: (data) => {
        return isEditing ? updateUser(id, data as UpdateUserData) : createUser(data as CreateUserData);
      },
      onSuccess: () => {
        this.closeModal();
        notificationManager.success(`Usuario ${isEditing ? 'actualizado' : 'creado'} con éxito.`);
        this.initializePage(); // Recargar la tabla
      },
      getFormData: (formData) => {
        const data: Partial<CreateUserData | UpdateUserData> = {
          fullName: formData.get("fullName") as string,
          email: formData.get("email") as string,
          role: formData.get("role") as "Admin" | "Kitchen",
        };
        if (isEditing) {
          (data as UpdateUserData).isActive = formData.get("isActive") === "on";
        } else {
          (data as CreateUserData).password = formData.get("password") as string;
        }
        return data;
      },
      customValidation: () => {
        if (!isEditing && !this.passwordField?.value) {
          notificationManager.error("La contraseña es obligatoria para nuevos usuarios.");
          return false;
        }
        return true;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new UsersPageManager());