# 📄 Páginas - RestMg Frontend

> **Autor:** Sorel Carrillo - UTS 2025  
> **Sección:** Documentación de Rutas y Páginas

## 📋 Descripción

Esta carpeta contiene todas las **páginas de la aplicación**, que funcionan como las **habitaciones de un edificio**. Cada archivo representa una ruta específica que los usuarios pueden visitar, con su propia funcionalidad y propósito.

### 🎯 Analogía: Las Habitaciones del Restaurante

Imagina que cada página es como una **habitación especializada** en un restaurante:

- **🏠 Entrada Principal** (index.astro): El lobby donde los visitantes deciden hacia dónde ir
- **🔐 Oficina de Seguridad** (login.astro): Donde se valida la identidad del personal
- **📋 Sala de Orientación** (onboarding.astro): Donde nuevos restaurantes se configuran
- **👨‍💼 Oficinas Administrativas** (/admin/): Área exclusiva para la gerencia
- **🍽️ Comedor Digital** (/menu/): Donde los clientes ven el menú y hacen pedidos
- **📋 Área de Recibos** (/order/status/): Donde se muestran los comprobantes

## 🏗️ Arquitectura de Rutas

### Routing File-Based
Astro usa **routing basado en archivos**, donde la estructura de carpetas define automáticamente las URLs:

```
pages/
├── index.astro                 → https://app.com/
├── login.astro                 → https://app.com/login
├── onboarding.astro           → https://app.com/onboarding
├── admin/
│   ├── index.astro            → https://app.com/admin/
│   ├── menu/index.astro       → https://app.com/admin/menu/
│   ├── kitchen/index.astro    → https://app.com/admin/kitchen/
│   ├── users/index.astro      → https://app.com/admin/users/
│   ├── settings/index.astro   → https://app.com/admin/settings/
│   └── reports/index.astro    → https://app.com/admin/reports/
├── menu/
│   └── [restaurantId]/
│       └── [tableCode]/
│           └── index.astro    → https://app.com/menu/rest123/mesa01/
└── order/
    └── status/
        └── index.astro        → https://app.com/order/status?code=ORD123
```

### Parámetros Dinámicos
Las rutas con `[parámetro]` son dinámicas:

```typescript
// En [restaurantId]/[tableCode]/index.astro
const { restaurantId, tableCode } = Astro.params;
// Captura automáticamente los valores de la URL
```

## 📄 Páginas Disponibles

### 🏠 index.astro - Página Principal
**Propósito:** Punto de entrada principal de la aplicación

**¿Qué hace?** Es como el **lobby del hotel** donde los visitantes deciden hacia dónde dirigirse. Identifica si son clientes escaneando un QR o personal que necesita acceder al sistema administrativo.

**Funcionalidades:**
- 🎯 **Detección de Contexto**: Identifica el tipo de usuario
- 🔗 **Redirección Inteligente**: Envía a la sección apropiada
- 📱 **QR Scanner**: Permite escanear códigos QR de mesas
- 🌟 **Landing Page**: Información sobre el sistema para nuevos visitantes

**Flujo de navegación:**
```
Usuario llega → Sistema detecta contexto →
├── ¿Tiene QR? → Redirige a menú específico
├── ¿Es personal? → Redirige a login
└── ¿Es nuevo restaurante? → Redirige a onboarding
```

### 🔐 login.astro - Autenticación
**Propósito:** Portal de acceso para personal del restaurante

**¿Qué hace?** Es como el **puesto de seguridad** donde el personal muestra sus credenciales para acceder a las áreas restringidas del sistema.

**Características técnicas:**
- 🔒 **Formulario Seguro**: Validación client-side y server-side
- 🛡️ **Protección CSRF**: Tokens de seguridad
- 👤 **Recordar Usuario**: Funcionalidad "Remember Me"
- 🔄 **Recuperación**: Enlaces para resetear contraseña
- 📱 **Responsive**: Optimizado para tablets de cocina

**Estados del formulario:**
```typescript
interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    general?: string;
  };
}
```

**Integración con servicios:**
- **AuthService**: Manejo de tokens JWT
- **NotificationService**: Mensajes de error/éxito
- **TokenManager**: Gestión automática de sesiones

### 📋 onboarding.astro - Configuración Inicial
**Propósito:** Proceso de registro para nuevos restaurantes

**¿Qué hace?** Es como el **asesor de setup** que ayuda a restaurantes nuevos a configurar todo su sistema desde cero, paso a paso.

**Proceso de onboarding:**
1. **Información Básica**: Nombre, ubicación, contacto
2. **Configuración Operativa**: Horarios, moneda, políticas
3. **Usuario Administrador**: Cuenta principal del gerente
4. **Personalización**: Logo, colores, branding
5. **Configuración de Mesas**: Layout inicial del restaurante
6. **Menú Básico**: Categorías y platos iniciales

**Validaciones implementadas:**
- ✅ **Email único**: Verifica que no esté registrado
- ✅ **Subdominio disponible**: Valida disponibilidad en tiempo real
- ✅ **Datos requeridos**: Formularios con validación completa
- ✅ **Formatos correctos**: Teléfonos, emails, URLs

### 👨‍💼 /admin/ - Panel Administrativo

#### admin/index.astro - Dashboard Principal
**Propósito:** Centro de control ejecutivo del restaurante

**¿Qué hace?** Es como el **centro de comando** donde los gerentes ven todo lo que está pasando en tiempo real: métricas de ventas, pedidos activos, estado del equipo.

**Métricas mostradas:**
- 📊 **KPIs del Día**: Ventas, pedidos, promedio por mesa
- 📈 **Gráficos**: Tendencias de última semana
- 🔄 **Actividad en Tiempo Real**: Pedidos entrantes, cocina
- 👥 **Estado del Personal**: Quién está conectado
- ⚡ **Alertas**: Problemas que requieren atención

**Widgets del dashboard:**
```typescript
interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'status';
  data: any;
  refreshInterval: number;
  priority: number;
}
```

#### admin/menu/index.astro - Gestión de Menús
**Propósito:** Administración completa del menú del restaurante

**¿Qué hace?** Es como el **estudio del chef** donde se diseña toda la oferta culinaria, desde las categorías hasta los platos individuales, con precios y disponibilidad.

**Funcionalidades principales:**
- 🗂️ **Gestión de Categorías**: Crear, editar, reordenar secciones
- 🍽️ **Gestión de Platos**: CRUD completo con imágenes
- 💰 **Control de Precios**: Actualización masiva o individual
- 🔄 **Estados**: Activar/desactivar disponibilidad
- 📸 **Galería**: Gestión de imágenes de platos
- 📊 **Analytics**: Platos más vendidos, menos populares

**Vista de administración:**
```typescript
interface MenuAdminView {
  categories: MenuCategory[];
  selectedCategory: string | null;
  editingItem: MenuItem | null;
  sortMode: 'name' | 'price' | 'popularity';
  filterMode: 'all' | 'available' | 'unavailable';
}
```

#### admin/kitchen/index.astro - Vista de Cocina
**Propósito:** Interfaz para el equipo de cocina gestionar pedidos

**¿Qué hace?** Es como el **centro de operaciones culinarias** donde los chefs ven todos los pedidos organizados visualmente, actualizan estados y coordinan la preparación.

**Características principales:**
- 📋 **Vista Kanban**: Pedidos organizados por columnas de estado
- 🔔 **Notificaciones en Tiempo Real**: Nuevos pedidos vía WebSockets
- ⏰ **Gestión de Tiempos**: Cronómetros de preparación
- 🔊 **Alertas Sonoras**: Notificaciones audibles configurables
- 💰 **Confirmación de Pagos**: Validación antes de cocinar
- 📊 **Métricas**: Tiempos promedio, productividad

**Estados de pedidos:**
```typescript
enum OrderStatus {
  AWAITING_PAYMENT = 'AwaitingPayment',  // 💰 Esperando pago
  PENDING = 'Pending',                   // 📋 En cola
  IN_PREPARATION = 'InPreparation',      // 👨‍🍳 Cocinando
  READY = 'Ready',                       // ✅ Listo
  COMPLETED = 'Completed'                // 🎉 Entregado
}
```

#### admin/users/index.astro - Gestión de Personal
**Propósito:** Administración del equipo de trabajo

**¿Qué hace?** Es como la **oficina de recursos humanos** donde se gestiona todo el personal: contrataciones, roles, permisos, horarios y coordinación del equipo.

**Funcionalidades:**
- 👥 **CRUD de Usuarios**: Agregar, editar, desactivar personal
- 🎭 **Gestión de Roles**: Asignación de permisos por cargo
- ✅ **Estados**: Control de usuarios activos/inactivos
- 📊 **Métricas de Personal**: Productividad, horarios
- 🔐 **Seguridad**: Reseteo de contraseñas, auditoría

#### admin/settings/index.astro - Configuración
**Propósito:** Configuración general del restaurante

**¿Qué hace?** Es como la **oficina de administración** donde se configuran todos los aspectos operativos del negocio.

**Secciones de configuración:**
- 🏪 **Información Básica**: Datos del restaurante
- 🕒 **Horarios**: Días y horarios de operación
- 💰 **Precios y Políticas**: Impuestos, descuentos
- 🎨 **Branding**: Logo, colores, personalización
- 🔗 **Integraciones**: APIs, pagos, delivery
- 📧 **Notificaciones**: Configurar alertas

#### admin/reports/index.astro - Reportes y Analytics
**Propósito:** Análisis de datos y reportes del negocio

**¿Qué hace?** Es como el **centro de inteligencia de negocios** que convierte todos los datos en información útil para tomar decisiones.

**Tipos de reportes:**
- 📊 **Ventas**: Diarias, semanales, mensuales
- 🍽️ **Menú**: Platos más/menos vendidos
- ⏰ **Operaciones**: Tiempos de cocina, eficiencia
- 👥 **Personal**: Productividad por empleado
- 📱 **Clientes**: Patrones de consumo

### 🍽️ /menu/ - Menú Digital para Clientes

#### menu/[restaurantId]/[tableCode]/index.astro - Menú Interactivo
**Propósito:** Experiencia de menú digital para clientes

**¿Qué hace?** Es como la **carta digital inteligente** que permite a los clientes ver el menú completo, agregar platos al carrito y hacer su pedido de manera autónoma.

**Experiencia del cliente:**
- 📱 **Menú Responsivo**: Optimizado para móviles
- 🖼️ **Galería Visual**: Imágenes apetitosas de platos
- 🛒 **Carrito Inteligente**: Persistente entre sesiones
- 💰 **Cálculo Automático**: Totales actualizados en tiempo real
- 🔍 **Filtros**: Por categoría, precio, ingredientes
- 📋 **Información Detallada**: Ingredientes, alérgenos, calorías

**Flujo del cliente:**
```
Escanea QR → Ve menú → Selecciona platos →
Revisa carrito → Confirma pedido → Recibe código
```

**Integración con servicios:**
- **CartService**: Gestión del carrito local
- **APIService**: Creación del pedido
- **NotificationService**: Confirmaciones y errores

### 📋 /order/status/ - Seguimiento de Pedidos

#### order/status/index.astro - Estado del Pedido
**Propósito:** Mostrar el comprobante y estado del pedido al cliente

**¿Qué hace?** Es como el **ticket de pedido inteligente** que muestra toda la información del pedido y permite al cliente seguir su progreso en tiempo real.

**Información mostrada:**
- 🎫 **Código de Pedido**: Número único para identificación
- 📋 **Detalles del Pedido**: Items, cantidades, precios
- 💰 **Total a Pagar**: Desglose completo de costos
- 📊 **Estado Actual**: Progreso en tiempo real
- ⏰ **Tiempo Estimado**: Cuándo estará listo
- 📱 **Instrucciones**: Cómo proceder con el pago

**Estados visuales:**
```css
.status-awaiting-payment { color: #f59e0b; } /* 💰 Amarillo */
.status-pending { color: #3b82f6; }          /* 📋 Azul */
.status-preparation { color: #f97316; }      /* 👨‍🍳 Naranja */
.status-ready { color: #10b981; }           /* ✅ Verde */
```

**Funcionalidades adicionales:**
- 🖨️ **Imprimir Comprobante**: Versión física del ticket
- 🔄 **Actualización Automática**: Refresco cada 30 segundos
- 📱 **QR del Pedido**: Para fácil identificación
- ⏰ **Notificaciones**: Cuando cambia el estado

## 🔒 Sistema de Protección de Rutas

### Rutas Públicas
**Sin autenticación requerida:**
- `/` - Página principal
- `/login` - Formulario de acceso
- `/onboarding` - Registro de restaurantes
- `/menu/[restaurantId]/[tableCode]/` - Menú para clientes
- `/order/status/` - Estado de pedidos

### Rutas Protegidas
**Requieren autenticación:**
- `/admin/*` - Todo el panel administrativo

**Middleware de protección:**
```typescript
// En cada página protegida
---
import { requireAuth } from '../services/auth';
await requireAuth(Astro.request);
---
```

### Protección por Roles
**Diferentes niveles de acceso:**
```typescript
interface RolePermissions {
  [UserRole.ADMIN]: string[];           // Acceso completo
  [UserRole.KITCHEN]: ['/admin/kitchen']; // Solo cocina
  [UserRole.WAITER]: ['/admin/orders'];   // Solo pedidos
  [UserRole.CASHIER]: ['/admin/payments']; // Solo pagos
}
```

## 🎨 Sistema de Layouts

### Layout Hierarchy
```
Layout.astro (Base)
├── AdminLayout.astro (Panel administrativo)
│   ├── admin/index.astro
│   ├── admin/menu/index.astro
│   ├── admin/kitchen/index.astro
│   └── ...
└── Páginas directas
    ├── index.astro
    ├── login.astro
    └── menu/[]/[]/index.astro
```

### Layout Features
- 📱 **Responsive Design**: Mobile-first approach
- 🌙 **Dark Theme**: Consistente en toda la app
- 🧭 **Navegación**: Breadcrumbs y menús contextuales
- 🔔 **Notificaciones**: Sistema global de alertas
- ⚡ **Performance**: Lazy loading de componentes pesados

## 🚀 Optimizaciones de Performance

### Server-Side Rendering (SSR)
- 📄 **Pre-rendering**: Páginas estáticas generadas al build
- ⚡ **Fast Loading**: Contenido visible inmediatamente
- 🔍 **SEO Optimized**: Indexable por motores de búsqueda

### Client-Side Optimization
- 🧩 **Component Hydration**: JavaScript solo donde es necesario
- 📦 **Code Splitting**: Carga diferida por página
- 💾 **Caching Strategy**: Cache inteligente de recursos
- 🖼️ **Image Optimization**: Formatos modernos y lazy loading

### Bundle Optimization
```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['axios', '@microsoft/signalr'],
          'admin': ['./src/scripts/dashboard-page.ts'],
          'kitchen': ['./src/scripts/kitchen-page.ts']
        }
      }
    }
  }
});
```

## 🧪 Testing de Páginas

### Pruebas Realizadas
- ✅ **Renderizado**: Todas las páginas cargan correctamente
- ✅ **Navegación**: Links y redirecciones funcionan
- ✅ **Formularios**: Validación y envío operativos
- ✅ **Responsive**: Funcionales en todos los dispositivos
- ✅ **Performance**: Tiempos de carga optimizados
- ✅ **Accesibilidad**: Navegables con teclado

### Casos de Uso Validados
- 📱 **Cliente nuevo**: Escanea QR → Ve menú → Hace pedido
- 👨‍💼 **Admin nuevo**: Login → Ve dashboard → Gestiona menú
- 👨‍🍳 **Cocinero**: Login → Ve cocina → Procesa pedidos
- 🔄 **Tiempo real**: Notificaciones WebSocket funcionando

## 🔮 Futuras Expansiones

### Nuevas Páginas Planificadas
- **Reservations**: Sistema de reservas de mesas
- **Delivery**: Gestión de pedidos a domicilio  
- **Loyalty**: Programa de puntos y recompensas
- **Analytics**: Dashboards avanzados de BI
- **Mobile App**: PWA con funcionalidades offline

### Mejoras Técnicas
- **Service Workers**: Funcionamiento offline
- **Push Notifications**: Notificaciones del navegador
- **WebRTC**: Video llamadas con soporte
- **AR Integration**: Realidad aumentada para menús

---

> **Nota de Experiencia**: Cada página está diseñada pensando en el usuario final, priorizando usabilidad, performance y accesibilidad por encima de la complejidad técnica.

*Documentación técnica - Sorel Carrillo - UTS 2025*
