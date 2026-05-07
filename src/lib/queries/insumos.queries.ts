export const GET_ALL_INSUMOS = `
  query GetAllInsumos($first: Int, $after: String, $where: InsumoFilterInput) {
    insumos(first: $first, after: $after, where: $where) {
      nodes {
        id
        nombre
        categoria
        unidad_min_uso
        unidad_compra
        factor_conversion
        costo
        stock_actual
        stock_min
      }
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const GET_INSUMO_BY_ID = `
  query GetInsumoById($id: Int!) {
    insumo(id: $id) {
      id
      nombre
      categoria
      unidad_min_uso
      unidad_compra
      factor_conversion
      costo
      stock_actual
      stock_min
    }
  }
`