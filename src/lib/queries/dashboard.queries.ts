export const GET_DASHBOARD_DATA = `
  query GetDashboardData {
    caja {
      id
      nombre
      abierta
      fechaApertura
      fechaCierre
      abiertaPor
      cerradaPor
      saldoInicial
      totalVentas
      totalIngresos
      totalEgresos
      saldoEsperado
    }
    comprados(skip: 0, take: 200) {
      items {
        stock_actual
        stock_minimo
        producto {
          id
          nombre
        }
      }
    }
    elaborados(skip: 0, take: 200) {
      items {
        stock_actual
        producible
        producto {
          id
          nombre
        }
      }
    }
  }
`;

export const GET_CAJA_MOVIMIENTOS_PAGE = `
  query GetCajaMovimientosPage($skip: Int!, $take: Int!) {
    cajaMoviminetos(skip: $skip, take: $take) {
      items {
        id
        fecha
        tipo
        categoria
        monto
        referencia
      }
      totalCount
    }
  }
`;
