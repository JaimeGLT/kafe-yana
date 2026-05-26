# Hitos por Compras — Documentación API (Frontend)

Documentación para integrar el **canje/reclamo de hitos por número de compras** en caja.

---

## Resumen del flujo

1. El cajero selecciona un **cliente**.
2. El front consulta:
   - **`NumeroCompras`** del cliente (cuántas compras lleva).
   - **Catálogo de hitos** configurados (`HitosCompra` vía GraphQL).
3. El front determina en UI qué hitos están **desbloqueados** (`NumeroCompras >= hito.NumeroCompras`).
4. Al confirmar, llama al **POST** `reclamar-hito` con `IdCliente` + `IdHitoCompra`.
5. Tras éxito, actualizar UI (ese hito ya no debe poder reclamarse de nuevo).

### Reglas de negocio

- Cada hito se configura con un **`NumeroCompras`** (ej. 5, 10, 20).
- El contador **`Cliente.NumeroCompras`** sube **+1** en cada venta cobrada.
- Un hito solo se puede **reclamar una vez por cliente**.
- El reclamo entrega **un producto canjeable** (el configurado en el hito).
- **No descuenta puntos** del cliente.
- Roles permitidos en el POST: **Admin** y **Cajero**.

> **Importante:** No existe GET REST de “hitos disponibles”. La UI se arma con GraphQL + lógica local. Si el cliente ya reclamó un hito, el POST responderá error.

---

## Configuración general

### Base URL REST

```
/api/ProductoCanjeable
```

Ejemplo local:

```
https://localhost:{puerto}/api/ProductoCanjeable

```

### Formato JSON

La API usa **PascalCase** en JSON (no camelCase).

Ejemplo: `IdCliente`, `NumeroCompras`, `NombreProducto`.

---

## Datos que necesita el front (GraphQL)

### 1) Contador de compras del cliente

Query GraphQL: **`Clientes`** (con filtro por `id`).

Campos útiles:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | int | ID del cliente |
| `Nombre` | string | Nombre |
| `NumeroCompras` | int | Total de compras cobradas del cliente |
| `Puntos` | int | Puntos actuales |

Ejemplo de query:

```graphql
query ClienteParaHitos($id: Int!) {
  clientes(where: { id: { eq: $id } }) {
    nodes {
      id
      nombre
      numeroCompras
      puntos
    }
  }
}
```

> GraphQL expone campos en camelCase (`numeroCompras`), aunque REST use PascalCase.

---

### 2) Catálogo de hitos configurados

Query GraphQL: **`HitosCompra`**

Roles: Admin, Cajero, Mesero.

Campos del hito:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Id` | int | ID del hito (usar en POST) |
| `NumeroCompras` | int | Compras requeridas para desbloquear |
| `Id_ProductoCanjeable` | int | ID producto canjeable recompensa |
| `Descripcion` | string | Texto descriptivo para UI |
| `Icono` | string | URL o identificador de icono |
| `Activo` | bool | Si está habilitado |
| `ProductoCanjeable` | object | Detalle del producto (nombre, categoría, puntos, etc.) |

Ejemplo:

```graphql
query HitosConfig {
  hitosCompra(where: { activo: { eq: true } }) {
    nodes {
      id
      numeroCompras
      descripcion
      icono
      activo
      productoCanjeable {
        id
        nombreProducto
        categoria
        puntos
        activo
      }
    }
  }
}
```

---

## Lógica recomendada en frontend (sin GET REST)

Para cada hito activo:

| Estado UI | Condición |
|-----------|-----------|
| **Bloqueado** | `cliente.numeroCompras < hito.numeroCompras` |
| **Desbloqueado (puede reclamar)** | `cliente.numeroCompras >= hito.numeroCompras` y aún no reclamado |
| **Ya reclamado** | Tras POST exitoso, o si POST devuelve `"El cliente ya reclamó este hito por compras."` |

Sugerencia de presentación:

- Mostrar barra/progreso: `numeroCompras / hito.numeroCompras`.
- Botón **Reclamar** solo en hitos desbloqueados.
- Tras reclamo exitoso, marcar hito como reclamado en estado local.

---

## POST — Reclamar hito por compras

Único endpoint REST del flujo de canje de hitos.

### Request

```http
POST /api/ProductoCanjeable/reclamar-hito
Authorization: Bearer {token}
Content-Type: application/json
```

### Body

```json
{
  "IdCliente": 5,
  "IdHitoCompra": 2
}
```

### Campos del body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `IdCliente` | int | Sí | Cliente que reclama |
| `IdHitoCompra` | int | Sí | ID del hito a canjear |

### Qué hace el backend

1. Valida que el cliente exista.
2. Valida que el hito exista y esté **activo**.
3. Valida que `Cliente.NumeroCompras >= Hito.NumeroCompras`.
4. Valida que el cliente **no haya reclamado** ese hito antes.
5. Valida que el producto canjeable del hito esté **activo**.
6. Descuenta inventario (movimiento tipo **Canje**).
7. Guarda historial interno (`HistorialHitoCompra`) para bloquear doble reclamo.

### Response 200 OK

```json
{
  "Mensaje": "Hito de 5 compras reclamado: \"Café especial\".",
  "IdHitoCompra": 2,
  "NumeroComprasRequerido": 5,
  "NumeroComprasCliente": 7,
  "CodigoReclamo": "RECLAMO-HITO-2-20260524234508",
  "IdProductoCanjeable": 3,
  "NombreProducto": "Café especial",
  "Categoria": "Bebidas"
}
```

### Campos de respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Mensaje` | string | Mensaje listo para mostrar al cajero |
| `IdHitoCompra` | int | Hito reclamado |
| `NumeroComprasRequerido` | int | Compras que exigía el hito |
| `NumeroComprasCliente` | int | Compras del cliente al momento del reclamo |
| `CodigoReclamo` | string | Código único de auditoría |
| `IdProductoCanjeable` | int | Producto entregado |
| `NombreProducto` | string | Nombre del producto |
| `Categoria` | string | Categoría del producto |

---

## Errores posibles (POST)

### 400 Bad Request — validación

```json
{
  "IdCliente": ["The IdCliente field is required."],
  "IdHitoCompra": ["The IdHitoCompra field is required."]
}
```

### Errores de negocio (`message`)

| Mensaje | Significado |
|---------|-------------|
| `"Cliente no encontrado."` | ID cliente inválido |
| `"El cliente ya reclamó este hito por compras."` | Hito ya canjeado antes |
| `"Hito por compra no encontrado o inactivo."` | Hito inexistente o desactivado |
| `"El cliente aún no alcanza este hito. Requiere X compras y tiene Y."` | Aún no cumple compras mínimas |
| `"El hito no tiene producto canjeable configurado."` | Config incompleta |
| `"El producto canjeable del hito está inactivo."` | Producto recompensa inactivo |

### 401 Unauthorized

Token ausente o inválido.

### 403 Forbidden

Usuario sin rol Admin/Cajero.

---

## Ejemplo con fetch

```js
const response = await fetch(
  `${API_URL}/api/ProductoCanjeable/reclamar-hito`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      IdCliente: idCliente,
      IdHitoCompra: idHitoCompra
    })
  }
);

if (!response.ok) {
  const error = await response.json();
  // error.message
  throw new Error(error.message);
}

const data = await response.json();
// Mostrar data.Mensaje y data.NombreProducto
```

---

## Flujo recomendado en frontend (pseudo)

```ts
// 1) Cargar cliente (GraphQL)
const cliente = await gqlClientes(idCliente);
const compras = cliente.numeroCompras;

// 2) Cargar hitos activos (GraphQL)
const hitos = await gqlHitosCompraActivos();

// 3) Render por hito
for (const hito of hitos) {
  const desbloqueado = compras >= hito.numeroCompras;
  const reclamado = estadoLocal.reclamados.includes(hito.id);

  // Mostrar progreso: compras / hito.numeroCompras
  // Botón reclamar solo si desbloqueado && !reclamado
}

// 4) Reclamar
await api.post('/api/ProductoCanjeable/reclamar-hito', {
  IdCliente: idCliente,
  IdHitoCompra: hito.id
});

// 5) Marcar reclamado en estado local y refrescar UI
estadoLocal.reclamados.push(hito.id);
```

---

## Cuándo sube `NumeroCompras`

- Se incrementa **automáticamente en backend** al **cobrar una venta** (mesa o para llevar).
- El front **no** debe sumar compras manualmente.
- Después de cobrar, refrescar datos del cliente (GraphQL) para ver el contador actualizado.

---

## Checklist de implementación UI

- [ ] Pantalla/modal de hitos en caja.
- [ ] Cargar `Cliente.numeroCompras` vía GraphQL al seleccionar cliente.
- [ ] Cargar `HitosCompra` activos vía GraphQL.
- [ ] Calcular bloqueado / desbloqueado en front.
- [ ] Mostrar progreso (`numeroCompras / hito.numeroCompras`).
- [ ] Botón **Reclamar** por hito desbloqueado.
- [ ] Confirmación antes del POST.
- [ ] Mostrar `Mensaje` y producto entregado al éxito.
- [ ] Guardar hito como reclamado en estado local tras éxito.
- [ ] Manejar error de “ya reclamó este hito”.
- [ ] Refrescar `numeroCompras` del cliente después de cobrar venta.

---

## Diferencia con otros flujos de canje

| Flujo | Endpoint | Condición | Repetible |
|------|----------|-----------|-----------|
| **Hito por compras** | `POST /reclamar-hito` | `NumeroCompras` del cliente | Una vez por hito |
| Promoción temporal | `POST /reclamar-promocion-temporada` | Vigencia de temporada | Una vez por promo |
| Promoción gratis permanente | `POST /reclamar-promocion-gratis` | Condición N compras / monto | Según promo |
| Canje por puntos | `POST /canje` | Puntos suficientes | Cada vez que tenga puntos |

No mezclar estos flujos en la misma acción de UI.

---

## Configuración admin (referencia)

Solo Admin. No es parte del flujo de caja, pero el front admin puede usarlo:

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/HitoCompra` | Crear hito |
| PUT | `/api/HitoCompra/{id}` | Actualizar |
| PATCH | `/api/HitoCompra/{id}/toggle` | Activar/desactivar |
| DELETE | `/api/HitoCompra/{id}` | Eliminar |

Body crear/actualizar:

```json
{
  "NumeroCompras": 5,
  "Id_ProductoCanjeable": 3,
  "Descripcion": "5 compras - Café gratis",
  "Icono": "url-o-icono",
  "Activo": true
}
```

---

## Migración requerida en backend

Debe estar aplicada:

`AddClienteNumeroComprasAndHistorialHitoCompra`

Si no está aplicada, el POST puede fallar por columnas/tablas inexistentes.