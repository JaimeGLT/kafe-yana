import type { OpcionSeleccionada } from '../types';

export const formatOpcionLabel = (o: OpcionSeleccionada): React.ReactNode => {
  const tipo = o.tipoOpcion ?? 'normal';
  const valorAnterior = o.valorAnterior;
  const costoExtra = o.costoExtra ?? o.precioAjuste;

  if (tipo === 'cambio' && valorAnterior) {
    return <>{valorAnterior} → {o.opcionNombre}{costoExtra ? ` (+${costoExtra}Bs)` : ''}</>;
  }
  if (tipo === 'extra') {
    return <>+ {o.opcionNombre}{costoExtra ? ` (+${costoExtra}Bs)` : ''}</>;
  }

  const ajuste = o.tipoAjuste ?? o.opcionRaw?.ajustes?.[0]?.tipoAjuste;
  const insumoBase = o.insumoBaseNombre ?? o.opcionRaw?.ajustes?.[0]?.insumoBase?.nombre;
  const insumoNuevo = o.insumoNuevoNombre ?? o.opcionRaw?.ajustes?.[0]?.insumoNuevo?.nombre;
  const cantidad = o.ajusteCantidad ?? o.opcionRaw?.ajustes?.[0]?.cantidad;

  if (ajuste === 'Reemplazo' && insumoBase && insumoNuevo) {
    return (
      <span className="text-coffee-500">
        Quita <span className="font-medium text-coffee-700">{insumoBase}</span> → Usa <span className="font-medium text-coffee-700">{insumoNuevo}</span>{cantidad ? ` (${cantidad})` : ''}
      </span>
    );
  }
  if (ajuste === 'Modificacion' && insumoBase) {
    return (
      <span className="text-coffee-500">
        Modifica <span className="font-medium text-coffee-700">{insumoBase}</span> a {cantidad}
      </span>
    );
  }

  if (insumoBase && insumoNuevo) {
    return <>{insumoBase} → {insumoNuevo}{cantidad ? ` (${cantidad})` : ''}</>;
  }
  if (insumoNuevo && o.tipoAjuste === 'extra') {
    return <>+ {insumoNuevo}{cantidad ? ` (${cantidad})` : ''}</>;
  }
  return o.opcionNombre;
};

export const formatOpcionLabelString = (o: OpcionSeleccionada): string => {
  const tipo = o.tipoOpcion ?? 'normal';
  const valorAnterior = o.valorAnterior;
  const costoExtra = o.costoExtra ?? o.precioAjuste;

  if (tipo === 'cambio' && valorAnterior) {
    return `${valorAnterior} → ${o.opcionNombre}${costoExtra ? ` (+${costoExtra}Bs)` : ''}`;
  }
  if (tipo === 'extra') {
    return `+ ${o.opcionNombre}${costoExtra ? ` (+${costoExtra}Bs)` : ''}`;
  }

  const ajuste = o.tipoAjuste ?? o.opcionRaw?.ajustes?.[0]?.tipoAjuste;
  const insumoBase = o.insumoBaseNombre ?? o.opcionRaw?.ajustes?.[0]?.insumoBase?.nombre;
  const insumoNuevo = o.insumoNuevoNombre ?? o.opcionRaw?.ajustes?.[0]?.insumoNuevo?.nombre;
  const cantidad = o.ajusteCantidad ?? o.opcionRaw?.ajustes?.[0]?.cantidad;

  if (ajuste === 'Reemplazo' && insumoBase && insumoNuevo) {
    return `Quita ${insumoBase} → Usa ${insumoNuevo}${cantidad ? ` (${cantidad})` : ''}`;
  }
  if (ajuste === 'Modificacion' && insumoBase) {
    return `Modifica ${insumoBase} a ${cantidad}`;
  }
  if (insumoBase && insumoNuevo) {
    return `${insumoBase} → ${insumoNuevo}${cantidad ? ` (${cantidad})` : ''}`;
  }
  if (insumoNuevo && o.tipoAjuste === 'extra') {
    return `+ ${insumoNuevo}${cantidad ? ` (${cantidad})` : ''}`;
  }
  return o.opcionNombre;
};
