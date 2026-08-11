# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

## [1.7.0] – Portnamen, Rahmen-Mehrfachauswahl mit Gruppen-Verschieben

- **Neu – Portnamen:** Einzelne Ports von Switch/Router/Patchfeld können
  jetzt zusätzlich zur Portnummer einen eigenen Namen bekommen (z. B.
  „Uplink WAN", „Server-Rack A"). Zwei Wege dafür:
  - Schnell: Doppelklick direkt auf einen Port öffnet ein kleines
    Eingabefeld an der Klickposition.
  - Vollständig: Der Element-Dialog (✎) zeigt bei Switch/Router/Patchfeld
    jetzt eine scrollbare Liste mit einem Namensfeld je Port, die sich
    automatisch an die eingestellte Portanzahl anpasst.
  - Benannte Ports sind an einer farbigen Unterkante zu erkennen; der volle
    Name erscheint als Tooltip beim Draufzeigen.
- **Neu – Rahmen-Mehrfachauswahl:** Im Bearbeitungsmodus bei gehaltener
  Umschalttaste (Shift) auf leerer Fläche ziehen, um einen Auswahlrahmen
  aufzuziehen. Alle Elemente, die der Rahmen berührt, werden markiert
  (orange Umrandung). Anschließend an einem der markierten Elemente
  ziehen, um **alle markierten Elemente parallel/gemeinsam zu
  verschieben** (Rasterfang gilt weiterhin für jedes Element einzeln).
  Klick auf leere Fläche ohne Shift hebt die Auswahl wieder auf, ebenso
  die Escape-Taste.
- `config.json`: Elemente mit Ports erhalten optional das Feld
  `port_names` (Liste von Zeichenketten, indexgleich zu den Ports).
  Bestehende Konfigurationen ohne dieses Feld funktionieren unverändert
  weiter.

## [1.6.1] – Grundlegender Bugfix: Leitungen/Buttons waren gar nicht klickbar

- **Ursache gefunden und behoben:** Die Element-Ebene (`#elementLayer`)
  lag als vollflächiger, transparenter Layer *über* der gesamten
  Verbindungs-Ebene (SVG) im Canvas. Da diese Ebene keine
  `pointer-events: none` besaß, fing sie **jeden** Mausklick im Canvas ab –
  auch an Stellen ohne sichtbares Element. Dadurch kamen Klicks auf
  Leitungen, den „✎"-Bearbeiten-Button an Verbindungen, Wegpunkte und die
  Bezeichnung nie bei der darunterliegenden SVG-Ebene an. Das erklärt auch
  frühere Probleme mit dem Ändern von Namen und dem (inzwischen entfernten)
  Doppelklick-Verhalten.
- `#elementLayer` hat jetzt `pointer-events: none`, `.net-element`
  (und damit alle Kind-Elemente wie Buttons, Ports, Link-Button) setzt
  `pointer-events: auto` gezielt wieder zurück. Klicks auf leere Stellen
  fallen dadurch korrekt durch zur Verbindungs-Ebene.
- Betrifft alle Interaktionen mit Verbindungen: Leitung anklicken (Dialog),
  „✎"-Button (Kontextmenü), Wegpunkte ziehen/entfernen, Bezeichnung ziehen.
  Auch das Verschieben der Ansicht (Pan) durch Ziehen auf leerer Fläche ist
  davon betroffen und jetzt zuverlässiger.

## [1.6.0] – Zuverlässiger Bearbeiten-Button an Leitungen, IP-Anzeige an Elementen

- **Behoben:** Das Doppelklick-Kontextmenü aus v1.5.0 hat nicht zuverlässig
  funktioniert (Race Condition: Wenn der zweite Klick etwas später als das
  interne Zeitfenster kam, öffnete sich stattdessen bereits der
  vollständige Dialog und "schluckte" den Doppelklick). Die komplette
  Doppelklick-Erkennung an Leitungen wurde entfernt.
- **Neu – fester Bearbeiten-Button je Leitung:** Jede Leitung zeigt jetzt
  im Bearbeitungsmodus einen eigenen „✎"-Button (wie schon an den
  Elementen), der zuverlässig mit einem einzelnen Klick das Menü für Name,
  Farbe, „+ Wegpunkt hier" und „Entfernen" öffnet.
- Ein Klick auf die Leitung selbst öffnet weiterhin sofort (ohne Verzögerung)
  den vollständigen Dialog für Stärke und „Linie zurücksetzen".
- **Neu – IP-Anzeige an Elementen:** Jedes Element zeigt jetzt automatisch
  die aus der ersten hinterlegten Webseite extrahierte IP-Adresse bzw.
  den Hostnamen direkt auf der Karte an (z. B. „IP: 192.168.1.2"), ganz
  ohne den Bearbeiten-Dialog öffnen zu müssen. Funktioniert sowohl mit
  vollständigen URLs (`https://192.168.1.2/admin`) als auch mit reinen
  Host-/IP-Angaben ohne Schema.

## [1.5.0] – Verbindungs-Kontextmenü (Name, Farbe, Entfernen)

- **Behoben:** Die Rechtsklick-Schnellbeschriftung aus v1.4.0 funktionierte
  nicht zuverlässig und wurde vollständig entfernt.
- **Neu – Kontextmenü per Doppelklick:** Ein Doppelklick auf eine Leitung
  (oder auf ihre Bezeichnung) öffnet im Bearbeitungsmodus jetzt ein kleines
  Menü direkt an der Klickposition mit:
  - Textfeld für die **Bezeichnung** (Änderung wird sofort auf der Leitung
    live angezeigt),
  - **Farbauswahl** (Presets + freier Farbwähler),
  - Button **„+ Wegpunkt hier"**, um an dieser Stelle die Linienführung
    anzupassen,
  - Button **„Entfernen"**, um genau diese Leitung einzeln zu löschen
    (mit Sicherheitsabfrage).
- Das Menü schließt sich automatisch (und speichert dabei) bei Klick
  außerhalb, bei Escape oder bei Enter im Namensfeld.
- Der vollständige Verbindungs-Dialog (einfacher Klick auf die Leitung)
  bleibt zusätzlich verfügbar für Leitungsstärke und „Linie zurücksetzen"
  (alle Wegpunkte auf einmal entfernen) und besitzt ebenfalls einen
  „Löschen"-Button.
- Damit sind Leitungen jetzt auf zwei Wegen einzeln entfernbar: schnell
  über das neue Doppelklick-Kontextmenü oder über den vollständigen Dialog.

## [1.4.0] – Verbindungs-Bezeichnungen einfacher anlegen und platzieren

- **Rechtsklick zum Anlegen:** Ein Rechtsklick auf eine Leitung öffnet ein
  kleines Eingabefeld direkt an der Klickposition. Text eingeben, Enter
  drücken – fertig. Die Bezeichnung erscheint sofort genau dort, wo
  geklickt wurde (kein Umweg mehr über den vollständigen Dialog nötig).
- **Frei platzierbar:** Eine gesetzte Bezeichnung lässt sich anschließend
  per Ziehen an eine beliebige Stelle verschieben (auch abseits der
  Leitung, für bessere Lesbarkeit). Ist sie weiter von der Leitung entfernt
  platziert, zeigt eine dünne gestrichelte Führungslinie die Zuordnung.
- **Jederzeit nachbearbeitbar:** Rechtsklick direkt auf eine bestehende
  Bezeichnung öffnet dasselbe Eingabefeld zum Ändern des Texts. Der
  vollständige Verbindungs-Dialog (Klick auf die Leitung) bietet das
  Textfeld weiterhin zusätzlich an.
- Wird der Text geleert, verschwindet die Bezeichnung und ihre freie
  Position wird zurückgesetzt (danach wieder automatisch mittig auf der
  Leitung, sobald erneut ein Text gesetzt wird).
- `config.json`: Jede Verbindung hat jetzt zusätzlich das Feld `label_at`
  (`{x, y}` in Canvas-Koordinaten oder `null` für automatische Position auf
  der Leitungsmitte). Bestehende Konfigurationen ohne dieses Feld
  funktionieren unverändert weiter.

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
