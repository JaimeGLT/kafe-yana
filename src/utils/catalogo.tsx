// utils/catalogo.js
export async function enviarCatalogo(comprados: any, elaborados: any, combos: any) {
  const productos = [
    ...comprados.map((i:any) => ({
      nombre:   i.producto.nombre,
      ubicacion: i.ubicacion  // "Barra" o "Cocina"
    })),
    ...elaborados.map((i:any) => ({
      nombre:   i.producto.nombre,
      ubicacion: i.ubicacion
    })),
    ...combos.map((i:any) => ({
      nombre:   i.producto.nombre,
      ubicacion: "Cocina"  // combos siempre a cocina
    })),
  ];

  const res = await fetch("http://localhost:5001/api/catalogo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productos }),
  });

  return res.json();
}