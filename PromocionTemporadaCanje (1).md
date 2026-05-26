# Promociones permanentes — Producto gratis (integración Front)

Documentación Kafe Yana API para consultar y reclamar productos gratis por promoción permanente.

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