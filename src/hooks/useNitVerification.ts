// Hook con debounce para verificar un NIT contra el SIAT.
// Encapsula el fetch + la lógica de "respuesta obsoleta" para no atar el PagoPanel.

import { useEffect, useRef, useState } from 'react';
import { useFacturacion } from './useFacturacion';
import type { VerificarNitRespuesta } from '../types/siat';
import { NIT_VERIFY_DEBOUNCE_MS } from '../constants/facturacion';

export type NitVerifyState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; data: VerificarNitRespuesta }
  | { kind: 'error'; message: string };

const NIT_REGEX = /^\d{1,13}$/;

/**
 * Verifica `value` contra el SIAT después de NIT_VERIFY_DEBOUNCE_MS ms de inactividad.
 * Devuelve el estado actual de la verificación.
 *
 * - No llama al backend si value está vacío, no es numérico, o es "0" (CF).
 * - Usa un ref para descartar respuestas que lleguen después de una nueva entrada.
 */
export function useNitVerification(value: string): NitVerifyState {
  const { verificarNit } = useFacturacion();
  const [state, setState] = useState<NitVerifyState>({ kind: 'idle' });
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = value.trim();

    // CF o valor no apto: no verificar.
    if (!trimmed || trimmed === '0' || !NIT_REGEX.test(trimmed)) {
      setState({ kind: 'idle' });
      return;
    }

    const myReqId = ++reqIdRef.current;
    setState({ kind: 'loading' });

    const timer = setTimeout(async () => {
      const nit = parseInt(trimmed, 10);
      if (Number.isNaN(nit)) {
        setState({ kind: 'idle' });
        return;
      }
      const res = await verificarNit(nit);
      // Si el usuario tipeó de nuevo mientras esperábamos, descartar.
      if (myReqId !== reqIdRef.current) return;
      if (res) {
        setState({ kind: 'ok', data: res });
      } else {
        setState({ kind: 'error', message: 'No se pudo verificar el NIT.' });
      }
    }, NIT_VERIFY_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [value, verificarNit]);

  return state;
}
