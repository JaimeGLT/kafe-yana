export const COMBOS_QUERY = `
  query {
    combos {
      id
      nombre
      descripcion
      precio
      tipo
      categoria_Id
      cantidadProducible
      productos {
        productoId
        cantidad
        opcional
      }
    }
  }
`;

export const PRODUCTS_QUERY = `
  query GetProductos($first: Int, $after: String) {
    productos(first: $first, after: $after) {
      nodes {
        id
        nombre
        tipo
        precioVenta
        costo
        stock
        categoriaNombre
        recetaName
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;