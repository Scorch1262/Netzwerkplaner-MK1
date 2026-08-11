# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

## [1.1.0] – Port-Andockpunkte für Switch, Patchfeld und Router

- Switches, Patchfelder und Router haben jetzt eine konfigurierbare Anzahl
  einzelner Ports (Standard: Switch = 8, Router = 4, Patchfeld = 24).
- Jeder Port ist ein eigener, nummerierter Andockpunkt am Element. Im
  Verbindungsmodus wird eine Verbindung bei diesen Elementen gezielt an
  einem konkreten Port begonnen bzw. beendet, statt am Element-Mittelpunkt.
- Andere Elementtypen (Server, PC, Laptop, Raspberry Pi, Gateway, LAN-Dose,
  Kamera, Sonstiges) verhalten sich unverändert (Verbindung am Element,
  kein Port erforderlich).
- Die Portanzahl ist im Bearbeiten-Dialog des Elements einstellbar (1–48).
  Wird sie verringert, werden Verbindungen zu nun nicht mehr existierenden
  Ports automatisch auf den Element-Mittelpunkt zurückgesetzt (bleiben
  erhalten, docken aber nicht mehr an einem konkreten Port an).
- `config.json`: Elemente mit Ports erhalten das Feld `ports` (Zahl),
  Verbindungen die Felder `from_port` / `to_port` (Portindex, 0-basiert,
  oder `null` für „kein bestimmter Port“ / Element-Mittelpunkt).
- Bestehende Konfigurationen aus v1.0.0 bleiben kompatibel: Fehlt `ports`
  bei einem Switch/Router/Patchfeld, wird automatisch die Standard-
  Portanzahl des Typs verwendet; fehlende `from_port`/`to_port` werden als
  „kein Port“ behandelt.

## [1.0.0] – Erste Version

- Frei platzierbarer Netzwerkplan mit Zoom/Pan, Raster und Einrasten.
- Elementtypen: Switch, Router, Server, PC, Laptop, Raspberry Pi, Gateway,
  LAN-Dose, Kamera, Patchfeld, Sonstiges – mit Name, Ort und verknüpften
  Webseiten (öffnen in neuem Tab).
- Farbige, unterschiedlich dicke Verbindungslinien zwischen Elementen
  (Bezier-Kurven im Stil von harness.design).
- Bearbeitungsmodus und Nutzungsmodus (nur Links öffnen, keine Änderungen).
- Dark-Theme im Stil von Anduril Lattice.
- Menschenlesbare `config.json` neben der exe (Ansicht, Elemente,
  Verbindungen, Server-Einstellungen).
- GitHub-Actions-Workflow zum automatischen Bauen der Windows-exe per
  PyInstaller (Artefakt bei jedem Push, Release bei `v*`-Tags).
