const PRINT_SERVER = import.meta.env.VITE_PRINTER_URL ||'http://192.168.1.25:5555';

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
    const res = await fetch(`${PRINT_SERVER}/api/catalogo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos }),
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
    const res = await fetch(`${PRINT_SERVER}/api/recibo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesa, codigo, total, metodoPago, destinos }),
    });
    const resultado: Array<{ ok: boolean; destino: string }> = await res.json();
    const fallas = resultado.filter(r => !r.ok);
    if (fallas.length > 0) {
      alert(`⚠️ Error de impresión en: ${fallas.map(f => f.destino).join(', ')}`);
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}

export async function enviarCuenta(
  mesa: string,
  codigo: string,
  items: Array<{ cantidad: number; nombre: string; precio: number; total: number }>,
  total: number,
  metodoPago: string,
  destinos: string[] = ['principal'],
): Promise<void> {
  try {
    const res = await fetch(`${PRINT_SERVER}/api/cuenta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesa, codigo, items, total, metodoPago, destinos }),
    });
    const resultado: Array<{ ok: boolean; destino: string }> = await res.json();
    const fallas = resultado.filter(r => !r.ok);
    if (fallas.length > 0) {
      alert(`⚠️ Error de impresión en: ${fallas.map(f => f.destino).join(', ')}`);
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
    const res = await fetch(`${PRINT_SERVER}/api/pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesa, ronda, items, destinos }),
    });
    const resultado: Array<{ ok: boolean; destino: string }> = await res.json();
    const fallas = resultado.filter(r => !r.ok);
    if (fallas.length > 0) {
      alert(`⚠️ Error de impresión en: ${fallas.map(f => f.destino).join(', ')}`);
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}