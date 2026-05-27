# GET Hitos Reclamados — Documentación (Frontend)

Endpoint para consultar **qué hitos por compras ya reclamó un cliente**. Sirve para ocultar o marcar como "canjeado" en la UI.



### Query params

| Parámetro    | Tipo | Requerido | Descripción    |
|-------------|------|-----------|----------------|
| `Id_Cliente`| int  | Sí        | ID del cliente |

### Roles permitidos

- Admin
- Cajero

---

## Response 200 OK

### Estructura

```json
{
  "Id_Cliente": 5,
  "Reclamados": [
    {
      "IdHitoCompra": 2,
      "NumeroComprasRequerido": 5,
      "NumeroComprasAlReclamar": 7,
      "CodigoReclamo": "RECLAMO-HITO-2-20260524234508",
      "Fecha": "2026-05-24T23:45:08.1234567",
      "Descripcion": "5 compras - Café gratis",
      "Icono": "https://.../icono.png",
      "IdProductoCanjeable": 3,
      "NombreProducto": "Café especial",
      "Categoria": "Bebidas"
    }
  ]
}
```

### Campos raíz

| Campo       | Tipo   | Descripción                                      |
|------------|--------|--------------------------------------------------|
| `Id_Cliente` | int  | ID del cliente consultado                        |
| `Reclamados` | array| Lista de hitos ya reclamados (puede ser `[]`)   |

### Cada item en `Reclamados`

| Campo                     | Tipo     | Descripción                                           |
|---------------------------|----------|-------------------------------------------------------|
| `IdHitoCompra`            | int      | ID del hito reclamado (usar para comparar con catálogo) |
| `NumeroComprasRequerido`  | int      | Compras que exigía ese hito al configurarse           |
| `NumeroComprasAlReclamar` | int      | Compras que tenía el cliente cuando lo reclamó        |
| `CodigoReclamo`           | string   | Código único de auditoría                             |
| `Fecha`                   | datetime | Cuándo se reclamó (UTC)                               |
| `Descripcion`             | string   | Descripción del hito                                  |
| `Icono`                   | string   | Icono del hito                                        |
| `IdProductoCanjeable`     | int      | Producto que recibió                                  |
| `NombreProducto`          | string   | Nombre del producto entregado                         |
| `Categoria`               | string   | Categoría del producto                                |

### Casos especiales

| Caso                         | Respuesta                          |
|-----------------------------|-------------------------------------|
| Cliente sin hitos reclamados | `{ "Id_Cliente": 5, "Reclamados": [] }` |
| Varios hitos reclamados      | Varios objetos en `Reclamados`      |
| Orden                       | Más reciente primero (`Fecha` DESC) |

---

## Errores

### 400 Bad Request

```json
{ "message": "Id_Cliente es obligatorio." }
```

Cuando `Id_Cliente` no se envía o es `<= 0`.

### Cliente inexistente

```json
{ "message": "Cliente no encontrado." }
```

### 401 / 403

Token inválido o usuario sin rol Admin/Cajero.

---

## Cómo debe manejarlo el front

### Flujo recomendado

1. Usuario selecciona **cliente**.
2. Cargar en paralelo (o secuencial):
   - GraphQL `clientes` → `numeroCompras`
   - GraphQL `hitosCompra` → catálogo de hitos activos
   - **GET `hitos-reclamados?Id_Cliente=X`** → hitos ya canjeados
3. Clasificar cada hito en UI:

| Estado        | Condición                                                                 |
|---------------|---------------------------------------------------------------------------|
| **Reclamado** | `IdHitoCompra` está en la lista de `Reclamados`                          |
| **Disponible**| NO reclamado + `numeroCompras >= hito.numeroCompras` + hito activo       |
| **Bloqueado** | NO reclamado + `numeroCompras < hito.numeroCompras`                      |

4. Tras un **POST `reclamar-hito` exitoso**, volver a llamar este GET para refrescar.

---

### Ejemplo de lógica (TypeScript)

```ts
type HitoReclamado = {
  IdHitoCompra: number;
  NumeroComprasRequerido: number;
  NumeroComprasAlReclamar: number;
  CodigoReclamo: string;
  Fecha: string;
  Descripcion: string;
  Icono: string;
  IdProductoCanjeable: number;
  NombreProducto: string;
  Categoria: string;
};

type HitosReclamadosResponse = {
  Id_Cliente: number;
  Reclamados: HitoReclamado[];
};

async function getHitosReclamados(idCliente: number): Promise<HitosReclamadosResponse> {
  const res = await fetch(
    `${API_URL}/api/ProductoCanjeable/hitos-reclamados?Id_Cliente=${idCliente}`,
    { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Error al cargar hitos reclamados');
  }

  return res.json();
}

// Set de IDs ya reclamados (lo principal que necesita el front)
function idsHitosReclamados(data: HitosReclamadosResponse): Set<number> {
  return new Set(data.Reclamados.map(r => r.IdHitoCompra));
}

// Clasificar un hito del catálogo
function estadoHito(
  hito: { id: number; numeroCompras: number; activo: boolean },
  numeroComprasCliente: number,
  reclamados: Set<number>
): 'reclamado' | 'disponible' | 'bloqueado' {
  if (reclamados.has(hito.id)) return 'reclamado';
  if (!hito.activo) return 'bloqueado';
  if (numeroComprasCliente >= hito.numeroCompras) return 'disponible';
  return 'bloqueado';
}
```

---

### Qué usar de la respuesta en UI

| Necesidad UI              | Campo a usar                          |
|---------------------------|---------------------------------------|
| Saber si ya lo canjeó     | `IdHitoCompra` (comparar con catálogo) |
| Mostrar historial         | `Fecha`, `NombreProducto`, `Descripcion` |
| Badge "Canjeado"          | Presencia en `Reclamados`             |
| Detalle del reclamo       | `CodigoReclamo`, `NumeroComprasAlReclamar` |
| Ocultar botón reclamar    | `reclamados.has(hito.id)`             |

---

### Cuándo volver a llamar el GET

| Evento                         | Acción                          |
|--------------------------------|---------------------------------|
| Cambia el cliente seleccionado | Llamar GET de nuevo             |
| POST `reclamar-hito` exitoso   | Llamar GET de nuevo             |
| Después de cobrar una venta    | Opcional: refrescar si la pantalla de hitos está abierta |

---

## Notas

- JSON en **PascalCase** (`Id_Cliente`, `Reclamados`, `IdHitoCompra`).
- Este endpoint **solo devuelve lo ya reclamado**; no indica qué hitos puede reclamar aún.
- Para hitos disponibles: combinar GraphQL `hitosCompra` + `cliente.numeroCompras` − IDs de este GET.
- El canje sigue siendo: `POST /api/ProductoCanjeable/reclamar-hito`.