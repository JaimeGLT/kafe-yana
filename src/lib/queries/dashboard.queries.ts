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
    ventas(first: 50, order: [{ fecha: DESC }], where: $where) {
      nodes {
        id 
        codigo
        fecha
        cliente
        cajero
        productos
        estado
        subtotal
        total
        pagoEfectivo
        pagoTarjeta
        pagoQr
        detalles {
          id
          id_venta
          nombre
          cantidad
          precio
          total
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

export const GET_VENTA_DETALLE = `
  query GetVentaDetalle($id: Int!) {
    ventas(where: { id: { eq: $id } }) {
      nodes {
        id
        codigo
        fecha
        cliente
        cajero
        productos
        estado
        subtotal
        total
        pagoEfectivo
        pagoTarjeta
        pagoQr
        detalles {
          id_venta
          nombre
          cantidad
          precio
          total
          id
        }
      }
    }
  }
`;