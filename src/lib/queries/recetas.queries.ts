export const GET_ALL_RECETAS = `
  query GetRecetas {
    recetas(where: { elaborado: { id_Producto: { gt: 0 } } }) {
      nodes {
        id
        nombre
        nota
        elaborado { id_Producto }
        detalles {
          id_insumo
          cantidad
          merma
          insumo { id nombre costo unidad_min_uso stock_actual }
        }
      }
    }
  }
`

export const GET_RECETA_BY_ID = `
  query GetRecetaById($id: Int!) {
    recetas(where: { id: { eq: $id } }) {
      nodes {
        id
        nombre
        nota
        elaborado { id_Producto }
        detalles {
          id_insumo
          cantidad
          merma
          insumo { id nombre costo unidad_min_uso stock_actual }
        }
      }
    }
  }
`
