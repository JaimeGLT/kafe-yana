export const GET_COMPRADOS_AJUSTES = `
  query GetCompradosAjustes {
    comprados {
      nodes {
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
  }
`;

export const GET_INSUMOS_AJUSTES = `
  query GetInsumosAjustes {
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
  }
`;

export const GET_ELABORADOS_AJUSTES = `
  query GetElaboradosAjustes {
    elaborados {
      nodes {
        id_Producto
        unidad_medida
        producto {
          id
          nombre
        }
        receta {
          id
          porciones
          cantidadProducible
          detalles {
            id_insumo
            cantidad
            merma
          }
        }
      }
    }
  }
`;
