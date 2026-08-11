# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

## [1.3.0] – Leitungsführung: weniger Verknoten, manuell anpassbar

- **Richtungsbasiertes Auto-Routing:** Leitungen, die an einem konkreten
  Port (Switch/Router/Patchfeld) beginnen oder enden, verlassen das
  Element jetzt senkrecht zur Portseite (z. B. nach unten, wenn die Ports
  unten liegen), statt immer in eine feste Richtung zu kurven. Dadurch
  laufen deutlich weniger Leitungen quer durchs Element oder durch andere
  Elemente hindurch.
- **Leitungen manuell verlegen:** Ein Doppelklick auf eine Leitung fügt an
  der geklickten Stelle einen frei verschiebbaren Wegpunkt hinzu. Beliebig
  viele Wegpunkte können gesetzt und per Ziehen verschoben werden, um die
  Leitung gezielt um andere Elemente oder Leitungen herumzuführen. Ein
  Doppelklick auf einen Wegpunkt entfernt ihn wieder.
- Die Linienführung wird als sanft abgerundete Kabelverlegung durch die
  Wegpunkte dargestellt (statt einer einzigen Kurve).
- Im Verbindungs-Dialog gibt es jetzt den Button „Linie zurücksetzen“, der
  alle manuell gesetzten Wegpunkte entfernt und zur automatischen
  Linienführung zurückkehrt.
- `config.json`: Jede Verbindung hat jetzt zusätzlich das Feld `waypoints`
  (Liste von `{x, y}`-Punkten in Canvas-Koordinaten, standardmäßig leer =
  automatische Linienführung). Bestehende Konfigurationen ohne dieses Feld
  funktionieren unverändert weiter (automatische Ergänzung beim Laden).

## [1.2.0] – Ports in einer Reihe, dreh-/spiegelbar, freie Leitungsfarben, aufgeräumter Nutzungsmodus

- **Ports in einer Reihe:** Alle Ports eines Switch/Router/Patchfelds liegen
  jetzt gemeinsam auf einer Seite des Elements in einer einzigen Reihe
  (nicht mehr umbrechend), statt in einem Raster verteilt zu sein.
- **Rotierbar:** Über den Button „⟳“ am Element lässt sich die Seite, auf
  der die Ports liegen, im Uhrzeigersinn durch unten → links → oben →
  rechts drehen.
- **Spiegelbar:** Über den Button „⇋“ lässt sich die Reihenfolge der Ports
  innerhalb der Reihe umkehren – beides zusammen erlaubt es, das Element so
  auszurichten, dass Leitungen möglichst kreuzungsfrei und gut lesbar
  verlaufen.
- **Klare Zuordnung Leitung↔Port:** Ein belegter Port färbt sich automatisch
  in der Farbe seiner Verbindung ein, sodass auf einen Blick erkennbar ist,
  welche Leitung an welchem Port hängt.
- **Freie Farbwahl für Leitungen:** Zusätzlich zu den Farb-Presets gibt es
  jetzt einen echten Farbwähler (Color-Picker) – sowohl beim Bearbeiten
  einer bestehenden Verbindung als auch direkt in der Werkzeugleiste beim
  Ziehen neuer Verbindungen.
- **Nutzungsmodus aufgeräumt:** Die Bedienelemente des Bearbeitungsmodus
  (Element-Palette, „Verbindung“-Button, Raster-/Einrasten-Kontrollkästchen,
  „Speichern“-Button, Farbwähler) werden im Nutzungsmodus jetzt vollständig
  ausgeblendet statt nur ausgegraut. Sichtbar bleiben nur der Moduswechsel
  und die Zoom-Steuerung.
- `config.json`: Elemente mit Ports erhalten zusätzlich die Felder
  `port_side` (`"bottom"`/`"top"`/`"left"`/`"right"`, Standard `"bottom"`)
  und `port_mirror` (`true`/`false`, Standard `false`). Bestehende
  Konfigurationen ohne diese Felder funktionieren unverändert weiter.

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
