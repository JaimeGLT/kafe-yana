export const GET_CLIENTES = `
  query GetClientes($skip: Int!, $take: Int!, $search: String) {
    clientes(skip: $skip, take: $take, search: $search) {
      items {
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
    }
  }
`;

export const GET_CLIENTES_SEARCH = `
  query GetClientesSearch($q: String!) {
    clientes(
      skip: 0,
      take: 20,
      search: $q
    ) {
      items {
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
      skip: 0,
      take: 5,
      dni: $dni
    ) {
      items {
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
    clientes(skip: 0, take: 1, id: $id) {
      items {
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