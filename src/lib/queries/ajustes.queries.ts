export const GET_AJUSTES = `
  query GetAjustes {
    ajustes {
      nodes {
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
  }
`;

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
        producible
        stock_actual
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

export const GET_ADJUSTMENTS_DATA = `
  query GetAdjustmentsData($first: Int, $after: String) {
    ajustes(first: $first, after: $after, order: { fecha: DESC }) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
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

export const GET_KARDEX_PRODUCTS = `
  query GetKardexProducts {
    comprados {
      nodes {
        producto { id nombre }
        stock_actual
      }
    }
    elaborados(where: { producible: { eq: false } }) {
      nodes {
        id_Producto
        producto { id nombre }
        stock_actual
      }
    }
  }
`;

export const GET_KARDEX_MOVEMENTS = `
  query GetKardexMovements($productoId: Int!) {
    ajustes(where: { producto: { eq: $productoId } }) {
      nodes {
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
    ventas(where: { productos: { eq: $productoId } }) {
      nodes {
        fecha
        id
        codigo
        estado
        total
        detalles {
          cantidad
          nombre
          precio
          total
        }
      }
    }
  }
`;
