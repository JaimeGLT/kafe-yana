# Documentación — Productos Canjeables

---

## REST Endpoints — `ProductoCanjeableController`

Base URL: `/api/ProductoCanjeable`  
Rol requerido: **Admin**

---

### `POST /api/ProductoCanjeable`
Crear un nuevo producto canjeable.

**Body:**
```json
{
  "Id_Producto": 3,
  "Puntos": 50,
  "Disponible": "Mesas",
  "Activo": true
}
```

> Valores válidos para `Disponible`:
> - `"Mesas"` → solo canjeable en mesas
> - `"ParaLlevar"` → solo canjeable para llevar
> - `"MesasYParaLlevar"` → canjeable en ambos

**Respuesta `201`:**
```json
{
  "message": "Producto canjeable creado",
  "id": 1
}
```

**Errores posibles:**
| Código | Motivo |
|--------|--------|
| `400` | `Activo` es `false` al crear |
| `400` | `Disponible` no es uno de los 3 valores válidos |
| `400` | `Puntos` menor o igual a 0 |
| `409` | El producto ya tiene un registro canjeable |
| `409` | Producto no encontrado |

---

### `PUT /api/ProductoCanjeable/{id}`
Actualizar un producto canjeable existente.

**Body:**
```json
{
  "Id_Producto": 3,
  "Puntos": 80,
  "Disponible": "MesasYParaLlevar",
  "Activo": false
}
```

**Respuesta `200`:**
```json
{
  "message": "Producto canjeable actualizado"
}
```

> Si se cambia el `Id_Producto`, el sistema actualiza automáticamente `NombreProducto` y `Categoria`.

**Errores posibles:**
| Código | Motivo |
|--------|--------|
| `404` | Producto canjeable no encontrado |
| `409` | Nuevo producto no encontrado |
| `409` | Nuevo producto ya tiene otro registro canjeable |

---

### `DELETE /api/ProductoCanjeable/{id}`
Eliminar un producto canjeable.

**Respuesta `200`:**
```json
{
  "message": "Producto canjeable eliminado"
}
```

**Errores posibles:**
| Código | Motivo |
|--------|--------|
| `404` | Producto canjeable no encontrado |

---

## GraphQL — Query `productosCanjeables`

### Todos los productos canjeables
```graphql
query {
  productosCanjeables {
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

### Solo los activos
```graphql
query {
  productosCanjeables(where: { activo: { eq: true } }) {
    totalCount
    nodes {
      id
      nombreProducto
      categoria
      puntos
      disponible
    }
  }
}
```

---

### Filtrar por disponibilidad — solo para mesas
```graphql
query {
  productosCanjeables(
    where: {
      and: [
        { activo: { eq: true } }
        { disponible: { in: ["Mesas", "MesasYParaLlevar"] } }
      ]
    }
    order: { puntos: ASC }
  ) {
    totalCount
    nodes {
      id
      nombreProducto
      categoria
      puntos
      disponible
    }
  }
}
```

---

### Filtrar por disponibilidad — solo para llevar
```graphql
query {
  productosCanjeables(
    where: {
      and: [
        { activo: { eq: true } }
        { disponible: { in: ["ParaLlevar", "MesasYParaLlevar"] } }
      ]
    }
    order: { puntos: ASC }
  ) {
    totalCount
    nodes {
      id
      nombreProducto
      categoria
      puntos
      disponible
    }
  }
}
```

---

### Filtrar por categoría
```graphql
query {
  productosCanjeables(
    where: {
      and: [
        { activo: { eq: true } }
        { categoria: { eq: "Bebidas" } }
      ]
    }
  ) {
    totalCount
    nodes {
      id
      nombreProducto
      categoria
      puntos
      disponible
    }
  }
}
```

---

### Con paginación
```graphql
query {
  productosCanjeables(
    first: 10
    where: { activo: { eq: true } }
    order: { puntos: ASC }
  ) {
    totalCount
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      nombreProducto
      categoria
      puntos
      disponible
    }
  }
}
```