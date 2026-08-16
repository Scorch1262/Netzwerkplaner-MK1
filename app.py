#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Netzwerkplan-Server
====================
Startet einen lokalen Webserver, der einen interaktiven, frei platzierbaren
Netzwerkplan bereitstellt (Elemente wie Switches, Router, Server, PCs, ...,
verbunden durch farbige Linien). Erreichbar unter der IP des Rechners im
lokalen Netzwerk.

Konfiguration (Ansicht, Elemente, Verbindungen) wird menschenlesbar in
"config.json" gespeichert, die im selben Verzeichnis wie das Skript / die
exe liegt.
"""

import os
import sys
import json
import socket
import threading
import webbrowser
import copy

from flask import Flask, request, jsonify, render_template

# paho-mqtt ist optional zur Laufzeit: Fehlt es, soll der Server trotzdem
# starten - nur der MQTT-Endpunkt liefert dann eine verstaendliche
# Fehlermeldung statt eines Startabsturzes.
try:
    import paho.mqtt.publish as mqtt_publish
    MQTT_AVAILABLE = True
except ImportError:  # pragma: no cover
    mqtt_publish = None
    MQTT_AVAILABLE = False

# --------------------------------------------------------------------------
# Pfad-Hilfsfunktionen (wichtig für PyInstaller --onefile)
# --------------------------------------------------------------------------

def get_base_dir():
    """Verzeichnis, in dem die exe (bzw. das Skript) liegt.
    Hier wird die config.json gespeichert -> vom Nutzer editierbar."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def get_resource_dir():
    """Verzeichnis, aus dem gebündelte Ressourcen (templates/static) beim
    Ausführen als exe gelesen werden (PyInstaller entpackt nach _MEIPASS)."""
    if getattr(sys, "frozen", False):
        return sys._MEIPASS  # type: ignore[attr-defined]
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = get_base_dir()
RES_DIR = get_resource_dir()
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

# --------------------------------------------------------------------------
# Standardkonfiguration
# --------------------------------------------------------------------------

DEFAULT_CONFIG = {
    "_kommentar": "Diese Datei wird vom Netzwerkplan-Programm gelesen und "
                  "geschrieben. Manuelle Aenderungen sind moeglich, aber "
                  "bitte gueltiges JSON beibehalten.",
    "server": {
        "host": "0.0.0.0",
        "port": 8080
    },
    "view": {
        "zoom": 1.0,
        "pan_x": 0,
        "pan_y": 0,
        "show_grid": True,
        "snap_to_grid": True,
        "grid_size": 40
    },
    "mode": "edit",
    "elements": [],
    "connections": []
}


def load_config():
    if not os.path.exists(CONFIG_PATH):
        save_config(DEFAULT_CONFIG)
        return copy.deepcopy(DEFAULT_CONFIG)
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Fehlende Top-Level-Schluessel mit Standardwerten auffuellen
        for key, value in DEFAULT_CONFIG.items():
            if key not in data:
                data[key] = value
        return data
    except Exception as exc:  # noqa: BLE001
        print(f"[WARNUNG] config.json konnte nicht gelesen werden ({exc}). "
              f"Erzeuge neue Standardkonfiguration.")
        save_config(DEFAULT_CONFIG)
        return copy.deepcopy(DEFAULT_CONFIG)


def save_config(data):
    tmp_path = CONFIG_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, CONFIG_PATH)


# --------------------------------------------------------------------------
# Flask-App
# --------------------------------------------------------------------------

app = Flask(
    __name__,
    template_folder=os.path.join(RES_DIR, "templates"),
    static_folder=os.path.join(RES_DIR, "static"),
)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config", methods=["GET"])
def api_get_config():
    return jsonify(load_config())


@app.route("/api/config", methods=["POST"])
def api_save_config():
    data = request.get_json(force=True, silent=True)
    if not isinstance(data, dict):
        return jsonify({"status": "error", "message": "Ungueltige Daten"}), 400
    save_config(data)
    return jsonify({"status": "ok"})


@app.route("/api/mqtt-publish", methods=["POST"])
def api_mqtt_publish():
    """Versendet eine MQTT-Nachricht ueber den angegebenen Broker.

    Laeuft als Backend-Proxy, da Browser aus Sicherheitsgruenden kein
    rohes TCP/MQTT sprechen koennen - der eigentliche MQTT-Connect/
    Publish/Disconnect passiert hier serverseitig mit paho-mqtt.
    """
    if not MQTT_AVAILABLE:
        return jsonify({
            "status": "error",
            "message": "Das Python-Paket 'paho-mqtt' ist nicht installiert. "
                       "Bitte 'pip install paho-mqtt' ausfuehren (siehe requirements.txt) "
                       "und den Server neu starten.",
        }), 501

    data = request.get_json(force=True, silent=True) or {}

    broker = str(data.get("broker") or "").strip()
    topic = str(data.get("topic") or "").strip()
    if not broker or not topic:
        return jsonify({"status": "error", "message": "Broker und Topic sind erforderlich."}), 400

    try:
        port = int(data.get("port") or 1883)
    except (TypeError, ValueError):
        port = 1883

    payload = data.get("payload", "")
    if payload is None:
        payload = ""

    try:
        qos = int(data.get("qos") or 0)
    except (TypeError, ValueError):
        qos = 0
    if qos not in (0, 1, 2):
        qos = 0

    retain = bool(data.get("retain"))
    username = str(data.get("username") or "").strip() or None
    password = data.get("password") or None
    use_tls = bool(data.get("use_tls"))

    auth = {"username": username, "password": password or ""} if username else None
    tls = {"tls_version": None} if use_tls else None

    try:
        mqtt_publish.single(
            topic,
            payload=payload,
            qos=qos,
            retain=retain,
            hostname=broker,
            port=port,
            auth=auth,
            tls=tls,
            client_id="netzwerkplan",
            keepalive=10,
        )
    except Exception as exc:  # noqa: BLE001 - Netzwerk-/Broker-Fehler sollen als JSON zurueckkommen
        return jsonify({"status": "error", "message": str(exc)}), 502

    return jsonify({"status": "ok"})


# --------------------------------------------------------------------------
# Netzwerk-Helfer
# --------------------------------------------------------------------------

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def open_browser_delayed(url, delay=1.0):
    threading.Timer(delay, lambda: webbrowser.open(url)).start()


# --------------------------------------------------------------------------
# Start
# --------------------------------------------------------------------------

def main():
    cfg = load_config()
    host = cfg.get("server", {}).get("host", "0.0.0.0")
    port = int(cfg.get("server", {}).get("port", 8080))
    local_ip = get_local_ip()

    print("=" * 64)
    print(" NETZWERKPLAN-SERVER")
    print("=" * 64)
    print(f" Lokal:          http://127.0.0.1:{port}")
    print(f" Im Netzwerk:    http://{local_ip}:{port}")
    print(f" Konfiguration:  {CONFIG_PATH}")
    print(" Zum Beenden dieses Fenster schliessen oder STRG+C druecken.")
    print("=" * 64)

    open_browser_delayed(f"http://127.0.0.1:{port}")

    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
