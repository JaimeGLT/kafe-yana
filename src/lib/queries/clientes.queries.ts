export const GET_CLIENTES = `
  query GetClientes($first: Int, $after: String, $where: ClienteFilterInput) {
    clientes(first: $first, after: $after, where: $where, order: [{ nombre: ASC }]) {
      nodes {
        dni
        nombre
        celular
        correo
        fecha_nacimiento
        direccion
        puntos
        numeroCompras
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

export const GET_CLIENTES_SEARCH = `
  query GetClientesSearch($q: String!) {
    clientes(
      first: 20,
      where: { or: [
        { nombre: { contains: $q } },
        { celular: { contains: $q } }
      ]}
    ) {
      nodes {
        id
        nombre
        celular
        correo
        dni
        fecha_nacimiento
        direccion
        puntos
        numeroCompras
        estado
      }
    }
  }
`;

/**
 * Búsqueda exacta de clientes por DNI. Útil para que el operador, al tipear el
 * número de documento en el panel de cobro, autocomplete los datos del cliente
 * si ya está registrado.
 */
export const GET_CLIENTE_BY_DNI = `
  query GetClienteByDni($dni: Int!) {
    clientes(
      first: 5,
      where: { dni: { eq: $dni } }
    ) {
      nodes {
        id
        nombre
        dni
        celular
        correo
        puntos
        estado
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
        numeroCompras
        estado
        id
      }
    }
  }
`;