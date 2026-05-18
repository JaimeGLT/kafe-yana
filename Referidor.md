# Documentación — Programa de referidos

---

## Resumen del modelo

| Concepto | Descripción |
|----------|-------------|
| **Configuración** | Una sola fila en BD (`ReferidosConfig`): puntos para referidor, puntos para referido y si el programa está **activo**. Se inicializa por seed (`0`, `0`, `inactivo`). No hay alta ni borrado por API; solo lectura y actualización. |
| **Alta referido** | Endpoint aparte del `POST /api/Cliente`: mismos datos de cliente **más** `IdReferidor` (cliente existente). Si el programa está activo, se suman puntos a ambos según la configuración y se registra una fila en historial. |
| **Historial** | Solo inserción al crear un referido. No existe API para editar ni eliminar registros de historial. Consulta en GraphQL. |

---

## REST — `ReferidosController`

Base URL: `/api/Referidos`

---

### `GET /api/Referidos/config`

Obtiene la configuración actual del programa de referidos.

- **Rol:** Admin

**Respuesta `200`:**
```json
{
  "Id": 1,
  "PuntosReferidor": 50,
  "PuntosReferido": 25,
  "Activo": true
}
```

**Respuesta `404`:** si la fila no existe (no debería ocurrir tras el seed).

---

### `PUT /api/Referidos/config`

Actualiza **solo** puntos del referidor, puntos del referido y estado activo. No crea ni elimina la configuración.

- **Rol:** Admin

**Body:**
```json
{
  "PuntosReferidor": 50,
  "PuntosReferido": 25,
  "Activo": true
}
```

- `PuntosReferidor` y `PuntosReferido`: enteros ≥ `0`.

**Respuesta `200`:**
```json
{
  "message": "Configuración de referidos actualizada"
}
```

---

### `POST /api/Referidos/cliente`

Crea un **nuevo cliente** (referido) con los **mismos campos** que `POST /api/Cliente`, más el referidor.

- **Roles:** Admin, Cajero

**Body:** igual que crear cliente (`DtoClienteCU`) **más**:

```json
{
  "Dni": null,
  "Nombre": "María García",
  "Celular": "70000000",
  "Correo": "maria@ejemplo.com",
  "Fecha_nacimiento": "1995-05-10",
  "Direccion": "…",
  "Estado": true,
  "IdReferidor": 12
}
```

**Reglas de negocio:**

1. Debe existir la configuración en BD.
2. **`Activo`** en configuración debe ser **`true`**; si no, respuesta **409** con mensaje tipo *programa de referidos inactivo*.
3. **`IdReferidor`** debe corresponder a un cliente **existente** y con **`Estado == true`**; si no, **409**.
4. Se crea el cliente referido (misma lógica de correo normalizado que `Cliente`).
5. Se suman **`PuntosReferidor`** al referidor y **`PuntosReferido`** al nuevo cliente (`AgregarPuntos`; valores `0` no suman).
6. Se inserta una fila en **`HistorialReferido`** con nombres, puntos otorgados y fecha UTC.

**Respuesta `201`:**
```json
{
  "message": "Cliente referido creado",
  "Id": 45,
  "puntosOtorgadosReferidor": 50,
  "puntosOtorgadosReferido": 25
}
```

**Errores habituales:**

| Código | Motivo |
|--------|--------|
| `400` | Modelo inválido |
| `404` | Configuración no inicializada |
| `409` | Programa inactivo o referidor no válido |
| `409` | Violaciones de unicidad del cliente (nombre, celular, correo, DNI, etc.) manejadas por el handler global |

> No hay `DELETE` de configuración ni de historial desde esta API.

---

## GraphQL — historial de referidos

Query: **`historialReferidos`**  

**Roles:** Admin, Cajero, Mesero  

Incluye paginación, filtros y ordenación estándar del proyecto.

### Ejemplo — listado ordenado por fecha

```graphql
query {
  historialReferidos(order: { fecha: DESC }) {
    totalCount
    nodes {
      id
      nombreReferidor
      nombreReferido
      puntosReferidor
      puntosReferido
      fecha
    }
  }
}
```

### Ejemplo — filtrar por nombre (según filtros HotChocolate disponibles)

```graphql
query {
  historialReferidos(where: { nombreReferidor: { contains: "Juan" } }) {
    nodes {
      id
      nombreReferidor
      nombreReferido
      puntosReferidor
      puntosReferido
      fecha
    }
  }
}
```

---

## Seed y migración

- Al arrancar la aplicación se ejecuta **`ReferidosConfigSeeder`**: si no hay filas en `ReferidosConfig`, inserta una con **`PuntosReferidor = 0`**, **`PuntosReferido = 0`**, **`Activo = false`**.
- Tras añadir las tablas al modelo, generar y aplicar migración:

```bash
dotnet ef migrations add Referidos --project KafeYana.Infrastructure --startup-project KafeYana.Api
dotnet ef database update --project KafeYana.Infrastructure --startup-project KafeYana.Api
```

---

## Tablas involucradas (referencia)

| Tabla | Uso |
|-------|-----|
| `ReferidosConfig` | Configuración única del programa |
| `HistorialReferido` | Registro por cada alta de cliente referido |
| `Cliente` | Referidor y referido (campo puntos actualizado en ambos cuando aplica) |
