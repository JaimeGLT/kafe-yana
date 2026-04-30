export const GET_CLIENTES = `
  query GetClientes {
    clientes {
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