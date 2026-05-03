export const GET_CLIENTES = `
  query GetClientes($first: Int, $after: String) {
    clientes(first: $first, after: $after) {
      nodes {
        dni
        nombre
        celular
        correo
        fecha_nacimiento
        direccion
        puntos
        estado
        id
      }
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_CLIENTE_BY_ID = `
  query GetClienteById($id: Int!) {
    clientes(where: { id: { eq: $id } }) {
      nodes {
        dni
        nombre
        celular
        correo
        fecha_nacimiento
        direccion
        puntos
        estado
        id
      }
    }
  }
`;