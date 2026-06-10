// Catálogo estático de unidades de medida.
// Se envía al backend la `descripcion` (string en mayúsculas) como `Unidad_medida`.
// Antes se tenía un `UNIT_OPTIONS` hardcodeado en cada formulario; ahora es una sola fuente
// compartida y se reemplaza la búsqueda al backend (no había) por este catálogo local.

export interface Unit {
  codigo: number;
  descripcion: string;
}

export const UNITS: readonly Unit[] = [
  { codigo: 57, descripcion: 'UNIDAD' },
  { codigo: 97, descripcion: 'VASO' },
  { codigo: 5,  descripcion: 'BOTELLA' },
  { codigo: 6,  descripcion: 'CAJA' },
  { codigo: 33, descripcion: 'MILIGRAMO' },
  { codigo: 17, descripcion: 'GRAMO' },
  { codigo: 28, descripcion: 'LITRO' },
  { codigo: 34, descripcion: 'MILILITRO' },
  { codigo: 57, descripcion: 'TAZA' },
  { codigo: 57, descripcion: 'PORCION' },
  { codigo: 57, descripcion: 'PLATO' },
  { codigo: 62, descripcion: 'OTRO' },
];

export const UNIT_OPTIONS = UNITS.map((u) => ({
  value: u.descripcion,
  label: u.descripcion,
}));

export const DEFAULT_UNIT = 'UNIDAD';
