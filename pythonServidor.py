import socket
import threading
import time
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

logging.basicConfig(
    filename="impresora.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)" \
    "s] %(message)s",
    datefmt="%H:%M:%S %d/%m/%Y",
)
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Dev mode: usa simuladores locales en vez de impresoras físicas ────────────
DEV_MODE = True

# ── Config impresoras ─────────────────────────────────────────────────────────
if DEV_MODE:
    IMPRESORAS = {
        "cocina":    {"ip": "127.0.0.1", "port": 9100},
        "barra":     {"ip": "127.0.0.1", "port": 9101},
        "principal": {"ip": "127.0.0.1", "port": 9102},
    }
else:
    IMPRESORAS = {
        "cocina":    {"ip": "192.168.1.110", "port": 9100},
        "barra":     {"ip": "192.168.1.101", "port": 9100},
        "principal": {"ip": "192.168.1.100", "port": 9100},  # ← poner IP real
    }

# ── Simuladores (solo en DEV_MODE) ───────────────────────────────────────────

def iniciar_simulador(port, nombre):
    def handle(conn):
        data = b""
        try:
            while True:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                data += chunk
        except Exception:
            pass
        finally:
            conn.close()

        texto = ""
        i = 0
        while i < len(data):
            b = data[i]
            if b == 0x1B:
                cmd = data[i+1] if i+1 < len(data) else 0
                if cmd in (0x40, 0x45, 0x61):
                    i += 3
                else:
                    i += 2
                continue
            elif b == 0x1D:
                i += 4
                continue
            elif b == 0x0A:
                texto += "\n"
            elif b == 0x0D:
                pass
            elif 0x20 <= b < 0x7F:
                texto += chr(b)
            i += 1

        ts = datetime.now().strftime("%H:%M:%S")
        print(f"\n{'='*42}")
        print(f"  [SIM:{nombre}] TICKET  {ts}")
        print(f"{'='*42}")
        print(texto.strip())
        print(f"{'='*42}\n")

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(5)
    print(f"[SIM] {nombre} escuchando en :{port}")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle, args=(conn,), daemon=True).start()

if DEV_MODE:
    for destino, cfg in IMPRESORAS.items():
        threading.Thread(
            target=iniciar_simulador,
            args=(cfg["port"], destino.upper()),
            daemon=True,
        ).start()

# ── Construir ticket ESC/POS ──────────────────────────────────────────────────

def build_ticket(destino: str, mesa, ronda: str, items: list) -> bytes:
    INIT         = bytes([0x1B, 0x40])
    BOLD_ON      = bytes([0x1B, 0x45, 0x01])
    BOLD_OFF     = bytes([0x1B, 0x45, 0x00])
    ALIGN_CENTER = bytes([0x1B, 0x61, 0x01])
    ALIGN_LEFT   = bytes([0x1B, 0x61, 0x00])
    BIG          = bytes([0x1D, 0x21, 0x11])
    NORMAL       = bytes([0x1D, 0x21, 0x00])
    CUT          = bytes([0x1D, 0x56, 0x41, 0x10])

    enc = lambda s: s.encode("iso-8859-1", errors="replace")

    t  = INIT
    t += ALIGN_CENTER + BIG + BOLD_ON
    t += enc(destino.upper()) + b"\n"
    t += NORMAL + BOLD_OFF
    t += BOLD_ON + enc(f"MESA: {mesa}") + b"\n" + BOLD_OFF
    if ronda:
        t += enc(str(ronda)) + b"\n"
    t += ALIGN_LEFT
    t += enc(f"Hora: {datetime.now().strftime('%H:%M  %d/%m/%Y')}") + b"\n"
    t += enc("=" * 32) + b"\n"

    for item in items:
        t += BOLD_ON
        t += enc(f"  {item['cantidad']}x {item['nombre']}") + b"\n"
        t += BOLD_OFF
        if item.get("nota"):
            t += enc(f"     >> {item['nota']}") + b"\n"

    t += enc("=" * 32) + b"\n\n\n"
    t += CUT
    return t

# ── Envío TCP con reintentos ──────────────────────────────────────────────────

def enviar_tcp(ip: str, port: int, data: bytes, reintentos: int = 3) -> tuple[bool, str | None]:
    ultimo_error = None
    for intento in range(1, reintentos + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(3)
                s.connect((ip, port))
                s.sendall(data)
            log.info(f"Enviado OK a {ip}:{port} (intento {intento})")
            return True, None
        except Exception as e:
            ultimo_error = str(e)
            log.warning(f"Intento {intento}/{reintentos} fallido -> {ip}:{port} — {e}")
            if intento < reintentos:
                time.sleep(0.5)

    log.error(f"Todos los reintentos fallaron -> {ip}:{port} — {ultimo_error}")
    return False, ultimo_error

METODO_LABEL = {
    "cash": "EFECTIVO",
    "card": "TARJETA",
    "transfer": "TRANSFERENCIA / QR",
}

def build_cuenta(mesa: str, codigo: str, items: list, total: float, metodo_pago: str) -> bytes:
    INIT         = bytes([0x1B, 0x40])
    BOLD_ON      = bytes([0x1B, 0x45, 0x01])
    BOLD_OFF     = bytes([0x1B, 0x45, 0x00])
    ALIGN_CENTER = bytes([0x1B, 0x61, 0x01])
    ALIGN_LEFT   = bytes([0x1B, 0x61, 0x00])
    BIG          = bytes([0x1D, 0x21, 0x11])
    NORMAL       = bytes([0x1D, 0x21, 0x00])
    CUT          = bytes([0x1D, 0x56, 0x41, 0x10])

    enc = lambda s: s.encode("iso-8859-1", errors="replace")

    t  = INIT
    t += ALIGN_CENTER + BIG + BOLD_ON
    t += enc("Kafe Yana") + b"\n"
    t += NORMAL + BOLD_OFF
    if mesa and mesa != codigo:
        t += enc(mesa) + b"\n"
    t += enc(f"Cod: {codigo}") + b"\n"
    t += enc(f"Hora: {datetime.now().strftime('%H:%M  %d/%m/%Y')}") + b"\n"
    t += ALIGN_LEFT
    t += enc("=" * 32) + b"\n"

    for item in items:
        cant     = item.get("cantidad", 1)
        nombre   = item.get("nombre", "?")
        precio   = float(item.get("precio", 0))
        subtotal = float(item.get("total", precio * cant))
        izq = f"  {cant}x {nombre}"
        der = f"Bs/{subtotal:.2f}"
        pad = max(1, 32 - len(izq) - len(der))
        t += enc(izq + " " * pad + der) + b"\n"
        if cant > 1:
            t += enc(f"    Bs/{precio:.2f} c/u") + b"\n"

    t += enc("=" * 32) + b"\n"
    t += BOLD_ON + ALIGN_CENTER + BIG
    t += enc(f"TOTAL  Bs/ {total:.2f}") + b"\n"
    t += NORMAL + BOLD_OFF + ALIGN_LEFT
    label = METODO_LABEL.get(metodo_pago, metodo_pago.upper() if metodo_pago else "")
    if label:
        t += enc(f"Pago: {label}") + b"\n"
    t += enc("=" * 32) + b"\n"
    t += ALIGN_CENTER + enc("Gracias por su visita!") + b"\n\n\n"
    t += CUT
    return t

# ── Ticket con precios (para impresora principal) ────────────────────────────

def build_ticket_principal(mesa, ronda: str, items: list) -> bytes:
    INIT         = bytes([0x1B, 0x40])
    BOLD_ON      = bytes([0x1B, 0x45, 0x01])
    BOLD_OFF     = bytes([0x1B, 0x45, 0x00])
    ALIGN_CENTER = bytes([0x1B, 0x61, 0x01])
    ALIGN_LEFT   = bytes([0x1B, 0x61, 0x00])
    BIG          = bytes([0x1D, 0x21, 0x11])
    NORMAL       = bytes([0x1D, 0x21, 0x00])
    CUT          = bytes([0x1D, 0x56, 0x41, 0x10])

    enc = lambda s: s.encode("iso-8859-1", errors="replace")

    t  = INIT
    t += ALIGN_CENTER + BIG + BOLD_ON
    t += enc("PRINCIPAL") + b"\n"
    t += NORMAL + BOLD_OFF
    t += BOLD_ON + enc(f"MESA: {mesa}") + b"\n" + BOLD_OFF
    if ronda:
        t += enc(str(ronda)) + b"\n"
    t += ALIGN_LEFT
    t += enc(f"Hora: {datetime.now().strftime('%H:%M  %d/%m/%Y')}") + b"\n"
    t += enc("=" * 32) + b"\n"

    total = 0.0
    for item in items:
        cant   = item.get("cantidad", 1)
        nombre = item.get("nombre", "?")
        precio = float(item.get("precio", 0) or 0)
        t += BOLD_ON
        if precio > 0:
            subtotal = precio * cant
            total   += subtotal
            izq = f"  {cant}x {nombre}"
            der = f"Bs/{subtotal:.2f}"
            pad = max(1, 32 - len(izq) - len(der))
            t += enc(izq + " " * pad + der) + b"\n"
            if cant > 1:
                t += BOLD_OFF + enc(f"     Bs/{precio:.2f} c/u") + b"\n" + BOLD_ON
        else:
            t += enc(f"  {cant}x {nombre}") + b"\n"
        t += BOLD_OFF
        if item.get("nota"):
            t += enc(f"     >> {item['nota']}") + b"\n"

    t += enc("=" * 32) + b"\n"
    if total > 0:
        t += BOLD_ON + ALIGN_CENTER + BIG
        t += enc(f"TOTAL  Bs/ {total:.2f}") + b"\n"
        t += NORMAL + BOLD_OFF + ALIGN_LEFT
    t += b"\n\n"
    t += CUT
    return t

# ── ENDPOINT: recibir pedido ──────────────────────────────────────────────────

@app.route("/api/pedido", methods=["POST"])
def recibir_pedido():
    data     = request.json or {}
    mesa     = data.get("mesa", "?")
    ronda    = data.get("ronda", "")
    items    = data.get("items", [])
    destinos = [d.lower() for d in data.get("destinos", [])]

    if not items:
        return jsonify({"error": "Sin items"}), 400

    por_destino: dict[str, list] = {}

    # Principal recibe todos los items si está seleccionado
    if "principal" in destinos:
        por_destino["principal"] = list(items)

    # Cocina y barra reciben solo sus items según ubicacion
    for item in items:
        ubicacion = item.get("ubicacion", "").lower()
        if ubicacion in ("cocina", "barra") and ubicacion in destinos:
            por_destino.setdefault(ubicacion, []).append(item)

    if not por_destino:
        return jsonify({"ok": True, "msg": "Ningun destino valido seleccionado, nada que imprimir"}), 200

    resultados = []
    for destino, items_destino in por_destino.items():
        config = IMPRESORAS.get(destino)
        if not config:
            resultados.append({"destino": destino, "ok": False, "error": "Destino no configurado"})
            continue
        if destino == "principal":
            ticket = build_ticket_principal(mesa, ronda, items_destino)
        else:
            ticket = build_ticket(destino, mesa, ronda, items_destino)
        ok, error = enviar_tcp(config["ip"], config["port"], ticket)

        estado = "OK" if ok else "ERROR"
        print(f"[{estado}] Mesa {mesa} -> {destino.upper()}" + (f" | {error}" if error else ""))
        resultados.append({"destino": destino, "ok": ok, "error": error})

    status = 200 if all(r["ok"] for r in resultados) else 207
    return jsonify(resultados), status

# ── ENDPOINT: imprimir cuenta con precios ────────────────────────────────────

@app.route("/api/cuenta", methods=["POST"])
def recibir_cuenta():
    data     = request.json or {}
    mesa     = data.get("mesa", "?")
    codigo   = data.get("codigo", "?")
    items    = data.get("items", [])
    total    = float(data.get("total", 0))
    metodo   = data.get("metodoPago", "")
    destinos = data.get("destinos", ["principal"])

    if not items:
        return jsonify({"error": "Sin items"}), 400

    ticket = build_cuenta(mesa, codigo, items, total, metodo)

    resultados = []
    for destino in destinos:
        config = IMPRESORAS.get(destino)
        if not config:
            resultados.append({"destino": destino, "ok": False, "error": "Destino no configurado"})
            continue
        ok, error = enviar_tcp(config["ip"], config["port"], ticket)
        estado = "OK" if ok else "ERROR"
        print(f"[{estado}] Cuenta {codigo} -> {destino.upper()}" + (f" | {error}" if error else ""))
        resultados.append({"destino": destino, "ok": ok, "error": error})

    status = 200 if all(r["ok"] for r in resultados) else 207
    return jsonify(resultados), status

# ── ENDPOINT: sincronizar catálogo ───────────────────────────────────────────

@app.route("/api/catalogo", methods=["POST"])
def recibir_catalogo():
    data = request.json or {}
    productos = data.get("productos", [])
    log.info(f"Catalogo recibido: {len(productos)} productos")
    for p in productos:
        log.info(f"  - {p.get('nombre')} ({p.get('ubicacion')})")
    return jsonify({"ok": True, "total": len(productos)}), 200

# ── Health check ──────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "ts": datetime.now().isoformat(), "dev_mode": DEV_MODE})

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mode = "DEV (simuladores)" if DEV_MODE else "PRODUCCION (impresoras fisicas)"
    print(f"\n Servidor listo en http://localhost:5555  [{mode}]\n")
    app.run(host="localhost", port=5555, debug=False)
