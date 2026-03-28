export const INITIAL_LOAD_QUERY = `
  query InitialLoad($cursor: String) {
    productos(first: 50, after: $cursor) {
      nodes { id nombre tipo categoriaNombre precioVenta costo stock recetaName }
      pageInfo { hasNextPage endCursor }
    }
    combos {
      id
      productos { productoId cantidad }
    }
    categorias(order: [{ nombre: ASC }]) {
      nodes { id nombre descripcion estado color cantidad }
    }
  }
`;