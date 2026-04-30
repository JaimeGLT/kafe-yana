export const GET_APP_INITIAL_DATA = `
  query GetAppInitialData {
    clientes {
      nodes {
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
    proveedores {
      nodes {
        id
        razon_Social
        dni
        telefono
        celular
        email
        direccion
      }
    }
    combos {
      nodes {
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
        cantidadProducible
      }
    }
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
          tipo
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
`;

export const GET_FULL_INVENTORY = `
  query GetFullInventory {
    combos {
      nodes {
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
        cantidadProducible
      }
    }
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
          tipo
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