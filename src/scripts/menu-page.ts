import { apiClient, uploadImage } from '../services/api';
import { getUserSession } from '../services/auth';
import notificationManager from '../services/notifications';
import type {
    CreateCategoryRequest,
    CreateMenuItemRequest,
    MenuCategory,
    MenuItem,
    UpdateMenuItemRequest
} from '../types/menu';
import { handleFormSubmit } from './utils/form-handler';

class MenuPageManager {
  private categories: MenuCategory[] = [];
  private currentEditingCategory: MenuCategory | null = null;
  private currentEditingItem: MenuItem | null = null;
  private selectedImageFile: File | null = null;
  private isUploading: boolean = false;

  constructor() {
    this.initializeEventListeners();
    this.setupImageHandlers();
    this.loadMenu();
  }

  private initializeEventListeners() {
    // Botones principales
    document.getElementById('add-category-btn')?.addEventListener('click', () => this.openCategoryModal());
    document.getElementById('add-item-btn')?.addEventListener('click', () => this.openItemModal());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadMenu());

    // Modales - Categoría
    document.getElementById('cancel-category-btn')?.addEventListener('click', () => this.closeCategoryModal());
    document.getElementById('close-category-modal')?.addEventListener('click', () => this.closeCategoryModal());
    document.getElementById('category-form')?.addEventListener('submit', (e) => this.handleCategorySubmit(e));

    // Modales - Plato
    document.getElementById('cancel-item-btn')?.addEventListener('click', () => this.closeItemModal());
    document.getElementById('close-item-modal')?.addEventListener('click', () => this.closeItemModal());
    document.getElementById('menu-item-form')?.addEventListener('submit', (e) => this.handleItemSubmit(e));

    // Cerrar modales al hacer clic fuera
    document.getElementById('category-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeCategoryModal();
    });
    document.getElementById('item-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeItemModal();
    });

    // Escape key para cerrar modales
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const categoryModal = document.getElementById('category-modal');
        const itemModal = document.getElementById('item-modal');
        
        if (categoryModal && !categoryModal.classList.contains('hidden')) {
          this.closeCategoryModal();
        } else if (itemModal && !itemModal.classList.contains('hidden')) {
          this.closeItemModal();
        }
      }
    });
  }

  private setupImageHandlers() {
    // Referencias a elementos
    const uploadTab = document.getElementById('upload-tab');
    const urlTab = document.getElementById('url-tab');
    const uploadPanel = document.getElementById('upload-panel');
    const urlPanel = document.getElementById('url-panel');
    const uploadArea = document.getElementById('item-image-upload-area');
    const fileInput = document.getElementById('item-image-upload') as HTMLInputElement;
    const urlInput = document.getElementById('item-image-url') as HTMLInputElement;
    const testUrlBtn = document.getElementById('test-url-btn');
    const previewContainer = document.getElementById('item-image-preview-container');
    const previewImage = document.getElementById('item-image-preview') as HTMLImageElement;
    const removeButton = document.getElementById('remove-image-preview');
    const sourceIndicator = document.getElementById('image-source-indicator');

    // Manejo de pestañas
    uploadTab?.addEventListener('click', () => {
      this.switchToUploadMode();
    });

    urlTab?.addEventListener('click', () => {
      this.switchToUrlMode();
    });

    // Área de subida de archivos
    uploadArea?.addEventListener('click', () => {
      if (!uploadPanel?.classList.contains('hidden')) {
        fileInput?.click();
      }
    });

    // Drag and drop
    uploadArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!uploadPanel?.classList.contains('hidden')) {
        uploadArea.classList.add('drag-over', 'border-accent/70');
        uploadArea.classList.remove('border-white/20');
      }
    });

    uploadArea?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!uploadArea.contains(e.relatedTarget as Node)) {
        uploadArea.classList.remove('drag-over', 'border-accent/70');
        uploadArea.classList.add('border-white/20');
      }
    });

    uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over', 'border-accent/70');
      uploadArea.classList.add('border-white/20');
      
      if (!uploadPanel?.classList.contains('hidden')) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          this.handleImageFile(files[0]);
        }
      }
    });

    // Selección de archivo
    fileInput?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.handleImageFile(file);
      }
    });

    // Botón para probar URL
    testUrlBtn?.addEventListener('click', () => {
      const url = urlInput?.value?.trim();
      if (url) {
        this.testImageUrl(url);
      } else {
        notificationManager.error('Por favor ingresa una URL válida');
      }
    });

    // Input de URL con validación en tiempo real
    urlInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const url = target.value.trim();
      
      // Limpiar archivo seleccionado si hay URL
      if (url) {
        this.selectedImageFile = null;
        if (fileInput) fileInput.value = '';
      }

      // Validar URL básica
      this.validateImageUrl(url);
    });

    // Aplicar URL al presionar Enter
    urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (url) {
          this.testImageUrl(url);
        }
      }
    });

    // Botón para remover imagen
    removeButton?.addEventListener('click', () => {
      this.clearImageSelection();
    });
  }

  private switchToUploadMode() {
    const uploadTab = document.getElementById('upload-tab');
    const urlTab = document.getElementById('url-tab');
    const uploadPanel = document.getElementById('upload-panel');
    const urlPanel = document.getElementById('url-panel');

    // Actualizar pestañas
    uploadTab?.classList.add('bg-accent', 'text-white');
    uploadTab?.classList.remove('text-text-secondary', 'hover:text-text-primary', 'hover:bg-white/5');
    
    urlTab?.classList.remove('bg-accent', 'text-white');
    urlTab?.classList.add('text-text-secondary', 'hover:text-text-primary', 'hover:bg-white/5');

    // Mostrar/ocultar paneles
    uploadPanel?.classList.remove('hidden');
    urlPanel?.classList.add('hidden');

    // Limpiar URL si hay alguna
    const urlInput = document.getElementById('item-image-url') as HTMLInputElement;
    if (urlInput && urlInput.value.trim()) {
      urlInput.value = '';
      // No limpiar preview si hay archivo seleccionado
      if (!this.selectedImageFile) {
        this.hideImagePreview();
      }
    }
  }

  private switchToUrlMode() {
    const uploadTab = document.getElementById('upload-tab');
    const urlTab = document.getElementById('url-tab');
    const uploadPanel = document.getElementById('upload-panel');
    const urlPanel = document.getElementById('url-panel');

    // Actualizar pestañas
    urlTab?.classList.add('bg-accent', 'text-white');
    urlTab?.classList.remove('text-text-secondary', 'hover:text-text-primary', 'hover:bg-white/5');
    
    uploadTab?.classList.remove('bg-accent', 'text-white');
    uploadTab?.classList.add('text-text-secondary', 'hover:text-text-primary', 'hover:bg-white/5');

    // Mostrar/ocultar paneles
    urlPanel?.classList.remove('hidden');
    uploadPanel?.classList.add('hidden');

    // Limpiar archivo seleccionado
    this.selectedImageFile = null;
    const fileInput = document.getElementById('item-image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // No limpiar preview si hay URL válida
    const urlInput = document.getElementById('item-image-url') as HTMLInputElement;
    if (!urlInput?.value.trim()) {
      this.hideImagePreview();
    }

    // Focus en input de URL
    setTimeout(() => {
      urlInput?.focus();
    }, 100);
  }

  private validateImageUrl(url: string) {
    const testUrlBtn = document.getElementById('test-url-btn');
    if (!testUrlBtn) return;

    if (!url) {
      testUrlBtn.classList.add('opacity-50', 'cursor-not-allowed');
      testUrlBtn.classList.remove('hover:bg-white/10');
      return;
    }

    try {
      new URL(url);
      testUrlBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      testUrlBtn.classList.add('hover:bg-white/10');
    } catch {
      testUrlBtn.classList.add('opacity-50', 'cursor-not-allowed');
      testUrlBtn.classList.remove('hover:bg-white/10');
    }
  }

  private async testImageUrl(url: string) {
    const testUrlBtn = document.getElementById('test-url-btn');
    const originalText = testUrlBtn?.innerHTML;

    try {
      // Validar URL
      new URL(url);
      
      // Mostrar estado de carga
      if (testUrlBtn) {
        testUrlBtn.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando...
          </div>
        `;
        testUrlBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }

      // Probar carga de imagen
      await this.loadImageFromUrl(url);
      this.showImagePreview(url, 'url');
      notificationManager.success('Imagen cargada correctamente');

    } catch (error) {
      console.error('Error loading image URL:', error);
      notificationManager.error('No se pudo cargar la imagen desde esa URL');
    } finally {
      // Restaurar botón
      if (testUrlBtn && originalText) {
        testUrlBtn.innerHTML = originalText;
        testUrlBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        testUrlBtn.classList.add('hover:bg-white/10');
      }
    }
  }

  private loadImageFromUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  private handleImageFile(file: File) {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      notificationManager.error('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      notificationManager.error('La imagen no puede superar los 5MB.');
      return;
    }

    this.selectedImageFile = file;
    
    // Limpiar URL externa si hay archivo
    const urlInput = document.getElementById('item-image-url') as HTMLInputElement;
    if (urlInput) urlInput.value = '';

    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = (e) => {
      this.showImagePreview(e.target?.result as string, 'file');
    };
    reader.readAsDataURL(file);
  }

  private showImagePreview(src: string, source: 'file' | 'url' = 'file') {
    const previewContainer = document.getElementById('item-image-preview-container');
    const previewImage = document.getElementById('item-image-preview') as HTMLImageElement;
    const sourceIndicator = document.getElementById('image-source-indicator');
    const uploadPanel = document.getElementById('upload-panel');
    const urlPanel = document.getElementById('url-panel');

    if (previewContainer && previewImage) {
      previewImage.src = src;
      
      // Actualizar indicador de fuente
      if (sourceIndicator) {
        sourceIndicator.textContent = source === 'file' ? '📁 Archivo subido' : '🌐 URL externa';
      }

      // Ocultar paneles de entrada y mostrar preview
      if (uploadPanel && urlPanel) {
        uploadPanel.classList.add('hidden');
        urlPanel.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        
        // Animación de entrada de la vista previa
        previewContainer.style.transform = 'scale(0.95)';
        previewContainer.style.opacity = '0';
        
        requestAnimationFrame(() => {
          previewContainer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          previewContainer.style.transform = 'scale(1)';
          previewContainer.style.opacity = '1';
        });
      }
    }
  }

  private hideImagePreview() {
    const previewContainer = document.getElementById('item-image-preview-container');
    const uploadPanel = document.getElementById('upload-panel');
    const urlPanel = document.getElementById('url-panel');
    const uploadTab = document.getElementById('upload-tab');

    if (previewContainer) {
      // Animación de salida de la vista previa
      previewContainer.style.transform = 'scale(0.95)';
      previewContainer.style.opacity = '0';
      
      setTimeout(() => {
        previewContainer.classList.add('hidden');
        
        // Mostrar el panel activo (por defecto upload)
        if (uploadTab?.classList.contains('bg-accent')) {
          uploadPanel?.classList.remove('hidden');
        } else {
          urlPanel?.classList.remove('hidden');
        }
        
        // Resetear estilos
        previewContainer.style.transform = '';
        previewContainer.style.opacity = '';
        previewContainer.style.transition = '';
      }, 300);
    }
  }

  private clearImageSelection() {
    this.selectedImageFile = null;
    
    const fileInput = document.getElementById('item-image-upload') as HTMLInputElement;
    const urlInput = document.getElementById('item-image-url') as HTMLInputElement;
    
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    
    this.hideImagePreview();
    
    // Resetear a modo de subida por defecto
    this.switchToUploadMode();
  }

  private showUploadProgress() {
    const uploadContent = document.getElementById('upload-content');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    
    if (uploadContent && uploadProgress && progressBar) {
      uploadContent.classList.add('hidden');
      uploadProgress.classList.remove('hidden');
      
      // Simular progreso (ya que no tenemos progreso real del upload)
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = `${progress}%`;
        
        if (progress >= 90) {
          clearInterval(interval);
        }
      }, 200);
      
      return interval;
    }
    return null;
  }

  private hideUploadProgress() {
    const uploadContent = document.getElementById('upload-content');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    
    if (uploadContent && uploadProgress && progressBar) {
      // Completar progreso
      progressBar.style.width = '100%';
      
      setTimeout(() => {
        uploadProgress.classList.add('hidden');
        uploadContent.classList.remove('hidden');
        progressBar.style.width = '0%';
      }, 500);
    }
  }

  private async loadMenu() {
    try {
      this.showLoading();
      
      // Obtener la sesión para el restaurantId
      const session = getUserSession();
      if (!session || !session.restaurantId) {
        throw new Error('No se pudo obtener la información del restaurante');
      }

      // Para el panel de administración, obtenemos el menú completo incluyendo platos inactivos
      const response = await apiClient.get(`/menu?restaurantId=${session.restaurantId}`);
      
      console.log('Respuesta de la API:', response.data);
      
      // La respuesta debería ser un array de categorías con sus items
      // Procesar los datos para asegurar que tengan las propiedades necesarias
      this.categories = response.data.map((category: any) => ({
        ...category,
        isActive: category.isActive ?? true, // Valor por defecto si no viene de la API
        items: category.items.map((item: any) => ({
          ...item,
          categoryId: category.id, // ✅ Asignar categoryId desde la categoría padre
          isActive: item.isActive ?? true // Valor por defecto si no viene de la API
        }))
      })).sort((a: MenuCategory, b: MenuCategory) => a.displayOrder - b.displayOrder);

      this.renderMenu();
      this.populateCategorySelect();
      
    } catch (error) {
      console.error('Error loading menu:', error);
      this.showError();
    }
  }

  private showLoading() {
    document.getElementById('loading-message')?.classList.remove('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
    document.getElementById('menu-content')?.classList.add('hidden');
  }

  private showError() {
    document.getElementById('loading-message')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.remove('hidden');
    document.getElementById('menu-content')?.classList.add('hidden');
  }

  private showContent() {
    document.getElementById('loading-message')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
    document.getElementById('menu-content')?.classList.remove('hidden');
  }

  private renderMenu() {
    const menuContent = document.getElementById('menu-content');
    if (!menuContent) return;

    if (this.categories.length === 0) {
      menuContent.innerHTML = `
        <div class="text-center text-text-secondary p-8">
          <p class="text-lg mb-4">No hay categorías de menú configuradas.</p>
          <button class="bg-accent text-white px-4 py-2 rounded-md hover:bg-opacity-80" onclick="document.getElementById('add-category-btn')?.click()">
            Crear Primera Categoría
          </button>
        </div>
      `;
    } else {
      menuContent.innerHTML = this.categories.map(category => this.renderCategory(category)).join('');
    }

    this.showContent();
  }

  private renderCategory(category: MenuCategory): string {
    const itemsHtml = category.items.length > 0 
      ? category.items.map(item => this.renderMenuItem(item)).join('')
      : '<p class="text-text-secondary text-center py-8">No hay platos en esta categoría.</p>';

    return `
      <div class="bg-surface rounded-lg p-6 border border-white/10">
        <div class="flex justify-between items-center mb-6">
          <h2 class="font-heading text-2xl font-bold text-text-primary">${category.name}</h2>
          <div class="flex gap-x-2">
            <button 
              onclick="menuManager.editCategory('${category.id}')"
              class="bg-background text-text-primary cursor-pointer px-3 py-1 rounded text-sm hover:bg-white/10 transition-colors"
            >
              Editar
            </button>
            <button 
              onclick="menuManager.deleteCategory('${category.id}')"
              class="bg-red-600 text-white cursor-pointer px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  private renderMenuItem(item: MenuItem): string {
    const imageHtml = item.imageUrl 
      ? `<img src="${item.imageUrl}" alt="${item.name}" class="w-full h-32 object-cover rounded-md mb-3">`
      : `<div class="w-full h-32 bg-background rounded-md mb-3 flex items-center justify-center">
           <span class="text-text-secondary">Sin imagen</span>
         </div>`;

    const availabilityClass = item.isAvailable ? 'text-green-400' : 'text-red-400';
    const availabilityText = item.isAvailable ? 'Disponible' : 'No disponible';
    // Eliminamos la verificación de isActive ya que no existe en la API
    const cardOpacity = item.isAvailable ? '' : 'opacity-75';

    return `
      <div class="bg-background rounded-lg p-4 border border-white/10 relative ${cardOpacity}" data-item-id="${item.id}">
        ${imageHtml}
        <h3 class="font-bold text-text-primary mb-2">${item.name}</h3>
        ${item.description ? `<p class="text-text-secondary text-sm mb-3">${item.description}</p>` : ''}
        <div class="flex justify-between items-center mb-3">
          <span class="font-bold text-accent text-lg">$${item.price.toLocaleString()}</span>
          <div class="flex items-center gap-x-2">
            <span class="text-sm ${availabilityClass}">${availabilityText}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                ${item.isAvailable ? 'checked' : ''} 
                onchange="menuManager.toggleAvailability('${item.id}', this.checked)"
                class="sr-only peer"
              >
              <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
        <div class="flex gap-x-2">
          <button 
            onclick="menuManager.editItem('${item.id}')"
            class="flex-1 bg-surface text-text-primary cursor-pointer px-3 py-1 rounded text-sm hover:bg-white/10 transition-colors"
          >
            Editar
          </button>
          <button 
            onclick="menuManager.deleteItem('${item.id}')"
            class="flex-1 bg-red-600 text-white cursor-pointer px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    `;
  }

  private populateCategorySelect() {
    const select = document.getElementById('item-category') as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar categoría...</option>';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  }

  // Modal Management - Category
  private openCategoryModal(category?: MenuCategory) {
    this.currentEditingCategory = category || null;
    const modal = document.getElementById('category-modal');
    const modalContent = document.getElementById('category-modal-content');
    const title = document.getElementById('category-modal-title');
    const form = document.getElementById('category-form') as HTMLFormElement;

    if (modal && modalContent && title && form) {
      title.textContent = category ? 'Editar Categoría' : 'Añadir Categoría';
      
      if (category) {
        (form.elements.namedItem('name') as HTMLInputElement).value = category.name;
        (form.elements.namedItem('displayOrder') as HTMLInputElement).value = category.displayOrder.toString();
      } else {
        form.reset();
        (form.elements.namedItem('displayOrder') as HTMLInputElement).value = (this.categories.length + 1).toString();
      }

      // Animación de apertura
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      });

      // Focus en el primer input
      setTimeout(() => {
        const firstInput = form.querySelector('input') as HTMLInputElement;
        firstInput?.focus();
      }, 150);
    }
  }

  private closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    const modalContent = document.getElementById('category-modal-content');
    
    if (modal && modalContent) {
      // Animación de cierre
      modal.classList.add('opacity-0');
      modalContent.classList.remove('scale-100');
      modalContent.classList.add('scale-95');
      
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
    this.currentEditingCategory = null;
  }

  private async handleCategorySubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    handleFormSubmit({
      form,
      apiCall: (data) => {
        if (this.currentEditingCategory) {
          return apiClient.put(`/menu/categories/${this.currentEditingCategory.id}`, data);
        }
        return apiClient.post('/menu/categories', data);
      },
      onSuccess: () => {
        this.closeCategoryModal();
        this.loadMenu();
        notificationManager.success(`Categoría ${this.currentEditingCategory ? 'actualizada' : 'creada'} con éxito.`);
      },
    });
  }

  // Modal Management - Item
  private openItemModal(item?: MenuItem) {
    this.currentEditingItem = item || null;
    const modal = document.getElementById('item-modal');
    const modalContent = document.getElementById('item-modal-content');
    const title = document.getElementById('item-modal-title');
    const form = document.getElementById('menu-item-form') as HTMLFormElement;
    const availabilityContainer = document.getElementById('item-availability-container');

    if (modal && modalContent && title && form && availabilityContainer) {
      title.textContent = item ? 'Editar Plato' : 'Añadir Plato';
      
      if (item) {
        (form.elements.namedItem('categoryId') as HTMLSelectElement).value = item.categoryId;
        (form.elements.namedItem('name') as HTMLInputElement).value = item.name;
        (form.elements.namedItem('description') as HTMLTextAreaElement).value = item.description || '';
        (form.elements.namedItem('price') as HTMLInputElement).value = item.price.toString();
        (form.elements.namedItem('isAvailable') as HTMLInputElement).checked = item.isAvailable;
        availabilityContainer.classList.remove('hidden');
        
        // Manejar imagen existente
        if (item.imageUrl) {
          const urlInput = document.getElementById('item-image-url') as HTMLInputElement;
          if (urlInput) {
            urlInput.value = item.imageUrl;
            this.switchToUrlMode(); // Cambiar a modo URL
            this.showImagePreview(item.imageUrl, 'url');
          }
        } else {
          this.clearImageSelection();
        }
      } else {
        form.reset();
        availabilityContainer.classList.add('hidden');
        this.clearImageSelection();
      }

      // Animación de apertura
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      });

      // Focus en el primer input
      setTimeout(() => {
        const firstInput = form.querySelector('input') as HTMLInputElement;
        firstInput?.focus();
      }, 150);
    }
  }

  private closeItemModal() {
    const modal = document.getElementById('item-modal');
    const modalContent = document.getElementById('item-modal-content');
    
    if (modal && modalContent) {
      // Animación de cierre
      modal.classList.add('opacity-0');
      modalContent.classList.remove('scale-100');
      modalContent.classList.add('scale-95');
      
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
    this.currentEditingItem = null;
    this.clearImageSelection();
  }

  private async handleItemSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    handleFormSubmit({
      form,
      apiCall: async (data) => {
        let imageUrl = data.imageUrl;
        if (this.selectedImageFile) {
          const uploadResult = await uploadImage(this.selectedImageFile);
          imageUrl = uploadResult.url;
        }
        
        const itemData = { ...data, imageUrl };

        if (this.currentEditingItem) {
          return apiClient.put(`/menu/items/${this.currentEditingItem.id}`, itemData);
        }
        return apiClient.post('/menu/items', itemData);
      },
      onSuccess: () => {
        this.closeItemModal();
        this.loadMenu();
        notificationManager.success(`Plato ${this.currentEditingItem ? 'actualizado' : 'creado'} con éxito.`);
      },
      getFormData: (formData) => ({
        categoryId: formData.get('categoryId') as string,
        name: formData.get('name') as string,
        description: formData.get('description') as string || "",
        price: parseFloat(formData.get('price') as string),
        imageUrl: (formData.get('imageUrl') as string) || "",
        isAvailable: formData.get('isAvailable') === 'on',
      }),
      customValidation: () => {
        const categoryId = (form.elements.namedItem('categoryId') as HTMLSelectElement).value;
        if (!categoryId) {
          notificationManager.error('Por favor selecciona una categoría.');
          return false;
        }
        return true;
      },
    });
  }

  // Public methods for template onclick handlers
  public editCategory(id: string) {
    const category = this.categories.find(c => c.id === id);
    if (category) {
      this.openCategoryModal(category);
    }
  }

  public async deleteCategory(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría? Todos los platos asociados también se eliminarán.')) {
      try {
        await apiClient.delete(`/menu/categories/${id}`);
        await this.loadMenu();
        notificationManager.success('Categoría eliminada correctamente');
      } catch (error) {
        console.error('Error deleting category:', error);
        notificationManager.error('Error al eliminar la categoría. Por favor, intenta nuevamente.');
      }
    }
  }

  public editItem(id: string) {
    let item: MenuItem | undefined;
    
    // Buscar el item (ya tiene categoryId asignado desde loadMenu)
    for (const category of this.categories) {
      item = category.items.find(i => i.id === id);
      if (item) break;
    }
    
    if (item) {
      this.openItemModal(item);
    }
  }

  public async deleteItem(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este plato?')) {
      try {
        await apiClient.delete(`/menu/items/${id}`);
        await this.loadMenu();
        notificationManager.success('Plato eliminado correctamente');
      } catch (error) {
        console.error('Error deleting item:', error);
        notificationManager.error('Error al eliminar el plato. Por favor, intenta nuevamente.');
      }
    }
  }

  public async toggleAvailability(itemId: string, isAvailable: boolean) {
    try {
      let item: MenuItem | undefined;
      
      // Buscar el item (ya tiene categoryId asignado desde loadMenu)
      for (const category of this.categories) {
        item = category.items.find(i => i.id === itemId);
        if (item) break;
      }

      if (!item) {
        notificationManager.error('No se encontró el item');
        return;
      }

      // Asegurar que todos los campos requeridos estén presentes
      const updateData = {
        categoryId: item.categoryId,
        name: item.name,
        description: item.description || "",
        price: item.price,
        imageUrl: item.imageUrl || "",
        isAvailable: isAvailable
      };

      console.log('Enviando datos para toggleAvailability:', updateData);

      await apiClient.put(`/menu/items/${itemId}`, updateData);
      
      // Actualizar el estado local sin recargar toda la página
      item.isAvailable = isAvailable;
      
      // Actualizar la UI dinámicamente
      this.updateItemAvailabilityUI(itemId, isAvailable);
      
      notificationManager.success(
        `Item ${isAvailable ? 'habilitado' : 'deshabilitado'} correctamente`
      );
      
    } catch (error) {
      console.error('Error updating item availability:', error);
      notificationManager.error('Error al actualizar la disponibilidad. Por favor, intenta nuevamente.');
      // Revertir el toggle en caso de error
      await this.loadMenu();
    }
  }

  /**
   * Actualiza dinámicamente la UI de disponibilidad de un item sin recargar toda la página
   */
  private updateItemAvailabilityUI(itemId: string, isAvailable: boolean) {
    // Buscar la tarjeta del item específico usando el atributo data-item-id
    const itemCard = document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
    if (!itemCard) {
      console.warn(`No se encontró la tarjeta para el item ${itemId}`);
      return;
    }

    this.updateItemCardUI(itemCard, isAvailable);
  }

  /**
   * Actualiza los elementos visuales de una tarjeta de item específica
   */
  private updateItemCardUI(card: HTMLElement, isAvailable: boolean) {
    // Actualizar el texto de disponibilidad
    const availabilitySpan = card.querySelector('.text-green-400, .text-red-400');
    if (availabilitySpan) {
      availabilitySpan.className = availabilitySpan.className.replace(
        /text-(green|red)-400/g, 
        isAvailable ? 'text-green-400' : 'text-red-400'
      );
      availabilitySpan.textContent = isAvailable ? 'Disponible' : 'No disponible';
    }

    // Actualizar la opacidad de la tarjeta
    if (isAvailable) {
      card.classList.remove('opacity-75');
    } else {
      card.classList.add('opacity-75');
    }

    // El checkbox ya debería estar actualizado por el navegador, pero por si acaso
    const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = isAvailable;
    }
  }
}

// Initialize and expose globally for template onclick handlers
const menuManager = new MenuPageManager();
(window as any).menuManager = menuManager;
