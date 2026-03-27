Productos
# 🛍️ Query: productos

Endpoint GraphQL para obtener productos con filtros y paginación.

---

## 🔐 Autorización

- Requiere usuario autenticado
- Usa cookies HttpOnly (JWT)
- En frontend usar: `credentials: "include"`

---

## ⚙️ Parámetros

| Parámetro | Tipo   | Requerido | Descripción |
|----------|--------|----------|------------|
| tipo     | String | ❌ | Filtra por tipo (`Comprado`, `Elaborado`, `Combos`) |
| categoria| String | ❌ | Filtra por categoría |
| texto    | String | ❌ | Búsqueda parcial (nombre o descripción) |
| first    | Int    | ❌ | Cantidad de registros |
| after    | String | ❌ | Cursor para paginación |

---

## 📥 Ejemplos de uso

---

### 🔹 Obtener todos los productos

```graphql
query {
  productos {
    nodes {
      id
      nombre
      tipo
    }
  }
}

query {
  productos(tipo: "Comprado") {
    nodes {
      id
      nombre
      stock
      costo
    }
  }
}

query {
  productos(categoria: "Bebidas") {
    nodes {
      id
      nombre
      categoriaNombre
    }
  }
}

query {
  productos(tipo: "Elaborado", texto: "latte") {
    nodes {
      id
      nombre
      recetaName
    }
  }
}

/me
## 👤 Query: Me

Obtiene la información del usuario actualmente autenticado.

Este endpoint identifica al usuario mediante **cookies HttpOnly** que contienen:
- JWT (access token)
- Refresh token

---

## 🔐 Autenticación

- Requiere autenticación (`[Authorize]`)
- No usa headers manuales en frontend
- Usa **cookies HttpOnly automáticas**

### 📌 Importante

El navegador envía automáticamente las cookies en cada request si:

- `credentials: "include"` está habilitado
- El backend permite `credentials` en CORS

---

## ⚙️ Parámetros

❌ No recibe parámetros

El usuario se identifica automáticamente desde el token almacenado en cookies.

---

## 🧠 Funcionamiento interno

1. El backend lee las cookies (JWT)
2. Extrae los `claims`
3. Obtiene el `NameIdentifier` (ID del usuario)
4. Busca el usuario en base de datos
5. Retorna los datos

---

## ❌ Posibles errores

| Error | Descripción |
|------|------------|
| No autorizado | No hay cookies válidas |
| "info no encontrado" | No se pudo obtener el ID del token |
| "Usario no encontrado" | Usuario no existe en BD |

---

## 📥 Ejemplo de Query

```graphql
query {
  me {
    nombre
    apellido
    userName
    email
    celular
    estado
  }
}


Categorias
query {
  categorias {
    nodes {
      nombre 
      descripcion
      estado
      color
      cantidad
    }
  }
}
devuleve
{
  "data": {
    "categorias": {
      "nodes": [
        {
          "nombre": "Bebidas"
        },
        {
          "nombre": "Cafes"
        },
        {
          "nombre": "Pasteles"
        },
        {
          "nombre": "Combos"
        }
      ]
    }
  }
}