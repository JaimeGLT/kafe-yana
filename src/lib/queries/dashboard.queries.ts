export const GET_DASHBOARD_DATA = `
  query GetDashboardData($where: VentaFilterInput) {
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
    cajaMoviminetos {
      nodes {
        id
        fecha
        tipo
        categoria
        monto
        referencia
      }
    }
    ventas(first: 50, order: [{ fechaEmision: DESC }], where: $where) {
      nodes {
        id
        numeroFactura
        fechaEmision
        nombreRazonSocial
        usuario
        estadoSiat
        montoTotalSujetoIva
        montoTotal
        numeroTarjeta
        detalles {
          id
          id_venta
          descripcion
          cantidad
          precioUnitario
          subTotal
        }
      }
      totalCount
    }
    comprados {
      nodes {
        stock_actual
        stock_minimo
        producto {
          id
          nombre
        }
      }
    }
    elaborados {
      nodes {
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
