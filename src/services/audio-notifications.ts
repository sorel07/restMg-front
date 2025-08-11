// Generador de tonos de audio sintéticos para notificaciones de cocina
class AudioNotificationManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.initializeAudioContext();
    this.loadAudioSettings();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API no está disponible:', error);
    }
  }

  private loadAudioSettings(): void {
    const saved = localStorage.getItem('kitchen_audio_enabled');
    this.isEnabled = saved !== 'false'; // Por defecto habilitado
  }

  public toggleAudio(): boolean {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('kitchen_audio_enabled', this.isEnabled.toString());
    return this.isEnabled;
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Generar tono para nuevo pedido (campana suave)
  public async playNewOrderSound(): Promise<void> {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      await this.resumeAudioContext();

      // Crear oscilador para sonido de campana
      const oscillator1 = this.audioContext.createOscillator();
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Conectar nodos
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configurar frecuencias (acorde agradable)
      oscillator1.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator2.frequency.setValueAtTime(1000, this.audioContext.currentTime);

      // Configurar envolvente (fade in/out)
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.2);

      // Iniciar y parar osciladores
      oscillator1.start(this.audioContext.currentTime);
      oscillator2.start(this.audioContext.currentTime);
      oscillator1.stop(this.audioContext.currentTime + 1.2);
      oscillator2.stop(this.audioContext.currentTime + 1.2);

    } catch (error) {
      console.error('Error reproduciendo sonido de nuevo pedido:', error);
    }
  }

  // Generar tono para pedido listo (beep de confirmación)
  public async playOrderReadySound(): Promise<void> {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      await this.resumeAudioContext();

      // Crear dos beeps cortos
      for (let i = 0; i < 2; i++) {
        const startTime = this.audioContext.currentTime + (i * 0.3);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Tono más alto y corto
        oscillator.frequency.setValueAtTime(1200, startTime);
        
        // Envolvente corta
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      }

    } catch (error) {
      console.error('Error reproduciendo sonido de pedido listo:', error);
    }
  }

  // Reproducir sonido usando archivos de audio (si están disponibles)
  public async playAudioFile(audioElementId: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const audioElement = document.getElementById(audioElementId) as HTMLAudioElement;
      if (audioElement) {
        audioElement.currentTime = 0; // Reiniciar al inicio
        await audioElement.play();
      }
    } catch (error) {
      console.warn(`No se pudo reproducir el archivo de audio ${audioElementId}:`, error);
    }
  }

  // Reproducir notificación de nuevo pedido (intenta archivo primero, luego sintético)
  public async notifyNewOrder(): Promise<void> {
    try {
      await this.playAudioFile('new-order-sound');
    } catch (error) {
      // Si falla el archivo, usar sonido sintético
      await this.playNewOrderSound();
    }
  }

  // Reproducir notificación de pedido listo
  public async notifyOrderReady(): Promise<void> {
    try {
      await this.playAudioFile('order-ready-sound');
    } catch (error) {
      // Si falla el archivo, usar sonido sintético
      await this.playOrderReadySound();
    }
  }
}

export default AudioNotificationManager;
