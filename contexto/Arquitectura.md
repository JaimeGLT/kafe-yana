# Reglas de desarrollo frontend

## Estructura de carpetas

```
src/
  assets/        → imágenes, fuentes, íconos estáticos
  components/    → componentes reutilizables en múltiples páginas
    ui/          → átomos: Button, Input, Select, Toast, Tooltip…
    layout/      → MainLayout, PageContainer, PageHeader…
    modals/      → modals reutilizables entre páginas
    [feature]/   → componentes específicos de un dominio (ej: elaborados/)
  contexts/      → React Context providers
  data/          → datos estáticos o mocks
  hooks/         → custom hooks (useRecetas, useElaborados…)
  lib/           → lógica que no es UI: queries, mappers, helpers de negocio, utils de cálculo
  pages/         → una carpeta por página
  types/         → tipos TypeScript globales
  utils/         → funciones utilitarias genéricas (formatCurrency, etc.)
```

## Responsabilidad única

Cada archivo tiene una sola razón para cambiar:

- Un componente hace UI. No hace fetch, no calcula márgenes, no contiene lógica de negocio.
- Un hook maneja estado y efectos. No retorna JSX.
- Un archivo en `lib/` contiene lógica pura. No importa React.
- Una página orquesta: conecta hooks con componentes. No tiene lógica inline.

## Reglas concretas

**Componentes**
- Si un componente supera ~150 líneas, probablemente tiene más de una responsabilidad.
- Extraer subcomponentes a archivos propios dentro de `components/[feature]/`.
- No hacer fetch directamente en un componente. Usar un hook o recibirlo como prop.

**Lógica de negocio**
- Cálculos (márgenes, costos, disponibilidad) van en `lib/`, no en componentes.
- Helpers de presentación basados en datos de negocio (ej: `getMarginInfo`) también van en `lib/`.

**Cuando refactorices**
- Mueve una cosa a la vez. Verifica que funciona antes de continuar.
- No cambies lógica al mismo tiempo que mueves archivos.
- Actualiza todos los imports del archivo movido. No toques otros archivos.
- No reorganices archivos que no tienen relación con la tarea actual.