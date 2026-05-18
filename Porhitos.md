# Kafe Yana API — Documentación: puntos, canjeables, promociones e hitos

Convenciones comunes:

- REST base: `/api/...` (JWT; roles indicados por sección).
- GraphQL: misma autorización por query; paginación, filtros (`where`) y orden (`order`) donde aplique `[UsePaging]`, `[UseFiltering]`, `[UseSorting]`.

---

## 1. Sistema de puntos

### 1.1 REST — `PuntosController` (`/api/puntos`)

Consultas **GET** no están aquí; puntos del cliente en GraphQL (`clientes.puntos`). Historial en GraphQL (`historialPuntos`).

#### Regla base

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/api/puntos/config/reglabase` | Admin | Obtener regla actual |
| `POST` | `/api/puntos/config/reglabase` | Admin | Crear regla (una sola vez) |
| `PUT` | `/api/puntos/config/reglabase` | Admin | Actualizar regla |

**Body crear/actualizar:**
```json
{
  "Cantidad": 10,
  "Activo": true
}
```
`Cantidad` = bolivianos por 1 punto (ej. cada 10 Bs → 1 punto).

#### Aceleradores

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/api/puntos/config/aceleradores` | Admin |
| `PUT` | `/api/puntos/config/aceleradores/{id}` | Admin |

IDs fijos típicos: `1` Combo, `2` CompraAlta (&gt;100), `3` CompraMediana (&gt;70), `4` Cumpleaños, `5` HoraValle.

**Body (`1–4`):**
```json
{ "Cantidad": 2, "Activo": true }
```

**Body HoraValle (`id = 5`):** obligatorios `HoraInicio` y `HoraFin`:
```json
{
  "Cantidad": 2,
  "Activo": true,
  "HoraInicio": "14:00",
  "HoraFin": "17:00"
}
```

#### Ajuste manual de puntos

| Método | Ruta | Rol |
|--------|------|-----|
| `POST` | `/api/puntos/cliente/{clienteId}/ajuste` | Admin |

```json
{
  "Cantidad": 50,
  "Motivo": "Compensación / nota obligatoria"
}
```

Los puntos se **aplican al cobrar** la venta (`POST /api/venta/cobrar` donde corresponda en tu flujo mesa/pedido).

**Lógica resumida:**

1. `PuntosBase = floor(Total / ReglaBase.Cantidad)` si la regla está activa y `Cantidad > 0`.
2. Si `PuntosBase > 0`, aceleradores **multiplicadores** actúan cada uno sobre la base: suma de `(base × factor)` entre multiplicadores activos.
3. Aceleradores **suma** agregan su cantidad al total final.

### 1.2 GraphQL — puntos e historial

**Puntos en cliente:**
```graphql
query {
  clientes(where: { id: { eq: 1 } }) {
    nodes {
      id
      nombre
      puntos
    }
  }
}
```

**Historial:**
```graphql
query {
  historialPuntos(
    where: { idCliente: { eq: 1 } }
    order: { fecha: DESC }
  ) {
    totalCount
    nodes {
      id
      codigoVenta
      puntosBase
      puntosFinales
      desglose
      fecha
    }
  }
}
```

---

## 2. Productos canjeables

### REST — `ProductoCanjeableController` (`/api/ProductoCanjeable`)

Rol: **Admin**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/ProductoCanjeable` | Crear |
| `PUT` | `/api/ProductoCanjeable/{id}` | Actualizar |
| `DELETE` | `/api/ProductoCanjeable/{id}` | Eliminar |

**Body:**
```json
{
  "Id_Producto": 3,
  "Puntos": 50,
  "Disponible": "Mesas",
  "Activo": true
}
```

`Disponible` (string): **`Mesas`** | **`ParaLlevar`** | **`MesasYParaLlevar`**.

Respuesta típica creación: `{ "message": "Producto canjeable creado", "id": 1 }`.

### GraphQL

```graphql
query {
  productosCanjeables(where: { activo: { eq: true } }) {
    totalCount
    nodes {
      id
      idProducto
      nombreProducto
      categoria
      puntos
      disponible
      activo
    }
  }
}
```

---

## 3. Promociones permanentes

### REST — `PromocionPermanenteController` (`/api/PromocionPermanente`)

Rol: **Admin**. Operaciones: `POST`, `PUT /{id}`, `DELETE /{id}`.

**Tipos:**

- Condición: `NCompras`, `MontoMinimo`, `Requeridos`
- Recompensa: `PuntosExtra`, `ProductoGratis`, `Descuento`

Si `TipoRecompensa` es **`ProductoGratis`**, `Id_ProductoCanjeable` es **obligatorio** y `ValorRecompensa` puede ser 0. En otros casos `ValorRecompensa > 0` (puntos extra o `%` como entero).

```json
{
  "Nombre": "Cliente frecuente",
  "Descripcion": "…",
  "TipoCondicion": "NCompras",
  "ValorCondicion": 5,
  "TipoRecompensa": "PuntosExtra",
  "ValorRecompensa": 20,
  "Activo": true,
  "Id_ProductoCanjeable": null
}
```

### GraphQL

```graphql
query {
  promocionPermanentes(where: { activo: { eq: true } }) {
    nodes {
      id
      nombre
      descripcion
      tipoCondicion
      valorCondicion
      tipoRecompensa
      valorRecompensa
      activo
      idProductoCanjeable
    }
  }
}
```

*(La aplicación de la regla en el cobro la defines después en lógica de negocio.)*

---

## 4. Promociones por temporada

### REST — `PromocionTemporadaController` (`/api/PromocionTemporada`)

Rol: **Admin**.

| Método | Ruta |
|--------|------|
| `POST` | `/api/PromocionTemporada` |
| `PUT` | `/api/PromocionTemporada/{id}` |
| `DELETE` | `/api/PromocionTemporada/{id}` |

**Body:**
```json
{
  "Nombre": "Verano 2026",
  "FechaInicio": "2026-06-01T00:00:00Z",
  "FechaFin": "2026-08-31T23:59:59Z",
  "IdsProductosCanjeables": [1, 2, 5],
  "Activo": true
}
```

- `FechaFin` ≥ `FechaInicio`
- Lista de IDs de **filas** en `ProductoCanjeable` (mínimo 1, sin duplicados).

### GraphQL

```graphql
query {
  promocionTemporadas {
    nodes {
      id
      nombre
      fechaInicio
      fechaFin
      activo
      productosCanjeables {
        idProductoCanjeable
        productoCanjeable {
          id
          nombreProducto
          categoria
          puntos
          disponible
        }
      }
    }
  }
}
```

---

## 5. Hitos por compra

### REST — `HitoCompraController` (`/api/HitoCompra`)

Rol: **Admin**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/HitoCompra` | Crear |
| `PUT` | `/api/HitoCompra/{id}` | Actualizar todos los campos |
| `PATCH` | `/api/HitoCompra/{id}/toggle` | Solo `id`; invierte `Activo` ↔ |
| `DELETE` | `/api/HitoCompra/{id}` | Eliminar |

**Body crear / actualizar:**
```json
{
  "NumeroCompras": 10,
  "Id_ProductoCanjeable": 2,
  "Descripcion": "Texto para UI",
  "Icono": "clave_o_uri_como_use_el_front",
  "Activo": true
}
```

- `NumeroCompras` entero ≥ 1 (**único** en base de datos: no dos hitos con el mismo número).
- `Icono`: string libre (clave de icono o URL si el front lo usa así).

**Respuesta toggle:**
```json
{
  "message": "Estado actualizado",
  "Activo": false
}
```

### GraphQL

Query: **`hitosCompra`**. Roles: Admin, Cajero, Mesero.

```graphql
query {
  hitosCompra(where: { activo: { eq: true } }, order: { numeroCompras: ASC }) {
    totalCount
    nodes {
      id
      numeroCompras
      idProductoCanjeable
      descripcion
      icono
      activo
      productoCanjeable {
        id
        nombreProducto
        categoria
        puntos
        disponible
        activo
      }
    }
  }
}
```

### Errores habituales (handler global)

- Nombre/reglas duplicadas según índices únicos de cada entidad.
- FK a `ProductoCanjeable` inválido o intento de borrar producto canjeable aún referenciado.

---

## Migraciones (recordatorio)

Tras cambios de modelo:

```bash
dotnet ef migrations add NombreMigracion --project KafeYana.Infrastructure --startup-project KafeYana.Api
dotnet ef database update --project KafeYana.Infrastructure --startup-project KafeYana.Api
```