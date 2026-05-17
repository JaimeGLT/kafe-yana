export const GET_CAJA_ESTADO = `
  query GetCajaEstado {
    caja {
      abierta
      abiertaPor
      cerradaPor
      fechaApertura
      fechaCierre
      id
      nombre
      saldoEsperado
      saldoInicial
      totalEgresos
      totalIngresos
      totalVentas
    }
  }
`

export const GET_CAJA_MOVIMIENTOS = `
  query GetCajaMovimientos {
    cajaMoviminetos {
      totalCount
      nodes {
        categoria
        descripcion
        fecha
        id
        id_Caja
        monto
        nota
        referencia
        tipo
      }
    }
  }
`

export const GET_CAJA_HISTORIAL = `
  query GetCajaHistorial {
    cajaHistorial {
      totalCount
      nodes {
        abiertaPor
        apertura
        cerradaPor
        cierre
        codigo
        diferencia
        estado
        id
        nota
        saldoInicial
        totalEgresos
        totalIngresos
        totalVentas
        movimientos {
          categoria
          codigo
          descripcion
          id
          id_CajaHistorial
          monto
          tipo
        }
      }
    }
  }
`

export const GET_ULTIMA_CAJA_HISTORIAL = `
  query GetUltimaCajaHistorial {
    cajaHistorial(first: 1, order: [{ id: DESC }]) {
      nodes {
        abiertaPor
        apertura
        cerradaPor
        cierre
        codigo
        diferencia
        estado
        id
        nota
        saldoInicial
        totalEgresos
        totalEfectivo
        totalIngresos
        totalQr
        totalTarjeta
        totalVentas
      }
    }
  }
`

export const GET_CAJA_HISTORIAL_MOVIMIENTO = `
  query GetCajaHistorialMovimiento {
    cajaHistorialMovimiento {
      totalCount
      nodes {
        categoria
        codigo
        descripcion
        id
        id_CajaHistorial
        monto
        tipo
        cajaHistorial {
          apertura
          cierre
          codigo
          diferencia
          estado
          id
          nota
          saldoInicial
          totalEgresos
          totalIngresos
          totalVentas
          movimientos {
            categoria
            codigo
            descripcion
            id
            id_CajaHistorial
            monto
            tipo
          }
        }
      }
    }
  }
`