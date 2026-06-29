// Catálogo de unidades activas en el SIAT para la cafetería.
// `value` coincide exactamente con la descripción canónica del backend
// (UnidadMedidaSiatCatalogo.TryResolver). El backend tiene aliases para
// nombres históricos (TAZA, PORCION, BOTELLA singular, etc.) vía _aliases.

export interface Unit {
  codigo: number;
  value: string;  // descripción canónica enviada al backend
  label: string;  // nombre visible para el operador
}

export const UNITS: readonly Unit[] = [
  { codigo: 57, value: 'UNIDAD (BIENES)', label: 'UNIDAD (taza / porción / plato)' },
  { codigo: 97, value: 'VASO',            label: 'VASO' },
  { codigo: 5,  value: 'BOTELLAS',        label: 'BOTELLA' },
  { codigo: 6,  value: 'CAJA',            label: 'CAJA' },
  { codigo: 33, value: 'MILIGRAMOS',      label: 'MILIGRAMO' },
  { codigo: 17, value: 'GRAMO',           label: 'GRAMO' },
  { codigo: 28, value: 'LITRO',           label: 'LITRO' },
  { codigo: 34, value: 'MILILITRO',       label: 'MILILITRO' },
  { codigo: 62, value: 'OTRO',            label: 'OTRO' },
];

export const UNIT_OPTIONS = UNITS.map((u) => ({
  value: u.value,
  label: u.label,
}));

export const DEFAULT_UNIT = 'UNIDAD (BIENES)';
