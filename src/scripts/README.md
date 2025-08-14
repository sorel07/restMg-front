# ⚡ Scripts - RestMg Frontend

> **Autor:** Sorel Carrillo - UTS 2025  
> **Sección:** Documentación de Scripts Cliente-Side

## 📋 Descripción

Esta carpeta contiene todos los **scripts de interactividad** del sistema, que funcionan como los **cerebros especializados** que dan vida a cada página. Cada script maneja la lógica específica de una sección de la aplicación.

### 🎯 Analogía: Los Especialistas del Restaurante

Imagina que cada script es como un **especialista experto** en su área:

- **🍽️ Menu Manager**: Como el **chef de menús** que sabe todo sobre platos y categorías
- **👨‍🍳 Kitchen Manager**: Como el **jefe de cocina** que coordina todos los pedidos  
- **🛒 Cart Manager**: Como el **asistente de pedidos** que ayuda a los clientes
- **📊 Dashboard Manager**: Como el **gerente general** que ve todo desde arriba
- **👥 Users Manager**: Como el **jefe de recursos humanos** que gestiona el personal

## 🧠 Scripts Disponibles

### 1. menu-page.ts - Gestión de Menús
**Propósito:** Administrar el menú completo del restaurante (CRUD)

**¿Qué hace?** Es como el **director culinario** que decide qué platos están en el menú, sus precios, descripción, y disponibilidad. Maneja tanto categorías como platos individuales.

**Responsabilidades principales:**
- 📋 **Gestión de Categorías**: Crear, editar, eliminar, reordenar
- 🍽️ **Gestión de Platos**: CRUD completo con imágenes
- 🔄 **Estados**: Activar/desactivar disponibilidad
- 📸 **Imágenes**: Subida y optimización automática
- ✅ **Validaciones**: Formularios con validación en tiempo real

**Arquitectura del componente:**
```typescript
class MenuPageManager {
  private categories: MenuCategory[] = [];
  private currentEditingItem: MenuItem | null = null;
  private currentEditingCategory: MenuCategory | null = null;
  
  // Ciclo de vida
  async init(): Promise<void>
  
  // Gestión de menú
  private async loadMenu(): Promise<void>
  private renderCategories(): void
  private renderItems(categoryId: string): void
  
  // CRUD de categorías
  private openCategoryModal(category?: MenuCategory): void
  private async handleCategorySubmit(e: Event): Promise<void>
  private async deleteCategory(categoryId: string): Promise<void>
  
  // CRUD de items
  private openItemModal(item?: MenuItem): void
  private async handleItemSubmit(e: Event): Promise<void>
  private async deleteItem(itemId: string): Promise<void>
  public async toggleAvailability(itemId: string, isAvailable: boolean): Promise<void>
}
```

**Funcionalidades especializadas:**
- **Drag & Drop**: Reordenar categorías visualmente
- **Upload de Imágenes**: Optimización automática
- **Vista Previa**: Ver cómo se ve el menú para clientes
- **Filtros**: Buscar platos por nombre o categoría
- **Estados Visuales**: Indicadores de disponibilidad claros

### 2. kitchen-page.ts - Sistema de Cocina
**Propósito:** Gestionar la vista de cocina con pedidos en tiempo real

**¿Qué hace?** Es como el **coordinador de cocina** que organiza todos los pedidos en una vista tipo kanban, maneja los estados de preparación y coordina con el equipo.

**Características principales:**
- 📋 **Vista Kanban**: Pedidos organizados por columnas de estado
- 🔄 **Tiempo Real**: Actualizaciones instantáneas vía SignalR
- 🔊 **Alertas Sonoras**: Notificaciones audibles configurables
- 💰 **Gestión de Pagos**: Confirmación antes de iniciar preparación
- ⏰ **Tiempos**: Seguimiento de tiempo de preparación

**Arquitectura del sistema:**
```typescript
class KitchenPageManager {
  private signalRConnection: any = null;
  private orders: Map<string, KitchenOrder> = new Map();
  private pendingPayments: Map<string, PendingPaymentOrder> = new Map();
  private currentTab: KitchenTab = KitchenTab.ACTIVE_ORDERS;
  
  // Estados del sistema
  private connectionState: SignalRConnection;
  private audioManager: AudioNotificationManager;
  private completedOrdersToday: number = 0;
  
  // Inicialización
  private async init(): Promise<void>
  private async initializeSignalR(): Promise<void>
  private setupEventListeners(): void
  
  // Gestión de pedidos
  private async loadInitialOrders(): Promise<void>
  private handleNewOrder(order: KitchenOrder): void
  private handleOrderStatusUpdate(update: OrderStatusUpdatePayload): void
  
  // Interfaz de cocina
  private renderAllColumns(): void
  private moveOrderToColumn(order: KitchenOrder): void
  private updateCounters(): void
  
  // Acciones de pedidos
  async startOrder(orderId: string): Promise<void>
  async markOrderReady(orderId: string): Promise<void>
  async completeOrder(orderId: string): Promise<void>
}
```

**Sistema de estados de pedidos:**
```
AwaitingPayment → Pending → InPreparation → Ready → Completed
     ↓              ↓           ↓           ↓         ↓
   💰 Pago      📋 Cola    👨‍🍳 Cocinando  ✅ Listo  🎉 Entregado
```

### 3. cart-manager.ts - Gestión del Carrito
**Propósito:** Manejar todas las interacciones del carrito de compras

**¿Qué hace?** Es como el **asistente personal** del cliente que recuerda todo lo que quiere pedir, ayuda a modificar cantidades, calcula totales y facilita el proceso de pedido.

**Funcionalidades clave:**
- 🛒 **Gestión de Items**: Agregar, modificar, eliminar productos
- 💱 **Cálculos**: Subtotales, impuestos, descuentos automáticos
- 💾 **Persistencia**: Carrito se mantiene entre sesiones
- 🔄 **Sincronización**: Estado consistente en toda la app
- 📱 **Botón Flotante**: Acceso rápido desde cualquier lugar

**API del manager:**
```typescript
class CartManager {
  private cartService: CartService;
  private modal: HTMLElement | null = null;
  private floatingButton: HTMLElement | null = null;
  
  // Inicialización
  init(): void
  private setupEventListeners(): void
  private setupFloatingButton(): void
  
  // Gestión del carrito
  addToCart(itemId: string, quantity: number = 1): void
  updateQuantity(itemId: string, newQuantity: number): void
  removeFromCart(itemId: string): void
  
  // UI Management
  private updateCartUI(): void
  private updateFloatingButton(): void
  private showModal(): void
  private hideModal(): void
  
  // Proceso de pedido
  async placeOrder(): Promise<void>
}
```

### 4. dashboard-page.ts - Panel de Control
**Propósito:** Mostrar métricas y resumen ejecutivo del restaurante

**¿Qué hace?** Es como el **tablero de control del capitán** que muestra todas las métricas importantes: ventas del día, pedidos activos, productos más vendidos, estado general del negocio.

**Métricas que maneja:**
- 📊 **KPIs Principales**: Ventas, pedidos, clientes
- 📈 **Gráficos**: Tendencias y comparativas
- 🔄 **Tiempo Real**: Actualizaciones automáticas
- 📋 **Pedidos Recientes**: Lista de última actividad
- ⚡ **Estados**: Conexiones, servicios, alertas

**Estructura del dashboard:**
```typescript
class DashboardPageManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private connectionStatusTimer: NodeJS.Timeout | null = null;
  
  // Inicialización
  async init(): Promise<void>
  private setupEventListeners(): void
  private setupAutoRefresh(): void
  
  // Carga de datos
  private async loadDashboardData(): Promise<void>
  private async loadRecentOrders(): Promise<void>
  private async loadKPIs(): Promise<void>
  
  // Visualización
  private updateKPICards(data: DashboardData): void
  private renderRecentOrders(orders: RecentOrder[]): void
  private updateConnectionStatus(): void
  
  // Utilidades
  private formatCurrency(amount: number): string
  private formatOrderTime(date: string): string
}
```

### 5. users-page.ts - Gestión de Usuarios
**Propósito:** Administrar el personal del restaurante

**¿Qué hace?** Es como el **director de recursos humanos** que gestiona todo el personal: contrataciones, roles, permisos, estados de empleados, y coordinación del equipo.

**Funcionalidades principales:**
- 👥 **CRUD de Usuarios**: Crear, editar, eliminar personal
- 🔐 **Gestión de Roles**: Admin, Kitchen, Waiter, etc.
- ✅ **Estados**: Activo, inactivo, temporal
- 📧 **Comunicación**: Notificaciones al equipo
- 🎯 **Permisos**: Control granular de accesos

**Sistema de roles:**
```typescript
enum UserRole {
  ADMIN = 'Admin',           // Acceso total
  KITCHEN = 'Kitchen',       // Solo cocina
  WAITER = 'Waiter',        // Solo mesas y pedidos
  CASHIER = 'Cashier'       // Solo pagos
}

interface UserPermissions {
  canManageMenu: boolean;
  canViewKitchen: boolean;
  canManageOrders: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
}
```

### 6. settings-form.ts - Configuración del Restaurante
**Propósito:** Gestionar la configuración general del establecimiento

**¿Qué hace?** Es como el **administrador general** que configura todos los aspectos operativos: información del restaurante, horarios, políticas, integraciones, etc.

**Configuraciones que maneja:**
- 🏪 **Info Básica**: Nombre, dirección, teléfono, email
- 🕒 **Horarios**: Días y horarios de operación
- 💰 **Precios**: Impuestos, descuentos, políticas
- 🎨 **Branding**: Logo, colores, personalización
- 🔗 **Integraciones**: APIs externas, pagos, delivery

### 7. login-form.ts - Sistema de Autenticación
**Propósito:** Manejar el proceso de inicio de sesión

**¿Qué hace?** Es como el **portero del restaurante** que verifica las credenciales y permite el acceso solo a personal autorizado.

**Características de seguridad:**
- 🔐 **Validación**: Credenciales seguras
- 🛡️ **Protección**: Prevención de ataques
- 🔄 **Sesiones**: Manejo de tokens JWT
- 📱 **Multi-dispositivo**: Sincronización entre dispositivos
- ⏰ **Timeout**: Cierre automático por inactividad

### 8. onboarding-form.ts - Registro de Restaurantes
**Propósito:** Proceso inicial de configuración para nuevos restaurantes

**¿Qué hace?** Es como el **consultor de setup** que ayuda a nuevos restaurantes a configurar completamente su sistema desde cero.

**Pasos del onboarding:**
1. **Información Básica**: Datos del restaurante
2. **Configuración Inicial**: Horarios, moneda, idioma
3. **Creación de Menú**: Primeras categorías y platos
4. **Setup de Mesas**: Configuración del layout
5. **Usuario Administrador**: Cuenta principal
6. **Integración**: Conexión con servicios externos

## 🏗️ Arquitectura de Scripts

### Patrón Manager
Todos los scripts siguen el patrón **Manager** donde cada uno:
- ✅ **Inicializa** sus dependencias
- ✅ **Configura** event listeners
- ✅ **Gestiona** el estado de su sección
- ✅ **Comunica** con servicios
- ✅ **Actualiza** la interfaz

### Ciclo de Vida Estándar
```typescript
class PageManager {
  constructor() {
    // Inicialización básica
  }
  
  async init(): Promise<void> {
    // Setup inicial asíncrono
    await this.loadInitialData();
    this.setupEventListeners();
    this.startPeriodicUpdates();
  }
  
  destroy(): void {
    // Limpieza de recursos
    this.cleanup();
  }
}
```

### Comunicación Entre Scripts
- **Event Bus**: Eventos globales para comunicación
- **Servicios Compartidos**: Estado centralizado
- **Local Storage**: Persistencia entre sesiones
- **Session Storage**: Datos temporales

## 🔄 Flujo de Interacción

### 1. Carga de Página
```
HTML carga → Script ejecutado → Manager inicializado →
Datos cargados → Event listeners configurados → UI lista
```

### 2. Interacción del Usuario
```
Usuario interactúa → Evento capturado → Validación →
Servicio llamado → Estado actualizado → UI actualizada
```

### 3. Actualizaciones en Tiempo Real
```
SignalR recibe → Event dispatcher → Manager relevante →
Datos procesados → UI actualizada → Notificación mostrada
```

## 🧪 Pruebas y Validación

### Pruebas de Funcionalidad
- ✅ **Event Handling**: Todos los eventos responden correctamente
- ✅ **State Management**: Estados se actualizan apropiadamente
- ✅ **API Integration**: Comunicación con servicios funciona
- ✅ **Error Handling**: Errores manejados elegantemente
- ✅ **UI Updates**: Interfaz se actualiza consistentemente

### Pruebas de Usuario
- ✅ **Usabilidad**: Interfaces intuitivas y fáciles de usar
- ✅ **Responsive**: Funcionan en todos los tamaños de pantalla
- ✅ **Performance**: Respuesta rápida a interacciones
- ✅ **Accesibilidad**: Navegables con teclado y screen readers

### Casos de Borde
- ✅ **Conexión Lenta**: Comportamiento con latencia alta
- ✅ **Datos Corruptos**: Manejo de datos inválidos
- ✅ **Memoria Limitada**: Eficiencia en dispositivos lentos
- ✅ **Concurrencia**: Múltiples usuarios simultáneos

## 💡 Mejores Prácticas Implementadas

### 1. Clean Code
- **Nombres descriptivos**: Variables y funciones autoexplicativas
- **Funciones pequeñas**: Una responsabilidad por función
- **Comentarios útiles**: Explicaciones del "por qué", no del "qué"
- **Estructura consistente**: Patrones repetibles

### 2. Error Handling
- **Try-catch comprehensivo**: Captura de todas las excepciones
- **Fallback strategies**: Alternativas cuando algo falla
- **User feedback**: Mensajes claros para el usuario
- **Logging detallado**: Información para debugging

### 3. Performance
- **Lazy loading**: Carga diferida de recursos pesados
- **Debouncing**: Evitar llamadas excesivas a APIs
- **Memory management**: Limpieza adecuada de recursos
- **Efficient DOM manipulation**: Mínimas actualizaciones del DOM

### 4. Security
- **Input sanitization**: Limpieza de datos de entrada
- **XSS prevention**: Prevención de scripts maliciosos
- **CSRF protection**: Tokens de seguridad en formularios
- **Secure communication**: Solo HTTPS para datos sensibles

## 🔮 Futuras Mejoras

### Optimizaciones Técnicas
- **Code Splitting**: División inteligente del código
- **Service Workers**: Funcionamiento offline
- **IndexedDB**: Base de datos local para cache
- **Web Workers**: Procesamiento en background

### Nuevas Funcionalidades
- **Voice Commands**: Control por voz para cocina
- **AR Menu**: Realidad aumentada para visualizar platos
- **AI Recommendations**: Sugerencias inteligentes
- **Advanced Analytics**: Métricas más detalladas

---

> **Nota de Implementación**: Todos los scripts están optimizados para **Progressive Enhancement**, funcionando incluso cuando JavaScript está deshabilitado en funcionalidades básicas.

*Documentación técnica - Sorel Carrillo - UTS 2025*
