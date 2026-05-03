export const GET_PROVEEDORES = `
  query GetProveedores($first: Int, $after: String) {
    proveedores(first: $first, after: $after) {
      nodes {
        id
        razon_Social
        dni
        telefono
        celular
        email
        direccion
      }
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_PROVEEDOR_BY_ID = `
  query GetProveedorById($id: Int!) {
    proveedores(where: { id: { eq: $id } }) {
      nodes {
        id
        razon_Social
        dni
        telefono
        celular
        email
        direccion
      }
    }
  }
`;