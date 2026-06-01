// utils/catalogo.ts — cambia la URL
const API_URL = import.meta.env.VITE_PRINTER_URL || "http://192.168.1.25:5555";
export async function enviarCatalogo(comprados: any, elaborados: any, combos: any) {
  const productos = [
    ...comprados.map((i: any) => ({
      nombre: i.producto.nombre,
      ubicacion: i.ubicacion
    })),
    ...elaborados.map((i: any) => ({
      nombre: i.producto.nombre,
      ubicacion: i.ubicacion
    })),
    ...combos.map((i: any) => ({
      nombre: i.producto.nombre,
      ubicacion: "Cocina"
    })),
  ];

  const res = await fetch(`${API_URL}/api/catalogo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productos }),
  });

  return res.json();
}

export async function enviarPedido(mesa: string, items: any[]) {
  const res = await fetch(`${API_URL}/api/pedido`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mesa, items }),
  });

  return res.json();
}