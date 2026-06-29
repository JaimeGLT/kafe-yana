export const GET_ORDENES_COMPRA = `
  query GetOrdenCompra($skip: Int, $take: Int, $search: String) {
    ordenes(skip: $skip, take: $take, search: $search) {
      items {
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
      totalCount
    }
  }
`;