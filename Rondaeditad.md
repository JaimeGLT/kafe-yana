# Documentación API - Pedidos, Rondas, Inventario y Ventas

## 1. Conceptos clave

| Concepto                 | Descripción                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pedido                   | Orden abierta de una mesa o para llevar. Tiene Total y lista de Rondas.                                                            |
| Ronda                    | Grupo de productos enviados juntos (ej. "Ronda 1", "Ronda 2"). Tiene SubTotal.                                                     |
| Detalle                  | Una línea dentro de la ronda: producto + cantidad + precio + opciones.                                                             |
| Compromiso de inventario | Registro interno del backend (no visible al frontend) que guarda qué stock se descontó por cada línea. Permite revertir al editar. |
| Precio de venta          | No se envía manualmente. Lo calcula el backend según configuración del producto (+ ajustes de opciones).                           |

---

## 2. Tipos de producto

| Tipo                 | Comportamiento de stock                        |
| -------------------- | ---------------------------------------------- |
| Comprado             | Descuenta stock del producto                   |
| Elaborado producible | Descuenta stock del elaborado                  |
| Elaborado con receta | Descuenta insumos (merma, porciones, opciones) |
| Combo / Promoción    | Descuenta cada ítem del combo según su tipo    |

---

# 3. Reglas de negocio

## Totales

```text
Precio línea  = precio del producto (+ ajustes de opciones si aplica)

SubTotal ronda = Σ (precio × cantidad) de sus detalles

Total pedido   = Σ (subTotal) de todas sus rondas
```

### Importante

* El backend recalcula todos los valores.
* El frontend nunca debe calcular totales manualmente.
* Siempre usar los valores retornados por la API.

---

## Liberar mesa / pedido para llevar

Solo se puede liberar si:

```text
Total == 0
```

Si el total es mayor a cero:

* Debe cobrarse el pedido.
* O eliminar todas las rondas y detalles.

### Errores

#### Mesa

```http
409 Conflict
```

```json
{
  "message": "No puedes liberar un pedido sin antes cobrar"
}
```

#### Para llevar

```http
400 Bad Request
```

```json
{
  "message": "No puedes liberar un pedido sin antes cobrar"
}
```

---

## Caja abierta

Los endpoints de:

* Agregar ronda
* Editar ronda
* Editar detalle
* Cobrar

requieren una caja abierta.

### Error

```http
409 Conflict
```

```json
{
  "message": "No hay una caja abierta"
}
```

---

## Precio

No existe un campo para enviar precio manual.

Cuando cambian:

* Producto
* Cantidad
* Opciones

el backend recalcula automáticamente el precio.

---

# 4. Modelos de datos (DTOs)

## DtoRondadetalle

### Agregar línea o editar detalle individual

```json
{
  "id_Producto": 5,
  "cantidad": 2,
  "ids_Opcion": [1, 3],
  "nota": "Sin azúcar"
}
```

| Campo       | Tipo   | Requerido | Validación                        |
| ----------- | ------ | --------- | --------------------------------- |
| id_Producto | int    | Sí        | Debe existir                      |
| cantidad    | int    | Sí        | Mínimo 1                          |
| ids_Opcion  | int[]  | No        | Solo para elaborados con opciones |
| nota        | string | No        | Máx. 500 caracteres               |

---

## DtoRondadetalleEditar

Igual que `DtoRondadetalle` pero agrega:

| Campo      | Tipo | Requerido | Descripción                                                          |
| ---------- | ---- | --------- | -------------------------------------------------------------------- |
| id_Detalle | int? | No        | Si viene → actualiza línea existente. Si es null → crea línea nueva. |

---

## DtoRondaAgregar

```json
{
  "id_Pedido": 12,
  "detalles": [
    {
      "id_Producto": 5,
      "cantidad": 2,
      "ids_Opcion": [],
      "nota": ""
    }
  ]
}
```

| Campo     | Tipo              | Requerido    |
| --------- | ----------------- | ------------ |
| id_Pedido | int               | Sí           |
| detalles  | DtoRondadetalle[] | Sí, mínimo 1 |

---

## DtoRondaEditar

```json
{
  "id_Pedido": 12,
  "detalles": [
    {
      "id_Detalle": 45,
      "id_Producto": 5,
      "cantidad": 3,
      "ids_Opcion": [1],
      "nota": "Actualizado"
    },
    {
      "id_Detalle": null,
      "id_Producto": 8,
      "cantidad": 1,
      "ids_Opcion": [],
      "nota": "Línea nueva"
    }
  ]
}
```

### Regla de reemplazo total

* Si tiene `id_Detalle` → se actualiza.
* Si no tiene `id_Detalle` → se crea.
* Si una línea existente no viene en el array → se elimina y devuelve stock.
* Debe existir al menos un detalle.

---

## DtoVentaPedido

```json
{
  "id_Pedido": 12,
  "id_Cliente": 3,
  "aplicarDescuentos": false,
  "pagos": {
    "efectivo": 50.00,
    "tarjeta": 0.00,
    "qr": 0.00
  }
}
```

### Validaciones

* Al menos un pago mayor que cero.
* La suma debe coincidir exactamente con el total del pedido.
* Si hay descuentos, debe coincidir con el total descontado.

---

# 5. Formato de errores

## Excepciones de negocio

```json
{
  "message": "Texto descriptivo del error"
}
```

---

## Errores de validación

```http
400 Bad Request
```

```json
{
  "Id_Producto": [
    "El campo Id_Producto es obligatorio."
  ],
  "Cantidad": [
    "La cantidad debe ser mayor que cero."
  ]
}
```

---

## Códigos HTTP

| Código | Descripción                                       |
| ------ | ------------------------------------------------- |
| 200    | Operación exitosa                                 |
| 400    | Validación, stock insuficiente o regla de negocio |
| 401    | Usuario no identificado                           |
| 404    | Recurso no encontrado                             |
| 409    | Conflicto de negocio                              |
| 500    | Error interno                                     |

---

## Mensajes de stock insuficiente

```text
Stock insuficiente para {nombre producto}. Disponible: X, Solicitado: Y
```

```text
Stock insuficiente para insumo {nombre insumo}. Disponible: X, Solicitado: Y
```

---

# 6. Endpoints Mesa

Base:

```text
/api/Mesa
```

## Ocupar mesa

```http
POST /api/Mesa/Ocupar/{idMesa}
```

### Respuesta

```http
200 OK
```

Devuelve:

* id_Pedido
* disponible = false
* datos del pedido

---

## Agregar ronda

```http
POST /api/Mesa/ronda/{idMesa}
```

SignalR:

* NuevaRonda
* StockActualizado

---

## Editar ronda

```http
PUT /api/Mesa/{idMesa}/ronda/{idRonda}
```

SignalR:

* StockActualizado

---

## Eliminar ronda

```http
DELETE /api/Mesa/{idMesa}/ronda/{idRonda}?idPedido=12
```

SignalR:

* StockActualizado

---

## Editar detalle

```http
PUT /api/Mesa/detalle/{idDetalle}?idPedido=12
```

SignalR:

* StockActualizado

---

## Eliminar detalle

```http
DELETE /api/Mesa/detalle/{idDetalle}?idPedido=12
```

SignalR:

* StockActualizado

---

## Cobrar mesa

```http
POST /api/Mesa/cobrar/{idMesa}
```

SignalR:

* VentaProcesada
* MesaActualizada

---

## Liberar mesa

```http
PUT /api/Mesa/Liberar/{idMesa}
```

Condición:

```text
Total == 0
```

---

# 7. Endpoints Para Llevar

Base:

```text
/api/Venta
```

| Acción           | Método | Ruta                                       |
| ---------------- | ------ | ------------------------------------------ |
| Crear pedido     | POST   | /api/Venta/pedido                          |
| Agregar ronda    | POST   | /api/Venta/ronda                           |
| Editar ronda     | PUT    | /api/Venta/ronda/{idRonda}                 |
| Eliminar ronda   | DELETE | /api/Venta/ronda/{idRonda}?idPedido=12     |
| Editar detalle   | PUT    | /api/Venta/detalle/{idDetalle}?idPedido=12 |
| Eliminar detalle | DELETE | /api/Venta/detalle/{idDetalle}?idPedido=12 |
| Cobrar           | POST   | /api/Venta/cobrar                          |
| Liberar          | PUT    | /api/Venta/liberar                         |

---

## Diferencias con Mesa

* No existe `idMesa` en las rutas.
* Se utiliza el pedido para llevar activo.
* Misma lógica de stock, rondas y cobro.

---

# 8. SignalR

## Grupos

```text
salon
caja
```

---

## Eventos

| Evento                      | Cuándo                | Acción Frontend      |
| --------------------------- | --------------------- | -------------------- |
| NuevaRonda                  | Agregar ronda         | Actualizar cocina    |
| StockActualizado            | Cambios de stock      | Actualizar menú      |
| MesaActualizada             | Ocupar/liberar/cobrar | Refrescar mesas      |
| VentaProcesada              | Cobro exitoso         | Cerrar pedido        |
| PedidoParaLlevarActualizado | Crear/cobrar/liberar  | Actualizar indicador |

---

## Payload StockActualizado

```json
{
  "comprados": [
    {
      "idProducto": 5,
      "stockActual": 12
    }
  ],
  "elaborados": [
    {
      "idProducto": 8,
      "stockActual": 0,
      "producible": 15
    }
  ],
  "combos": [
    {
      "idProducto": 20,
      "producible": 3
    }
  ]
}
```

---

# 9. Flujos recomendados

## Tomar pedido en mesa

```text
1. POST /api/Mesa/Ocupar/{idMesa}

2. POST /api/Mesa/ronda/{idMesa}

3. PUT /api/Mesa/detalle/{idDetalle}

4. PUT /api/Mesa/{idMesa}/ronda/{idRonda}

5. DELETE /api/Mesa/ronda/{idRonda}

6. POST /api/Mesa/cobrar/{idMesa}
```

---

## Corregir cantidad

### Opción A

```http
PUT /api/Mesa/detalle/{idDetalle}?idPedido={idPedido}
```

### Opción B

```http
PUT /api/Mesa/{idMesa}/ronda/{idRonda}
```

---

## Quitar producto

```http
DELETE /api/Mesa/detalle/{idDetalle}?idPedido={idPedido}
```

Si el total queda en cero:

```http
PUT /api/Mesa/Liberar/{idMesa}
```

---

## Qué NO hacer

| ❌ No hacer                  | ✅ Hacer                         |
| --------------------------- | ------------------------------- |
| Enviar precio manual        | Dejar calcular al backend       |
| Calcular totales localmente | Usar respuesta API              |
| Descontar stock al cobrar   | Ya se descontó en la ronda      |
| Liberar con total > 0       | Cobrar o eliminar primero       |
| Ignorar SignalR             | Actualizar stock en tiempo real |

---

# 10. Checklist de implementación

* [ ] Mostrar rondas y detalles.
* [ ] Agregar ronda.
* [ ] Editar detalle.
* [ ] Editar ronda completa.
* [ ] Eliminar detalle.
* [ ] Eliminar ronda.
* [ ] Mostrar total desde API.
* [ ] Implementar cobro.
* [ ] Suscribirse a SignalR.
* [ ] Bloquear liberar con total > 0.
* [ ] Manejar globalmente el error "No hay una caja abierta".

---

# Referencia rápida

## Mesa

| Método | Ruta                                         |
| ------ | -------------------------------------------- |
| POST   | /api/Mesa/Ocupar/{idMesa}                    |
| POST   | /api/Mesa/ronda/{idMesa}                     |
| PUT    | /api/Mesa/{idMesa}/ronda/{idRonda}           |
| DELETE | /api/Mesa/{idMesa}/ronda/{idRonda}?idPedido= |
| PUT    | /api/Mesa/detalle/{idDetalle}?idPedido=      |
| DELETE | /api/Mesa/detalle/{idDetalle}?idPedido=      |
| POST   | /api/Mesa/cobrar/{idMesa}                    |
| PUT    | /api/Mesa/Liberar/{idMesa}                   |

## Para llevar

| Método | Ruta                                     |
| ------ | ---------------------------------------- |
| POST   | /api/Venta/pedido                        |
| POST   | /api/Venta/ronda                         |
| PUT    | /api/Venta/ronda/{idRonda}               |
| DELETE | /api/Venta/ronda/{idRonda}?idPedido=     |
| PUT    | /api/Venta/detalle/{idDetalle}?idPedido= |
| DELETE | /api/Venta/detalle/{idDetalle}?idPedido= |
| POST   | /api/Venta/cobrar                        |
| PUT    | /api/Venta/liberar                       |
