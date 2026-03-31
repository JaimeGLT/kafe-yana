export const GET_ALL_ELABORADOS = `
  query {
    elaborados {
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
