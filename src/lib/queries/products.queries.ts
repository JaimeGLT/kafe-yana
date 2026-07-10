export const INITIAL_LOAD_QUERY = `
  query InitialLoad($cursor: String) {
    productos(skip: 0, take: 200) {
      items { id nombre tipo categoriaNombre precioVenta costo stock recetaName }
      totalCount
    }
    combos(skip: 0, take: 200) {
      items
      {
        id
        productos { productoId cantidad }
      }
    }
    categorias(skip: 0, take: 200, soloConProductos: true) {
      items { id nombre descripcion color estado }
    }
    clientes(skip: 0, take: 200) {
      items {
        dni
        nombre
        celular
        correo
        fecha_nacimiento
        direccion
        puntos
        estado
        id
      }
    }
  }
`;

export const GET_COMPRADOS_WITH_CATEGORIES_QUERY = `
  query GetCompradosWithCategories(
    $skip: Int!
    $take: Int!
    $search: String
    $categoria: String
  ) {
    comprados(
      skip: $skip
      take: $take
      search: $search
      categoria: $categoria
    ) {
      totalCount
      items {
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
          urlImagen
          codigoSin
          categoria { id nombre estado color }
          detalles { cantidad opcional }
        }
      }
    }
    categorias(skip: 0, take: 200) {
      items { id nombre descripcion color estado }
    }
  }
`;

export const GET_COMPRADO_DETAIL = `
  query GetCompradoDetail($id: Int!) {
    comprados(skip: 0, take: 1, idProducto: $id) {
      items {
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
          urlImagen
          codigoSin
          categoria { id nombre descripcion estado color }
          detalles { cantidad opcional }
        }
      }
    }
  }
`;

export const GET_KARDEX_PRODUCTS_QUERY = `
  query {
    productos(skip: 0, take: 500) {
      items { id nombre tipo categoriaNombre precioVenta costo stock }
    }
    elaborados(skip: 0, take: 500) {
      items {
        id_Producto
        producto { id nombre }
        cantidadProducible
        unidad_medida
      }
    }
    combos(skip: 0, take: 500) {
      items {
        producto { id nombre }
        cantidadProducible
      }
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
    elaborados(skip: 0, take: 500) {
      items {
        id_Producto
        unidad_medida
        producible
        stock_actual
        ubicacion
        producto {
          id nombre descripcion precio tipo urlImagen
          categoria { id nombre descripcion estado color }
        }
        receta {
          id
          porciones
          cantidadProducible
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
    comprados(skip: 0, take: 500) {
      items {
        costo_compra stock_actual disponible ubicacion
        producto {
          id nombre descripcion precio tipo urlImagen
          categoria { id nombre descripcion estado color }
        }
      }
    }
    combos(skip: 0, take: 500) {
      items {
        cantidadProducible
        producto { id nombre descripcion precio tipo urlImagen }
        detalles {
          cantidad
          opcional
          producto {
            id nombre descripcion precio tipo urlImagen
          }
        }
      }
    }
    categorias(skip: 0, take: 200, soloConProductos: true) {
      items {
        id
        nombre
        descripcion
        color
        estado
      }
    }
    clientes(skip: 0, take: 200) {
      items {
        dni
        nombre
        celular
        correo
        fecha_nacimiento
        direccion
        puntos
        estado
        id
      }
    }
    productosCanjeables(skip: 0, take: 200) {
      items {
        id
        id_Producto
        puntos
        disponible
        activo
      }
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