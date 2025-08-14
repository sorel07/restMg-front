# 🔧 Servicios - RestMg Frontend

> **Autor:** Sorel Carrillo - UTS 2025  
> **Sección:** Documentación de Servicios y APIs

## 📋 Descripción

Esta carpeta contiene todos los **servicios especializados** del sistema, que funcionan como los **departamentos de una empresa**. Cada servicio tiene una responsabilidad específica y se encarga de una parte crucial del funcionamiento de la aplicación.

### 🎯 Analogía: Los Departamentos del Restaurante

Imagina que el sistema frontend es como un **restaurante bien organizado** donde cada departamento tiene una función específica:

- **🌐 API Service**: Es como el **departamento de comunicaciones** que habla con el mundo exterior
- **🔐 Auth Service**: Como el **servicio de seguridad** que controla quién puede entrar y a dónde
- **🛒 Cart Service**: Como el **área de pedidos** que gestiona lo que cada cliente está ordenando
- **🔔 Notification Service**: Como el **sistema de megafonía** que informa eventos importantes

## 🛠️ Servicios Disponibles

### 1. api.ts - Central de Comunicaciones
**Propósito:** Gestionar todas las comunicaciones con el backend

**¿Qué hace?** Es como el **centro de llamadas** del restaurante. Todas las peticiones al servidor pasan por aquí: obtener menús, crear pedidos, autenticar usuarios, etc.

**Características técnicas:**
- Cliente HTTP configurado con axios
- Interceptores para manejo automático de tokens
- Renovación automática de autenticación
- Manejo centralizado de errores
- Configuración HTTPS segura

**Funcionalidades principales:**
```typescript
// Autenticación
loginUser(data): Promise<AuthResult>
refreshToken(): Promise<AuthResult>

// Gestión de restaurante
getMyRestaurant(): Promise<RestaurantDetails>
updateMyRestaurant(data): Promise<void>

// Menús y pedidos
getMenuByRestaurant(id): Promise<MenuCategory[]>
createOrder(orderData): Promise<{ orderId, orderCode }>
getOrderByCode(code, restaurantId): Promise<Order>

// Gestión de usuarios
getUsers(): Promise<User[]>
createUser(data): Promise<User>
updateUser(id, data): Promise<void>
```

**Configuración del cliente:**
- **Base URL**: `https://restmg.runasp.net/api`
- **Headers**: Automáticamente incluye tokens JWT
- **Timeout**: Configurado para evitar peticiones colgadas
- **Retry Logic**: Reintento automático en caso de fallos temporales

### 2. auth.ts - Sistema de Seguridad
**Propósito:** Gestionar la autenticación y autorización de usuarios

**¿Qué hace?** Es como el **jefe de seguridad** que decide quién puede entrar, qué puede hacer cada persona, y cuándo debe renovar sus credenciales.

**Funcionalidades principales:**
```typescript
// Gestión de tokens
saveToken(token: string): void
getToken(): string | null
removeToken(): void

// Estados de usuario
isLoggedIn(): boolean
isTokenExpired(): boolean
isTokenNearExpiry(): boolean

// Información del usuario
getUserSession(): UserSession | null
getCurrentUser(): User | null

// Navegación segura
redirectToLogin(): void
requireAuth(): boolean
```

**Sistema de Tokens JWT:**
- **Almacenamiento**: localStorage para persistencia
- **Validación**: Verificación automática de expiración
- **Renovación**: Refresh automático antes del vencimiento
- **Limpieza**: Eliminación segura al cerrar sesión

### 3. cart.ts - Gestión del Carrito
**Propósito:** Manejar el carrito de compras del cliente

**¿Qué hace?** Es como el **asistente personal de pedidos** que recuerda todo lo que el cliente quiere, calcula totales, y prepara la orden final.

**Características técnicas:**
- Singleton pattern para instancia única
- Persistencia en localStorage
- Validación automática de inventario
- Cálculos precisos de totales
- Estados sincronizados entre sesiones

**API del servicio:**
```typescript
class CartService {
  // Gestión de items
  addItem(item: MenuItem, quantity: number): void
  updateQuantity(itemId: string, quantity: number): void
  removeItem(itemId: string): void
  clearCart(): void
  
  // Información del carrito
  getItems(): CartItem[]
  getItemCount(): number
  getSummary(): CartSummary
  
  // Preparación de pedido
  getOrderData(restaurantId: string, tableId: string): OrderData
  
  // Eventos
  subscribe(callback: CartEventCallback): void
  unsubscribe(callback: CartEventCallback): void
}
```

**Estructura de datos:**
```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
}
```

### 4. signalr.ts - Comunicación en Tiempo Real
**Propósito:** Establecer conexiones WebSocket para actualizaciones instantáneas

**¿Qué hace?** Es como un **teléfono directo** entre la cocina y los meseros, donde se comunican cambios instantáneamente sin necesidad de preguntar constantemente.

**Funcionalidades:**
```typescript
// Conexión
createSignalRConnection(hubName: string, handlers: EventHandlers): Promise<Connection>

// Eventos del sistema
interface SignalREventHandlers {
  onNewOrder: (order: KitchenOrder) => void;
  onOrderStatusUpdated: (update: OrderStatusUpdate) => void;
  onConnectionStateChanged: (connected: boolean) => void;
}

// Gestión de estado
class SignalRService {
  startConnection(hubUrl: string): Promise<void>
  stopConnection(): Promise<void>
  isConnected(): boolean
  sendMessage(method: string, ...args: any[]): Promise<void>
}
```

**Hubs disponibles:**
- **kitchenHub**: Para actualizaciones de cocina
- **orderHub**: Para seguimiento de pedidos
- **adminHub**: Para notificaciones administrativas

### 5. notifications.ts - Sistema de Notificaciones
**Propósito:** Mostrar mensajes y alertas al usuario

**¿Qué hace?** Es como el **sistema de anuncios** del restaurante que informa sobre eventos importantes: pedido confirmado, error en pago, plato listo, etc.

**Tipos de notificaciones:**
```typescript
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
  showCloseButton?: boolean;
  actions?: NotificationAction[];
}
```

**API del servicio:**
```typescript
class NotificationManager {
  show(message: string, type: NotificationType, duration?: number): void
  success(message: string, duration?: number): void
  error(message: string, duration?: number): void
  warning(message: string, duration?: number): void
  info(message: string, duration?: number): void
  
  dismiss(id: string): void
  dismissAll(): void
}
```

### 6. token-manager.ts - Gestión Proactiva de Tokens
**Propósito:** Monitorear y renovar tokens automáticamente

**¿Qué hace?** Es como un **asistente proactivo** que se asegura de que las credenciales estén siempre actualizadas, renovándolas antes de que expiren.

**Funcionalidades:**
```typescript
class TokenManagerService {
  startTokenMonitoring(): void
  stopTokenMonitoring(): void
  checkTokenStatus(): TokenStatus
  renewTokenIfNeeded(): Promise<boolean>
  
  // Configuración
  setRenewalThreshold(minutes: number): void
  setCheckInterval(seconds: number): void
}
```

### 7. audio-notifications.ts - Notificaciones Sonoras
**Propósito:** Reproducir alertas sonoras para eventos importantes

**¿Qué hace?** Es como el **sistema de campanas** de la cocina que suena cuando hay un nuevo pedido o cuando algo requiere atención inmediata.

**API del servicio:**
```typescript
class AudioNotificationManager {
  playNewOrderSound(): Promise<void>
  playOrderReadySound(): Promise<void>
  playErrorSound(): Promise<void>
  
  // Configuración
  setVolume(level: number): void
  enableAudio(): void
  disableAudio(): void
  isEnabled(): boolean
}
```

## 🏗️ Arquitectura de Servicios

### Patrón Singleton
Muchos servicios usan el **patrón Singleton** para garantizar que solo existe una instancia en toda la aplicación. Es como tener un único gerente por departamento.

### Inyección de Dependencias
Los servicios se comunican entre sí de manera controlada:
```
AuthService → APIService → NotificationService
     ↓           ↓              ↓
TokenManager → CartService → AudioNotifications
```

### Event-Driven Architecture
Los servicios se comunican mediante eventos, permitiendo bajo acoplamiento:
```typescript
// Un servicio emite un evento
cartService.emit('item-added', { item, quantity });

// Otros servicios escuchan y reaccionan
notificationService.on('item-added', () => {
  this.show('Producto agregado al carrito', 'success');
});
```

## 🔄 Flujo de Datos

### 1. Autenticación
```
Usuario login → AuthService → APIService → Backend →
Token JWT → TokenManager → Monitoreo automático
```

### 2. Gestión del Carrito
```
Agregar item → CartService → localStorage → 
Actualizar UI → Notificación → Evento emitido
```

### 3. Comunicación en Tiempo Real
```
Evento backend → SignalR Hub → Frontend Service →
Estado actualizado → UI re-renderizada → Notificación sonora
```

## 🛡️ Seguridad y Confiabilidad

### Manejo de Errores
Todos los servicios implementan manejo robusto de errores:
- **Try-catch**: Captura de excepciones
- **Fallbacks**: Comportamientos alternativos
- **Logging**: Registro detallado para debugging
- **User-friendly**: Mensajes comprensibles para usuarios

### Validación de Datos
- **Input validation**: Verificación de datos de entrada
- **Type checking**: TypeScript previene errores de tipos
- **Sanitization**: Limpieza de datos peligrosos
- **Schema validation**: Verificación de estructura de datos

### Persistencia y Estado
- **localStorage**: Para datos que deben persistir
- **sessionStorage**: Para datos temporales de sesión
- **Memory state**: Para datos volátiles
- **Synchronization**: Sincronización entre pestañas

## 🧪 Pruebas Realizadas

### Pruebas de Integración
- ✅ **API Calls**: Todos los endpoints funcionan correctamente
- ✅ **Authentication Flow**: Login, refresh, logout operativos
- ✅ **Cart Operations**: CRUD completo del carrito
- ✅ **Real-time Updates**: SignalR conexiones estables

### Pruebas de Error Handling
- ✅ **Network Failures**: Comportamiento ante fallas de red
- ✅ **Token Expiry**: Renovación automática funcional
- ✅ **Invalid Data**: Manejo de datos corruptos
- ✅ **Service Unavailable**: Degradación elegante

### Pruebas de Performance
- ✅ **Response Times**: Tiempos de respuesta aceptables
- ✅ **Memory Usage**: Sin leaks de memoria detectados
- ✅ **Bundle Size**: Tamaño optimizado de archivos
- ✅ **Caching**: Estrategias de cache implementadas

## 💡 Mejores Prácticas Implementadas

### 1. Separation of Concerns
Cada servicio tiene una responsabilidad específica y bien definida.

### 2. Error Boundaries
Manejo de errores que no afecte otros servicios.

### 3. Async/Await
Programación asíncrona moderna y legible.

### 4. Type Safety
TypeScript garantiza seguridad de tipos en tiempo de compilación.

### 5. Configuration Management
Configuraciones centralizadas y fáciles de modificar.

## 🔮 Futuras Mejoras

### Posibles Expansiones
- **Offline Support**: Funcionamiento sin conexión
- **Push Notifications**: Notificaciones del navegador
- **Background Sync**: Sincronización en segundo plano
- **Service Workers**: Cache inteligente
- **Analytics Service**: Métricas de uso detalladas

### Optimizaciones Pendientes
- **Request Batching**: Agrupar peticiones similares
- **Smart Caching**: Cache más inteligente
- **Retry Strategies**: Estrategias de reintento más sofisticadas
- **Load Balancing**: Distribución de carga automática

---

> **Nota Técnica**: Los servicios están diseñados siguiendo los principios **SOLID** y **Clean Architecture**, garantizando código mantenible, testeable y escalable.

*Documentación técnica - Sorel Carrillo - UTS 2025*
