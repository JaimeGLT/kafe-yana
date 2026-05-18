# KafeYana API — Documentación de Productos con Imagen

> Todos los endpoints de productos usan `multipart/form-data`.
> La autenticación es mediante cookie `ACCESS_TOKEN` (JWT, rol `Admin`).

---

## Producto Comprado

### Crear producto comprado
**POST** `/api/Producto`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Nombre` | `string` | ✅ | Nombre del producto |
| `urlImagen` | `file` | ✅ | Imagen del producto (jpg, jpeg, png, webp) |
| `Descripcion` | `string` | ❌ | Descripción |
| `Categoria_Id` | `int` | ✅ | ID de la categoría |
| `Codigo_barra` | `string` | ❌ | Código de barras (max 50) |
| `Unidad_medida` | `string` | ✅ | Unidad de medida |
| `Marca` | `string` | ❌ | Marca |
| `Ubicacion` | `string` | ❌ | Ubicación en almacén |
| `Costo_compra` | `decimal` | ✅ | Costo de compra (> 0) |
| `Precio` | `decimal` | ✅ | Precio de venta (> 0) |
| `Stock_actual` | `int` | ✅ | Stock inicial (≥ 0) |
| `Stock_minimo` | `int` | ✅ | Stock mínimo (≥ 0) |
| `Disponible` | `bool` | ✅ | Disponible para venta |

**Respuestas:**
```json
// 201 Created
{ "message": "Producto creado" }

// 400 Bad Request
{ "message": "La imagen es requerida." }

// 400 Bad Request (formato inválido)
{ "message": "Formato no permitido. Solo se aceptan: .jpg, .jpeg, .png, .webp." }
```

---

### Editar producto comprado
**PUT** `/api/Producto/{Id}`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Nombre` | `string` | ✅ | Nombre del producto |
| `urlImagen` | `file` | ❌ | Nueva imagen — si se envía reemplaza la anterior |
| `Descripcion` | `string` | ❌ | Descripción |
| `Categoria_Id` | `int` | ✅ | ID de la categoría |
| `Codigo_barra` | `string` | ❌ | Código de barras |
| `Unidad_medida` | `string` | ✅ | Unidad de medida |
| `Marca` | `string` | ❌ | Marca |
| `Ubicacion` | `string` | ❌ | Ubicación |
| `Costo_compra` | `decimal` | ✅ | Costo de compra |
| `Precio` | `decimal` | ✅ | Precio de venta |
| `Stock_actual` | `int` | ✅ | Stock actual |
| `Stock_minimo` | `int` | ✅ | Stock mínimo |
| `Disponible` | `bool` | ✅ | Disponible |

**Respuestas:**
```json
// 200 OK
{ "message": "Producto actualizado" }

// 404 Not Found
{ "message": "Producto no encontrado" }
```

---

### Eliminar producto comprado
**DELETE** `/api/Producto/{Id}`

> Elimina el producto y su imagen de R2 automáticamente.

**Respuestas:**
```json
// 200 OK
{ "message": "Producto eliminado" }

// 404 Not Found
{ "message": "Producto no encontrado" }
```

---

## Producto Elaborado

### Crear producto elaborado
**POST** `/api/Elaborado`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Nombre` | `string` | ✅ | Nombre del producto |
| `urlImagen` | `file` | ✅ | Imagen (jpg, jpeg, png, webp) |
| `Descripcion` | `string` | ❌ | Descripción |
| `Precio` | `decimal` | ✅ | Precio de venta (> 0) |
| `Categoria_Id` | `int` | ✅ | ID de la categoría |
| `Unidad_medida` | `string` | ✅ | Unidad de medida |
| `Ubicacion` | `string` | ❌ | Ubicación |
| `Producible` | `bool` | ✅ | Si se puede producir |

**Respuestas:**
```json
// 201 Created
{
  "Id": 1,
  "Nombre": "Café Latte",
  "Precio": 15.50,
  "message": "Producto creado"
}

// 400 Bad Request
{ "message": "La imagen es requerida." }
```

---

### Editar producto elaborado
**PUT** `/api/Elaborado/{Id}`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Nombre` | `string` | ✅ | Nombre del producto |
| `urlImagen` | `file` | ❌ | Nueva imagen — si se envía reemplaza la anterior |
| `Descripcion` | `string` | ❌ | Descripción |
| `Precio` | `decimal` | ✅ | Precio de venta |
| `Categoria_Id` | `int` | ✅ | ID de la categoría |
| `Unidad_medida` | `string` | ✅ | Unidad de medida |
| `Ubicacion` | `string` | ❌ | Ubicación |

**Respuestas:**
```json
// 200 OK
{
  "Id": 1,
  "Nombre": "Café Latte",
  "Precio": 15.50,
  "message": "Producto actualizado"
}

// 404 Not Found
"Producto elaborado no existe"
```

---

## Combo

### Crear combo
**POST** `/api/Combo`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Nombre` | `string` | ✅ | Nombre del combo |
| `urlImagen` | `file` | ✅ | Imagen (jpg, jpeg, png, webp) |
| `Descripcion` | `string` | ❌ | Descripción |
| `Precio` | `decimal` | ✅ | Precio del combo (> 0) |
| `Productos` | `array` | ✅ | Lista de productos del combo |
| `Productos[i].ProductoId` | `int` | ✅ | ID del producto |
| `Productos[i].Cantidad` | `int` | ✅ | Cantidad |
| `Productos[i].Opcional` | `bool` | ✅ | Si es opcional |

**Ejemplo de body (FormData):**
```
Nombre        = "Combo Mañanero"
Precio        = 25.00
Descripcion   = "Café + snack"
Imagen        = [archivo.jpg]
Productos[0].ProductoId = 3
Productos[0].Cantidad   = 1
Productos[0].Opcional   = false
Productos[1].ProductoId = 7
Productos[1].Cantidad   = 1
Productos[1].Opcional   = true
```

**Respuestas:**
```json
// 201 Created
{ "message": "Combo creado" }

// 400 Bad Request
{ "message": "La imagen es requerida." }

// 400 Bad Request
{ "message": "El producto 5 es un combo y no puede agregarse a otro combo." }
```

---

### Editar combo
**PUT** `/api/Combo/{Id}`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Nombre` | `string` | ✅ | Nombre del combo |
| `urlImagen` | `file` | ❌ | Nueva imagen — si se envía reemplaza la anterior |
| `Descripcion` | `string` | ❌ | Descripción |
| `Precio` | `decimal` | ✅ | Precio |
| `Productos` | `array` | ✅ | Lista completa de productos (reemplaza la anterior) |

**Respuestas:**
```json
// 200 OK
{ "message": "Combo actualizado" }

// 404 Not Found
"Combo no existe"
```

---

## Comportamiento de imágenes

| Operación | Imagen |
|-----------|--------|
| **Crear** | Obligatoria. Se sube a Cloudflare R2 y la URL se guarda en `UrlImagen` |
| **Editar** | Opcional. Si se envía → elimina la anterior en R2 y sube la nueva |
| **Eliminar** | Automático. Se elimina la imagen de R2 junto con el producto |

**Organización en R2:**
```
productos/{slug-categoria}/{6chars}-{slug-nombre}.{ext}

Ejemplos:
  productos/bebidas/a3bx9z-coca-cola.jpg
  productos/cafes/m7kp2r-cafe-latte.webp
  productos/combos/xq91kc-combo-maanero.png
```

**Formatos aceptados:** `jpg`, `jpeg`, `png`, `webp`