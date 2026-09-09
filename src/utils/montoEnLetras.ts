// Puerto TS de MontoEnLetrasBoliviano.cs (backend/.../Servicios/FacturacionImpresion).
// Debe producir el mismo texto que el ticket térmico real ("Son: ...") para
// que la vista previa / impresión por navegador coincida con lo que
// efectivamente imprime la impresora fiscal.

const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve',
];

const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

function convertir(numero: number): string {
  if (numero === 0) return 'cero';
  if (numero < 0) return `menos ${convertir(-numero)}`;
  if (numero < 20) return UNIDADES[numero];
  if (numero < 100) {
    const d = Math.floor(numero / 10);
    const u = numero % 10;
    if (numero > 20 && numero < 30) return u === 0 ? 'veinte' : `veinti${UNIDADES[u]}`;
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
  }
  if (numero === 100) return 'cien';
  if (numero < 1000) {
    const c = Math.floor(numero / 100);
    const r = numero % 100;
    return r === 0 ? CENTENAS[c] : `${CENTENAS[c]} ${convertir(r)}`;
  }
  if (numero < 1_000_000) {
    const miles = Math.floor(numero / 1000);
    const r = numero % 1000;
    const pref = miles === 1 ? 'mil' : `${convertir(miles)} mil`;
    return r === 0 ? pref : `${pref} ${convertir(r)}`;
  }
  const millones = Math.floor(numero / 1_000_000);
  const resto = numero % 1_000_000;
  const prefijo = millones === 1 ? 'un millon' : `${convertir(millones)} millones`;
  return resto === 0 ? prefijo : `${prefijo} ${convertir(resto)}`;
}

function capitalizar(texto: string): string {
  if (!texto.trim()) return texto;
  return texto
    .split(' ')
    .filter((p) => p.length > 0)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

/** Replica `MontoEnLetrasBoliviano.Formatear` del backend: "Cien 00/100 Bolivianos". */
export function montoEnLetras(monto: number): string {
  let entero = Math.floor(monto);
  let centavos = Math.round((monto - entero) * 100);
  if (centavos === 100) {
    entero += 1;
    centavos = 0;
  }

  let letras = convertir(entero);
  if (entero === 1) letras = 'un';
  if (entero === 0) letras = 'cero';

  const centavosStr = String(centavos).padStart(2, '0');
  return `${capitalizar(letras)} ${centavosStr}/100 Bolivianos`;
}
