export const GET_APP_INITIAL_DATA = `
  query GetAppInitialData {
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
    proveedores(skip: 0, take: 200) {
      items {
        id
        razon_Social
        dni
        telefono
        celular
        email
        direccion
      }
    }
    combos(skip: 0, take: 200) {
      items {
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
        cantidadProducible
      }
    }
    comprados(skip: 0, take: 500) {
      items {
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
          tipo
          categoria {
            id
            nombre
            color
          }
        }
      }
    }
    elaborados(skip: 0, take: 500) {
      items {
        id_Producto
        stock_actual
        producible
        unidad_medida
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          categoria {
            id
            nombre
            color
          }
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
    insumos(skip: 0, take: 500) {
      items {
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
    categorias(skip: 0, take: 200) {
      items {
        id
        nombre
        color
      }
    }
  }
`;

export const GET_FULL_INVENTORY = `
  query GetFullInventory {
    combos(skip: 0, take: 200) {
      items {
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
        cantidadProducible
      }
    }
    comprados(skip: 0, take: 500) {
      items {
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
          tipo
          categoria {
            id
            nombre
            color
          }
        }
      }
    }
    elaborados(skip: 0, take: 500) {
      items {
        id_Producto
        stock_actual
        producible
        unidad_medida
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          categoria {
            id
            nombre
            color
          }
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
    insumos(skip: 0, take: 500) {
      items {
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
    categorias(skip: 0, take: 200) {
      items {
        id
        nombre
        color
      }
    }
  }
`

export const GET_REPORTE_INVENTARIO = `
  query GetReporteInventario {
    comprados(skip: 0, take: 500) {
      items {
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
    elaborados(skip: 0, take: 500) {
      items {
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
    insumos(skip: 0, take: 500) {
      items {
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
    categorias(skip: 0, take: 200) {
      items {
        id
        nombre
        color
      }
    }
  }
`

export const GET_HEADER_NOTIFICATIONS = `
  query GetHeaderNotifications {
    comprados(skip: 0, take: 500) {
      items {
        costo_compra
        stock_actual
        disponible
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          categoria { id nombre color }
        }
      }
    }
    elaborados(skip: 0, take: 500) {
      items {
        id_Producto
        stock_actual
        producible
        producto {
          id
          nombre
          descripcion
          precio
          tipo
          categoria { id nombre color }
        }
      }
    }
    insumos(skip: 0, take: 500) {
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
  }
`;

export const GET_COMPRADOS = `
  query GetComprados($skip: Int!, $take: Int!) {
    comprados(skip: $skip, take: $take) {
      items {
        id_Producto
        producto {
          id
          nombre
          descripcion
          precio
          tipo
        }
        stock_actual
        stock_minimo
        unidad_medida
        costo_compra
        disponible
      }
    }
  }
`;

export const GET_INSUMOS_QUERY = `
  query GetInsumos($skip: Int!, $take: Int!) {
    insumos(skip: $skip, take: $take) {
      items {
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
  }
`;

export const GET_CATEGORIAS_QUERY = `
  query GetCategorias($skip: Int, $take: Int) {
    categorias(skip: $skip, take: $take) {
      items { id nombre descripcion estado color productos { id } }
      totalCount
    }
  }
`;