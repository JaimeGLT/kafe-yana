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
      totalEfectivo
      totalEgresos
      totalIngresos
      totalQr
      totalTarjeta
      totalVentas
    }
  }
`

export const GET_CAJA_MOVIMIENTOS = `
  query GetCajaMovimientos {
    cajaMoviminetos(skip: 0, take: 200) {
      totalCount
      items {
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
    cajaHistorial(skip: 0, take: 200) {
      totalCount
      items {
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
    cajaHistorial(skip: 0, take: 1) {
      items {
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
    cajaHistorialMovimiento(skip: 0, take: 500) {
      totalCount
      items {
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