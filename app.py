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
