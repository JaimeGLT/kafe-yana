export const GET_ALL_ELABORADOS = `
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
          detalles { cantidad opcional }
        }
        receta {
          id
          nombre
          nota
          detalles {
            id_insumo
            cantidad
            merma
            insumo { id nombre costo stock_actual unidad_min_uso }
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones { id nombre ajustePrecio }
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
          opciones { id nombre ajustePrecio }
        }
      }
    }
  }
`

export const GET_ELABORADO_BY_ID = `
  query GetElaboradoById($idProducto: bigint!) {
    elaborados(where: { id_Producto: { _eq: $idProducto } }) {
      nodes {
        id_Producto
        unidad_medida
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          detalles { cantidad opcional }
        }
        receta {
          id
          nombre
          nota
          detalles {
            id_insumo
            cantidad
            merma
            insumo { id nombre costo stock_actual unidad_min_uso }
          }
        }
        variaciones {
          id
          nombre
          requerido
          opciones { id nombre ajustePrecio }
        }
      }
    }
  }
`
