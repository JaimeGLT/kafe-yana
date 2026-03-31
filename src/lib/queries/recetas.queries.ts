export const GET_ALL_RECETAS = `
  query {
    recetas {
      id
      nombre
      nota
      id_Elaborado
      detalles {
        id_insumo
        cantidad
        merma
        subTotal
      }
    }
  }
`

export const GET_RECETA_BY_ID = `
  query GetRecetaById($id: Int!) {
    receta(id: $id) {
      id
      nombre
      nota
      id_Elaborado
      detalles {
        id_insumo
        cantidad
        merma
        subTotal
      }
    }
  }
`
