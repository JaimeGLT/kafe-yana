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

export const GET_COMPRADOS_QUERY = `
  query GetComprados($cursor: String) {
    productos(first: 50, after: $cursor) {
      nodes { id nombre tipo categoriaNombre precioVenta costo stock }
      pageInfo { hasNextPage endCursor }
    }
    categorias(order: [{ nombre: ASC }]) {
      nodes { id nombre descripcion estado color cantidad }
    }
  }
`;

export const GET_COMPRADO_DETAIL = `
  query GetCompradoDetail($id: Int!) {
    comprado(id: $id) {
      id nombre descripcion codigo_barra categoria_Id
      unidad_medida marca ubicacion costo_compra precio
      stock_actual stock_minimo disponible
    }
  }
`;

export const GET_COMBO_DETAIL = `
  query GetComboDetail($id: Int!) {
    combo(id: $id) {
      id nombre descripcion precio
      productos { productoId cantidad opcional }
    }
  }
`;