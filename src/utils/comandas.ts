const API = import.meta.env.VITE_API_URL || '/api';
const IMPRESORA = `${API}/Impresora`;

export async function enviarCatalogo(
  comprados: Array<{ producto: { nombre: string }; ubicacion: string }>,
  elaborados: Array<{ producto: { nombre: string }; ubicacion: string }>,
  combos: Array<{ producto: { nombre: string } }>,
): Promise<void> {
  const productos = [
    ...comprados.map(i => ({ nombre: i.producto.nombre, ubicacion: i.ubicacion })),
    ...elaborados.map(i => ({ nombre: i.producto.nombre, ubicacion: i.ubicacion })),
    ...combos.map(i => ({ nombre: i.producto.nombre, ubicacion: 'Cocina' })),
  ];
  try {
    const res = await fetch(`${IMPRESORA}/catalogo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Productos: productos }),
    });
    const r = await res.json();
    console.log('Catálogo enviado:', r);
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}

export async function enviarRecibo(
  mesa: string,
  codigo: string,
  total: number,
  metodoPago: string,
  destinos: string[] = ['principal'],
): Promise<void> {
  try {
    const res = await fetch(`${IMPRESORA}/recibo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Mesa: mesa, Codigo: codigo, Total: total, MetodoPago: metodoPago, Destinos: destinos }),
    });
    const resultado: Array<{ Ok: boolean; Destino: string }> = await res.json();
    const fallas = resultado.filter(r => !r.Ok);
    if (fallas.length > 0) {
      alert(`⚠️ Error de impresión en: ${fallas.map(f => f.Destino).join(', ')}`);
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}

export async function enviarCuenta(
  mesa: string,
  codigo: string,
  items: Array<{ cantidad: number; nombre: string; precio: number; total: number; ubicacion?: string }>,
  total: number,
  metodoPago: string,
  destinos: string[] = ['principal'],
): Promise<void> {
  try {
    const res = await fetch(`${IMPRESORA}/cuenta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Mesa: mesa,
        Codigo: codigo,
        Items: items.map(i => ({ Cantidad: i.cantidad, Nombre: i.nombre, Precio: i.precio, Total: i.total, Ubicacion: i.ubicacion })),
        Total: total,
        MetodoPago: metodoPago,
        Destinos: destinos,
      }),
    });
    const resultado: Array<{ Ok: boolean; Destino: string }> = await res.json();
    const fallas = resultado.filter(r => !r.Ok);
    if (fallas.length > 0) {
      alert(`⚠️ Error de impresión en: ${fallas.map(f => f.Destino).join(', ')}`);
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}

export async function enviarPedido(
  mesa: string,
  ronda: string,
  items: Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string; precio?: number }>,
  destinos: string[] = ['principal'],
): Promise<void> {
  try {
    const res = await fetch(`${IMPRESORA}/pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Mesa: mesa,
        Ronda: ronda,
        Items: items.map(i => ({
          Cantidad: i.cantidad,
          Nombre: i.nombre,
          Nota: i.nota,
          Ubicacion: i.ubicacion,
          Precio: i.precio,
        })),
        Destinos: destinos,
      }),
    });
    const resultado: Array<{ Ok: boolean; Destino: string }> = await res.json();
    const fallas = resultado.filter(r => !r.Ok);
    if (fallas.length > 0) {
      alert(`⚠️ Error de impresión en: ${fallas.map(f => f.Destino).join(', ')}`);
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}
