# Guía completa Frontend — KafeYana
## Stack de datos
| Para qué | Tecnología |
|---|---|
| Cargar datos al abrir una vista | **GraphQL** |
| Mantener datos actualizados en tiempo real | **SignalR** |
## Instalación
```bash
npm install @microsoft/signalr
const API = "https://[dominio]";
VISTA: Punto de Venta
1 — Carga inicial (GraphQL)
const res = await fetch(`${API}/graphql`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: `
    query {
      mesas {
        nodes {
          id
          nombre
          disponible
          id_Pedido
          pedido {
            id
            total
            rondas {
              id
              ronda_Descripcion
              subTotal
              detalle {
                id
                nombre_Producto
                cantidad
                precio
                ubicacion
                nota
                opciones {
                  opcion { nombre ajustePrecio }
                }
                itemsCombo {
                  nombre
                  cantidad
                  ubicacion
                }
              }
            }
          }
        }
      }
    }
  `})
});
const { data } = await res.json();
const mesas = data.mesas.nodes;
2 — Tiempo real (SignalR)
import * as signalR from "@microsoft/signalr";
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${API}/hubs/kafayana`, { withCredentials: true })
  .withAutomaticReconnect()
  .build();
// MesaActualizada → mesa se ocupa, libera o cobra
connection.on("MesaActualizada", (data) => {
  // {
  //   Id: 3,
  //   Nombre: "Mesa 3",
  //   Disponible: false,  // false = ocupada | true = libre
  //   IdPedido: 12        // null cuando queda libre
  // }
});
// NuevaRonda → se agregó una ronda al pedido
connection.on("NuevaRonda", (data) => {
  // {
  //   NombreMesa:       "Mesa 3" | "Para llevar",
  //   NumeroOrden:      12,            // Id del pedido
  //   RondaId:          45,
  //   RondaDescripcion: "Ronda 2",
  //   SubTotal:         150.00,
  //   Detalles: [
  //     {
  //       Nombre:    "Cappuccino (Leche con avena)",
  //       Cantidad:  2,
  //       Precio:    35.00,
  //       Ubicacion: "barra",
  //       Opciones: [
  //         {
  //           Nombre:       "Leche con avena",
  //           AjustePrecio: 5.00,
  //           Cambios: [
  //             { Tipo: "Reemplazo", Sale: "Leche", Entra: "Leche con avena", Cantidad: 200, Unidad: "ml" }
  //           ]
  //         }
  //       ],
  //       ItemsCombo: []
  //     },
  //     {
  //       Nombre:     "Combo Desayuno",
  //       Cantidad:   1,
  //       Precio:     80.00,
  //       Ubicacion:  "",
  //       Opciones:   [],
  //       ItemsCombo: [
  //         { Nombre: "Croissant",       Cantidad: 1, Ubicacion: "cocina" },
  //         { Nombre: "Jugo de Naranja", Cantidad: 1, Ubicacion: "barra"  }
  //       ]
  //     }
  //   ]
  // }
});
// VentaProcesada → se cobró una mesa
connection.on("VentaProcesada", (data) => {
  // {
  //   NombreMesa:  "Mesa 3" | "Para llevar",
  //   NumeroOrden: 12,
  //   Total:       230.00
  // }
});
// PedidoParaLlevarActualizado → para llevar se creó, cobró o liberó
connection.on("PedidoParaLlevarActualizado", (data) => {
  // {
  //   IdPedido:   12,    // null cuando se liberó o cobró
  //   Disponible: false  // false = activo | true = libre
  // }
});
connection.onreconnected(async () => {
  await connection.invoke("UnirseAGrupo", "salon");
});
await connection.start();
await connection.invoke("UnirseAGrupo", "salon");
VISTA: Caja
1 — Carga inicial caja (GraphQL)
const res = await fetch(`${API}/graphql`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: `
    query {
      caja {
        id
        nombre
        abierta
        fechaApertura
        abiertaPor
        saldoInicial
        totalVentas
        totalEfectivo
        totalTarjeta
        totalQr
        totalIngresos
        totalEgresos
        saldoEsperado
      }
    }
  `})
});
const { data } = await res.json();
const caja = data.caja;
2 — Movimientos de caja (GraphQL — paginado aparte)
const res = await fetch(`${API}/graphql`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: `
    query ($cursor: String) {
      cajaMoviminetos(
        first: 20
        after: $cursor
        order: { fecha: DESC }
      ) {
        nodes {
          id
          tipo
          categoria
          descripcion
          referencia
          monto
          nota
          fecha
        }
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `, variables: { cursor: null } })
});
const { data } = await res.json();
const movimientos  = data.cajaMoviminetos.nodes;
const totalCount   = data.cajaMoviminetos.totalCount;
const nextCursor   = data.cajaMoviminetos.pageInfo.endCursor;
const hayMas       = data.cajaMoviminetos.pageInfo.hasNextPage;
3 — Tiempo real (SignalR)
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${API}/hubs/kafayana`, { withCredentials: true })
  .withAutomaticReconnect()
  .build();
// VentaProcesada → sumar al totalVentas en pantalla
connection.on("VentaProcesada", (data) => {
  // {
  //   NombreMesa:  "Mesa 3" | "Para llevar",
  //   NumeroOrden: 12,
  //   Total:       230.00
  // }
  // → sumar data.Total al totalVentas mostrado
  // → opcionalmente recargar movimientos con GraphQL si la vista los muestra
});
connection.onreconnected(async () => {
  await connection.invoke("UnirseAGrupo", "caja");
});
await connection.start();
await connection.invoke("UnirseAGrupo", "caja");
Resumen grupos SignalR
Vista	Grupo	Eventos
Punto de Venta
"salon"
MesaActualizada, NuevaRonda, VentaProcesada, PedidoParaLlevarActualizado
Caja
"caja"
VentaProcesada
Patrón recomendado

mountComponent()
    │
    ├── GraphQL → estado inicial
    │
    └── SignalR → actualizaciones en tiempo real
                      │
                      ├── evento → actualizar estado local (sin re-fetch)
                      │
                      └── VentaProcesada en Caja → recargar movimientos
                          con GraphQL (paginado) si están visibles