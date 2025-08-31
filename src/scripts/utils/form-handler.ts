import notificationManager from '../../services/notifications';

interface HandleFormSubmitOptions {
  form: HTMLFormElement;
  apiCall: (data: any) => Promise<any>;
  onSuccess: (result: any) => void;
  getFormData?: (formData: FormData) => any;
  customValidation?: () => boolean;
}

export async function handleFormSubmit({
  form,
  apiCall,
  onSuccess,
  getFormData,
  customValidation,
}: HandleFormSubmitOptions) {
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (!submitButton) {
    console.error('No se encontró un botón de tipo submit en el formulario.');
    return;
  }
  const originalButtonHTML = submitButton.innerHTML;

  // Validación personalizada
  if (customValidation && !customValidation()) {
    return; // La validación falló, no continuar
  }

  // Deshabilitar botón y mostrar estado de carga
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <div class="flex items-center justify-center gap-2">
      <svg class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Procesando...</span>
    </div>
  `;

  try {
    const formData = new FormData(form);
    const data = getFormData ? getFormData(formData) : Object.fromEntries(formData.entries());

    const result = await apiCall(data);

    onSuccess(result);

  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Ha ocurrido un error inesperado.';
    notificationManager.error(errorMessage);
  } finally {
    // Restaurar botón
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonHTML;
  }
}
