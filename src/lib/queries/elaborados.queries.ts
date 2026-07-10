export const GET_ALL_ELABORADOS = `
  query {
    elaborados(skip: 0, take: 500) {
      items {
        id_Producto
        unidad_medida
        producible
        stock_actual
        ubicacion
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          codigoSin
          categoria { id nombre descripcion estado color }
          detalles { cantidad opcional }
        }
        receta {
          id
          nombre
          nota
          cantidadProducible
          porciones
          detalles {
            id_receta
            id_insumo
            cantidad
            merma
            subTotal
            insumo {
              id
              nombre
              categoria
              unidad_min_uso
              unidad_compra
              factor_conversion
              costo
              stock_actual
              stock_min
            }
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones {
            id
            nombre
            ajustePrecio
            id_variacion
            ajustes {
              tipoAjuste
              cantidad
              insumoBase { id nombre }
              insumoNuevo { id nombre }
            }
          }
        }
      }
    }
  }
`

// Query ligera para VariacionesPage: no pide insumo details para evitar 500
// cuando algún insumo referenciado en la receta fue eliminado.
export const GET_ELABORADOS_VARIACIONES = `
  query {
    elaborados(skip: 0, take: 500, producible: false) {
      items {
        id_Producto
        unidad_medida
        producible
        producto {
          id
          nombre
          descripcion
          precio
          tipo
        }
        receta {
          id
          detalles {
            id_insumo
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones {
            id
            nombre
            ajustePrecio
            id_variacion
            ajustes {
              tipoAjuste
              cantidad
              id_Insumo
              id_InsumoNuevo
            }
          }
        }
      }
    }
  }
`

export const GET_VARIACIONES_DATA = `
  query {
    elaborados(skip: 0, take: 500, producible: false) {
      items {
        id_Producto
        unidad_medida
        producible
        producto {
          id
          nombre
          descripcion
          precio
          tipo
        }
        receta {
          id
          detalles {
            id_insumo
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones {
            id
            nombre
            ajustePrecio
            id_variacion
            ajustes {
              tipoAjuste
              cantidad
              id_Insumo
              id_InsumoNuevo
            }
          }
        }
      }
    }
    insumos(skip: 0, take: 500) {
      items {
        id
        nombre
        categoria
        unidad_min_uso
        unidad_compra
        factor_conversion
        costo
        stock_actual
        stock_min
      }
    }
  }
`

export const GET_ELABORADO_INGREDIENTES = `
  query GetElaboradoIngredientes($id: Int!) {
    elaborados(skip: 0, take: 1, idProducto: $id) {
      items {
        receta {
          porciones
          detalles {
            cantidad
            merma
            insumo { id nombre unidad_min_uso stock_actual }
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones {
            id
            nombre
            ajustePrecio
            ajustes {
              tipoAjuste
              cantidad
              id_Insumo
              id_InsumoNuevo
            }
          }
        }
      }
    }
    insumos(skip: 0, take: 500) {
      items {
        id
        nombre
        stock_actual
      }
    }
  }
`;

export const GET_ELABORADO_BY_ID = `
  query GetElaboradoById($id: Int!) {
    elaborados(skip: 0, take: 1, idProducto: $id) {
      items {
        id_Producto
        unidad_medida
        producible
        stock_actual
        ubicacion
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          codigoSin
          categoria { id nombre descripcion estado color }
          detalles { cantidad opcional }
        }
        receta {
          id
          nombre
          nota
          cantidadProducible
          porciones
          detalles {
            id_receta
            id_insumo
            cantidad
            merma
            subTotal
            insumo {
              id
              nombre
              categoria
              unidad_min_uso
              unidad_compra
              factor_conversion
              costo
              stock_actual
              stock_min
            }
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones {
            id
            nombre
            ajustePrecio
            id_variacion
            ajustes {
              tipoAjuste
              cantidad
              insumoBase { id nombre }
              insumoNuevo { id nombre }
            }
          }
        }
      }
    }
  }
`

export const GET_ELABORADOS_PAGE = `
  query GetElaboradosPage($skip: Int, $take: Int, $search: String) {
    elaborados(
      skip: $skip
      take: $take
      search: $search
    ) {
      totalCount
      items {
        id_Producto
        stock_actual
        producible
        unidad_medida
        ubicacion
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          urlImagen
          codigoSin
          categoria { id nombre descripcion estado color }
        }
        receta {
          id
          nombre
          nota
          cantidadProducible
          porciones
          detalles {
            id_receta
            id_insumo
            cantidad
            merma
            subTotal
            insumo {
              id
              nombre
              categoria
              unidad_min_uso
              unidad_compra
              factor_conversion
              costo
              stock_actual
              stock_min
            }
          }
        }
      }
    }
    insumos(skip: 0, take: 500) {
      items {
        id
        nombre
        categoria
        unidad_min_uso
        unidad_compra
        factor_conversion
        costo
        stock_actual
        stock_min
      }
    }
    categorias(skip: 0, take: 200) {
      items {
        id
        nombre
        color
      }
    }
  }
`