# 🎨 Componentes - RestMg Frontend

> **Autor:** Sorel Carrillo - UTS 2025  
> **Sección:** Documentación de Componentes Reutilizables

## 📋 Descripción

Esta carpeta contiene todos los **componentes reutilizables** del sistema, que funcionan como las **piezas de LEGO** que construyen la interfaz de usuario. Cada componente tiene una responsabilidad específica y puede ser utilizado en múltiples páginas.

### 🎯 Analogía: Los Ladrillos del Restaurante

Imagina que estás construyendo un restaurante físico. Los componentes son como los **elementos prefabricados** que puedes usar en diferentes partes:
- Las **mesas** (MenuItemCard) se pueden colocar en cualquier salón
- Las **puertas** (Modal) funcionan igual en toda la construcción  
- La **barra lateral** (Sidebar) mantiene la misma estructura en todas las áreas

## 🧩 Componentes Disponibles

### 1. MenuItemCard.astro
**Propósito:** Tarjeta visual para mostrar cada plato del menú

**¿Qué hace?** Es como una **carta de presentación** para cada plato. Muestra la foto apetitosa, el nombre, descripción, precio y botón para agregar al carrito.

**Características técnicas:**
- Diseño responsivo con TailwindCSS
- Manejo de estados (disponible/no disponible)
- Integración con el sistema de carrito
- Optimización de imágenes automática

**Props que recibe:**
```typescript
interface MenuItemProps {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  categoryId: string;
}
```

### 2. Modal.astro
**Propósito:** Ventana emergente reutilizable para diferentes tipos de contenido

**¿Qué hace?** Es como una **ventana que se abre** encima de la página principal. Se puede usar para mostrar el carrito de compras, confirmaciones, formularios, etc.

**Características técnicas:**
- Overlay semi-transparente para el fondo
- Animaciones suaves de entrada y salida
- Cierre por ESC o click fuera del modal
- Scroll bloqueado en el body cuando está abierto

**Funcionalidades:**
- Auto-focus en el primer elemento interactivo
- Trap de tabulación para accesibilidad
- Manejo de eventos del teclado

### 3. Sidebar.astro
**Propósito:** Barra de navegación lateral para el panel administrativo

**¿Qué hace?** Es como el **directorio del edificio** que te permite navegar entre diferentes áreas del sistema administrativo.

**Características técnicas:**
- Navegación jerárquica con iconos
- Estado activo/inactivo para cada sección
- Responsive: se colapsa en móviles
- Integración con el sistema de autenticación

**Secciones que incluye:**
- Dashboard principal
- Gestión de menú
- Vista de cocina
- Administración de usuarios
- Configuración del restaurante
- Reportes y estadísticas

### 4. CartModal.astro
**Propósito:** Modal especializado para mostrar y gestionar el carrito de compras

**¿Qué hace?** Es como una **bandeja de pedidos** donde el cliente puede revisar sus selecciones antes de confirmar.

**Características técnicas:**
- Lista dinámica de items seleccionados
- Controles para modificar cantidades
- Cálculo automático de totales y subtotales
- Validación de inventario en tiempo real
- Botón de confirmación de pedido

**Estados que maneja:**
- Carrito vacío
- Carrito con items
- Procesando pedido
- Error en el pedido

## 🏗️ Arquitectura de Componentes

### Patrón de Diseño: Composición
Los componentes siguen el principio de **composición sobre herencia**. Es decir, cada componente hace una cosa bien específica y se pueden combinar para crear interfaces complejas.

### Sistema de Props
Todos los componentes reciben sus datos a través de **props** (propiedades), que actúan como **parámetros de configuración**. Esto los hace:
- ✅ Predecibles: siempre se comportan igual con los mismos datos
- ✅ Reutilizables: se pueden usar en diferentes contextos
- ✅ Mantenibles: cambiar un componente actualiza todas sus instancias

### Gestión de Estados
Los componentes manejan dos tipos de estado:
1. **Estado Local**: Información que solo necesita el componente (ej: modal abierto/cerrado)
2. **Estado Global**: Información compartida (ej: contenido del carrito)

## 🎨 Sistema de Estilos

### TailwindCSS: El Lenguaje Visual
Todos los componentes usan **TailwindCSS** como sistema de estilos. Es como tener un **diccionario de diseño** donde cada palabra (clase) tiene un significado visual específico.

**Ventajas del sistema:**
- 🎨 **Consistencia**: Todos los componentes usan las mismas reglas visuales
- 📱 **Responsive**: Automáticamente se adaptan a diferentes pantallas
- 🌙 **Tema Oscuro**: Paleta de colores unificada para toda la aplicación
- ⚡ **Performance**: Solo se incluye el CSS que realmente se usa

### Paleta de Colores del Sistema
```css
/* Colores principales */
--color-background: #1a1a1a;      /* Fondo principal */
--color-surface: #2a2a2a;         /* Superficies elevadas */
--color-accent: #ff6b35;          /* Color de marca/acción */
--color-text-primary: #ffffff;    /* Texto principal */
--color-text-secondary: #9ca3af;  /* Texto secundario */
```

## 🔄 Flujo de Interacción

### 1. Carga de Componentes
```
Página carga → Astro renderiza componentes → 
Estilos aplicados → JavaScript hidrata → Componente interactivo
```

### 2. Manejo de Eventos
```
Usuario interactúa → Evento capturado → 
Estado actualizado → Componente re-renderiza → UI actualizada
```

### 3. Comunicación entre Componentes
```
Componente A → Evento disparado → 
Service/Store actualizado → Componente B reacciona → UI sincronizada
```

## 🧪 Pruebas y Validación

### Pruebas Realizadas
- ✅ **Renderizado**: Todos los componentes se muestran correctamente
- ✅ **Props**: Reciben y procesan datos correctamente
- ✅ **Interactividad**: Eventos y estados funcionan como se espera
- ✅ **Responsive**: Se adaptan a diferentes tamaños de pantalla
- ✅ **Accesibilidad**: Navegables con teclado y lectores de pantalla

### Criterios de Calidad
- **Legibilidad**: El código es fácil de entender
- **Mantenibilidad**: Fácil modificar sin romper funcionalidad
- **Reutilización**: Se pueden usar en múltiples contextos
- **Performance**: Carga rápida y ejecución eficiente

## 🚀 Uso de Componentes

### Importación en páginas Astro
```astro
---
import MenuItemCard from '../components/MenuItemCard.astro';
import Modal from '../components/Modal.astro';
---

<MenuItemCard 
  id="plato-1"
  name="Hamburguesa Clásica"
  description="Carne, lechuga, tomate y salsas"
  price={15.99}
  imageUrl="/images/hamburguesa.jpg"
  isAvailable={true}
  categoryId="principales"
/>
```

### Integración con Scripts
Los componentes se conectan con la lógica JavaScript a través de:
- **IDs únicos** para selección en el DOM
- **Data attributes** para pasar información
- **Event listeners** para manejar interacciones

## 💡 Mejores Prácticas Implementadas

### 1. Separación de Responsabilidades
- **Estructura**: HTML semántico y accesible
- **Presentación**: CSS/TailwindCSS para estilos
- **Comportamiento**: JavaScript para interactividad

### 2. Accesibilidad (A11Y)
- Roles ARIA apropiados
- Etiquetas descriptivas
- Navegación por teclado
- Contraste de colores adecuado

### 3. Performance
- Lazy loading de imágenes
- Minificación automática de CSS
- JavaScript solo donde es necesario
- Optimización de bundle size

## 🔮 Futuras Mejoras

### Posibles Expansiones
- **Componentes de Gráficos**: Para mostrar estadísticas
- **Componentes de Formulario**: Input, Select, etc. especializados
- **Componentes de Animación**: Loaders, transiciones
- **Sistema de Notificaciones**: Toasts, alerts personalizados

---

> **Nota Técnica**: Los componentes están diseñados siguiendo los principios de **Atomic Design**, donde cada componente es una pieza pequeña y específica que se puede combinar para crear interfaces complejas y funcionales.

*Documentación técnica - Sorel Carrillo - UTS 2025*
