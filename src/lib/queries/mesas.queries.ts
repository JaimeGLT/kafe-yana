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
            nombre
            celular
            puntos
            estado
          }
          rondas {
            id
            ronda_Descripcion
            subTotal
            detalle {
              id
              id_Producto
              nombre_Producto
              cantidad
              nota
              precio
              ubicacion
              itemsCombo {
                id
                id_Producto
                nombre
                cantidad
                ubicacion
              }
              producto {
                tipo
                categoria { nombre }
                detalles {
                  cantidad
                  producto { id nombre tipo }
                }
              }
              opciones {
                opcion {
                  nombre
                  ajustePrecio
                  tipoOpcion
                  variacion { id nombre }
                  ajustes {
                    tipoAjuste
                    cantidad
                    insumoBase { nombre }
                    insumoNuevo { nombre }
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
            ronda_Descripcion
            subTotal
            detalle {
              id
              id_Producto
              nombre_Producto
              cantidad
              nota
              precio
              ubicacion
              itemsCombo {
                id
                id_Producto
                nombre
                cantidad
                ubicacion
              }
              producto {
                tipo
                categoria { nombre }
                detalles {
                  cantidad
                  producto { id nombre tipo }
                }
              }
              opciones {
                opcion {
                  nombre
                  ajustePrecio
                  tipoOpcion
                  variacion { id nombre }
                  ajustes {
                    tipoAjuste
                    cantidad
                    insumoBase { nombre }
                    insumoNuevo { nombre }
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