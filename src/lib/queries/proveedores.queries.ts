export const GET_PROVEEDORES = `
  query GetProveedores {
    proveedores {
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