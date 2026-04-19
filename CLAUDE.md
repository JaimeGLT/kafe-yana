# Contexto del proyecto: Kafe Yana

## Qué es este sistema

ERP/CRM para cafetería. Gestiona operaciones completas: punto de venta con mesas,
inventario, compras, clientes, fidelización, caja y reportes.

## Roles y permisos

| Módulo          | Administrador | Cajero | Mesero |
|-----------------|:---:|:---:|:---:|
| Punto de Venta  | ✓ | ✓ | ✓ |
| Ventas (historial) | ✓ | ✓ | — |
| Clientes        | ✓ | ✓ | — |
| Fidelización    | ✓ | ✓ | — |
| Caja            | ✓ | ✓ | — |
| Inventario      | ✓ | — | — |
| Compras         | ✓ | — | — |
| Reportes        | ✓ | — | — |
| Recetas y Costos| ✓ | — | — |
| Configuración   | ✓ | — | — |

Nunca mostrar ni enrutar módulos a roles que no tienen acceso.

## Estado de módulos

Todos los módulos están en progreso. Ninguno está terminado.

## Stack técnico

- React 19 + TypeScript + Vite
- Tailwind CSS v4 para estilos
- React Router DOM v7 para navegación
- Axios para llamadas REST (POST, PUT, DELETE)
- GraphQL consumido con Axios (NO Apollo Client, NO urql)
- Recharts para gráficos y reportes
- date-fns para manejo de fechas
- lucide-react para iconos
- clsx para clases condicionales
- qrcode.react para generación de QR

## Arquitectura de datos

El backend está en C# desarrollado por otra persona.

- **GET** → GraphQL con Axios
- **POST / PUT / DELETE** → REST con Axios

### Dónde vive cada cosa

```
src/lib/
    graphql.ts           ← configuración del cliente GraphQL (no crear otro)
    queries/
      [modulo].queries.ts  ← queries GraphQL por módulo
    api.ts           ← instancia de Axios configurada (no crear otra)
```

Nunca escribir queries GraphQL inline en componentes o hooks.
Nunca crear una segunda instancia de Axios.
Nunca usar fetch nativo — siempre la instancia configurada.

## Reglas de negocio críticas

### Punto de venta — mesas y órdenes

**Una mesa, una orden abierta.**
Una mesa solo puede tener una orden activa a la vez. No se crean órdenes paralelas.

**Las órdenes se agregan en rondas.**
```
Mesa 1 → Orden #001 (abierta)
  └── Ronda 1: Cappuccino, Sandwich   ← se imprime comanda
  └── Ronda 2: Jugo de lata           ← se imprime comanda (solo lo nuevo)
  └── Ronda 3: Torta                  ← se imprime comanda (solo lo nuevo)
Al cobrar → se totaliza todo
```

**El stock se descuenta al confirmar y enviar a cocina, no al cobrar.**

**Permisos de modificación sobre órdenes enviadas:**
- Mesero → puede AGREGAR productos (se imprime nueva comanda solo con lo nuevo)
- Mesero → NO puede eliminar productos ya enviados
- Cajero / Admin → pueden cancelar o eliminar ítems ya enviados

**Devoluciones:** solo Cajero o Administrador.

### Nunca asumir estas reglas — siempre respetarlas

Si una tarea parece requerir violar alguna de estas reglas, preguntar antes de implementar.

## Convenciones de código

Ver `.claude/CLAUDE.md` para reglas de estructura de carpetas, responsabilidad única
y convenciones de componentes, hooks y lógica de negocio.

Ese archivo y este son complementarios. Este define el QUÉ, ese define el CÓMO.