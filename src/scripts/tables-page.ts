import { apiClient } from '../services/api';
import notificationManager from '../services/notifications';
import type { CreateTableRequest, Table, TableStatus, UpdateTableRequest } from '../types/table';

class TablesPageManager {
  private tables: Table[] = [];
  private currentEditingTable: Table | null = null;
  private isLoading = false;

  constructor() {
    this.initializePage();
  }

  private initializePage() {
    this.init();
    this.getTables();
  }

  private async getTables() {
    return this.loadTables();
  }

  private init() {
    // Event listeners para modales
    document.getElementById('add-table-btn')?.addEventListener('click', () => this.openTableModal());
    document.getElementById('cancel-table-btn')?.addEventListener('click', () => this.closeTableModal());
    document.getElementById('close-table-modal')?.addEventListener('click', () => this.closeTableModal());
    document.getElementById('close-qr-modal')?.addEventListener('click', () => this.closeQrModal());
    document.getElementById('close-qr-btn')?.addEventListener('click', () => this.closeQrModal());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadTables());

    // Event listener para formulario
    document.getElementById('table-form')?.addEventListener('submit', (e) => this.handleTableSubmit(e));

    // Event listeners para cerrar modales al hacer click fuera
    document.getElementById('table-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeTableModal();
    });
    document.getElementById('qr-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeQrModal();
    });

    // Event listeners para QR
    document.getElementById('download-qr-btn')?.addEventListener('click', () => this.downloadQr());
    document.getElementById('retry-qr-btn')?.addEventListener('click', () => this.retryQrGeneration());
  }

  private async loadTables() {
    try {
      this.showLoading();
      
      const response = await apiClient.get('/tables');
      this.tables = response.data;

      this.renderUsersTable();
      this.showContent();
      
    } catch (error) {
      console.error('Error loading tables:', error);
      this.showError();
    }
  }

  private showLoading() {
    const loading = document.getElementById('loading-message');
    const error = document.getElementById('error-message');
    const content = document.getElementById('tables-content');

    loading?.classList.remove('hidden');
    error?.classList.add('hidden');
    content?.classList.add('hidden');
  }

  private showError() {
    const loading = document.getElementById('loading-message');
    const error = document.getElementById('error-message');
    const content = document.getElementById('tables-content');

    loading?.classList.add('hidden');
    error?.classList.remove('hidden');
    content?.classList.add('hidden');
  }

  private showContent() {
    const loading = document.getElementById('loading-message');
    const error = document.getElementById('error-message');
    const content = document.getElementById('tables-content');

    loading?.classList.add('hidden');
    error?.classList.add('hidden');
    content?.classList.remove('hidden');
  }

  private renderUsersTable() {
    const grid = document.getElementById('tables-grid');
    if (!grid) return;

    if (this.tables.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <svg class="w-16 h-16 text-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15l8-6"></path>
          </svg>
          <p class="text-text-secondary text-lg">No hay mesas creadas</p>
          <p class="text-text-secondary text-sm mt-2">Comienza agregando tu primera mesa</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.tables.map(table => this.renderTableCard(table)).join('');
    
    // Asignar event listeners después de renderizar
    this.assignTableButtonListeners();
  }

  private assignTableButtonListeners() {
    const qrButtons = document.querySelectorAll('.qr-button');
    qrButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const tableId = target.getAttribute('data-table-id');
        const tableCode = target.getAttribute('data-table-code');
        
        if (tableId && tableCode) {
          this.showQrModal(tableId, tableCode);
        }
      });
    });
  }

  private renderTableCard(table: Table): string {
    const statusColor = this.getStatusColor(table.status as TableStatus);
    const statusText = this.getStatusText(table.status as TableStatus);

    return `
      <div class="bg-background rounded-lg p-6 border border-white/10 hover:border-white/20 transition-all duration-200 relative">
        <!-- Indicador de estado -->
        <div class="absolute top-4 right-4">
          <div class="w-3 h-3 rounded-full ${statusColor}"></div>
        </div>
        
        <!-- Contenido principal -->
        <div class="pr-8">
          <h3 class="font-bold text-xl text-text-primary mb-2">${table.code}</h3>
          <p class="text-text-secondary text-sm mb-4">Estado: ${statusText}</p>
        </div>
        
        <!-- Botones de acción -->
        <div class="flex gap-2">
          <button 
            onclick="tablesManager.editTable('${table.id}')"
            class="flex-1 bg-surface text-text-primary cursor-pointer px-3 py-2 rounded text-sm hover:bg-white/10 transition-colors"
          >
            Editar
          </button>
          <button 
            data-table-id="${table.id}"
            data-table-code="${table.code}"
            class="qr-button flex-1 bg-accent text-white cursor-pointer px-3 py-2 rounded text-sm hover:bg-opacity-80 transition-colors"
          >
            Generar QR
          </button>
        </div>
      </div>
    `;
  }

  private getStatusColor(status: TableStatus): string {
    switch (status) {
      case 'Available':
        return 'bg-green-500';
      case 'Occupied':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  private getStatusText(status: TableStatus): string {
    switch (status) {
      case 'Available':
        return 'Disponible';
      case 'Occupied':
        return 'Ocupada';
      default:
        return status;
    }
  }

  // Modal Management - Table
  private openTableModal(table?: Table) {
    this.currentEditingTable = table || null;
    const modal = document.getElementById('table-modal');
    const modalContent = document.getElementById('table-modal-content');
    const title = document.getElementById('table-modal-title');
    const form = document.getElementById('table-form') as HTMLFormElement;
    const statusContainer = document.getElementById('table-status-container');

    if (modal && modalContent && title && form && statusContainer) {
      title.textContent = table ? 'Editar Mesa' : 'Añadir Mesa';
      
      if (table) {
        (form.elements.namedItem('code') as HTMLInputElement).value = table.code;
        (form.elements.namedItem('status') as HTMLSelectElement).value = table.status;
        statusContainer.classList.remove('hidden');
      } else {
        form.reset();
        statusContainer.classList.add('hidden');
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

  private closeTableModal() {
    const modal = document.getElementById('table-modal');
    const modalContent = document.getElementById('table-modal-content');

    if (modal && modalContent) {
      modal.classList.add('opacity-0');
      modalContent.classList.remove('scale-100');
      modalContent.classList.add('scale-95');

      setTimeout(() => {
        modal.classList.add('hidden');
        this.currentEditingTable = null;
      }, 300);
    }
  }

  private async handleTableSubmit(e: Event) {
    e.preventDefault();
    
    if (this.isLoading) {
      return;
    }

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalButtonText = submitButton?.textContent || 'Guardar';

    try {
      this.isLoading = true;
      
      // Deshabilitar botón y mostrar estado de carga
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `
          <div class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Guardando...</span>
          </div>
        `;
      }

      if (this.currentEditingTable) {
        // Editar mesa existente
        const updateData: UpdateTableRequest = {
          code: formData.get('code') as string,
          status: formData.get('status') as string,
        };

        await apiClient.put(`/tables/${this.currentEditingTable.id}`, updateData);
        notificationManager.success('Mesa actualizada correctamente');
      } else {
        // Crear nueva mesa
        const createData: CreateTableRequest = {
          code: formData.get('code') as string,
        };

        await apiClient.post('/tables', createData);
        notificationManager.success('Mesa creada correctamente');
      }

      this.closeTableModal();
      await this.loadTables();
      
    } catch (error) {
      console.error('Error saving table:', error);
      notificationManager.error('Error al guardar la mesa. Por favor, intenta nuevamente.');
    } finally {
      this.isLoading = false;
      
      // Restaurar botón
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  }

  // Modal Management - QR
  private currentQrData: { tableId: string; tableCode: string } | null = null;

  private showQrModal(tableId: string, tableCode?: string) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return;

    // Usar el tableCode pasado como parámetro o el del objeto table
    const code = tableCode || table.code;
    this.currentQrData = { tableId: table.id, tableCode: code };

    const modal = document.getElementById('qr-modal');
    const modalContent = document.getElementById('qr-modal-content');
    const title = document.getElementById('qr-modal-title');

    if (modal && modalContent && title) {
      title.textContent = `Código QR para: ${code}`;
      
      // Resetear estados del modal
      this.resetQrModalState();

      // Animación de apertura
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
      });

      // Generar QR inmediatamente
      this.generateQrCode(table.id, code);
    }
  }

  private resetQrModalState() {
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    const qrLoading = document.getElementById('qr-loading');
    const qrError = document.getElementById('qr-error');
    const downloadBtn = document.getElementById('download-qr-btn') as HTMLButtonElement;
    const qrInfo = document.getElementById('qr-info');
    const errorMessage = document.getElementById('qr-error-message');
    const errorSubtitle = document.getElementById('qr-error-subtitle');
    const settingsLink = document.getElementById('settings-link');
    const generalErrorIcon = document.getElementById('general-error-icon');
    const configErrorIcon = document.getElementById('config-error-icon');

    // Resetear imagen
    if (qrImage) {
      qrImage.style.display = 'none';
      qrImage.style.opacity = '0';
      qrImage.src = '';
    }

    // Mostrar loading
    if (qrLoading) {
      qrLoading.style.display = 'flex';
    }

    // Ocultar error y resetear mensaje
    if (qrError) {
      qrError.style.display = 'none';
    }
    
    if (errorMessage) {
      errorMessage.textContent = 'Error al generar QR';
    }
    
    if (errorSubtitle) {
      errorSubtitle.style.display = 'none';
    }
    
    if (settingsLink) {
      settingsLink.style.display = 'none';
    }
    
    // Resetear iconos
    if (generalErrorIcon) {
      generalErrorIcon.style.display = 'block';
    }
    
    if (configErrorIcon) {
      configErrorIcon.style.display = 'none';
    }

    // Deshabilitar botón de descarga
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.querySelector('#download-btn-text')!.textContent = 'Generando QR...';
    }

    // Ocultar info
    if (qrInfo) {
      qrInfo.style.display = 'none';
    }
  }

  private async generateQrCode(tableId: string, tableCode: string) {
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    const qrLoading = document.getElementById('qr-loading');
    const qrError = document.getElementById('qr-error');
    const downloadBtn = document.getElementById('download-qr-btn') as HTMLButtonElement;
    const qrInfo = document.getElementById('qr-info');

    try {
      // Hacer petición directa para obtener la imagen QR
      console.log('Obteniendo QR para mesa:', tableCode);
      const response = await apiClient.get(`/tables/${tableId}/qr`, {
        responseType: 'blob',
        headers: {
          'Accept': 'image/png'
        }
      });

      // Crear URL del blob para la imagen
      const imageUrl = URL.createObjectURL(response.data);
      
      // Configurar imagen
      qrImage.onload = () => {
        // Ocultar loading
        if (qrLoading) qrLoading.style.display = 'none';
        
        // Mostrar imagen con animación
        qrImage.style.display = 'block';
        qrImage.style.opacity = '1';
        
        // Habilitar botón de descarga
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.querySelector('#download-btn-text')!.textContent = 'Descargar QR';
        }
        
        // Mostrar info
        if (qrInfo) qrInfo.style.display = 'block';
        
        // Guardar URL para descarga
        qrImage.dataset.downloadUrl = imageUrl;
        qrImage.dataset.filename = `QR-${tableCode.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
        
        console.log('QR generado exitosamente');
      };
      
      qrImage.onerror = () => {
        this.showQrError('Error al cargar la imagen del QR');
      };
      
      qrImage.src = imageUrl;
      
    } catch (error: any) {
      console.error('Error generating QR:', error);
      
      // Extraer mensaje del servidor si está disponible
      let errorMessage = 'Error al generar QR';
      let showSettingsLink = false;
      let isConfigurationError = false;
      
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response data:', error.response.data);
        
        // Error del servidor
        if (error.response.status === 400) {
          try {
            let errorData;
            
            // Si la respuesta es un blob, intentar convertirla a texto y parsearla
            if (error.response.data instanceof Blob) {
              console.log('Error response is blob, converting to text...');
              const errorText = await error.response.data.text();
              console.log('Error text:', errorText);
              errorData = JSON.parse(errorText);
            } else if (typeof error.response.data === 'string') {
              console.log('Error response is string, parsing...');
              errorData = JSON.parse(error.response.data);
            } else {
              console.log('Error response is object');
              errorData = error.response.data;
            }
            
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
              console.log('Parsed error message:', errorMessage);
              
              // Si el mensaje menciona slug/subdominio/configurado, mostrar enlace a ajustes
              if (errorMessage.toLowerCase().includes('slug') || 
                  errorMessage.toLowerCase().includes('subdominio') ||
                  errorMessage.toLowerCase().includes('configurado') ||
                  errorMessage.toLowerCase().includes('configúrelo')) {
                showSettingsLink = true;
                isConfigurationError = true;
                console.log('Configuration error detected');
              }
            }
          } catch (parseError) {
            // Si no se puede parsear, asumir que es error de configuración para 400
            console.warn('Could not parse error response:', parseError);
            console.log('Assuming configuration error for 400 status');
            errorMessage = 'Error de configuración del restaurante. Verifica los ajustes.';
            showSettingsLink = true;
            isConfigurationError = true;
          }
        } else if (error.response.status === 401) {
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
        } else if (error.response.status === 404) {
          errorMessage = 'Mesa no encontrada.';
        } else if (error.response.status === 405) {
          errorMessage = 'Método no permitido. Contacta al administrador.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        }
      } else if (error.request) {
        // Error de red
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
      }
      
      // Mostrar toast notification para errores de configuración
      if (isConfigurationError) {
        notificationManager.error('⚙️ Configuración requerida: Necesitas configurar el subdominio del restaurante en Ajustes.');
      } else {
        notificationManager.error(errorMessage);
      }
      
      this.showQrError(errorMessage, showSettingsLink);
    }
  }

  private showQrError(message: string = 'Error al generar QR', showSettingsLink: boolean = false) {
    const qrLoading = document.getElementById('qr-loading');
    const qrError = document.getElementById('qr-error');
    const downloadBtn = document.getElementById('download-qr-btn') as HTMLButtonElement;
    const errorMessage = document.getElementById('qr-error-message');
    const errorSubtitle = document.getElementById('qr-error-subtitle');
    const settingsLink = document.getElementById('settings-link');
    const generalErrorIcon = document.getElementById('general-error-icon');
    const configErrorIcon = document.getElementById('config-error-icon');

    // Ocultar loading
    if (qrLoading) qrLoading.style.display = 'none';
    
    // Mostrar error
    if (qrError) qrError.style.display = 'flex';
    
    // Actualizar mensaje de error
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    
    // Configurar UI según tipo de error
    if (showSettingsLink) {
      // Error de configuración - mostrar icono de configuración y estilo especial
      if (generalErrorIcon) generalErrorIcon.style.display = 'none';
      if (configErrorIcon) configErrorIcon.style.display = 'block';
      
      if (errorSubtitle) {
        errorSubtitle.style.display = 'block';
        errorSubtitle.textContent = 'Configura el subdominio para generar códigos QR';
      }
      
      if (settingsLink) {
        settingsLink.style.display = 'block';
      }
    } else {
      // Error general - mostrar icono de error normal
      if (generalErrorIcon) generalErrorIcon.style.display = 'block';
      if (configErrorIcon) configErrorIcon.style.display = 'none';
      
      if (errorSubtitle) {
        errorSubtitle.style.display = 'none';
      }
      
      if (settingsLink) {
        settingsLink.style.display = 'none';
      }
    }
    
    // Mantener botón deshabilitado
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.querySelector('#download-btn-text')!.textContent = 'QR no disponible';
    }
  }

  private retryQrGeneration() {
    if (this.currentQrData) {
      this.resetQrModalState();
      this.generateQrCode(this.currentQrData.tableId, this.currentQrData.tableCode);
    }
  }

  private closeQrModal() {
    const modal = document.getElementById('qr-modal');
    const modalContent = document.getElementById('qr-modal-content');
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;

    if (modal && modalContent) {
      modal.classList.add('opacity-0');
      modalContent.classList.remove('scale-100');
      modalContent.classList.add('scale-95');

      setTimeout(() => {
        modal.classList.add('hidden');
        
        // Limpiar recursos
        if (qrImage && qrImage.src && qrImage.src.startsWith('blob:')) {
          URL.revokeObjectURL(qrImage.src);
        }
        
        this.currentQrData = null;
      }, 300);
    }
  }

  private async downloadQr() {
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    const downloadBtn = document.getElementById('download-qr-btn') as HTMLButtonElement;
    const originalText = downloadBtn?.querySelector('#download-btn-text')?.textContent || 'Descargar QR';
    
    if (!qrImage || !qrImage.src || downloadBtn?.disabled) return;

    try {
      // Cambiar estado del botón
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.querySelector('#download-btn-text')!.textContent = 'Descargando...';
      }

      // Usar la URL del blob que ya tenemos
      const downloadUrl = qrImage.dataset.downloadUrl || qrImage.src;
      const filename = qrImage.dataset.filename || 'QR-Mesa.png';
      
      // Crear enlace de descarga
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      notificationManager.success('QR descargado correctamente');
      
    } catch (error) {
      console.error('Error downloading QR:', error);
      notificationManager.error('Error al descargar el QR');
    } finally {
      // Restaurar estado del botón
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.querySelector('#download-btn-text')!.textContent = originalText;
      }
    }
  }

  // Public methods for template onclick handlers
  public editTable(id: string) {
    const table = this.tables.find(t => t.id === id);
    if (table) {
      this.openTableModal(table);
    }
  }

  public showQr(id: string) {
    this.showQrModal(id);
  }
}

// Initialize and expose globally for template onclick handlers
const tablesManager = new TablesPageManager();
(window as any).tablesManager = tablesManager;
