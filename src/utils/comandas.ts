import { toast } from '../components/ui';

const API = import.meta.env.VITE_API_URL || '/api';
const IMPRESORA = `${API}/Impresora`;

// Timeout generoso: el backend hace hasta 3 reintentos × 3s = ~10s por destino.
// 18s cubre el peor caso sin colgar la UI indefinidamente.
const FETCH_TIMEOUT_MS = 18_000;

/**
 * Wrapper de fetch con timeout vía AbortController.
 * Lanza `Error('timeout')` si supera FETCH_TIMEOUT_MS.
 */
async function fetchConTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

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
    const res = await fetchConTimeout(`${IMPRESORA}/catalogo`, {
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

export async function enviarCuenta(
  mesa: string,
  codigo: string,
  items: Array<{ cantidad: number; nombre: string; precio: number; total: number; ubicacion?: string }>,
  total: number,
  metodoPago: string,
  destinos: string[] = ['principal'],
  anchoCaracteres?: number,
): Promise<void> {
  try {
    const res = await fetchConTimeout(`${IMPRESORA}/cuenta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Mesa: mesa,
        Codigo: codigo,
        Items: items.map(i => ({ Cantidad: i.cantidad, Nombre: i.nombre, Precio: i.precio, Total: i.total, Ubicacion: i.ubicacion })),
        Total: total,
        MetodoPago: metodoPago,
        Destinos: destinos,
        ...(anchoCaracteres != null && { AnchoCaracteres: anchoCaracteres }),
      }),
    });
    const resultado: Array<{ Ok: boolean; Destino: string; Error?: string }> = await res.json();
    const fallas = resultado.filter(r => !r.Ok);
    if (fallas.length > 0) {
      toast.warning(
        'Impresión parcial',
        `No se pudo imprimir en: ${fallas.map(f => f.Destino).join(', ')}`,
      );
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
    toast.error('Sin conexión con impresora', 'No se pudo enviar la cuenta a la térmica.');
  }
}

export async function enviarPedido(
  mesa: string,
  ronda: string,
  items: Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string; precio?: number }>,
  destinos: string[] = ['principal'],
  anchoCaracteres?: number,
): Promise<void> {
  try {
    const res = await fetchConTimeout(`${IMPRESORA}/pedido`, {
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
        ...(anchoCaracteres != null && { AnchoCaracteres: anchoCaracteres }),
      }),
    });
    const resultado: Array<{ Ok: boolean; Destino: string; Error?: string }> = await res.json();
    const fallas = resultado.filter(r => !r.Ok);
    if (fallas.length > 0) {
      toast.warning(
        'Impresión parcial',
        `No se pudo imprimir en: ${fallas.map(f => f.Destino).join(', ')}`,
      );
    }
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
    toast.error('Sin conexión con impresora', 'No se pudo enviar el pedido a la térmica.');
  }
}