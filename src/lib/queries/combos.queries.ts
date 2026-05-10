export const GET_COMBOS_WITH_PRODUCTS = `
  query GetCombosWithProducts($first: Int, $after: String) {
    combos(
      first: $first
      after: $after
      order: [{ producto: { nombre: ASC } }]
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        producto { id nombre descripcion precio tipo imagen }
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
        costo_compra
        stock_actual
        producto { id nombre descripcion precio tipo }
      }
    }
    elaborados {
      nodes {
        producto { id nombre descripcion precio tipo }
        receta { id }
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