export const GET_ADJUSTMENTS_DATA = `
  query GetAdjustmentsData($skip: Int, $take: Int) {
    ajustes(skip: $skip, take: $take) {
      totalCount
      items {
        fecha
        id
        nombre
        tipo
        ajuste
        stockAnterior
        stockNuevo
        perdida
        motivo
        nota
        usuario
      }
    }
    comprados {
      items {
        codigo_barra
        unidad_medida
        marca
        ubicacion
        costo_compra
        stock_actual
        stock_minimo
        producto { id nombre descripcion precio tipo detalles { cantidad opcional } }
        disponible
      }
    }
    insumos {
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
    elaborados {
      items {
        id_Producto
        unidad_medida
        producible
        stock_actual
        producto { id nombre }
        receta {
          id
          porciones
          cantidadProducible
          detalles { id_insumo cantidad merma }
        }
      }
    }
  }
`;
