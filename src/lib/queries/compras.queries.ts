export const GET_ORDENES_COMPRA = `
  query GetOrdenCompra($first: Int, $after: String, $where: OrdenCompraFilterInput) {
    ordenes(first: $first, after: $after, where: $where, order: [{ fecha: DESC }]) {
      nodes {
        id
        codigo
        fecha
        id_Proveedor
        nombre_Proveedor
        nota
        recibido
        estado
        total
        proveedor {
          id
          razon_Social
          dni
          telefono
          celular
          email
          direccion
        }
        insumos {
          id
          id_Insumo
          id_Orden
          cantidad
          precio
          subtotal
          nombre
        }
        productos {
          id
          id_Producto
          id_Orden
          cantidad
          precio
          subtotal
          nombre
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
      totalCount
    }
  }
`;