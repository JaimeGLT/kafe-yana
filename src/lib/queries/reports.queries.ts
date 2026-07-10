export const GET_REPORTE_CAJA_DIARIO = `
  query GetReporteCajaDiario($fecha: DateTime) {
    reporteCajaDiario(fecha: $fecha) {
      fecha
      generadoEn
      resumen {
        cajasIniciadas
        cajasCerradas
        hayCajaAbierta
        totalVentas
        totalEfectivo
        totalTarjeta
        totalQr
        totalIngresos
        totalEgresos
        saldoInicialTotal
        balanceNeto
      }
      cajas {
        id
        codigo
        apertura
        cierre
        abiertaPor
        cerradaPor
        saldoInicial
        totalVentas
        totalEfectivo
        totalTarjeta
        totalQr
        totalIngresos
        totalEgresos
        diferencia
        estado
        abiertaActualmente
        movimientos {
          id
          codigoCaja
          fecha
          tipo
          categoria
          descripcion
          monto
          referencia
          nota
        }
      }
      movimientos {
        id
        codigoCaja
        fecha
        tipo
        categoria
        descripcion
        monto
        referencia
        nota
      }
    }
  }
`;

export const GET_REPORTE_PRODUCTOS_MENSUAL = `
  query GetReporteProductosMensual($mes: Int, $anio: Int) {
    reporteProductosMensual(mes: $mes, anio: $anio) {
      mes
      anio
      generadoEn
      resumen {
        totalFacturado
        numeroFacturas
        unidadesVendidas
        productosDistintos
        categoriasActivas
      }
      topUnidades {
        idProducto
        codigo
        nombre
        categoria
        unidadesVendidas
        ingresos
        precioPromedio
        numeroVentas
        stockFinMes
        stockInicioMes
        stockPromedio
        rotacion
      }
      topIngresos {
        idProducto
        codigo
        nombre
        categoria
        unidadesVendidas
        ingresos
        precioPromedio
        numeroVentas
        stockFinMes
        stockInicioMes
        stockPromedio
        rotacion
      }
      topRotacion {
        idProducto
        codigo
        nombre
        categoria
        unidadesVendidas
        ingresos
        precioPromedio
        numeroVentas
        stockFinMes
        stockInicioMes
        stockPromedio
        rotacion
      }
      porCategoria {
        categoria
        unidadesVendidas
        ingresos
        productosDistintos
      }
    }
  }
`;
