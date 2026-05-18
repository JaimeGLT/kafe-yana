const PRINT_SERVER = 'http://localhost:5001';

type Destino = 'principal' | 'cocina' | 'barra';

type ComandaItemRaw = { cantidad: number; nombre: string; nota: string; ubicacion: string };

function prepareItemsForDestinos(items: ComandaItemRaw[], destinos: Destino[]): ComandaItemRaw[] {
  const result: ComandaItemRaw[] = [];
  const otherDestinos = destinos.filter((d) => d !== 'principal');
  if (otherDestinos.length > 0) {
    result.push(...items.filter((i) => (otherDestinos as string[]).includes(i.ubicacion.toLowerCase())));
  }
  if (destinos.includes('principal')) {
    result.push(...items.map((i) => ({ ...i, ubicacion: 'principal' })));
  }
  return result.length > 0 ? result : items;
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
    const res = await fetch(`${PRINT_SERVER}/api/catalogo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos }),
    });
    const r = await res.json();
    console.log('Catálogo enviado al servidor de impresión:', r);
  } catch (err) {
    console.warn('Servidor de impresión no disponible:', err);
  }
}

export async function enviarPedido(
  mesa: string,
  ronda: string,
  items: Array<{ cantidad: number; nombre: string; nota: string; ubicacion: string }>,
  tamaño: 'pequeño' | 'mediano' = 'mediano',
  destinos?: Destino[],
): Promise<void> {
  const finalItems = destinos && destinos.length > 0 ? prepareItemsForDestinos(items, destinos) : items;
  try {
    const res = await fetch(`${PRINT_SERVER}/api/pedido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesa, ronda, items: finalItems, tamaño }),
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
