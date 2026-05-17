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