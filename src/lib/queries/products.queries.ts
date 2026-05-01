export const INITIAL_LOAD_QUERY = `
  query InitialLoad($cursor: String) {
    productos(first: 50, after: $cursor) {
      nodes { id nombre tipo categoriaNombre precioVenta costo stock recetaName }
      pageInfo { hasNextPage endCursor }
    }
    combos {
      id
      productos { productoId cantidad }
    }
    categorias {
      nodes { id nombre descripcion estado color cantidad }
    }
  }
`;

export const GET_COMPRADOS_WITH_CATEGORIES_QUERY = `
  query GetCompradosWithCategories {
    comprados(order: [{ producto: { nombre: ASC } }]) {
      nodes {
        codigo_barra
        unidad_medida
        ubicacion
        costo_compra
        stock_actual
        stock_minimo
        disponible
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          categoria { id nombre estado color }
          detalles { cantidad opcional }
        }
      }
    }
    categorias {
      nodes { id nombre descripcion color estado }
    }
  }
`;

export const GET_COMPRADO_DETAIL = `
  query GetCompradoDetail($id: Int!) {
    comprados(where: { id_Producto: { eq: $id } }) {
      nodes {
        codigo_barra
        unidad_medida
        marca
        ubicacion
        costo_compra
        stock_actual
        stock_minimo
        disponible
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          categoria { id nombre descripcion estado color }
          detalles { cantidad opcional }
        }
      }
    }
  }
`;

export const GET_KARDEX_PRODUCTS_QUERY = `
  query {
    productos(first: 50) {
      nodes { id nombre tipo categoriaNombre precioVenta costo stock }
    }
    elaborados {
      id nombre precio cantidadProducible unidad_medida
    }
    combos {
      id nombre precio cantidadProducible
    }
  }
`;

// TODO: implementar en el backend — query para el historial de movimientos de un producto
export const GET_KARDEX_MOVEMENTS_QUERY = `
  query GetKardexMovements($productoId: Int!) {
    kardexMovimientos(productoId: $productoId) {
      id
      fecha
      tipo
      referencia
      cantidad
      costoUnitario
      costoTotal
      stockResultante
      notas
    }
  }
`;

export const GET_POS_DATA = `
  query GetPOSData {
    elaborados {
      nodes {
        id_Producto
        unidad_medida
        producto {
          id nombre descripcion precio tipo
          categoria { id nombre descripcion estado color }
        }
        variaciones {
          id nombre requerido
          opciones {
            id nombre ajustePrecio id_variacion
            ajustes { tipoAjuste cantidad insumoBase { id nombre } insumoNuevo { id nombre } }
          }
        }
      }
    }
    comprados {
      nodes {
        costo_compra stock_actual disponible
        producto {
          id nombre descripcion precio tipo
          categoria { id nombre descripcion estado color }
        }
      }
    }
    combos {
      nodes {
        cantidadProducible
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad opcional
        }
      }
    }
    categorias {
      nodes { id nombre descripcion color estado }
    }
  }
`;

export const GET_COMBO_DETAIL = `
  query GetComboDetail($id: Int!) {
    combo(id: $id) {
      id nombre descripcion precio
      productos { productoId cantidad opcional }
    }
  }
`;