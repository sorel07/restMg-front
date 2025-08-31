console.log('tables-page.ts script loaded');
import { apiClient } from '../services/api';
import notificationManager from '../services/notifications';
import type { Table } from '../types/table';
import { handleFormSubmit } from './utils/form-handler';

class TablesPageManager {

  private tables: Table[] = [];
  private currentEditingTable: Table | null = null;
  private tableForm: HTMLFormElement | null;

  constructor() {
    this.tableForm = document.getElementById('table-form') as HTMLFormElement;
    this.initializePage();
  }

  private initializePage() {
    console.log('Initializing page...');
    this.init();
    this.loadTables();
  }

  private init() {
    console.log('init() called');
    document.getElementById('add-table-btn')?.addEventListener('click', () => this.openTableModal());
    document.getElementById('cancel-table-btn')?.addEventListener('click', () => this.closeTableModal());
    document.getElementById('close-table-modal')?.addEventListener('click', () => this.closeTableModal());
    document.getElementById('close-qr-modal')?.addEventListener('click', () => this.closeQrModal());
    document.getElementById('close-qr-btn')?.addEventListener('click', () => this.closeQrModal());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadTables());
    this.tableForm?.addEventListener('submit', (e) => this.onFormSubmit(e));
    document.getElementById('download-qr-btn')?.addEventListener('click', () => this.downloadQr());
    document.getElementById('retry-qr-btn')?.addEventListener('click', () => this.retryQrGeneration());

    // Event delegation for table buttons
    const tablesGrid = document.getElementById('tables-grid');
    tablesGrid?.addEventListener('click', (event) => {
      console.log('tables-grid clicked');
      const target = event.target as HTMLElement;
      const editButton = target.closest('[data-edit-id]');
      const qrButton = target.closest('[data-qr-id]');
      const releaseButton = target.closest('[data-release-id]');

      if (editButton) {
        console.log('edit button clicked');
        const tableId = editButton.getAttribute('data-edit-id');
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
          this.openTableModal(table);
        }
        return;
      }

      if (qrButton) {
        console.log('qr button clicked');
        const tableId = qrButton.getAttribute('data-qr-id');
        const table = this.tables.find(t => t.id === tableId);
        if (table) {
          this.showQrModal(table.id, table.code);
        }
        return;
      }

      if (releaseButton) {
        console.log('release button clicked');
        const tableId = releaseButton.getAttribute('data-release-id');
        if (tableId) {
          this.releaseTable(tableId);
        }
      }
    });
  }

  private async loadTables() {
    this.showLoading();
    try {
      const response = await apiClient.get('/tables');
      this.tables = response.data;
      this.renderTables();
      this.showContent();
    } catch (error) {
      console.error('Error loading tables:', error);
      this.showError();
    }
  }

  private showLoading() {
    document.getElementById('loading-message')?.classList.remove('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
    document.getElementById('tables-content')?.classList.add('hidden');
  }

  private showError() {
    document.getElementById('loading-message')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.remove('hidden');
    document.getElementById('tables-content')?.classList.add('hidden');
  }

  private showContent() {
    document.getElementById('loading-message')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
    document.getElementById('tables-content')?.classList.remove('hidden');
  }

  private renderTables() {
    const grid = document.getElementById('tables-grid');
    if (!grid) return;
    if (this.tables.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12"><p>No hay mesas creadas.</p></div>`;
      return;
    }
    grid.innerHTML = this.tables.map(table => this.renderTableCard(table)).join('');
  }

  private renderTableCard(table: Table): string {
    const statusColor = table.status === 'Available' ? 'bg-green-500' : 'bg-yellow-500';
    const statusText = table.status === 'Available' ? 'Disponible' : 'Ocupada';
    const isOccupied = table.status === 'Occupied';

    return `
      <div class="bg-background rounded-lg p-6 border border-white/10">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-xl text-text-primary">${table.code}</h3>
            <p class="text-text-secondary text-sm">${statusText}</p>
          </div>
          <div class="w-3 h-3 rounded-full ${statusColor}"></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button data-edit-id="${table.id}" class="flex-1 bg-surface text-text-primary px-3 py-2 rounded text-sm hover:bg-white/10">Editar</button>
          <button data-qr-id="${table.id}" class="flex-1 bg-accent text-white px-3 py-2 rounded text-sm hover:bg-opacity-80">Generar QR</button>
        </div>
        ${isOccupied ? `
        <div class="mt-3">
          <button data-release-id="${table.id}" class="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors">Liberar Mesa</button>
        </div>
        ` : ''}
      </div>
    `;
  }

  private openTableModal(table?: Table) {
    this.currentEditingTable = table || null;
    const modal = document.getElementById('table-modal');
    const title = document.getElementById('table-modal-title');
    const statusContainer = document.getElementById('table-status-container');
    if (this.tableForm && modal && title && statusContainer) {
      title.textContent = table ? 'Editar Mesa' : 'Añadir Mesa';
      if (table) {
        (this.tableForm.elements.namedItem('code') as HTMLInputElement).value = table.code;
        (this.tableForm.elements.namedItem('status') as HTMLSelectElement).value = table.status;
        statusContainer.classList.remove('hidden');
      } else {
        this.tableForm.reset();
        statusContainer.classList.add('hidden');
      }
      modal.classList.remove('hidden');
      // Add this line to make the modal visible
      modal.classList.remove('opacity-0');
    }
  }

  private closeTableModal() {
    const modal = document.getElementById('table-modal');
    if (modal) {
      modal.classList.add('opacity-0');
      // Add a delay to allow the transition to finish before hiding the modal
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300); // This should match the transition duration
    }
    this.currentEditingTable = null;
  }

  private onFormSubmit(e: Event) {
    e.preventDefault();
    if (!this.tableForm) return;

    handleFormSubmit({
      form: this.tableForm,
      apiCall: (data) => {
        if (this.currentEditingTable) {
          return apiClient.put(`/tables/${this.currentEditingTable.id}`, data);
        }
        return apiClient.post('/tables', data);
      },
      onSuccess: () => {
        this.closeTableModal();
        this.loadTables();
        notificationManager.success(`Mesa ${this.currentEditingTable ? 'actualizada' : 'creada'} con éxito.`);
      },
    });
  }

  private async releaseTable(tableId: string) {
    if (!confirm('¿Estás seguro de que quieres liberar esta mesa? Esto la marcará como Disponible.')) {
      return;
    }

    try {
      await apiClient.put(`/tables/${tableId}`, { status: 'Available' });
      notificationManager.success('Mesa liberada con éxito.');
      this.loadTables(); // Reload tables to reflect the change
    } catch (error) {
      console.error('Error al liberar la mesa:', error);
      notificationManager.error('Error al liberar la mesa. Por favor, intenta de nuevo.');
    }
  }
  
  private currentQrData: { tableId: string; tableCode: string } | null = null;

  private showQrModal(tableId: string, tableCode: string) {
    this.currentQrData = { tableId, tableCode };
    const modal = document.getElementById('qr-modal');
    const title = document.getElementById('qr-modal-title');
    if (modal && title) {
      title.textContent = `Código QR para: ${tableCode}`;
      this.resetQrModalState();
      modal.classList.remove('hidden');
      modal.classList.remove('opacity-0');
      this.generateQrCode(tableId, tableCode);
    }
  }

  private resetQrModalState() {
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    const qrLoading = document.getElementById('qr-loading');
    const qrError = document.getElementById('qr-error');
    const downloadBtn = document.getElementById('download-qr-btn') as HTMLButtonElement;

    if (qrImage) {
      qrImage.src = '';
      qrImage.style.display = 'none';
      qrImage.style.opacity = '0';
    }
    if (qrLoading) qrLoading.style.display = 'flex';
    if (qrError) qrError.style.display = 'none';
    if (downloadBtn) downloadBtn.disabled = true;
  }

  private async generateQrCode(tableId: string, tableCode: string) {
    console.log('generateQrCode called');
    this.resetQrModalState();
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    const qrLoading = document.getElementById('qr-loading');
    const downloadBtn = document.getElementById('download-qr-btn') as HTMLButtonElement;

    try {
      const url = `/tables/${tableId}/qr`;
      console.log('Requesting QR code from:', url);
      const response = await apiClient.get(url, { responseType: 'blob' });
      console.log('QR code response:', response);
      const imageUrl = URL.createObjectURL(response.data);
      
      qrImage.onload = () => {
        if (qrLoading) qrLoading.style.display = 'none';
        qrImage.style.display = 'block';
        qrImage.style.opacity = '1';
        if (downloadBtn) downloadBtn.disabled = false;
        URL.revokeObjectURL(imageUrl); // Clean up the object URL after the image has loaded
      };
      qrImage.src = imageUrl;

    } catch (error: any) {
      console.error('Error generating QR code:', error);
      if (error.response && error.response.data.includes('Subdomain not configured')) {
        this.showQrError('Subdominio no configurado.', true);
      } else {
        this.showQrError('No se pudo generar el código QR.');
      }
    }
  }

  private showQrError(message: string, showSettingsLink: boolean = false) {
    const qrLoading = document.getElementById('qr-loading');
    const qrError = document.getElementById('qr-error');
    const errorMessage = document.getElementById('qr-error-message');
    const errorSubtitle = document.getElementById('qr-error-subtitle');
    const settingsLink = document.getElementById('settings-link');
    const generalErrorIcon = document.getElementById('general-error-icon');
    const configErrorIcon = document.getElementById('config-error-icon');

    if (qrLoading) qrLoading.style.display = 'none';
    if (qrError) qrError.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = message;

    if (showSettingsLink) {
      if (errorSubtitle) errorSubtitle.style.display = 'block';
      if (settingsLink) settingsLink.style.display = 'block';
      if (generalErrorIcon) generalErrorIcon.style.display = 'none';
      if (configErrorIcon) configErrorIcon.style.display = 'block';
    } else {
      if (errorSubtitle) errorSubtitle.style.display = 'none';
      if (settingsLink) settingsLink.style.display = 'none';
      if (generalErrorIcon) generalErrorIcon.style.display = 'block';
      if (configErrorIcon) configErrorIcon.style.display = 'none';
    }
  }

  private retryQrGeneration() {
    if (this.currentQrData) {
      this.generateQrCode(this.currentQrData.tableId, this.currentQrData.tableCode);
    }
  }

  private closeQrModal() {
    const modal = document.getElementById('qr-modal');
    if (modal) {
      modal.classList.add('opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
  }

  private async downloadQr() {
    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
    const tableCode = this.currentQrData?.tableCode || 'qr-code';
    if (qrImage && qrImage.src) {
      const link = document.createElement('a');
      link.href = qrImage.src;
      link.download = `${tableCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }



}

new TablesPageManager();

new TablesPageManager();