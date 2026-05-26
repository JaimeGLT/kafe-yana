Integración del backend Kafe Yana para que el front implemente cobro, mensajes de puntos y administración de promos.

**Alcance actual (v1):** solo recompensa **`PuntosExtra`**, aplicada **automáticamente** al cerrar venta.  

**Pendiente backend:** `ProductoGratis`, `Descuento`, condición `Requeridos`, consulta de progreso del cliente.

---
## 1. Cómo funciona (resumen)
1. Un **Admin** crea promociones permanentes con REST.
2. Al **cobrar** un pedido (mesa o para llevar), el backend:
   - Cierra la venta.
   - Calcula **puntos normales** por compra (`PuntosPorVenta`).
   - Evalúa promos activas con `TipoRecompensa = PuntosExtra`.
   - Si alguna califica, aplica **como máximo una** (la de mayor `ValorRecompensa`).
   - Suma esos puntos extra al cliente.
3. La respuesta del **POST cobrar** trae el mensaje y el desglose para mostrar en pantalla.
**No hay botón “reclamar”** para puntos extra. El front **no envía** id de promoción al cobrar.
---
## 2. Convenciones del API
| Tema | Valor |
|------|--------|
| Base URL | La configurada en el front (ej. `https://host/api`) |
| Auth | `Authorization: Bearer {JWT}` |
| JSON | **PascalCase** (`Id_Pedido`, `PuntosPorVenta`, …) |
| Roles cobrar | Admin, Cajero, Mesero |
| Roles CRUD promos | Solo **Admin** |
| Caja | Cobrar requiere **caja abierta** |
---
## 3. Modelo — Promoción permanente
### 3.1 Campos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | int | Identificador |
| `Nombre` | string | Nombre (máx. 100) |
| `Descripcion` | string | Descripción (máx. 300) |
| `TipoCondicion` | string | `NCompras` \| `MontoMinimo` \| `Requeridos` |
| `ValorCondicion` | int | Umbral (> 0) |
| `TipoRecompensa` | string | `PuntosExtra` \| `ProductoGratis` \| `Descuento` |
| `ValorRecompensa` | int | Puntos extra, % descuento, etc. |
| `Activo` | bool | Solo activas participan al cobrar |
| `Id_ProductoCanjeable` | int? | Solo para `ProductoGratis` (futuro). En `PuntosExtra` = **null** |
### 3.2 TipoCondicion — qué implementar en front
| Valor | ¿Usar en v1? | Comportamiento backend |
|-------|--------------|------------------------|
| `NCompras` | Sí | Contador por cliente + promo. Cada venta +1. Al llegar a `ValorCondicion` → puntos extra y contador vuelve a 0. Repetible. |
| `MontoMinimo` | Sí | Si total de **esta venta** ≥ `ValorCondicion` → puntos extra. Repetible en cada venta que cumpla. |
| `Requeridos` | **No** | Ignorado por backend. No ofrecer en formulario admin hasta fase 2. |
### 3.3 TipoRecompensa — qué implementar en front
| Valor | ¿Usar en v1? |
|-------|--------------|
| `PuntosExtra` | **Sí** — única que aplica al cobrar hoy |
| `ProductoGratis` | No (futuro) |
| `Descuento` | No (futuro) |
### 3.4 Reglas de negocio importantes
- Solo promos **`Activo = true`** y **`TipoRecompensa = PuntosExtra`**.
- **Máximo 1 promo por venta.** Si varias califican, gana la de **mayor `ValorRecompensa`**.
- **`NCompras`:** no cuenta compras antiguas del cliente; el contador empieza con la primera venta después de existir la promo.
- **`MontoMinimo`:** se compara con el **total cobrado** del pedido (suma de pagos = total pedido).
- Puntos extra se **suman** a los puntos normales de la venta.
---
## 4. Admin — CRUD promociones
**Controller:** `PromocionPermanente`  
**Base:** `/api/PromocionPermanente`  
**Rol:** Admin
### 4.1 Crear — POST /api/PromocionPermanente
**Ejemplo — cada N compras:**
    {
      "Nombre": "Cada 5 compras +50 pts",
      "Descripcion": "Acumula 5 compras y gana 50 puntos extra",
      "TipoCondicion": "NCompras",
      "ValorCondicion": 5,
      "TipoRecompensa": "PuntosExtra",
      "ValorRecompensa": 50,
      "Activo": true,
      "Id_ProductoCanjeable": null
    }
**Ejemplo — monto mínimo:**
    {
      "Nombre": "Compra mayor a S/ 100",
      "Descripcion": "20 puntos extra si la venta supera S/ 100",
      "TipoCondicion": "MontoMinimo",
      "ValorCondicion": 100,
      "TipoRecompensa": "PuntosExtra",
      "ValorRecompensa": 20,
      "Activo": true,
      "Id_ProductoCanjeable": null
    }
**Respuesta 201:**
    {
      "message": "Promoción permanente creada",
      "Id": 3
    }
### 4.2 Actualizar — PUT /api/PromocionPermanente/{id}
Mismo body que crear.
**Respuesta 200:**
    {
      "message": "Promoción permanente actualizada"
    }
### 4.3 Eliminar — DELETE /api/PromocionPermanente/{id}
**Respuesta 200:**
    {
      "message": "Promoción permanente eliminada"
    }
### 4.4 Errores 400 frecuentes (admin)
| Mensaje | Causa |
|---------|--------|
| `Id_ProductoCanjeable es obligatorio cuando la recompensa es ProductoGratis` | Falta producto en ProductoGratis |
| `Id_ProductoCanjeable solo aplica cuando la recompensa es ProductoGratis` | Id enviado con PuntosExtra |
| `ValorRecompensa debe ser mayor a 0` | ValorRecompensa ≤ 0 (con PuntosExtra) |
| Errores ModelState | Campos requeridos, AllowedValues, etc. |
### 4.5 Formulario admin sugerido (v1)
- Nombre *
- Descripción
- Tipo condición * → dropdown: `NCompras`, `MontoMinimo` (ocultar `Requeridos`)
- Valor condición * → número > 0  
  - Si `NCompras`: label “Cada N compras”  
  - Si `MontoMinimo`: label “Monto mínimo de la venta”
- Tipo recompensa * → fijo o solo opción `PuntosExtra`
- Valor recompensa * → puntos extra > 0
- Activo → checkbox
- **No mostrar** `Id_ProductoCanjeable` en v1
---
## 5. Cobrar venta — integración principal
La promo **no va en el body**. Solo `Id_Pedido`, `Id_Cliente` y `Pagos`.
### 5.1 Para llevar
**POST** `/api/Venta/cobrar`
**Body:**
    {
      "Id_Pedido": 12,
      "Id_Cliente": 45,
      "Pagos": {
        "Efectivo": 50.00,
        "Tarjeta": 0,
        "Qr": 0
      }
    }
Regla: `Pagos.Efectivo + Pagos.Tarjeta + Pagos.Qr` = total del pedido.
### 5.2 Mesa
**POST** `/api/Mesa/cobrar/{IdMesa}`
**Ejemplo:** `/api/Mesa/cobrar/3`
**Body:** igual que para llevar (`Id_Pedido`, `Id_Cliente`, `Pagos`).
---
## 6. Respuesta del cobrar — lo que debe leer el front
Ambos endpoints (Venta/cobrar y Mesa/cobrar) devuelven la **misma estructura**.
### 6.1 Sin promoción aplicada
    {
      "message": "Venta procesada correctamente",
      "PuntosPorVenta": 12,
      "PuntosPromocionPermanente": 0,
      "PromocionPermanente": null
    }
### 6.2 Con promoción PuntosExtra aplicada
    {
      "message": "Venta procesada correctamente Se agregaron 50 puntos extra por la promoción \"Cada 5 compras +50 pts\".",
      "PuntosPorVenta": 12,
      "PuntosPromocionPermanente": 50,
      "PromocionPermanente": {
        "NombrePromocion": "Cada 5 compras +50 pts",
        "PuntosExtra": 50,
        "Mensaje": "Se agregaron 50 puntos extra por la promoción \"Cada 5 compras +50 pts\"."
      }
    }
### 6.3 Tabla de campos
| Campo | Tipo | Uso en UI |
|-------|------|-----------|
| `message` | string | Toast / modal principal (ya incluye texto de promo si hubo) |
| `PuntosPorVenta` | int | Puntos normales por la compra |
| `PuntosPromocionPermanente` | int | Puntos extra por promo; **0** si no aplicó |
| `PromocionPermanente` | object \| null | **null** si no hubo promo |
| `PromocionPermanente.NombrePromocion` | string | Nombre para badge o detalle |
| `PromocionPermanente.PuntosExtra` | int | Igual que `PuntosPromocionPermanente` cuando hay promo |
| `PromocionPermanente.Mensaje` | string | Texto listo para mostrar |
### 6.4 UI sugerida post-cobro
    ✓ Venta procesada correctamente
    Puntos por esta compra:        12
    Puntos extra (promoción):      50    ← solo si PuntosPromocionPermanente > 0
    ─────────────────────────────────
    Total puntos agregados:        62
    Promoción: "Cada 5 compras +50 pts"
### 6.5 Tipos TypeScript (referencia)
    interface PromocionPermanenteCobro {
      NombrePromocion: string;
      PuntosExtra: number;
      Mensaje: string;
    }
    interface RespuestaCobro {
      message: string;
      PuntosPorVenta: number;
      PuntosPromocionPermanente: number;
      PromocionPermanente: PromocionPermanenteCobro | null;
    }
    function totalPuntosAgregados(r: RespuestaCobro): number {
      return r.PuntosPorVenta + r.PuntosPromocionPermanente;
    }
    function huboPromoPuntos(r: RespuestaCobro): boolean {
      return r.PuntosPromocionPermanente > 0 && r.PromocionPermanente !== null;
    }
### 6.6 Errores al cobrar (sin cambios)
| HTTP | Caso |
|------|------|
| 400 | Total de pagos ≠ total del pedido |
| 401 | Sin token o usuario no identificado |
| 404 | Pedido, mesa o para llevar no encontrado |
---
## 7. GraphQL — listar promos (opcional)
**Query:** `PromocionPermanentes`  
**Roles:** Admin, Cajero, Mesero  
Soporta paginación, filtros y orden.
**Ejemplo:**
    query {
      promocionPermanentes {
        nodes {
          id
          nombre
          descripcion
          tipoCondicion
          valorCondicion
          tipoRecompensa
          valorRecompensa
          activo
        }
      }
    }
**Uso:** pantalla informativa de promos vigentes.  
**No incluye** progreso del cliente (ej. “3/5 compras”) — aún no hay API para eso.
---
## 8. Flujo completo
    [Admin crea promo PuntosExtra + NCompras o MontoMinimo]
                        │
                        ▼
    [Cajero: pedido → rondas → cobrar]
                        │
                        ▼
    POST /api/Venta/cobrar  o  POST /api/Mesa/cobrar/{idMesa}
    Body: Id_Pedido, Id_Cliente, Pagos  (sin id de promo)
                        │
                        ▼
    Backend: venta + puntos normales + evalúa promos + aplica máx. 1
                        │
                        ▼
    Front: muestra message + PuntosPorVenta + PuntosPromocionPermanente
---
## 9. Lo que el front NO debe hacer (v1)
| Acción | Motivo |
|--------|--------|
| Botón “Reclamar promoción” para puntos | No existe; es automático al cobrar |
| Enviar `IdPromocion` en el cobrar | No está en el API |
| Mostrar opción `Requeridos` en admin | Backend lo ignora |
| Esperar descuento en total del pedido | Descuento no implementado |
| Esperar producto gratis al cobrar | ProductoGratis no implementado |
| Mostrar “3/5 compras” sin API | No hay endpoint de progreso aún |
---
## 10. Casos de prueba (QA / front)
| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | `MontoMinimo` 100, venta 80 | `PuntosPromocionPermanente: 0`, `PromocionPermanente: null` |
| 2 | `MontoMinimo` 100, venta 120 | `PuntosPromocionPermanente > 0`, objeto promo |
| 3 | `NCompras` 5, ventas 1–4 | Sin puntos extra |
| 4 | `NCompras` 5, venta 5 | Puntos extra; ventas 6–9 sin promo; venta 10 otra vez con promo |
| 5 | Dos promos califican misma venta | Solo una (mayor `ValorRecompensa`) |
| 6 | Promo `Activo: false` | No aplica |
| 7 | `TipoRecompensa: ProductoGratis` | No suma puntos al cobrar en v1 |
---
## 11. Requisito backend (coordinación)
Para que cobrar funcione en integración, la BD debe tener:
- Tabla `PromocionPermanenteProgreso` (contador NCompras)
- Tabla `HistorialPromocionPermanente` (auditoría)
Si al cobrar falla por tabla inexistente, backend debe aplicar migración antes de probar.
---
## 12. Próximas fases (avisar al front cuando existan)
| Fase | Cambio esperado |
|------|-----------------|
| ProductoGratis | Posible mensaje o flujo aparte; inventario |
| Descuento | Posible impacto en total del pedido |
| Requeridos | Nueva condición en admin |
| Progreso cliente | Posible GET con estado / barra “X de Y compras” |
---
## 13. Checklist implementación front
- [ ] Pantalla admin CRUD promos (`PuntosExtra` + `NCompras` / `MontoMinimo`)
- [ ] Ocultar `Requeridos`, `ProductoGratis`, `Descuento` en admin (v1)
- [ ] Tras cobrar (mesa y para llevar), parsear respuesta con puntos
- [ ] Mostrar `message` o modal con desglose: normal + extra + total
- [ ] Si `PromocionPermanente != null`, mostrar nombre de la promo
- [ ] No agregar campos de promo al body de cobrar
- [ ] (Opcional) GraphQL listado informativo de promos
---
## 14. Ejemplo cURL — cobrar con cliente
    curl -X POST "https://TU_HOST/api/Venta/cobrar" \
      -H "Authorization: Bearer TU_JWT" \
      -H "Content-Type: application/json" \
      -d "{\"Id_Pedido\":12,\"Id_Cliente\":45,\"Pagos\":{\"Efectivo\":120,\"Tarjeta\":0,\"Qr\":0}}"
---
*Fin del documento — Promociones permanentes Puntos extra v1 — Kafe Yana API*

# Promociones permanentes — Front (Puntos extra + Descuento)

Documentación Kafe Yana API para integración en caja/admin.

**JSON:** PascalCase (`Id_Pedido`, `AplicarDescuentos`, …)  
**Auth:** `Authorization: Bearer {JWT}`

---

## 1. Resumen

| Recompensa | Cuándo aplica | Acción del front |
|------------|---------------|------------------|
| **PuntosExtra** | Automático al cobrar | Leer respuesta del cobro |
| **Descuento** | Solo si `AplicarDescuentos: true` | 1) GET preview 2) Cobrar con flag true y pagos al total descontado |

**Pueden aplicar juntas** en la misma venta (descuento + puntos extra).

**Máximo 1 promo por tipo de recompensa** por venta (si califican varias descuentos, gana el de **mayor monto en soles**).

---

## 2. Constantes

### TipoCondicion

| Valor | Uso v1 |
|-------|--------|
| `NCompras` | Sí |
| `MontoMinimo` | Sí |
| `Requeridos` | No (backend lo ignora) |

### TipoRecompensa

| Valor | Implementado |
|-------|--------------|
| `PuntosExtra` | Sí — automático al cobrar |
| `Descuento` | Sí — GET preview + `AplicarDescuentos` |
| `ProductoGratis` | No (futuro) |

### ValorRecompensa

| Tipo | Significado |
|------|-------------|
| `PuntosExtra` | Cantidad de puntos extra |
| `Descuento` | Porcentaje entero (10 = 10 %, máx. 100) |

---

## 3. Admin — CRUD promociones

**Base:** `/api/PromocionPermanente`  
**Rol CRUD:** Admin

### Crear — POST /api/PromocionPermanente

**Ejemplo descuento + monto mínimo:**

    {
      "Nombre": "10% compras mayores a S/ 100",
      "Descripcion": "Descuento automático al cumplir monto",
      "TipoCondicion": "MontoMinimo",
      "ValorCondicion": 100,
      "TipoRecompensa": "Descuento",
      "ValorRecompensa": 10,
      "Activo": true,
      "Id_ProductoCanjeable": null
    }

**Ejemplo puntos + N compras:**

    {
      "Nombre": "Cada 5 compras +50 pts",
      "Descripcion": "",
      "TipoCondicion": "NCompras",
      "ValorCondicion": 5,
      "TipoRecompensa": "PuntosExtra",
      "ValorRecompensa": 50,
      "Activo": true,
      "Id_ProductoCanjeable": null
    }

**Respuesta 201:**

    { "message": "Promoción permanente creada", "Id": 3 }

### Actualizar — PUT /api/PromocionPermanente/{id}

Mismo body que crear → `{ "message": "Promoción permanente actualizada" }`

### Eliminar — DELETE /api/PromocionPermanente/{id}

    { "message": "Promoción permanente eliminada" }

---

## 4. GET — Preview descuentos del pedido

**Antes de cobrar**, consultar qué descuentos califican **sin guardar nada**.

| Campo | Valor |
|-------|--------|
| **Método** | GET |
| **URL** | `/api/PromocionPermanente/descuentos-pedido` |
| **Query** | `Id_Pedido`, `Id_Cliente` (obligatorios) |
| **Roles** | Admin, Cajero, Mesero |

**Ejemplo:**

    GET /api/PromocionPermanente/descuentos-pedido?Id_Pedido=12&Id_Cliente=45

### Respuesta 200

    {
      "Id_Pedido": 12,
      "Id_Cliente": 45,
      "SubtotalPedido": 120.00,
      "HayDescuentoDisponible": true,
      "DescuentosDisponibles": [
        {
          "IdPromocion": 2,
          "Nombre": "10% compras mayores a S/ 100",
          "TipoCondicion": "MontoMinimo",
          "ValorCondicion": 100,
          "PorcentajeDescuento": 10,
          "MontoDescuento": 12.00,
          "TotalConDescuento": 108.00
        }
      ],
      "DescuentoRecomendado": {
        "IdPromocion": 2,
        "Nombre": "10% compras mayores a S/ 100",
        "TipoCondicion": "MontoMinimo",
        "ValorCondicion": 100,
        "PorcentajeDescuento": 10,
        "MontoDescuento": 12.00,
        "TotalConDescuento": 108.00
      }
    }

### Sin descuentos

    {
      "Id_Pedido": 12,
      "Id_Cliente": 45,
      "SubtotalPedido": 80.00,
      "HayDescuentoDisponible": false,
      "DescuentosDisponibles": [],
      "DescuentoRecomendado": null
    }

### Campos

| Campo | Descripción |
|-------|-------------|
| `SubtotalPedido` | Total del pedido sin descuento |
| `HayDescuentoDisponible` | true si hay al menos uno |
| `DescuentosDisponibles` | Lista de promos que califican |
| `DescuentoRecomendado` | La de **mayor ahorro** (backend elige; el front no envía id de promo) |
| `PorcentajeDescuento` | % de la promo |
| `MontoDescuento` | Descuento en soles |
| `TotalConDescuento` | Lo que debería pagar el cliente |

### Errores

| HTTP | Caso |
|------|------|
| 400 | Id_Pedido o Id_Cliente inválidos |
| 409 | Pedido/cliente no encontrado o no corresponden |

---

## 5. POST cobrar — aplicar descuento (opcional)

### Endpoints

| Canal | URL |
|-------|-----|
| Para llevar | POST `/api/Venta/cobrar` |
| Mesa | POST `/api/Mesa/cobrar/{IdMesa}` |

**Roles:** Admin, Cajero, Mesero  
**Requisito:** caja abierta

### Body — DtoVentaPedido

    {
      "Id_Pedido": 12,
      "Id_Cliente": 45,
      "AplicarDescuentos": false,
      "Pagos": {
        "Efectivo": 120.00,
        "Tarjeta": 0,
        "Qr": 0
      }
    }

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `Id_Pedido` | int | — | Obligatorio |
| `Id_Cliente` | int | — | Obligatorio |
| `AplicarDescuentos` | bool | **false** | true = aplica el mejor descuento disponible |
| `Pagos` | object | — | Efectivo + Tarjeta + Qr |

### Regla de pagos (IMPORTANTE)

| AplicarDescuentos | Total que debe cuadrar Pagos |
|-------------------|------------------------------|
| **false** | Total del pedido (sin descuento) |
| **true** | Total **con descuento** (`TotalConDescuento` del GET) |

    Pagos.Efectivo + Pagos.Tarjeta + Pagos.Qr = total esperado

Si `AplicarDescuentos: true` y **no hay descuento aplicable** → error 409:

    { "message": "No hay descuentos aplicables para este pedido y cliente." }

---

## 6. Respuesta del cobrar

### Sin descuento, sin puntos promo

    {
      "message": "Venta procesada correctamente",
      "PuntosPorVenta": 12,
      "PuntosPromocionPermanente": 0,
      "PromocionPermanente": null,
      "AplicoDescuento": false,
      "MontoDescuento": 0,
      "PorcentajeDescuento": null,
      "SubtotalPedido": 120.00,
      "TotalCobrado": 120.00,
      "PromocionDescuento": null
    }

### Con descuento y puntos extra

    {
      "message": "Venta procesada correctamente Se aplicó un descuento del 10% (12.00) por la promoción \"10% compras mayores a S/ 100\". Se agregaron 50 puntos extra por la promoción \"Cada 5 compras +50 pts\".",
      "PuntosPorVenta": 10,
      "PuntosPromocionPermanente": 50,
      "PromocionPermanente": {
        "NombrePromocion": "Cada 5 compras +50 pts",
        "PuntosExtra": 50,
        "Mensaje": "Se agregaron 50 puntos extra por la promoción \"Cada 5 compras +50 pts\"."
      },
      "AplicoDescuento": true,
      "MontoDescuento": 12.00,
      "PorcentajeDescuento": 10,
      "SubtotalPedido": 120.00,
      "TotalCobrado": 108.00,
      "PromocionDescuento": {
        "IdPromocion": 2,
        "NombrePromocion": "10% compras mayores a S/ 100",
        "PorcentajeDescuento": 10,
        "MontoDescuento": 12.00,
        "TotalConDescuento": 108.00,
        "Mensaje": "Se aplicó un descuento del 10% (12.00) por la promoción \"10% compras mayores a S/ 100\"."
      }
    }

### Tabla de campos respuesta cobro

| Campo | Uso UI |
|-------|--------|
| `message` | Toast / modal principal |
| `SubtotalPedido` | Total antes de descuento |
| `TotalCobrado` | Lo que pagó el cliente |
| `AplicoDescuento` | Checkbox / badge descuento aplicado |
| `MontoDescuento` | Monto descontado |
| `PorcentajeDescuento` | % aplicado |
| `PromocionDescuento` | Detalle promo descuento o null |
| `PuntosPorVenta` | Puntos normales |
| `PuntosPromocionPermanente` | Puntos extra promo |
| `PromocionPermanente` | Detalle puntos extra o null |

---

## 7. Flujo recomendado en el front (caja)

    1. Usuario tiene pedido + cliente asignado
    2. GET descuentos-pedido (Id_Pedido, Id_Cliente)
    3. Si HayDescuentoDisponible:
         - Mostrar DescuentoRecomendado (nombre, %, monto, total a pagar)
         - Toggle/checkbox "Aplicar descuento" (default OFF)
    4. Pantalla de pago:
         - Si toggle OFF → total a pagar = SubtotalPedido
         - Si toggle ON  → total a pagar = DescuentoRecomendado.TotalConDescuento
    5. POST cobrar con AplicarDescuentos = valor del toggle
         - Pagos deben sumar el total correcto
    6. Mostrar respuesta: descuento + puntos (message y desglose)

---

## 8. TypeScript (referencia)

    interface DtoPagos {
      Efectivo: number;
      Tarjeta: number;
      Qr: number;
    }

    interface DtoVentaPedido {
      Id_Pedido: number;
      Id_Cliente: number;
      AplicarDescuentos?: boolean; // default false
      Pagos: DtoPagos;
    }

    interface DtoDescuentoDisponible {
      IdPromocion: number;
      Nombre: string;
      TipoCondicion: string;
      ValorCondicion: number;
      PorcentajeDescuento: number;
      MontoDescuento: number;
      TotalConDescuento: number;
    }

    interface DtoDescuentosPedidoRespuesta {
      Id_Pedido: number;
      Id_Cliente: number;
      SubtotalPedido: number;
      HayDescuentoDisponible: boolean;
      DescuentosDisponibles: DtoDescuentoDisponible[];
      DescuentoRecomendado: DtoDescuentoDisponible | null;
    }

    interface RespuestaCobro {
      message: string;
      PuntosPorVenta: number;
      PuntosPromocionPermanente: number;
      PromocionPermanente: {
        NombrePromocion: string;
        PuntosExtra: number;
        Mensaje: string;
      } | null;
      AplicoDescuento: boolean;
      MontoDescuento: number;
      PorcentajeDescuento: number | null;
      SubtotalPedido: number;
      TotalCobrado: number;
      PromocionDescuento: {
        IdPromocion: number;
        NombrePromocion: string;
        PorcentajeDescuento: number;
        MontoDescuento: number;
        TotalConDescuento: number;
        Mensaje: string;
      } | null;
    }

    function totalAPagar(subtotal: number, preview: DtoDescuentosPedidoRespuesta, aplicar: boolean): number {
      if (!aplicar || !preview.DescuentoRecomendado) return subtotal;
      return preview.DescuentoRecomendado.TotalConDescuento;
    }

---

## 9. Reglas de negocio (referencia)

### NCompras (descuento y puntos)

- Contador **por cliente + promo** (no en tabla Cliente).
- Solo cuenta ventas **después** de existir la promo.
- Al **aplicar** esa promo (descuento o puntos), contador vuelve a **0**.
- GET descuentos **simula** la venta actual sin guardar contador.

### MontoMinimo

- Se evalúa contra el **total del pedido/venta**.
- Cada venta que cumple puede aplicar de nuevo.

### Descuento

- `ValorRecompensa` = porcentaje.
- `MontoDescuento = round(Subtotal * % / 100, 2)`.
- Backend elige la promo; el front **no envía IdPromocion** al cobrar.

### PuntosExtra

- Siempre automático al cobrar (independiente de `AplicarDescuentos`).
- Puntos se calculan sobre **Subtotal sin descuento**.

---

## 10. Errores frecuentes

| message | Causa | Acción front |
|---------|-------|--------------|
| El total de los pagos no coincide con el total del pedido (X) | AplicarDescuentos false y pagos ≠ subtotal | Ajustar montos |
| El total de los pagos no coincide con el total con descuento (X) | AplicarDescuentos true y pagos ≠ total descontado | Usar TotalConDescuento del GET |
| No hay descuentos aplicables... | AplicarDescuentos true pero ya no califica | Desactivar toggle o refrescar GET |
| Pedido no encontrado | Id_Pedido inválido | — |

---

## 11. Casos de prueba QA

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | GET pedido 80, promo mínimo 100 | HayDescuentoDisponible false |
| 2 | GET pedido 120, promo 10% mín 100 | MontoDescuento 12, Total 108 |
| 3 | Cobrar AplicarDescuentos false, pagos 120 | Sin descuento en respuesta |
| 4 | Cobrar AplicarDescuentos true, pagos 108 | AplicoDescuento true |
| 5 | Cobrar AplicarDescuentos true, pagos 120 | Error pagos |
| 6 | Misma venta califica descuento + puntos | Ambos en respuesta |
| 7 | NCompras descuento venta 5 | Descuento aplica; contador reset |

---

## 12. Backend — migración BD

Aplicar antes de probar en integración:

    dotnet ef database update --project KafeYana.Infrastructure --startup-project KafeYana.Api

Tablas/columnas relevantes:

- `Venta`: `MontoDescuento`, `PorcentajeDescuento`, `Id_PromocionPermanenteDescuento`, `NombrePromocionDescuento`
- `PromocionPermanenteProgreso`: contador NCompras
- `HistorialPromocionPermanente`: auditoría (permite puntos + descuento misma venta)

---

## 13. Checklist front

- [ ] Admin CRUD promos Descuento y PuntosExtra
- [ ] GET descuentos-pedido antes de cobrar
- [ ] Toggle "Aplicar descuento" (default false)
- [ ] Recalcular total a pagar según toggle
- [ ] POST cobrar con `AplicarDescuentos`
- [ ] Validar suma de pagos vs total esperado
- [ ] Modal post-cobro: descuento + puntos
- [ ] No enviar IdPromocion en cobrar

---

*Fin — Promociones permanentes v2 (PuntosExtra + Descuento) — Kafe Yana API*

# Promociones permanentes — Producto gratis (integración Front)

Documentación Kafe Yana API para consultar y reclamar productos gratis por promoción permanente.

**JSON:** PascalCase (`Id_Cliente`, `IdPromocionPermanente`, …)  
**Auth:** `Authorization: Bearer {JWT}`

---

## 1. Resumen

| Concepto | Comportamiento |
|----------|----------------|
| **ProductoGratis** | Recompensa manual: el cajero **reclama** cuando el cliente cumple la condición |
| **No resta puntos** | A diferencia del canje por puntos (`POST canje`) |
| **Inventario** | Baja stock igual que canje (movimiento tipo `Canje`) |
| **Progreso NCompras** | Se incrementa **automáticamente al cobrar** ventas |
| **MontoMinimo** | Tras una venta que cumple el mínimo, queda **beneficio pendiente** hasta reclamar |

**Endpoints bajo:** `/api/ProductoCanjeable`  
**Roles GET y POST reclamar:** Admin, Cajero

---

## 2. Diferencia: canje por puntos vs producto gratis

| | Canje por puntos | Producto gratis (promo) |
|--|------------------|-------------------------|
| **POST** | `/api/ProductoCanjeable/canje` | `/api/ProductoCanjeable/reclamar-promocion-gratis` |
| **Body** | `IdProductoCanjeable`, `IdCliente` | `IdCliente`, `IdPromocionPermanente` |
| **Resta puntos** | Sí | **No** |
| **Condición** | Puntos suficientes | `NCompras` o `MontoMinimo` de la promo |
| **Progreso** | — | Contador / beneficio pendiente por cliente+promo |

---

## 3. Admin — crear promo ProductoGratis

**Base:** `/api/PromocionPermanente`  
**Rol:** Admin

### POST /api/PromocionPermanente

**Ejemplo — cada 5 compras, café gratis:**

```json
{
  "Nombre": "Cada 5 compras café gratis",
  "Descripcion": "Al completar 5 compras puede reclamar un café",
  "TipoCondicion": "NCompras",
  "ValorCondicion": 5,
  "TipoRecompensa": "ProductoGratis",
  "ValorRecompensa": 0,
  "Activo": true,
  "Id_ProductoCanjeable": 2
}
```

**Ejemplo — compra mayor a S/ 80, postre gratis:**

```json
{
  "Nombre": "Postre gratis compras +S/ 80",
  "Descripcion": "",
  "TipoCondicion": "MontoMinimo",
  "ValorCondicion": 80,
  "TipoRecompensa": "ProductoGratis",
  "ValorRecompensa": 0,
  "Activo": true,
  "Id_ProductoCanjeable": 4
}
```

| Campo | ProductoGratis |
|-------|----------------|
| `TipoRecompensa` | `"ProductoGratis"` |
| `Id_ProductoCanjeable` | **Obligatorio** — id del producto canjeable a entregar |
| `ValorRecompensa` | Ignorado (usar `0`) |
| `TipoCondicion` | `NCompras` o `MontoMinimo` (`Requeridos` no implementado) |

---

## 4. GET — consultar promos disponibles del cliente

| Campo | Valor |
|-------|--------|
| **Método** | GET |
| **URL** | `/api/ProductoCanjeable/promociones-gratis-disponibles` |
| **Query** | `Id_Cliente` (obligatorio) |
| **Roles** | Admin, Cajero |

**Ejemplo:**

```
GET /api/ProductoCanjeable/promociones-gratis-disponibles?Id_Cliente=45
```

### Respuesta 200

```json
{
  "Id_Cliente": 45,
  "Disponibles": [
    {
      "IdPromocionPermanente": 3,
      "NombrePromocion": "Cada 5 compras café gratis",
      "TipoCondicion": "NCompras",
      "ValorCondicion": 5,
      "ProgresoActual": 5,
      "IdProductoCanjeable": 2,
      "NombreProducto": "Cappuccino",
      "Categoria": "Bebidas calientes"
    }
  ],
  "EnProgreso": [
    {
      "IdPromocionPermanente": 4,
      "NombrePromocion": "Postre gratis compras +S/ 80",
      "TipoCondicion": "NCompras",
      "ValorCondicion": 3,
      "ProgresoActual": 1,
      "IdProductoCanjeable": 4,
      "NombreProducto": "Brownie",
      "Categoria": "Postres"
    }
  ]
}
```

### Campos

| Campo | Descripción |
|-------|-------------|
| `Disponibles` | Promos que el cliente **puede reclamar ahora** |
| `EnProgreso` | Promos `NCompras` aún no completadas (`ProgresoActual` / `ValorCondicion`) |
| `ProgresoActual` | Solo en `NCompras`; `null` en `MontoMinimo` |
| `IdProductoCanjeable` | Producto a entregar al reclamar |
| `NombreProducto`, `Categoria` | Datos para mostrar en UI |

### Reglas de listado

| Condición | Cuándo aparece en `Disponibles` |
|-----------|----------------------------------|
| **NCompras** | `ProgresoActual >= ValorCondicion` (ej. 5/5) |
| **MontoMinimo** | Tras cobrar una venta con subtotal ≥ mínimo; queda pendiente hasta reclamar |

**Este GET no modifica inventario ni progreso.** Solo lectura.

### Errores

| HTTP | Caso |
|------|------|
| 400 | `Id_Cliente` inválido o ausente |
| 409 | Cliente no encontrado |

---

## 5. POST — reclamar producto gratis

| Campo | Valor |
|-------|--------|
| **Método** | POST |
| **URL** | `/api/ProductoCanjeable/reclamar-promocion-gratis` |
| **Roles** | Admin, Cajero |

### Body

```json
{
  "IdCliente": 45,
  "IdPromocionPermanente": 3
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `IdCliente` | int | Cliente que reclama |
| `IdPromocionPermanente` | int | Promo `ProductoGratis` activa |

### Qué hace el backend

1. Valida cliente, promo activa y producto canjeable activo.
2. Valida que el cliente **cumple la condición** (misma regla que el GET).
3. Descuenta inventario (cantidad **1**, movimiento `Canje`).
4. Registra `HistorialPromocionPermanente`.
5. **No** resta puntos del cliente.
6. Resetea progreso:
   - `NCompras` → contador vuelve a **0**
   - `MontoMinimo` → limpia beneficio pendiente

### Respuesta 200

```json
{
  "Mensaje": "Producto gratis reclamado: \"Cappuccino\" por la promoción \"Cada 5 compras café gratis\".",
  "IdPromocionPermanente": 3,
  "NombrePromocion": "Cada 5 compras café gratis",
  "IdProductoCanjeable": 2,
  "NombreProducto": "Cappuccino",
  "Categoria": "Bebidas calientes"
}
```

### Errores frecuentes (409)

| message | Causa |
|---------|-------|
| Cliente no encontrado | `IdCliente` inválido |
| Promoción permanente no encontrada o inactiva | Promo inexistente o desactivada |
| El cliente no cumple la condición... | Aún no califica (refrescar GET) |
| Stock insuficiente para... | Sin inventario para el producto |
| El producto canjeable de la promoción está inactivo | Admin desactivó el canjeable |

---

## 6. Progreso automático al cobrar ventas

Al **POST cobrar** (mesa o para llevar), el backend incrementa progreso de promos `ProductoGratis`:

| Condición | Al cobrar |
|-----------|-----------|
| **NCompras** | `ContadorCompras + 1` por venta |
| **MontoMinimo** | Si `Subtotal >= ValorCondicion` → marca beneficio **pendiente de reclamar** |

**No es automático el reclamo:** el front debe llamar al POST reclamar cuando el cliente lo pida.

**Endpoints cobrar (sin cambios):**

| Canal | URL |
|-------|-----|
| Para llevar | POST `/api/Venta/cobrar` |
| Mesa | POST `/api/Mesa/cobrar/{IdMesa}` |

---

## 7. Flujo recomendado en caja

```
1. Cliente identificado (Id_Cliente)
2. GET promociones-gratis-disponibles?Id_Cliente=X
3. Mostrar:
   - Disponibles → botón "Reclamar"
   - EnProgreso → barra "2/5 compras"
4. Usuario confirma reclamo
5. POST reclamar-promocion-gratis { IdCliente, IdPromocionPermanente }
6. Toast con Mensaje + producto entregado
7. Refrescar GET (promo ya no en Disponibles; contador reset si NCompras)
```

---

## 8. TypeScript (referencia)

```typescript
interface DtoPromocionGratisItem {
  IdPromocionPermanente: number;
  NombrePromocion: string;
  TipoCondicion: 'NCompras' | 'MontoMinimo';
  ValorCondicion: number;
  ProgresoActual: number | null;
  IdProductoCanjeable: number;
  NombreProducto: string;
  Categoria: string;
}

interface DtoPromocionesGratisCliente {
  Id_Cliente: number;
  Disponibles: DtoPromocionGratisItem[];
  EnProgreso: DtoPromocionGratisItem[];
}

interface DtoReclamarPromocionGratis {
  IdCliente: number;
  IdPromocionPermanente: number;
}

interface ResultadoReclamoPromocionGratis {
  Mensaje: string;
  IdPromocionPermanente: number;
  NombrePromocion: string;
  IdProductoCanjeable: number;
  NombreProducto: string;
  Categoria: string;
}
```

---

## 9. Casos de prueba QA

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Cliente 0 compras, promo NCompras 5 | EnProgreso 0/5, Disponibles vacío |
| 2 | Tras 5 ventas cobradas | Disponibles con la promo |
| 3 | POST reclamar | 200, inventario baja, contador → 0 |
| 4 | Reclamar sin calificar | 409 |
| 5 | Venta subtotal 90, promo MontoMinimo 80 | Aparece en Disponibles |
| 6 | Reclamar MontoMinimo | Disponibles vacío hasta nueva venta que cumpla |
| 7 | Canje por puntos | Sigue en POST `/canje`; no usa estas rutas |

---

## 10. Migración BD

Aplicar antes de probar:

```bash
dotnet ef database update --project KafeYana.Infrastructure --startup-project KafeYana.Api
```

Columna nueva en `PromocionPermanenteProgreso`:

- `ReclamoMontoMinimoPendiente` (bool) — beneficio MontoMinimo pendiente de reclamar

---

## 11. Checklist front

- [ ] Pantalla cliente: GET promociones-gratis-disponibles
- [ ] Listar `Disponibles` con botón reclamar
- [ ] Listar `EnProgreso` con progreso NCompras (ej. 2/5)
- [ ] POST reclamar-promocion-gratis al confirmar
- [ ] Mostrar `Mensaje` de éxito o error 409
- [ ] Refrescar lista tras reclamar o tras cobrar venta
- [ ] No confundir con canje por puntos (`POST canje`)

---

*Fin — Promociones permanentes v3 (ProductoGratis) — Kafe Yana API*