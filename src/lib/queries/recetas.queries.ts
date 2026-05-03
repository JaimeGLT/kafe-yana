export const GET_ALL_RECETAS = `
  query GetRecetas {
    recetas(where: { elaborado: { id_Producto: { gt: 0 } } }) {
      nodes {
        id
        nombre
        nota
        porciones
        elaborado { id_Producto }
        detalles {
          id_insumo
          cantidad
          merma
          insumo { id nombre costo factor_conversion unidad_min_uso stock_actual }
        }
      }
    }
  }
`

export const GET_RECETA_BY_ID = `
  query GetRecetaById($id: Int!) {
    recetas(where: { id: { eq: $id } }) {
      nodes {
        id
        nombre
        nota
        porciones
        elaborado { id_Producto }
        detalles {
          id_insumo
          cantidad
          merma
          insumo { id nombre costo factor_conversion unidad_min_uso stock_actual }
        }
      }
    }
  }
`

export const GET_RECETAS_PAGE = `
  query GetRecetasPage {
    recetas(where: { elaborado: { id_Producto: { gt: 0 } } }) {
      nodes {
        id
        nombre
        nota
        porciones
        elaborado { id_Producto }
        detalles {
          id_insumo
          cantidad
          merma
          insumo { id nombre costo factor_conversion unidad_min_uso stock_actual }
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
              id_Insumo
              id_InsumoNuevo
            }
          }
        }
      }
    }
  }
`
