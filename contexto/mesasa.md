#CONEXION BACKEND Punto de venta mesas

## /api/Mesa POST   Crear mesa
requests.post(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Mesa",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": ""
    }
)

## /api/Mesa/{id} DELETE Elimina mesa
requests.delete(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Mesa/1"
)

## /api/Mesa/{id} UPDATE Actualizar mesa
requests.put(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Mesa/1",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": ""
    }
)

## /api/Mesa/Ocupar/{id} POST ocupar mesa
requests.post(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Mesa/Ocupar/1",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "id_Cliente": integer | null
Format:int32
    }
)

## /api/Mesa/Liberar/{id} PUT Liberar mesa
requests.put(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Mesa/Liberar/1"
)

## /api/Mesa/ronda/{id} POST Para la ronda de pedidos. Si se agrega un pedido es una ronda, si se agrega otro pedido es otra ronda
requests.post(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Mesa/ronda/1",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "id_Pedido": 1,
      "detalles": [
        {
          "id_Producto": 1,
          "cantidad": 1
        }
      ]
    }
)




# Ahora para los get en graphql
Este para traer todas las mesas:
query GetMesasConPedidos {
  mesas {
    nodes {
      id
      nombre
      pedido {
        id_Cliente
        total

        cliente {
          id
          dni
          nombre
          celular
          correo
          fecha_nacimiento
          direccion
          puntos
          estado
        }
        
        rondas {
          id
          id_Pedido
          ronda_Descripcion
          subTotal
          detalle {
            id_Ronda
            id_Producto
            nombre_Producto
            cantidad
            precio
          }
        }
      }
    }
  }
}

## Este para traer mesas por id
query GetMesasConPedidos {
  mesas( where:  {
     id:  {
        eq: 1
     }
  } ) {
    nodes {
      id
      nombre
      pedido {
        id_Cliente
        total

        cliente {
          id
          dni
          nombre
          celular
          correo
          fecha_nacimiento
          direccion
          puntos
          estado
        }
        
        rondas {
          id
          id_Pedido
          ronda_Descripcion
          subTotal
          detalle {
            id_Ronda
            id_Producto
            nombre_Producto
            cantidad
            precio
          }
        }
      }
    }
  }
}



