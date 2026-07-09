export const GET_PARA_LLEVAR = `
  query GetParaLlevar {
    paraLlevar(skip: 0, take: 200) {
      items {
        disponible
        id
        id_Pedido
        pedido {
          id
          id_Cliente
          total
          cliente {
            id
            dni
            nombre
            celular
            correo
            direccion
            fecha_nacimiento
            puntos
            estado
          }
          rondas {
            id
            id_Pedido
            ronda_Descripcion
            subTotal
            detalle {
              cantidad
              cantidadDescontada
              id
              id_Producto
              id_Ronda
              nombre_Producto
              precio
            }
          }
        }
      }
      totalCount
    }
  }
`;

export const GET_VENTAS_REPORT = `
  query GetVentasReport($skip: Int!, $take: Int!, $fechaDesde: DateTime, $fechaHasta: DateTime, $estadoSiat: String, $search: String) {
    ventas(skip: $skip, take: $take, fechaDesde: $fechaDesde, fechaHasta: $fechaHasta, estadoSiat: $estadoSiat, search: $search) {
      items {
        id
        numeroFactura
        fechaEmision
        nombreRazonSocial
        usuario
        estadoSiat
        revertidaAnulacion
        montoTotalSujetoIva
        montoTotal
        codigoMetodoPago
        pagos {
          codigoMetodoPago
          monto
        }
        cuf
        numeroDocumento
        detalles {
          id
          cantidad
        }
        cantidadProductos
        leyenda
        notasAjuste {
          id
          idVenta
          numeroNotaCreditoDebito
          estadoSiat
          codigoRecepcion
          codigoMotivoAjuste
          fechaEmision
          montoTotalOriginal
          montoTotalDevuelto
          montoEfectivoCreditoDebito
          cuf
          revertidaAnulacion
        }
      }
      totalCount
    }
  }
`;

export const GET_VENTAS = `
  query GetVentas($skip: Int!, $take: Int!, $fechaDesde: DateTime, $fechaHasta: DateTime, $estadoSiat: String, $facturado: Boolean, $search: String) {
    ventas(skip: $skip, take: $take, fechaDesde: $fechaDesde, fechaHasta: $fechaHasta, estadoSiat: $estadoSiat, facturado: $facturado, search: $search) {
      items {
        id
        numeroFactura
        fechaEmision
        nombreRazonSocial
        usuario
        estadoSiat
        facturado
        revertidaAnulacion
        montoTotalSujetoIva
        montoTotal
        codigoMetodoPago
        pagos {
          codigoMetodoPago
          monto
        }
        cuf
        numeroDocumento
        detalles {
          id
          cantidad
        }
        cantidadProductos
        leyenda
        notasAjuste {
          id
          idVenta
          numeroNotaCreditoDebito
          estadoSiat
          codigoRecepcion
          codigoMotivoAjuste
          fechaEmision
          montoTotalOriginal
          montoTotalDevuelto
          montoEfectivoCreditoDebito
          cuf
          revertidaAnulacion
        }
      }
      totalCount
    }
  }
`;

/**
 * KPIs agregados de ventas (totales monetarios y conteos para hoy/mes).
 * El backend (VentaQuery.VentasEstadisticas) aplica el mismo `where` que la lista
 * y calcula los agregados sobre todas las páginas, no sólo la cargada en la UI.
 *
 * El input `where` es un subconjunto de VentaFilterInput (fecha + estado SIAT)
 * que coincide con `VentasEstadisticasFiltroInput` del backend.
 */
export const GET_VENTAS_STATS = `
  query GetVentasStats($where: VentasEstadisticasFiltroInput) {
    ventasEstadisticas(where: $where) {
      totalHoy
      totalMes
      conteoHoy
      conteoMes
      ticketPromedioMes
    }
  }
`;

/**
 * Trae UNA venta por id con sus detalles y notas de ajuste completas.
 *
 * Se usa para el modal de detalle (`SaleDetailModal`). La lista no incluye
 * `detalles` para mantener el payload liviano — sólo el conteo
 * (`cantidadProductos`); este query se dispara on-demand al abrir el modal.
 *
 * Patrón: reutiliza el resolver paginado `ventas(where: { id: { eq: $id } })`
 * con `take: 1`. Es la única forma de pedir `detalles` sin duplicar resolvers.
 */
export const GET_VENTA_CON_DETALLES = `
  query GetVentaConDetalles($id: Int!) {
    ventas(skip: 0, take: 1, id: $id) {
      items {
        id
        numeroFactura
        fechaEmision
        nombreRazonSocial
        usuario
        estadoSiat
        facturado
        revertidaAnulacion
        montoTotalSujetoIva
        montoTotal
        codigoMetodoPago
        pagos {
          codigoMetodoPago
          monto
        }
        cuf
        numeroDocumento
        complemento
        codigoTipoDocumentoIdentidad
        codigoRecepcion
        detalles {
          id
          id_venta
          descripcion
          cantidad
          precioUnitario
          subTotal
          codigoProducto
          unidadMedida
          codigoProductoSin
          actividadEconomica
          cantidadDevuelta
        }
        notasAjuste {
          id
          idVenta
          numeroNotaCreditoDebito
          estadoSiat
          codigoRecepcion
          codigoMotivoAjuste
          fechaEmision
          montoTotalOriginal
          montoTotalDevuelto
          montoEfectivoCreditoDebito
          cuf
          revertidaAnulacion
        }
      }
    }
  }
`;
