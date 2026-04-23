export const GET_REPORTE_INVENTARIO = `
  query GetReporteInventario {
    comprados {
      nodes {
        codigo_barra
        stock_actual
        stock_minimo
        costo_compra
        disponible
        producto {
          id
          nombre
          descripcion
          precio
          categoria {
            id
            nombre
            color
          }
        }
      }
    }
    elaborados {
      nodes {
        id_Producto
        stock_actual
        producible
        unidad_medida
        producto {
          id
          nombre
          categoria {
            nombre
            color
          }
        }
      }
    }
    insumos {
      nodes {
        id
        nombre
        categoria
        stock_actual
        stock_min
        costo
        unidad_min_uso
        unidad_compra
        factor_conversion
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