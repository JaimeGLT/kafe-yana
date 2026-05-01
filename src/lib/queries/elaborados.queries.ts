export const GET_ALL_ELABORADOS = `
  query {
    elaborados {
      nodes {
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
    elaborados {
      nodes {
        id_Producto
        unidad_medida
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

export const GET_ELABORADO_INGREDIENTES = `
  query GetElaboradoIngredientes($id: Int!) {
    elaborados(where: { id_Producto: { eq: $id } }) {
      nodes {
        receta {
          detalles {
            cantidad
            insumo { nombre unidad_min_uso }
          }
        }
      }
    }
  }
`;

export const GET_ELABORADO_BY_ID = `
  query GetElaboradoById($id: Int!) {
    elaborados(where: { id_Producto: { eq: $id } }) {
      nodes {
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
  query GetElaboradosPage {
    elaborados {
      nodes {
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
    insumos {
      nodes {
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
    categorias {
      nodes {
        id
        nombre
        color
      }
    }
  }
`
