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

export const GET_PERMANENT_PROMOTIONS = `
  query GetPermanentPromotions {
    permanentPromotions {
      nodes {
        id
        name
        description
        isActive
        conditionType
        conditionValue
        rewardType
        rewardValue
        productId
        createdAt
        updatedAt
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
      where: { cliente: { contains: $nombre } },
      order: [{ fecha: DESC }]
    ) {
      nodes {
        id
        codigo
        fecha
        total
        cliente
        detalles {
          nombre
          cantidad
          precio
          total
        }
      }
    }
  }
`;