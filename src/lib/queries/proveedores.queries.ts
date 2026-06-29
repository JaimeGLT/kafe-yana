export const GET_PROVEEDORES = `
  query GetProveedores($skip: Int!, $take: Int!) {
    proveedores(skip: $skip, take: $take) {
      items {
        id
        razon_Social
        dni
        telefono
        celular
        email
        direccion
      }
      totalCount
    }
  }
`;

export const GET_PROVEEDOR_BY_ID = `
  query GetProveedorById($id: Int!) {
    proveedores(skip: 0, take: 1, id: $id) {
      items {
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