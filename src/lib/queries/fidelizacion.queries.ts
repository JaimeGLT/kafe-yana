export const GET_PRODUCTOS_CANJEABLES = `
  query GetProductosCanjeables {
    productosCanjeables(skip: 0, take: 200) {
      totalCount
      items {
        id
        id_Producto
        nombreProducto
        categoria
        puntos
        disponible
        activo
      }
    }
  }
`;

export const GET_PRODUCTOS_SELECTOR = `
  query GetProductosSelector {
    comprados(skip: 0, take: 500) {
      items {
        producto {
          id
          nombre
          categoria { nombre color }
        }
      }
    }
    elaborados(skip: 0, take: 500) {
      items {
        producto {
          id
          nombre
          categoria { nombre color }
        }
      }
    }
    combos(skip: 0, take: 200) {
      items {
        producto {
          id
          nombre
        }
      }
    }
  }
`;

export const GET_PROMOCIONES_PERMANENTES = `
  query GetPromocionPermanentes {
    promocionPermanentes(skip: 0, take: 200) {
      items {
        id
        nombre
        descripcion
        tipoCondicion
        valorCondicion
        tipoRecompensa
        valorRecompensa
        activo
        id_ProductoCanjeable
      }
    }
  }
`;

export const GET_HISTORIAL_PUNTOS = `
  query GetHistorialPuntos($clienteId: Int!) {
    historialPuntos(
      skip: 0
      take: 200
      idCliente: $clienteId
    ) {
      items {
        id
        id_Cliente
        codigoVenta
        puntosBase
        puntosFinales
        desglose
        fecha
      }
    }
  }
`;

export const GET_PROMOCIONES_TEMPORADA = `
  query GetPromocionesTemporada {
    promocionTemporadas(skip: 0, take: 200) {
      totalCount
      items {
        id
        nombre
        fechaInicio
        fechaFin
        activo
        productosCanjeables {
          id_ProductoCanjeable
          productoCanjeable {
            id
            nombreProducto
            categoria
            puntos
            disponible
            activo
          }
        }
      }
    }
  }
`;

export const GET_HITOS_COMPRA = `
  query GetHitosCompra {
    hitosCompra(skip: 0, take: 200) {
      totalCount
      items {
        id
        numeroCompras
        id_ProductoCanjeable
        descripcion
        icono
        activo
        productoCanjeable {
          id
          nombreProducto
          categoria
          puntos
          disponible
          activo
        }
      }
    }
  }
`;

export const GET_HISTORIAL_REFERIDOS = `
  query GetHistorialReferidos {
    historialReferidos(skip: 0, take: 200) {
      totalCount
      items {
        id
        nombreReferidor
        nombreReferido
        puntosReferidor
        puntosReferido
        fecha
      }
    }
  }
`;

export const GET_VENTAS_CLIENTE = `
  query GetVentasCliente($nombre: String!) {
    ventas(
      skip: 0,
      take: 100,
      search: $nombre
    ) {
      items {
        id
        numeroFactura
        fechaEmision
        montoTotal
        nombreRazonSocial
        detalles {
          id
          id_venta
          descripcion
          cantidad
          precioUnitario
          subTotal
        }
      }
    }
  }
`;