export const GET_PRODUCTS_FOR_COMBO = `
  query {
    comprados {
      nodes {
        costo_compra
        stock_actual
        producto { id nombre descripcion precio tipo }
      }
    }
    elaborados {
      nodes {
        producto { id nombre descripcion precio tipo }
      }
    }
  }
`;

export const COMBOS_QUERY = `
  query GetCombos {
    combos {
      nodes {
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
      }
    }
  }
`;

export const GET_COMBO_BY_ID = `
  query GetComboById($idProducto: Int!) {
    combos(where: { producto_Id: { eq: $idProducto } }) {
      nodes {
        producto { id nombre descripcion precio tipo }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
      }
    }
  }
`;