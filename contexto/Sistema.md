# CLAUDE.md

## Qué es el sistema
El sistema es una aplicacion web para una cafeteria que gestiona el inventario(productos elaborados con variaciones, recetas e insumos, productos comprados y productos combo).
Este sistema también se encarga del flujo de venta POS.

## Roles y permisos
- El administrador "admin" puede realizar todas las acciones del sistema y acceder a todos los modulos.
- El mesero "mesero" puede acceder al modulo de ventas - submódulo de punto de venta.
- El cajero "cajero" puede acceder a el punto de venta, ventas (historial), clientes, fidelización, caja.

## Módulos y estado
El sistema cuenta con los siguientes modulos:
- Dashboard - No terminado.
- Inventario: No terminado, falta el submódulo kardex.
- Ventas: No terminado.
- Compras: No terminado.
- Caja: No terminado.
- reportes: Aún no está, falta desarrollar.
- Recetas y Costos: Terminado.
- Configuración: No terminado.

## Stack técnico
- React + typeScript para el frontend.
- React perzonalido: Para selects que permitan realizar busqueda, generalmente usado en modales donde se deben buscar o productos o codigos de productos en selects.
## Patrones de datos
El proyecto utiliza GrahpQL para las peticiones GET y API REST para las peticiones POST, PUT, DELETE.
- Se utiliza el archivo lib/graphql.ts para hacer las peticiones GET.
- Las queries están en la carpeta lib/queries/[modulo].queries.ts.
- Se utiliza el archivo lib/api.ts para hacer las peticiones POST, PUT, DELETE.

## Que tener muy claro
- El inicio de sesión funciona con cookies.

## Revisar siempre
- Que el codigo sea limpio
- Que el codigo no se repita
- Que el codigo sea rápido
- La estructura de lrpoyecto debe ser ordenada
- Ejecutar npm run build para los errores de type script.






