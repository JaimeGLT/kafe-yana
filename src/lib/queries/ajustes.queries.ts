export const GET_COMPRADOS_AJUSTES = `
  query GetCompradosAjustes {
    comprados {
      id
      nombre
      descripcion
      precio
      tipo
      categoria_Id
      codigo_barra
      unidad_medida
      marca
      ubicacion
      costo_compra
      stock_actual
      stock_minimo
      disponible
    }
  }
`;

export const GET_INSUMOS_AJUSTES = `
  query GetInsumosAjustes {
    insumos {
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
`;

export const GET_ELABORADOS_AJUSTES = `
  query GetElaboradosAjustes {
    elaborados {
      id_Producto
      unidad_medida
      producto {
        id
        nombre
      }
      receta {
        id
        porciones
        detalles {
          id_insumo
          cantidad
          merma
          subTotal
        }
      }
    }
  }
`;
