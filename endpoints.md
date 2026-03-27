requests.delete(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Producto/1"
)

requests.put(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Producto/1",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": "",
      "codigo_barra": "",
      "descripcion": "",
      "categoria_Id": 1,
      "unidad_medida": "",
      "marca": "",
      "ubicacion": "",
      "costo_compra": 0.01,
      "precio": 0.01,
      "stock_actual": 0,
      "stock_minimo": 0,
      "disponible": True
    }
)

requests.post(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Producto",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": "",
      "codigo_barra": "",
      "descripcion": "",
      "categoria_Id": 1,
      "unidad_medida": "",
      "marca": "",
      "ubicacion": "",
      "costo_compra": 0.01,
      "precio": 0.01,
      "stock_actual": 0,
      "stock_minimo": 0,
      "disponible": True
    }
)

requests.put(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Elaborado/1",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": "",
      "descripcion": "",
      "precio": 0.01,
      "categoria_Id": 1,
      "unidad_medida": ""
    }
)

requests.post(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Elaborado",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": "",
      "descripcion": "",
      "precio": 0.01,
      "categoria_Id": 1,
      "unidad_medida": ""
    }
)

requests.post(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Combo",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": "",
      "descripcion": "",
      "precio": 0.01,
      "productos": [
        {
          "productoId": 1,
          "cantidad": 1,
          "opcional": True
        }
      ]
    }
)

requests.put(
    "https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/api/Combo/1",
    headers={
      "Content-Type": "application/json"
    },
    json={
      "nombre": "",
      "descripcion": "",
      "precio": 0.01,
      "productos": [
        {
          "productoId": 1,
          "cantidad": 1,
          "opcional": True
        }
      ]
    }
)

GETS
query {
  comprado ( id: 1 ) {
    nombre
    stock_actual
    stock_minimo
    disponible
    id
    descripcion
    costo_compra
    ubicacion
    marca
    unidad_medida
    codigo_barra
    categoria_Id
    tipo
    precio
  }
}

query {
  elaborado ( id: 3 ) {
    nombre
    descripcion
    precio
    tipo
    categoria_Id
    unidad_medida
    id
    categoria_Id
    tipo
    precio
  }
}

COMBOS

query {
  combo ( id: 7 ) {
    nombre
    descripcion
    precio
    tipo
    categoria_Id
    productos {
      productoId
      cantidad
      opcional
    }
    id
  }
}

{
  "data": {
    "combo": {
      "nombre": "Dia de la Madre",
      "descripcion": "Promocion dia de la madre",
      "precio": 120,
      "tipo": "Combos",
      "categoria_Id": 5,
      "productos": [
        {
          "productoId": 1,
          "cantidad": 1,
          "opcional": true
        },
        {
          "productoId": 6,
          "cantidad": 2,
          "opcional": true
        }
      ],
      "id": 7
    }
  }
}

query {
  combos {
    nombre
    descripcion
    precio
    tipo
    categoria_Id
    productos {
      productoId
      cantidad
      opcional
    }
    id
  }
}

{
  "data": {
    "combos": [
      {
        "nombre": "Dia de la Madre",
        "descripcion": "Promocion dia de la madre",
        "precio": 120,
        "tipo": "Combos",
        "categoria_Id": 5,
        "productos": [
          {
            "productoId": 1,
            "cantidad": 1,
            "opcional": true
          },
          {
            "productoId": 6,
            "cantidad": 2,
            "opcional": true
          }
        ],
        "id": 7
      },
      {
        "nombre": "Dia del padre",
        "descripcion": "Promocion dia del padre",
        "precio": 100,
        "tipo": "Combos",
        "categoria_Id": 5,
        "productos": [
          {
            "productoId": 1,
            "cantidad": 1,
            "opcional": true
          },
          {
            "productoId": 5,
            "cantidad": 2,
            "opcional": true
          },
          {
            "productoId": 6,
            "cantidad": 123,
            "opcional": true
          }
        ],
        "id": 9
      }
    ]
  }
}