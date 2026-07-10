export const GET_DASHBOARD_DATA = `
  query GetDashboardData($fechaDesde: DateTime, $fechaHasta: DateTime) {
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
    cajaMoviminetos(skip: 0, take: 200) {
      items {
        id
        fecha
        tipo
        categoria
        monto
        referencia
      }
    }
    ventas(skip: 0, take: 50, fechaDesde: $fechaDesde, fechaHasta: $fechaHasta) {
      items {
        id
        numeroFactura
        fechaEmision
        nombreRazonSocial
        usuario
        estadoSiat
        montoTotalSujetoIva
        montoTotal
        codigoMetodoPago
        pagos {
          codigoMetodoPago
          monto
        }
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
