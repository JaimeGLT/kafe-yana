export const GET_COMBOS_WITH_PRODUCTS = `
  query GetCombosWithProducts($skip: Int, $take: Int, $search: String) {
    combos(
      skip: $skip
      take: $take
      search: $search
    ) {
      totalCount
      items {
        producto { id nombre descripcion precio tipo urlImagen codigoSin }
        detalles {
          producto { id nombre descripcion precio tipo }
          cantidad
          opcional
        }
        cantidadProducible
      }
    }
    comprados {
      items {
        costo_compra
        stock_actual
        producto { id nombre descripcion precio tipo }
      }
    }
    elaborados(skip: 0, take: 50) {
      items {
        producto { id nombre descripcion precio tipo }
        receta { id }
      }
    }
  }
`;

export const GET_COMBO_BY_ID = `
  query GetComboById($idProducto: Int!) {
    combos(skip: 0, take: 1, idProducto: $idProducto) {
      items {
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