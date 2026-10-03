"""Datos del caso «Tiendas Guadua S.A.S.» (empresa FICTICIA).

Genera los archivos con los que se trabaja durante el curso:

    datos/productos.csv    catálogo de 60 productos
    datos/ventas.csv       ~3 000 ventas del primer semestre de 2025, SUCIAS A PROPÓSITO
    datos/resenas.csv      40 reseñas cortas de clientes (texto libre)
    datos/logs_web.jsonl   eventos de navegación de la tienda en línea (JSON por línea)

Solo usa la biblioteca estándar y una semilla fija: en Colab, en Windows o en
macOS se generan exactamente los mismos archivos. Ninguna cifra del material se
escribe a mano: todas salen de ejecutar el código sobre estos datos.

Uso:  python genera_datos.py [carpeta_destino]      (por defecto ./datos)
"""

import csv
import json
import os
import random
import sys
from datetime import date, datetime, timedelta

SEMILLA = 2026

PRODUCTOS = [
    # (nombre, categoría, precio de lista en pesos)
    ("Arroz blanco 1 kg", "Despensa", 4900),
    ("Lentejas 500 g", "Despensa", 3900),
    ("Fríjol cargamanto 500 g", "Despensa", 6800),
    ("Aceite vegetal 1 L", "Despensa", 11900),
    ("Azúcar 1 kg", "Despensa", 4600),
    ("Sal refinada 1 kg", "Despensa", 1900),
    ("Pasta spaghetti 500 g", "Despensa", 3400),
    ("Harina de maíz 1 kg", "Despensa", 3800),
    ("Atún en lata 170 g", "Despensa", 6900),
    ("Panela 500 g", "Despensa", 3200),
    ("Café molido 500 g", "Despensa", 16900),
    ("Chocolate de mesa 250 g", "Despensa", 7500),
    ("Agua sin gas 600 ml", "Bebidas", 1800),
    ("Gaseosa 1,5 L", "Bebidas", 5200),
    ("Jugo de naranja 1 L", "Bebidas", 6400),
    ("Té helado 500 ml", "Bebidas", 3100),
    ("Bebida energizante 250 ml", "Bebidas", 4900),
    ("Leche entera 1 L", "Bebidas", 4300),
    ("Yogur bebible 1 L", "Bebidas", 8200),
    ("Kumis 1 L", "Bebidas", 7400),
    ("Malta 330 ml", "Bebidas", 2500),
    ("Agua con gas 600 ml", "Bebidas", 2100),
    ("Huevos x 30", "Frescos", 17900),
    ("Pollo entero kg", "Frescos", 13900),
    ("Carne molida 500 g", "Frescos", 12400),
    ("Queso campesino 500 g", "Frescos", 11800),
    ("Plátano verde kg", "Frescos", 3600),
    ("Papa pastusa kg", "Frescos", 2900),
    ("Tomate chonto kg", "Frescos", 4200),
    ("Cebolla cabezona kg", "Frescos", 3300),
    ("Aguacate hass unidad", "Frescos", 3900),
    ("Banano kg", "Frescos", 2800),
    ("Detergente en polvo 1 kg", "Aseo", 14500),
    ("Jabón de loza 500 g", "Aseo", 5900),
    ("Limpiador multiusos 1 L", "Aseo", 7800),
    ("Cloro 1 L", "Aseo", 4100),
    ("Papel higiénico x 12", "Aseo", 21900),
    ("Toallas de cocina x 3", "Aseo", 9600),
    ("Suavizante 1 L", "Aseo", 10900),
    ("Esponjas x 3", "Aseo", 3700),
    ("Bolsas de basura x 10", "Aseo", 6200),
    ("Desinfectante 500 ml", "Aseo", 8900),
    ("Champú 400 ml", "Cuidado personal", 15900),
    ("Crema dental 100 ml", "Cuidado personal", 6300),
    ("Jabón de baño x 3", "Cuidado personal", 8400),
    ("Desodorante 150 ml", "Cuidado personal", 13200),
    ("Cepillo dental", "Cuidado personal", 4800),
    ("Acondicionador 400 ml", "Cuidado personal", 16400),
    ("Protector solar 120 ml", "Cuidado personal", 32900),
    ("Toallas higiénicas x 10", "Cuidado personal", 7900),
    ("Crema corporal 400 ml", "Cuidado personal", 18700),
    ("Bombillo LED 9 W", "Hogar", 7900),
    ("Pilas AA x 4", "Hogar", 12900),
    ("Velas x 6", "Hogar", 5400),
    ("Vasos plásticos x 25", "Hogar", 4300),
    ("Platos desechables x 20", "Hogar", 6900),
    ("Encendedor", "Hogar", 2500),
    ("Extensión eléctrica 3 m", "Hogar", 24900),
    ("Olla 24 cm", "Hogar", 59900),
    ("Juego de cubiertos 16 piezas", "Hogar", 39900),
]

PESO_CATEGORIA = {"Despensa": 1.6, "Bebidas": 1.5, "Frescos": 1.4, "Aseo": 1.0,
                  "Cuidado personal": 0.8, "Hogar": 0.5}

CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena"]
PESO_CIUDAD = [0.34, 0.20, 0.15, 0.12, 0.10, 0.09]

# Formas "sucias" en que llega escrita cada ciudad desde los distintos sistemas
VARIANTES_CIUDAD = {
    "Bogotá": ["bogota", "BOGOTÁ", "Bogotá D.C.", "Bogota", " Bogotá"],
    "Medellín": ["Medellin", "medellín", "MEDELLIN"],
    "Cali": ["cali", "Cali ", "CALI"],
    "Barranquilla": ["barranquilla", "B/quilla", "Barranquilla "],
    "Bucaramanga": ["bucaramanga", "B/manga"],
    "Cartagena": ["cartagena", "Cartagena de Indias"],
}

VARIANTES_CANAL = {"Tienda": ["tienda", "TIENDA"], "Web": ["WEB", "web "], "App": ["app", "APP"]}

PAGO_POR_CANAL = {
    "Tienda": (["Efectivo", "Tarjeta", "Billetera digital"], [0.35, 0.45, 0.20]),
    "Web": (["Tarjeta", "Transferencia", "Billetera digital"], [0.60, 0.30, 0.10]),
    "App": (["Billetera digital", "Tarjeta", "Transferencia"], [0.50, 0.40, 0.10]),
}

RESENAS = [
    # (calificación, texto). Reseñas ficticias escritas para el curso.
    (5, "La entrega fue muy rápida y el pedido llegó completo. Excelente servicio."),
    (4, "Buenos precios y buena calidad, pero la app se demora en cargar el carrito."),
    (2, "El pedido llegó tarde y faltaba un producto. Tuve que llamar dos veces."),
    (5, "Me encanta comprar por la app, es fácil y el domicilio siempre llega a tiempo."),
    (1, "Pésima experiencia: cobraron dos veces el pago y nadie responde en el chat."),
    (4, "Los frescos llegaron en buen estado. El aguacate estaba perfecto."),
    (3, "Precios normales. La tienda es amplia pero las filas en caja son largas."),
    (5, "Excelente atención en la tienda de Medellín, el personal es muy amable."),
    (2, "La página web se cae al momento de pagar. Perdí el carrito dos veces."),
    (4, "Buena variedad de productos de aseo y descuentos interesantes en la app."),
    (1, "Llegó el huevo roto y el pollo sin refrigerar. No vuelvo a pedir frescos."),
    (5, "Rápido, económico y sin complicaciones. Recomendado."),
    (3, "El domicilio llegó bien, pero el empaque venía golpeado."),
    (4, "Me gusta pagar con billetera digital, es rápido. Faltan más promociones."),
    (2, "El precio en la app no coincidía con el precio en la tienda."),
    (5, "Pedí a las ocho de la mañana y a las diez ya tenía todo en casa. Muy bien."),
    (3, "Regular. La calidad del café ha bajado y el precio subió."),
    (4, "La tienda de Cali siempre está limpia y ordenada. Buen surtido."),
    (1, "Cancelaron mi pedido sin avisar y el reembolso tardó una semana."),
    (5, "Excelente calidad en carnes y quesos. El domicilio fue puntual."),
    (2, "La app no me deja aplicar el cupón de descuento. Muy frustrante."),
    (4, "Buena experiencia en general, aunque el pedido llegó un poco tarde."),
    (3, "Productos buenos pero la entrega es lenta los fines de semana."),
    (5, "Siempre encuentro lo que necesito y a buen precio. La mejor opción del barrio."),
    (1, "El servicio al cliente es terrible, nadie resuelve nada por el chat."),
    (4, "La compra por la web fue fácil y el pago con tarjeta funcionó sin problema."),
    (2, "El producto llegó vencido. Revisen las fechas antes de enviar."),
    (5, "Muy buena atención en Barranquilla, rápidos en caja y muy amables."),
    (3, "Normal. Nada especial, pero cumple."),
    (4, "Las ofertas de los martes son muy buenas, compro el mercado completo."),
    (2, "Demasiada demora en el domicilio y el repartidor no encontraba la dirección."),
    (5, "Calidad excelente y precios justos. La app funciona perfecto."),
    (1, "Me llegó un pedido equivocado y no me dejaron devolverlo."),
    (4, "Buen precio en productos de despensa. El arroz y el aceite siempre en oferta."),
    (3, "La tienda de Bucaramanga es pequeña y a veces no hay todo lo del catálogo."),
    (5, "Entrega rápida, todo bien empacado y frío. Muy recomendado."),
    (2, "Cobran el domicilio muy caro para pedidos pequeños."),
    (4, "Me gusta que en la app se ve el estado del pedido en tiempo real."),
    (3, "El pago con transferencia tardó en confirmarse, pero al final llegó todo."),
    (5, "Excelente servicio y excelente calidad. Seguiré comprando en Cartagena."),
]


def _semestre(rng):
    """Días del 1 de enero al 30 de junio de 2025, con más peso el fin de semana
    y una tendencia suave al alza."""
    inicio = date(2025, 1, 1)
    dias = [inicio + timedelta(days=i) for i in range((date(2025, 6, 30) - inicio).days + 1)]
    pesos = [(1.4 if d.weekday() >= 5 else 1.0) * (1 + 0.12 * (d.month - 1) / 5) for d in dias]
    return dias, pesos


def _ventas(rng):
    dias, pesos_dia = _semestre(rng)
    pesos_producto = [PESO_CATEGORIA[c] for _, c, _ in PRODUCTOS]
    clientes = [f"C{i:04d}" for i in range(1, 1501)]
    # Pocos clientes compran mucho: pesos decrecientes
    pesos_cliente = [1 / (1 + i) ** 0.6 for i in range(len(clientes))]

    filas = []
    for dia in sorted(rng.choices(dias, weights=pesos_dia, k=3000)):
        ciudad = rng.choices(CIUDADES, weights=PESO_CIUDAD)[0]
        # La app gana participación mes a mes
        p_app = 0.12 + 0.03 * (dia.month - 1)
        canal = rng.choices(["Tienda", "Web", "App"], weights=[0.63 - p_app, 0.25, p_app + 0.12])[0]
        indice = rng.choices(range(len(PRODUCTOS)), weights=pesos_producto)[0]
        _, _, precio = PRODUCTOS[indice]
        if precio < 10000:
            cantidad = rng.choices([1, 2, 3, 4, 5, 6], weights=[30, 28, 18, 12, 7, 5])[0]
        else:
            cantidad = rng.choices([1, 2, 3], weights=[70, 24, 6])[0]
        if canal == "Tienda":
            descuento = rng.choices([0, 0.05, 0.10], weights=[85, 10, 5])[0]
        else:
            descuento = rng.choices([0, 0.05, 0.10, 0.15], weights=[55, 20, 15, 10])[0]
        medios, pesos_pago = PAGO_POR_CANAL[canal]
        pago = rng.choices(medios, weights=pesos_pago)[0]
        # En tienda se puede comprar sin registrarse: ese nulo NO es un error
        if canal == "Tienda" and rng.random() < 0.40:
            cliente = ""
        else:
            cliente = rng.choices(clientes, weights=pesos_cliente)[0]
        filas.append({
            "fecha": dia.isoformat(),
            "ciudad": ciudad,
            "canal": canal,
            "id_cliente": cliente,
            "id_producto": f"P{indice + 1:03d}",
            "cantidad": cantidad,
            "precio_unitario": precio,
            "descuento": descuento,
            "metodo_pago": pago,
        })

    for i, f in enumerate(filas, start=1):
        f["id_venta"] = f"V{i:05d}"

    # ---- Suciedad controlada: los problemas típicos de un consolidado real ----
    for f in filas:
        r = rng.random()
        if r < 0.07:
            f["ciudad"] = rng.choice(VARIANTES_CIUDAD[f["ciudad"]])
        elif r < 0.075:
            f["ciudad"] = ""                                   # ciudad sin registrar
        if rng.random() < 0.03:
            f["canal"] = rng.choice(VARIANTES_CANAL[f["canal"]])
        if rng.random() < 0.025:
            f["precio_unitario"] = "$" + f"{f['precio_unitario']:,}".replace(",", ".")
        if rng.random() < 0.04:
            d = date.fromisoformat(f["fecha"])
            f["fecha"] = d.strftime("%d/%m/%Y")                # otro formato de fecha
        r = rng.random()
        if r < 0.004:
            f["cantidad"] = -rng.randint(1, 3)                 # cantidad negativa
        elif r < 0.006:
            f["cantidad"] = 0
        elif r < 0.0075:
            f["cantidad"] = f["cantidad"] * 100 + rng.randint(0, 9) * 10   # error de digitación
        if rng.random() < 0.02:
            f["descuento"] = ""
        if rng.random() < 0.01:
            f["metodo_pago"] = ""

    # Doble carga: ~1 % de las ventas aparece repetida justo después del original
    con_duplicados = []
    for f in filas:
        con_duplicados.append(f)
        if rng.random() < 0.01:
            con_duplicados.append(dict(f))
    return con_duplicados


def _resenas(rng):
    dias, _ = _semestre(rng)
    filas = []
    for i, (calificacion, texto) in enumerate(RESENAS, start=1):
        fila = {
            "id_resena": f"R{i:03d}",
            "fecha": rng.choice(dias).isoformat(),
            "ciudad": rng.choices(CIUDADES, weights=PESO_CIUDAD)[0],
            "canal": rng.choices(["Tienda", "Web", "App"], weights=[0.3, 0.3, 0.4])[0],
            "id_producto": f"P{rng.randint(1, len(PRODUCTOS)):03d}",
            "calificacion": calificacion,
            "texto": texto,
        }
        # Lo que dice el texto manda sobre el sorteo (sin más llamadas a rng: ventas y logs no cambian)
        t = texto.lower()
        for ciudad in CIUDADES:
            if ciudad.lower() in t:
                fila["ciudad"] = ciudad
        if " app" in t:
            fila["canal"] = "App"
        elif "web" in t:
            fila["canal"] = "Web"
        elif "tienda de" in t or "en caja" in t or "la tienda es" in t:
            fila["canal"] = "Tienda"
        elif fila["canal"] == "Tienda" and any(p in t for p in ("domicilio", "pedido", "pedí", "entrega",
                                                                "repartidor", "llegó", "envi", "chat")):
            fila["canal"] = "Web"                      # un domicilio o un chat no son de la caja
        filas.append(fila)
    filas.sort(key=lambda f: f["fecha"])
    return filas


def _logs(rng, n=1500):
    """Eventos de la tienda en línea en junio de 2025. Semiestructurados: no
    todos los eventos tienen los mismos campos y algunos van anidados."""
    eventos = []
    inicio = datetime(2025, 6, 1)
    for _ in range(n):
        ts = inicio + timedelta(seconds=rng.randint(0, 30 * 24 * 3600 - 1))
        tipo = rng.choices(["buscar", "ver_producto", "agregar_carrito", "pagar"],
                           weights=[25, 45, 20, 10])[0]
        movil = rng.random() < 0.62
        evento = {
            "ts": ts.isoformat(timespec="seconds"),
            "sesion": f"s-{rng.randint(0, 0xFFFFF):05x}",
            "evento": tipo,
            "dispositivo": {"tipo": "movil" if movil else "escritorio",
                            "so": rng.choice(["android", "ios"]) if movil else rng.choice(["windows", "macos", "linux"])},
            "ciudad": rng.choices(CIUDADES, weights=PESO_CIUDAD)[0],
        }
        if rng.random() < 0.7:
            evento["id_cliente"] = f"C{rng.randint(1, 1500):04d}"
        if tipo == "buscar":
            evento["consulta"] = rng.choice(["arroz", "cafe", "detergente", "leche", "huevos",
                                             "protector solar", "pilas", "pollo", "aceite"])
        else:
            evento["id_producto"] = f"P{rng.randint(1, len(PRODUCTOS)):03d}"
        if tipo == "pagar":
            evento["pago"] = {"medio": rng.choice(["Tarjeta", "Billetera digital", "Transferencia"]),
                              "aprobado": rng.random() < 0.9}
        evento["duracion_ms"] = rng.randint(80, 4000)
        eventos.append(evento)
    eventos.sort(key=lambda e: e["ts"])
    return eventos


def _escribir_csv(ruta, filas, columnas):
    with open(ruta, "w", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=columnas)
        escritor.writeheader()
        escritor.writerows(filas)


def crear_datos(carpeta="datos"):
    """Crea los cuatro archivos del caso en `carpeta` y devuelve sus rutas."""
    os.makedirs(carpeta, exist_ok=True)
    rng = random.Random(SEMILLA)

    productos = [{"id_producto": f"P{i:03d}", "nombre": n, "categoria": c, "precio_lista": p}
                 for i, (n, c, p) in enumerate(PRODUCTOS, start=1)]
    ventas = _ventas(rng)
    resenas = _resenas(rng)
    logs = _logs(rng)

    rutas = {
        "productos": os.path.join(carpeta, "productos.csv"),
        "ventas": os.path.join(carpeta, "ventas.csv"),
        "resenas": os.path.join(carpeta, "resenas.csv"),
        "logs": os.path.join(carpeta, "logs_web.jsonl"),
    }
    _escribir_csv(rutas["productos"], productos, ["id_producto", "nombre", "categoria", "precio_lista"])
    _escribir_csv(rutas["ventas"], ventas,
                  ["id_venta", "fecha", "ciudad", "canal", "id_cliente", "id_producto",
                   "cantidad", "precio_unitario", "descuento", "metodo_pago"])
    _escribir_csv(rutas["resenas"], resenas,
                  ["id_resena", "fecha", "ciudad", "canal", "id_producto", "calificacion", "texto"])
    with open(rutas["logs"], "w", encoding="utf-8") as f:
        for e in logs:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"productos.csv : {len(productos):>5} filas")
    print(f"ventas.csv    : {len(ventas):>5} filas")
    print(f"resenas.csv   : {len(resenas):>5} filas")
    print(f"logs_web.jsonl: {len(logs):>5} eventos")
    return rutas


if __name__ == "__main__":
    crear_datos(sys.argv[1] if len(sys.argv) > 1 else "datos")
