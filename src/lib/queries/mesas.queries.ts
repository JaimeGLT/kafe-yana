export const GET_MESAS = `
  query GetMesas {
    mesas {
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
                  id
                  nombre
                  ajustePrecio
                  variacion {
                    id
                    nombre
                    requerido
                  }
                  ajustes {
                    cantidad
                    tipoAjuste
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
`;

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
                  id
                  nombre
                  ajustePrecio
                  variacion {
                    id
                    nombre
                    requerido
                  }
                  ajustes {
                    cantidad
                    tipoAjuste
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
`;