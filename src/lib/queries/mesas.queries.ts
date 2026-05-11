export const GET_MESAS = `
  query GetMesas {
    mesas(order: [{ nombre: ASC }]) {
      nodes {
        id
        nombre
        disponible
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
            fecha_nacimiento
            direccion
            puntos
            estado
          }
          rondas {
            id
            id_Pedido
            ronda_Descripcion
            subTotal
            detalle {
              id
              nombre_Producto
              cantidad
              precio
              
            }
          }
        }
      }
    }
  }
`

export const GET_MESAS_SIMPLE = `
  query GetMesasSimple {
    mesas(order: [{ nombre: ASC }]) {
      nodes {
        id
        nombre
        disponible
        id_Pedido
      }
    }
  }
`

export const GET_MESA_BY_ID = `
  query GetMesaById($id: Int!) {
    mesas(where: { id: { eq: $id } }) {
      nodes {
        id
        nombre
        disponible
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
            fecha_nacimiento
            direccion
            puntos
            estado
          }
          rondas {
            id
            id_Pedido
            ronda_Descripcion
            subTotal
            detalle {
              id
              nombre_Producto
              cantidad
              precio
              opciones {
                id_Opcion
                tipoOpcion
                valorAnterior
                costoExtra
                opcion {
                  nombre
                  ajustePrecio
                  variacion {
                    id
                    nombre
                  }
                  ajustes {
                    tipoAjuste
                    cantidad
                    insumoBase {
                      id
                      nombre
                    }
                    insumoNuevo {
                      id
                      nombre
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`