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
`