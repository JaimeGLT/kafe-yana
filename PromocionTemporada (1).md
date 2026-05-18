# Documentación — Promociones por temporada

---

## Modelo de datos

| Campo | Descripción |
|-------|-------------|
| `Nombre` | Nombre de la promoción (único). |
| `FechaInicio` | Inicio de vigencia (inclusive según uso en front). |
| `FechaFin` | Fin de vigencia (`>= FechaInicio`). |
| `Activo` | Si la promoción está habilitada. |
| `IdsProductosCanjeables` | Lista de **Ids** de registros en **ProductoCanjeable** (uno o más). |

Relación: una temporada tiene **varios** productos canjeables mediante la tabla `PromocionTemporada_ProductoCanjeable`.

---

## REST — `PromocionTemporadaController`

Base URL: `/api/PromocionTemporada`  
Rol: **Admin**

### `POST /api/PromocionTemporada`

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

**Respuesta `201`:**
```json
{
  "message": "Promoción por temporada creada",
  "id": 1
}
```

**Errores habituales:**
| Código | Motivo |
|--------|--------|
| `400` | `FechaFin` &lt; `FechaInicio` |
| `400` | Lista vacía o ids duplicados |
| `409` | Producto canjeable inexistente |
| `409` | Nombre duplicado |

---

### `PUT /api/PromocionTemporada/{id}`

Mismo body que el POST. **Reemplaza por completo** la lista de productos canjeables enlazados.

**Respuesta `200`:**
```json
{ "message": "Promoción por temporada actualizada" }
```

---

### `DELETE /api/PromocionTemporada/{id}`

Elimina la temporada y **todos sus enlaces** (cascade).

**Respuesta `200`:**
```json
{ "message": "Promoción por temporada eliminada" }
```

---

## GraphQL — `promocionTemporadas`

Roles: **Admin**, **Cajero**, **Mesero**.

### Listado con productos canjeables anidados

```graphql
query {
  promocionTemporadas {
    totalCount
    nodes {
      id
      nombre
      fechaInicio
      fechaFin
      activo
      productosCanjeables {
        idPromocionTemporada
        idProductoCanjeable
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
}
```

### Solo activas y vigentes (ejemplo filtro por fecha)

Ajusta las fechas según zona horaria del servidor/cliente:

```graphql
query {
  promocionTemporadas(
    where: {
      and: [
        { activo: { eq: true } }
        { fechaInicio: { lte: "2026-07-15T23:59:59Z" } }
        { fechaFin: { gte: "2026-07-15T00:00:00Z" } }
      ]
    }
  ) {
    nodes {
      id
      nombre
      fechaInicio
      fechaFin
      productosCanjeables {
        idProductoCanjeable
        productoCanjeable {
          nombreProducto
          puntos
        }
      }
    }
  }
}
```