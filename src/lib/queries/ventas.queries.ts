export const GET_PARA_LLEVAR = `
  query GetParaLlevar {
    paraLlevar {
      nodes {
        disponible
        id
        id_Pedido
        pedido {
          id
          id_Cliente
          total
          cliente {
            id
            dni
            nombre
            celular
            correo
            direccion
            fecha_nacimiento
            puntos
            estado
          }
          rondas {
            id
            id_Pedido
            ronda_Descripcion
            subTotal
            detalle {
              cantidad
              id
              id_Ronda
              nombre_Producto
              precio
            }
          }
        }
      }
      totalCount
    }
  }
`;

export const GET_VENTAS = `
  query GetVentas($after: String) {
    ventas(first: 50, after: $after, order: [{ fecha: DESC }]) {
      nodes {
        detalles {
          id_venta
          nombre
          cantidad
          precio
          total
          id
        }
        id
        codigo
        fecha
        cliente
        cajero
        productos
        pago
        estado
        subtotal
        total
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;