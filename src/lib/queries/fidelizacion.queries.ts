export const GET_PRODUCTOS_CANJEABLES = `
  query GetProductosCanjeables {
    productosCanjeables {
      totalCount
      nodes {
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
    comprados {
      nodes {
        producto {
          id
          nombre
          categoria { nombre color }
        }
      }
    }
    elaborados {
      nodes {
        producto {
          id
          nombre
          categoria { nombre color }
        }
      }
    }
    combos {
      nodes {
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
    promocionPermanentes(first: 100) {
      nodes {
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
      first: 100
      where: { id_Cliente: { eq: $clienteId } }
      order: [{ fecha: DESC }]
    ) {
      nodes {
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
    promocionTemporadas {
      totalCount
      nodes {
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
    hitosCompra(order: { numeroCompras: ASC }) {
      totalCount
      nodes {
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
    historialReferidos(order: { fecha: DESC }) {
      totalCount
      nodes {
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
      first: 100,
      where: { nombreRazonSocial: { contains: $nombre } },
      order: [{ fechaEmision: DESC }]
    ) {
      nodes {
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