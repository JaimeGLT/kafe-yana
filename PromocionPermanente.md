# Documentación — Promociones Permanentes

---

## REST Endpoints — `PromocionPermanenteController`

Base URL: `/api/PromocionPermanente`  
Rol requerido: **Admin**

---

### `POST /api/PromocionPermanente`
Crear una nueva promoción permanente.

**Body:**
```json
{
  "Nombre": "Cliente frecuente",
  "Descripcion": "Por cada 5 compras gana puntos extra",
  "TipoCondicion": "NCompras",
  "ValorCondicion": 5,
  "TipoRecompensa": "PuntosExtra",
  "ValorRecompensa": 20,
  "Activo": true,
  "Id_ProductoCanjeable": null
}
```

> Valores válidos para `TipoCondicion`:
> - `"NCompras"` → se activa al llegar a N compras
> - `"MontoMinimo"` → se activa cuando el monto supera el valor
> - `"Requeridos"` → requiere N productos en la compra
>
> Valores válidos para `TipoRecompensa`:
> - `"PuntosExtra"` → `ValorRecompensa` = cantidad de puntos extra
> - `"Descuento"` → `ValorRecompensa` = porcentaje de descuento (ej: 10 = 10%)
> - `"ProductoGratis"` → `ValorRecompensa` = 0, `Id_ProductoCanjeable` es **obligatorio**

**Ejemplo con ProductoGratis:**
```json
{
  "Nombre": "Café gratis en cumpleaños",
  "Descripcion": "Al gastar Bs. 100 el cliente recibe un café gratis",
  "TipoCondicion": "MontoMinimo",
  "ValorCondicion": 100,
  "TipoRecompensa": "ProductoGratis",
  "ValorRecompensa": 0,
  "Activo": true,
  "Id_ProductoCanjeable": 3
}
```

**Respuesta `201`:**
```json
{
  "message": "Promoción permanente creada",
  "id": 1
}
```

**Errores posibles:**
| Código | Motivo |
|--------|--------|
| `400` | `TipoCondicion` no es un valor válido |
| `400` | `TipoRecompensa` no es un valor válido |
| `400` | `ValorCondicion` menor o igual a 0 |
| `400` | `ValorRecompensa` menor o igual a 0 (cuando no es ProductoGratis) |
| `400` | `Id_ProductoCanjeable` ausente y recompensa es ProductoGratis |
| `400` | `Id_ProductoCanjeable` enviado pero recompensa no es ProductoGratis |
| `400` | `Id_ProductoCanjeable` no existe |
| `409` | Ya existe una promoción con ese nombre |

---

### `PUT /api/PromocionPermanente/{id}`
Actualizar una promoción existente.

**Body:** mismo formato que el POST.

**Respuesta `200`:**
```json
{
  "message": "Promoción permanente actualizada"
}
```

**Errores posibles:**
| Código | Motivo |
|--------|--------|
| `404` | Promoción no encontrada |
| Mismos del POST | Validaciones de negocio |

---

### `DELETE /api/PromocionPermanente/{id}`
Eliminar una promoción permanente.

**Respuesta `200`:**
```json
{
  "message": "Promoción permanente eliminada"
}
```

**Errores posibles:**
| Código | Motivo |
|--------|--------|
| `404` | Promoción no encontrada |

---

## GraphQL — Query `promocionPermanentes`

### Todas las promociones
```graphql
query {
  promocionPermanentes {
    totalCount
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

---

### Solo las activas
```graphql
query {
  promocionPermanentes(where: { activo: { eq: true } }) {
    totalCount
    nodes {
      id
      nombre
      descripcion
      tipoCondicion
      valorCondicion
      tipoRecompensa
      valorRecompensa
      idProductoCanjeable
    }
  }
}
```

---

### Filtrar por tipo de condición
```graphql
query {
  promocionPermanentes(
    where: {
      and: [
        { activo: { eq: true } }
        { tipoCondicion: { eq: "NCompras" } }
      ]
    }
  ) {
    nodes {
      id
      nombre
      tipoCondicion
      valorCondicion
      tipoRecompensa
      valorRecompensa
    }
  }
}
```

---

### Filtrar por tipo de recompensa
```graphql
query {
  promocionPermanentes(
    where: {
      and: [
        { activo: { eq: true } }
        { tipoRecompensa: { eq: "ProductoGratis" } }
      ]
    }
  ) {
    nodes {
      id
      nombre
      tipoCondicion
      valorCondicion
      idProductoCanjeable
    }
  }
}
```