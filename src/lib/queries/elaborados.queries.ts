export const GET_ALL_ELABORADOS = `
  query {
    elaborados {
      id_Producto
      unidad_medida
      producto {
        id
        nombre
        descripcion
        precio
        tipo
        categoria_Id
      }
      receta {
        nombre
        cantidadProducible
      }
    }
  }
`

export const GET_ELABORADO_BY_ID = `
  query GetElaboradoById($id: Int!) {
    elaborado(id: $id) {
      id
      nombre
      descripcion
      precio
      tipo
      categoria_Id
      unidad_medida
    }
  }
`
