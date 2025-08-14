# 🏗️ Tipos TypeScript - RestMg Frontend

> **Autor:** Sorel Carrillo - UTS 2025  
> **Sección:** Documentación del Sistema de Tipos

## 📋 Descripción

Esta carpeta contiene todas las **definiciones de tipos TypeScript** del sistema, que funcionan como los **planos arquitectónicos** de la aplicación. Cada archivo define las estructuras de datos que garantizan la coherencia y seguridad del código.

### 🎯 Analogía: Los Planos del Restaurante

Imagina que los tipos TypeScript son como los **planos detallados** de un restaurante:

- **🏗️ Estructuras**: Definen cómo debe ser cada "habitación" (objeto)
- **📐 Medidas exactas**: Especifican qué propiedades debe tener cada estructura  
- **🔗 Conexiones**: Muestran cómo se relacionan las diferentes partes
- **✅ Validaciones**: Aseguran que todo encaje perfectamente

### 💡 ¿Por qué TypeScript?

TypeScript es como tener un **supervisor de construcción** que revisa que todo esté según los planos:

- 🛡️ **Previene errores**: Detecta problemas antes de que lleguen al usuario
- 📚 **Autodocumentación**: El código se explica a sí mismo
- 🔍 **Autocompletado**: El editor sabe qué propiedades están disponibles
- 🏗️ **Refactoring seguro**: Cambios masivos sin romper funcionalidad

## 🗂️ Estructura de Tipos

### 📁 auth/ - Sistema de Autenticación
**Propósito:** Definir todas las estructuras relacionadas con usuarios y autenticación

```typescript
// Datos de login del usuario
interface LoginData {
  email: string;
  password: string;
}

// Resultado de autenticación exitosa
interface AuthResult {
  token: string;           // JWT token
  refreshToken: string;    // Token para renovación
  user: UserInfo;         // Información del usuario
  expiresAt: Date;        // Cuándo expira el token
}

// Información del usuario en sesión
interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId: string;
  permissions: UserPermissions;
}

// Roles disponibles en el sistema
enum UserRole {
  ADMIN = 'Admin',         // Acceso total al sistema
  KITCHEN = 'Kitchen',     // Solo acceso a cocina
  WAITER = 'Waiter',      // Solo gestión de mesas
  CASHIER = 'Cashier'     // Solo gestión de pagos
}

// Permisos granulares por rol
interface UserPermissions {
  canManageMenu: boolean;      // Crear/editar menú
  canViewKitchen: boolean;     // Ver vista de cocina  
  canManageOrders: boolean;    // Gestionar pedidos
  canManageUsers: boolean;     // Administrar personal
  canViewReports: boolean;     // Ver reportes y analytics
  canManageSettings: boolean;  // Configurar restaurante
}
```

### 📁 menu/ - Sistema de Menús
**Propósito:** Estructuras para categorías, platos y menús completos

```typescript
// Categoría del menú (Entradas, Platos Principales, etc.)
interface MenuCategory {
  id: string;
  name: string;                // "Entradas", "Principales"
  description?: string;        // Descripción opcional
  displayOrder: number;        // Orden de visualización
  isActive: boolean;          // Si está visible al público
  items: MenuItem[];          // Platos de esta categoría
  createdAt: Date;
  updatedAt: Date;
}

// Plato individual del menú
interface MenuItem {
  id: string;
  categoryId: string;         // A qué categoría pertenece
  name: string;               // "Hamburguesa Clásica"
  description: string;        // Descripción detallada
  price: number;              // Precio en la moneda local
  imageUrl?: string;          // URL de la imagen del plato
  isAvailable: boolean;       // Si está disponible ahora
  preparationTime?: number;   // Tiempo estimado en minutos
  ingredients?: string[];     // Lista de ingredientes
  allergens?: string[];       // Alérgenos presentes
  nutritionalInfo?: NutritionalInfo;
  createdAt: Date;
  updatedAt: Date;
}

// Información nutricional opcional
interface NutritionalInfo {
  calories?: number;
  protein?: number;           // En gramos
  carbohydrates?: number;     // En gramos
  fat?: number;              // En gramos
  fiber?: number;            // En gramos
  sodium?: number;           // En miligramos
}

// Para crear nuevas categorías
interface CreateCategoryRequest {
  name: string;
  description?: string;
  displayOrder: number;
}

// Para crear nuevos platos
interface CreateMenuItemRequest {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  preparationTime?: number;
  ingredients?: string[];
  allergens?: string[];
}

// Para actualizar platos existentes
interface UpdateMenuItemRequest extends CreateMenuItemRequest {
  isAvailable: boolean;
}
```

### 📁 restaurant/ - Información del Restaurante
**Propósito:** Datos y configuración del establecimiento

```typescript
// Información completa del restaurante
interface RestaurantDetails {
  id: string;
  name: string;                    // "Restaurante El Buen Sabor"
  subdomain: string;              // "elbuensabor" para URLs
  description?: string;           // Descripción del restaurante
  address: RestaurantAddress;     // Dirección completa
  contact: RestaurantContact;     // Información de contacto
  businessHours: BusinessHours[];  // Horarios de operación
  settings: RestaurantSettings;   // Configuraciones operativas
  branding: RestaurantBranding;   // Logo, colores, etc.
  createdAt: Date;
  updatedAt: Date;
}

// Dirección del restaurante
interface RestaurantAddress {
  street: string;                 // "Calle 123 #45-67"
  neighborhood?: string;          // "Centro"
  city: string;                   // "Bucaramanga"
  state: string;                  // "Santander"
  zipCode?: string;              // "680001"
  country: string;               // "Colombia"
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Información de contacto
interface RestaurantContact {
  phone: string;                  // "+57 301 234 5678"
  email: string;                  // "contacto@restaurant.com"
  website?: string;              // "https://restaurant.com"
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Horarios de operación
interface BusinessHours {
  dayOfWeek: number;             // 0-6 (Domingo a Sábado)
  isOpen: boolean;               // Si abre este día
  openTime: string;              // "08:00"
  closeTime: string;             // "22:00"
  breakTime?: {
    startTime: string;           // "14:00"
    endTime: string;             // "16:00"
  };
}

// Configuraciones operativas
interface RestaurantSettings {
  currency: string;              // "COP", "USD"
  taxRate: number;               // 0.19 para 19% IVA
  serviceCharge: number;         // 0.10 para 10% servicio
  allowTakeaway: boolean;        // Permite para llevar
  allowDelivery: boolean;        // Permite domicilio
  maxOrdersPerHour: number;      // Límite de capacidad
  autoAcceptOrders: boolean;     // Acepta pedidos automáticamente
}

// Branding visual
interface RestaurantBranding {
  logoUrl?: string;              // URL del logo
  primaryColor?: string;         // "#FF6B35"
  secondaryColor?: string;       // "#1A1A1A"
  accentColor?: string;          // "#FFA500"
  fontFamily?: string;           // "Poppins"
}

// Para el proceso de onboarding
interface OnboardingData {
  restaurantName: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  phone: string;
  address: Omit<RestaurantAddress, 'coordinates'>;
  subdomain: string;
}

// Resultado del onboarding
interface OnboardResult {
  restaurantId: string;
  userId: string;
  token: string;
  message: string;
}
```

### 📁 table/ - Gestión de Mesas
**Propósito:** Estructuras para mesas y códigos QR

```typescript
// Mesa del restaurante
interface Table {
  id: string;
  restaurantId: string;          // A qué restaurante pertenece
  code: string;                  // "MESA-01", "A1"
  name: string;                  // "Mesa 1", "Terraza A"
  capacity: number;              // Número de comensales
  location?: string;             // "Salón Principal", "Terraza"
  isActive: boolean;             // Si está disponible
  qrCodeUrl?: string;           // URL del código QR generado
  status: TableStatus;           // Estado actual
  currentOrderId?: string;       // Pedido actual si tiene
  createdAt: Date;
  updatedAt: Date;
}

// Estados posibles de una mesa
enum TableStatus {
  AVAILABLE = 'Available',       // Disponible
  OCCUPIED = 'Occupied',         // Ocupada
  RESERVED = 'Reserved',         // Reservada
  OUT_OF_SERVICE = 'OutOfService' // Fuera de servicio
}

// Para crear nuevas mesas
interface CreateTableRequest {
  code: string;
  name: string;
  capacity: number;
  location?: string;
}

// Para generar código QR
interface QRCodeOptions {
  size: number;                  // Tamaño en píxeles
  format: 'PNG' | 'SVG';        // Formato de salida
  includelogo: boolean;         // Si incluir logo del restaurante
}
```

### 📁 user/ - Gestión de Usuarios
**Propósito:** Estructuras para el personal del restaurante

```typescript
// Usuario del sistema (empleado)
interface User {
  id: string;
  restaurantId: string;          // A qué restaurante pertenece
  email: string;                 // Email único
  name: string;                  // Nombre completo
  phone?: string;               // Teléfono opcional
  role: UserRole;               // Rol asignado
  isActive: boolean;            // Si está activo
  lastLogin?: Date;             // Última vez que se conectó
  createdAt: Date;
  updatedAt: Date;
}

// Para crear nuevos usuarios
interface CreateUserData {
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  password: string;             // Se hashea antes de guardar
}

// Para actualizar usuarios existentes
interface UpdateUserData {
  name?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Información básica del usuario
interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId: string;
}
```

### 📁 kitchen/ - Sistema de Cocina
**Propósito:** Estructuras para la gestión de pedidos en cocina

```typescript
// Pedido desde la perspectiva de cocina
interface KitchenOrder {
  id: string;
  orderCode: string;             // "ORD-001"
  tableCode: string;             // "MESA-01"
  status: OrderStatus;
  items: KitchenOrderItem[];     // Items a preparar
  totalItems: number;            // Cantidad total de items
  estimatedTime: number;         // Tiempo estimado en minutos
  priority: OrderPriority;       // Prioridad del pedido
  notes?: string;               // Notas especiales
  createdAt: Date;              // Cuándo se creó
  startedAt?: Date;             // Cuándo se empezó a preparar
  readyAt?: Date;               // Cuándo se completó
}

// Item individual del pedido para cocina
interface KitchenOrderItem {
  id: string;
  name: string;                  // Nombre del plato
  quantity: number;              // Cantidad pedida
  notes?: string;               // Notas especiales
  preparationTime: number;       // Tiempo de preparación
  status: ItemStatus;           // Estado individual
}

// Estados posibles de un pedido
enum OrderStatus {
  AWAITING_PAYMENT = 'AwaitingPayment',  // Esperando pago
  PENDING = 'Pending',                   // Pendiente de cocina
  IN_PREPARATION = 'InPreparation',      // En preparación
  READY = 'Ready',                       // Listo para servir
  COMPLETED = 'Completed',               // Entregado
  CANCELLED = 'Cancelled'                // Cancelado
}

// Estados de items individuales
enum ItemStatus {
  PENDING = 'Pending',           // Pendiente
  PREPARING = 'Preparing',       // En preparación
  READY = 'Ready',              // Listo
  DELIVERED = 'Delivered'        // Entregado
}

// Prioridades de pedidos
enum OrderPriority {
  LOW = 'Low',                   // Baja
  NORMAL = 'Normal',            // Normal
  HIGH = 'High',                // Alta
  URGENT = 'Urgent'             // Urgente
}

// Para actualizar estado de pedido
interface OrderStatusUpdatePayload {
  orderId: string;
  newStatus: OrderStatus;
  timestamp: Date;
  notes?: string;
}

// Configuración de columnas Kanban
interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  status: OrderStatus[];         // Qué estados van en esta columna
  color: string;                // Color de la columna
  maxItems?: number;            // Límite de items
}

type KanbanColumnId = 'pending' | 'preparation' | 'ready' | 'completed';

// Estado de conexión SignalR
interface SignalRConnection {
  isConnected: boolean;
  reconnectAttempts: number;
  lastHeartbeat?: Date;
}
```

### 📁 payment/ - Sistema de Pagos
**Propósito:** Estructuras para manejo de pagos

```typescript
// Pedido pendiente de pago
interface PendingPaymentOrder {
  id: string;
  orderCode: string;             // "ORD-001"
  tableCode: string;             // "MESA-01"
  customerInfo?: {
    name?: string;
    phone?: string;
  };
  items: PaymentOrderItem[];     // Items del pedido
  subtotal: number;              // Subtotal sin impuestos
  tax: number;                   // Impuestos
  serviceCharge: number;         // Cargo por servicio
  total: number;                 // Total a pagar
  paymentMethod?: PaymentMethod; // Método preferido
  createdAt: Date;              // Cuándo se creó
  expiresAt?: Date;             // Cuándo expira
}

// Item en un pedido para pago
interface PaymentOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

// Métodos de pago disponibles
enum PaymentMethod {
  CASH = 'Cash',                 // Efectivo
  CARD = 'Card',                // Tarjeta
  DIGITAL_WALLET = 'DigitalWallet', // Billetera digital
  BANK_TRANSFER = 'BankTransfer' // Transferencia
}

// Estado de un pago
enum PaymentStatus {
  PENDING = 'Pending',           // Pendiente
  PROCESSING = 'Processing',     // Procesando
  CONFIRMED = 'Confirmed',       // Confirmado
  FAILED = 'Failed',            // Fallido
  REFUNDED = 'Refunded'         // Reembolsado
}

// Confirmación de pago
interface PaymentConfirmation {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionId?: string;        // ID de transacción externa
  confirmedBy: string;           // Usuario que confirmó
  confirmedAt: Date;
  notes?: string;
}
```

## 🔧 Utilidades de Tipos

### Tipos de Utilidad Personalizados

```typescript
// Para crear tipos opcionales
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Para hacer campos obligatorios
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Para omitir campos específicos
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Para seleccionar solo ciertos campos
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Tipos de respuesta de API comunes
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Tipos para formularios
interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  valid: boolean;
}

interface FormState<T> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
}
```

## 🏗️ Beneficios del Sistema de Tipos

### 1. Detección Temprana de Errores
El compilador TypeScript detecta errores antes de que lleguen a producción:

```typescript
// ❌ Error detectado en tiempo de compilación
const user: User = {
  id: "123",
  email: "user@test.com",
  // name: "Juan", // Error: falta propiedad requerida
  role: "InvalidRole" // Error: role inválido
};
```

### 2. Autocompletado Inteligente
El editor conoce exactamente qué propiedades están disponibles:

```typescript
// ✅ Autocompletado automático
restaurant.settings.currency // El editor sugiere todas las propiedades
```

### 3. Refactoring Seguro
Cambiar un tipo actualiza automáticamente todos los usos:

```typescript
// Si cambio UserRole, todos los usos se actualizan automáticamente
enum UserRole {
  ADMIN = 'Administrator', // Cambio aquí
  // ... el resto se actualiza automáticamente
}
```

### 4. Documentación Viva
Los tipos sirven como documentación que nunca se desactualiza:

```typescript
// El tipo documenta exactamente qué debe contener
interface MenuItem {
  id: string;          // ✅ Siempre requerido
  name: string;        // ✅ Siempre requerido  
  imageUrl?: string;   // ✅ Opcional (? lo indica)
}
```

## 🧪 Validación y Testing

### Validación en Runtime
Aunque TypeScript valida en compilación, también validamos en runtime:

```typescript
function isValidMenuItem(obj: any): obj is MenuItem {
  return typeof obj.id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.price === 'number' &&
         typeof obj.isAvailable === 'boolean';
}
```

### Guards de Tipos
Para verificaciones seguras de tipos:

```typescript
function isKitchenOrder(order: any): order is KitchenOrder {
  return order && 
         typeof order.id === 'string' &&
         typeof order.orderCode === 'string' &&
         Array.isArray(order.items);
}
```

## 💡 Mejores Prácticas Aplicadas

### 1. Nomenclatura Consistente
- **Interfaces**: PascalCase (`MenuItem`, `UserRole`)
- **Propiedades**: camelCase (`createdAt`, `isActive`)
- **Enums**: PascalCase con valores descriptivos

### 2. Composición sobre Herencia
- Preferir composition de interfaces
- Reutilizar tipos pequeños en tipos más grandes
- Evitar jerarquías complejas

### 3. Tipos Específicos vs Genéricos
- Usar tipos específicos cuando sea posible
- Genéricos solo cuando añaden valor real
- Evitar `any` en todas las circunstancias

### 4. Documentación en Tipos
```typescript
interface RestaurantSettings {
  /** Tasa de impuestos (0.19 = 19%) */
  taxRate: number;
  
  /** Máximo de pedidos por hora (control de capacidad) */
  maxOrdersPerHour: number;
}
```

## 🔮 Futuras Expansiones

### Nuevos Dominios
- **Delivery**: Tipos para envío a domicilio
- **Reservations**: Sistema de reservas de mesas
- **Inventory**: Control de inventario de ingredientes
- **Analytics**: Métricas detalladas y reportes
- **Loyalty**: Programa de fidelización

### Mejoras Técnicas
- **Branded Types**: Tipos más específicos para IDs
- **Template Literal Types**: Validación de patrones
- **Conditional Types**: Tipos que dependen de condiciones
- **Mapped Types**: Transformaciones automáticas de tipos

---

> **Nota de Arquitectura**: El sistema de tipos está diseñado para evolucionar con el negocio, manteniendo la compatibilidad hacia atrás y facilitando nuevas funcionalidades.

*Documentación técnica - Sorel Carrillo - UTS 2025*
