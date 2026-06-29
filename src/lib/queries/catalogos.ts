/**
 * Queries REST contra el controlador de catálogos SIAT (`/api/catalogos/*`).
 *
 * Diferencia con `siat.queries.ts`:
 *   - `siat.queries.ts`  → GraphQL (catálogo de productos/servicios via `CodigosSiat`).
 *   - `catalogos.ts`     → REST (sincronización y consulta de catálogos paramétricos
 *                          expuestos por `CatalogosController`).
 *
 * Mantener separados los dos paradigmas para que cada archivo refleje un solo
 * mecanismo de fetch (gql vs api.get).
 */
import { api } from '../api';

/** Un motivo de anulación devuelto por el backend (caché sincronizado). */
export interface MotivoAnulacionItem {
  codigo: number;
  descripcion: string;
}

/** Respuesta de `GET /api/catalogos/motivos-anulacion`. */
export interface MotivosAnulacionResponse {
  items: MotivoAnulacionItem[];
  /**
   * `false` mientras el server no haya ejecutado un sync del SIAT y esté
   * sirviendo el `FallbackHardcoded`. La UI debe mostrar un aviso y bloquear
   * el submit en ese caso.
   */
  sincronizado: boolean;
}

/**
 * Devuelve el catálogo de motivos de anulación actualmente en uso por el backend.
 *
 * Es la misma fuente que valida `DtoAnularFactura`/`DtoAnularNotaAjuste` server-side;
 * consumirla acá garantiza que lo que el cajero selecciona en el modal es exactamente
 * lo que el backend va a aceptar.
 *
 * Lanza `ApiError` (de `lib/api`) si la petición falla o el backend devuelve !2xx.
 */
export async function getMotivosAnulacion(): Promise<MotivosAnulacionResponse> {
  return api.get<MotivosAnulacionResponse>('/catalogos/motivos-anulacion');
}


/**
 * Un país de origen devuelto por el backend (catálogo sincronizado contra el SIAT).
 *
 * `codigo` es el código SIN oficial (1..211, 22=BOLIVIA, 28=BRASIL, …) que viaja
 * al backend en `DtoVentaPedido.CodigoPaisOrigen`.
 */
export interface PaisOrigenItem {
  codigo: number;
  descripcion: string;
}

/** Respuesta de `GET /api/catalogos/paises-origen`. */
export interface PaisesOrigenResponse {
  items: PaisOrigenItem[];
  /**
   * `false` si la tabla `CatPaisOrigen` está vacía (server arrancó pero el
   * sync #8 contra el SIAT todavía no corrió o falló en todos los PVs).
   * La UI debe mostrar un aviso y bloquear el submit en ese caso.
   */
  sincronizado: boolean;
}

/**
 * Devuelve el catálogo paramétrico de países de origen del SIAT actualmente
 * persistido en BD (sincronizado por `SincronizadorCatPaisOrigen`, ~211 entradas).
 *
 * Consumido por `usePaisesOrigen` para alimentar el dropdown "País de origen
 * del documento" en `DatosFiscalesForm` cuando el cajero elige tipo de
 * documento CEX (2) o PAS (3).
 *
 * Lanza `ApiError` (de `lib/api`) si la petición falla o el backend devuelve !2xx.
 */
export async function getPaisesOrigen(): Promise<PaisesOrigenResponse> {
  return api.get<PaisesOrigenResponse>('/catalogos/paises-origen');
}

/**
 * Un tipo de documento de identidad devuelto por el backend (catálogo
 * sincronizado contra el SIAT).
 *
 * `codigo` es el código SIN oficial (1=CI, 2=CEX, 3=PAS, 4=OD, 5=NIT, ...)
 * que viaja al backend en `DtoVentaPedido.CodigoTipoDocumento`.
 *
 * `descripcion` es la cadena cruda del SIN, con formato "PREFIJO - RESTO"
 * (ej: "CI - CEDULA DE IDENTIDAD", "NIT - NUMERO DE IDENTIFICACION TRIBUTARIA").
 * La UI puede usar `descripcion` tal cual o partirla por el primer '-' para
 * quedarse con el prefijo corto ("CI", "CEX", ...).
 */
export interface TipoDocumentoIdentidadItem {
  codigo: number;
  descripcion: string;
}

/** Respuesta de `GET /api/catalogos/tipos-documento-identidad`. */
export interface TiposDocumentoIdentidadResponse {
  items: TipoDocumentoIdentidadItem[];
  /**
   * `false` si la tabla `CatTiposDocumentoIdentidad` está vacía (server arrancó
   * pero el sync #9 contra el SIAT todavía no corrió o falló en todos los PVs).
   * En ese caso `items` viene del `FallbackHardcoded` del backend (1..5), que
   * coincide con el catálogo SIN vigente a jun-2026 pero NO se garantiza que
   * siga así. La UI debe mostrar un aviso pero no bloquear el submit (los
   * códigos 1..5 siguen siendo válidos server-side).
   */
  sincronizado: boolean;
}

/**
 * Devuelve el catálogo paramétrico de tipos de documento de identidad del SIAT
 * actualmente en uso por el backend (sincronizado por
 * `SincronizadorCatTipoDocumentoIdentidad`).
 *
 * Consumido por `useTiposDocumentoIdentidad` para alimentar el dropdown
 * "Tipo de documento" en `DatosFiscalesForm`. Es la misma fuente que valida
 * `DtoVentaPedido.CodigoTipoDocumento` server-side, así que lo que el cajero
 * selecciona acá es exactamente lo que el backend va a aceptar.
 *
 * Lanza `ApiError` (de `lib/api`) si la petición falla o el backend devuelve !2xx.
 */
export async function getTiposDocumentoIdentidad(): Promise<TiposDocumentoIdentidadResponse> {
  return api.get<TiposDocumentoIdentidadResponse>('/catalogos/tipos-documento-identidad');
}

/**
 * Un método de pago devuelto por el backend (catálogo sincronizado contra el SIAT).
 *
 * `codigo` es el código SIN oficial (1=EFECTIVO, 7=TRANSFERENCIA, …) que viaja
 * al backend en `DtoPagos.Lineas[].CodigoMetodoPago`.
 *
 * `activo` lo controla el operador (no el SIN): por default tras el primer sync
 * solo vienen `true` los códigos 1=EFECTIVO y 7=TRANSFERENCIA. El resto está
 * `false` hasta que el operador los habilite manualmente desde un panel admin.
 *
 * Diferencia con los catálogos anteriores: este endpoint devuelve SOLO los
 * métodos con `activo=true` (los que el operador habilitó para KafeYana).
 * Los códigos con `activo=false` NO se exponen a la UI ni al POS.
 */
export interface MetodoPagoItem {
  codigo: number;
  descripcion: string;
  activo: boolean;
}

/** Respuesta de `GET /api/catalogos/metodos-pago`. */
export interface MetodosPagoResponse {
  items: MetodoPagoItem[];
  /**
   * `false` si el server arrancó pero el sync #11 contra el SIAT todavía no
   * corrió o falló en todos los PVs. En ese caso `items` viene del
   * `FallbackHardcoded` del backend (1=EFECTIVO, 2=TARJETA, 5=OTROS,
   * 7=TRANSFERENCIA), que coincide con los códigos SIN vigentes a jun-2026
   * pero NO se garantiza que siga así. La UI debe mostrar un aviso pero no
   * bloquear el submit (los códigos 1, 2, 5, 7 siguen siendo válidos).
   */
  sincronizado: boolean;
}

/**
 * Devuelve los métodos de pago del SIAT que están **habilitados por el
 * operador** (los que el sistema acepta en el POS).
 *
 * Sincronizado por `SincronizadorCatMetodosPago` contra el catálogo paramétrico
 * `sincronizarParametricaTipoMetodoPago` del SIN (~308 entradas). NO se
 * sincroniza diario: solo al boot del server y bajo demanda manual vía
 * `POST /api/catalogos/sincronizar-metodos-pago`.
 *
 * Consumido por `useMetodosPago` para alimentar los botones de método de pago
 * en `PagoPanel`. Es la misma fuente que valida `DtoPagos` server-side vía
 * `MetodoPagoSiatCatalogo.EsValidoYActivo`, así que lo que el cajero selecciona
 * es exactamente lo que el backend va a aceptar.
 *
 * Lanza `ApiError` (de `lib/api`) si la petición falla o el backend devuelve !2xx.
 */
export async function getMetodosPago(): Promise<MetodosPagoResponse> {
  return api.get<MetodosPagoResponse>('/catalogos/metodos-pago');
}
