/* =========================================================================
   Netzwerkplan – Frontend-Logik
   ========================================================================= */

const ELEMENT_TYPES = {
  gateway:     { label: "Gateway",       icon: "🌐", color: "#3ad6ff" },
  router:      { label: "Router",        icon: "⇋",  color: "#ff8a3d" },
  switch:      { label: "Switch",        icon: "⇄",  color: "#3ad6ff" },
  server:      { label: "Server",        icon: "▤",  color: "#35d68f" },
  pc:          { label: "PC",            icon: "🖥",  color: "#e8edf4" },
  laptop:      { label: "Laptop",        icon: "💻", color: "#e8edf4" },
  raspberry_pi:{ label: "Raspberry Pi",  icon: "◍",  color: "#ff4d5e" },
  lan_socket:  { label: "LAN-Dose",      icon: "▣",  color: "#9aa7b8" },
  camera:      { label: "Kamera",        icon: "◉",  color: "#ffd23d" },
  patchpanel:  { label: "Patchfeld",     icon: "▦",  color: "#9aa7b8" },
  generic:     { label: "Sonstiges",     icon: "▪",  color: "#9aa7b8" },
};

const CONNECTION_COLORS = [
  "#3ad6ff", "#ff8a3d", "#35d68f", "#ff4d5e",
  "#ffd23d", "#b98bff", "#e8edf4", "#5c6b7f",
];

const DEFAULT_ELEMENT_W = 148;
const DEFAULT_ELEMENT_H = 76;

/* Elementtypen mit eigenen Anschluss-Ports (je Port ein Andockpunkt fuer
   Verbindungsleitungen). Wert = Standard-Portanzahl bei neuen Elementen. */
const DEFAULT_PORTS = {
  switch: 8,
  router: 4,
  patchpanel: 24,
};
const PORT_MIN = 1, PORT_MAX = 48;
const PORT_DOT = 14, PORT_GAP = 5;

function hasPorts(type) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_PORTS, type);
}
function getPortCount(el) {
  if (!hasPorts(el.type)) return 0;
  const n = parseInt(el.ports, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORTS[el.type];
}

let config = null;
let mode = "edit"; // "edit" | "use"

let scale = 1, panX = 0, panY = 0;
const ZOOM_MIN = 0.25, ZOOM_MAX = 2.5;

let isPanning = false, panStart = { x: 0, y: 0 }, panOrigin = { x: 0, y: 0 };
let draggingEl = null, dragOffset = { x: 0, y: 0 };
let connectMode = false, connectFrom = null; // connectFrom = { id, port } | { id, port: null }
let editingElementId = null;
let editingConnId = null;
let selectedColor = CONNECTION_COLORS[0];

/* Relative Position jedes Ports innerhalb seines Elements (in Canvas-Pixeln,
   unabhaengig vom Zoom). Wird nach jedem Rendern der Elemente neu berechnet. */
let portRelOffsets = {}; // { elementId: [{x,y}, ...] }

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const viewport = $("#viewport");
const canvas = $("#canvas");
const elementLayer = $("#elementLayer");
const connectionLayer = $("#connectionLayer");

/* ------------------------------------------------------------------ */
/* Initialisierung                                                     */
/* ------------------------------------------------------------------ */

async function init() {
  const res = await fetch("/api/config");
  config = await res.json();

  scale = config.view?.zoom ?? 1;
  panX = config.view?.pan_x ?? 0;
  panY = config.view?.pan_y ?? 0;
  mode = config.mode === "use" ? "use" : "edit";

  $("#chkGrid").checked = config.view?.show_grid ?? true;
  $("#chkSnap").checked = config.view?.snap_to_grid ?? true;

  buildPalette();
  buildColorRow();
  buildTypeSelect();
  applyMode();
  applyTransform();
  applyGridVisibility();
  renderAll();

  $("#ipText").textContent = window.location.host;

  bindGlobalEvents();
}

/* ------------------------------------------------------------------ */
/* Palette (Edit-Modus): Elementtypen zum Hinzufuegen                  */
/* ------------------------------------------------------------------ */

function buildPalette() {
  const palette = $("#palette");
  palette.innerHTML = "";
  for (const [type, def] of Object.entries(ELEMENT_TYPES)) {
    const item = document.createElement("div");
    item.className = "palette-item";
    item.title = "Hinzufuegen: " + def.label;
    item.textContent = def.icon;
    item.addEventListener("click", () => addElement(type));
    palette.appendChild(item);
  }
}

function buildTypeSelect() {
  const sel = $("#fType");
  sel.innerHTML = "";
  for (const [type, def] of Object.entries(ELEMENT_TYPES)) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = def.label;
    sel.appendChild(opt);
  }
}

function buildColorRow() {
  const row = $("#colorRow");
  row.innerHTML = "";
  for (const color of CONNECTION_COLORS) {
    const sw = document.createElement("div");
    sw.className = "color-swatch";
    sw.style.background = color;
    sw.dataset.color = color;
    sw.addEventListener("click", () => {
      selectedColor = color;
      $$(".color-swatch").forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
    });
    row.appendChild(sw);
  }
}

/* ------------------------------------------------------------------ */
/* Modus: Bearbeitung <-> Nutzung                                      */
/* ------------------------------------------------------------------ */

function applyMode() {
  const btn = $("#modeToggle");
  const label = $("#modeToggleLabel");
  const editTools = $("#editTools");
  document.body.classList.toggle("edit-mode", mode === "edit");
  document.body.classList.toggle("use-mode", mode === "use");

  if (mode === "edit") {
    label.textContent = "BEARBEITUNGSMODUS";
    btn.classList.remove("use-mode");
    editTools.classList.remove("disabled");
  } else {
    label.textContent = "NUTZUNGSMODUS";
    btn.classList.add("use-mode");
    editTools.classList.add("disabled");
    connectMode = false;
    viewport.classList.remove("connect-mode");
    connectFrom = null;
  }
  setStatus(mode === "edit"
    ? "Bearbeitungsmodus – Elemente verschieben, verbinden und bearbeiten."
    : "Nutzungsmodus – nur Links oeffnen moeglich.");
}

$("#modeToggle").addEventListener("click", () => {
  mode = mode === "edit" ? "use" : "edit";
  config.mode = mode;
  applyMode();
  renderAll();
  persistConfig();
});

/* ------------------------------------------------------------------ */
/* Zoom / Pan                                                          */
/* ------------------------------------------------------------------ */

function applyTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  $("#zoomLabel").textContent = Math.round(scale * 100) + "%";
}

function applyGridVisibility() {
  canvas.classList.toggle("no-grid", !$("#chkGrid").checked);
}

function zoomAt(clientX, clientY, factor) {
  const rect = viewport.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale * factor));
  const ratio = newScale / scale;
  panX = x - (x - panX) * ratio;
  panY = y - (y - panY) * ratio;
  scale = newScale;
  applyTransform();
}

viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  zoomAt(e.clientX, e.clientY, factor);
  saveViewDebounced();
}, { passive: false });

$("#btnZoomIn").addEventListener("click", () => {
  const rect = viewport.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
  saveViewDebounced();
});
$("#btnZoomOut").addEventListener("click", () => {
  const rect = viewport.getBoundingClientRect();
  zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.83);
  saveViewDebounced();
});
$("#btnZoomReset").addEventListener("click", () => {
  scale = 1; panX = 0; panY = 0;
  applyTransform();
  saveViewDebounced();
});

/* Pan bei Klick auf leere Flaeche */
viewport.addEventListener("mousedown", (e) => {
  if (e.target !== viewport && e.target !== canvas) return;
  if (connectMode) return;
  isPanning = true;
  panStart = { x: e.clientX, y: e.clientY };
  panOrigin = { x: panX, y: panY };
  viewport.classList.add("panning");
});

window.addEventListener("mousemove", (e) => {
  if (isPanning) {
    panX = panOrigin.x + (e.clientX - panStart.x);
    panY = panOrigin.y + (e.clientY - panStart.y);
    applyTransform();
  }
  if (draggingEl) {
    moveDraggingElement(e);
  }
});

window.addEventListener("mouseup", () => {
  if (isPanning) {
    isPanning = false;
    viewport.classList.remove("panning");
    saveViewDebounced();
  }
  if (draggingEl) {
    finishDraggingElement();
  }
});

/* ------------------------------------------------------------------ */
/* Elemente: Rendern                                                   */
/* ------------------------------------------------------------------ */

function renderAll() {
  renderElements();
  renderConnections();
}

function renderElements() {
  elementLayer.innerHTML = "";
  for (const el of config.elements) {
    elementLayer.appendChild(buildElementNode(el));
  }
  computePortRelOffsets();
}

function buildElementNode(el) {
  const def = ELEMENT_TYPES[el.type] || ELEMENT_TYPES.generic;
  const node = document.createElement("div");
  node.className = "net-element";
  node.dataset.id = el.id;
  node.style.left = el.x + "px";
  node.style.top = el.y + "px";

  const hasLinks = Array.isArray(el.links) && el.links.filter(Boolean).length > 0;
  const portCount = getPortCount(el);

  node.innerHTML = `
    <div class="el-head">
      <div class="el-icon" style="color:${def.color}">${def.icon}</div>
      <div>
        <div class="el-name">${escapeHtml(el.name || "(ohne Namen)")}</div>
        <div class="el-type">${def.label}</div>
      </div>
    </div>
    <div class="el-location">${escapeHtml(el.location || "")}</div>
    <button class="el-link-btn" ${hasLinks ? "" : "disabled"}>↗ Webseite oeffnen</button>
  `;

  if (portCount > 0) {
    const portsWrap = document.createElement("div");
    portsWrap.className = "ports-container";
    for (let i = 0; i < portCount; i++) {
      const dot = document.createElement("div");
      dot.className = "port-dot";
      dot.dataset.port = String(i);
      dot.title = "Port " + (i + 1);
      dot.textContent = String(i + 1);
      portsWrap.appendChild(dot);
    }
    node.appendChild(portsWrap);
  }

  if (mode === "edit") {
    const editBtn = document.createElement("div");
    editBtn.className = "el-edit-btn";
    editBtn.textContent = "✎";
    editBtn.title = "Bearbeiten";
    editBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openElementModal(el.id);
    });
    node.appendChild(editBtn);
  }

  node.querySelector(".el-link-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (hasLinks) openLinks(el);
  });

  node.addEventListener("mousedown", (e) => {
    if (e.target.closest(".el-link-btn") || e.target.closest(".el-edit-btn")) return;
    if (mode === "edit" && !connectMode) {
      startDraggingElement(el.id, node, e);
    }
  });

  if (portCount > 0) {
    /* Elemente mit Ports: Verbindungen duerfen nur an einem konkreten
       Port-Andockpunkt gestartet/beendet werden, nicht am Element selbst. */
    node.querySelectorAll(".port-dot").forEach((dot) => {
      dot.addEventListener("mousedown", (e) => e.stopPropagation());
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        if (mode === "edit" && connectMode) {
          handleConnectPick(el.id, parseInt(dot.dataset.port, 10));
        }
      });
    });
  } else {
    node.addEventListener("click", (e) => {
      if (e.target.closest(".el-link-btn") || e.target.closest(".el-edit-btn")) return;
      if (mode === "edit" && connectMode) {
        handleConnectPick(el.id, null);
      }
    });
  }

  return node;
}

/* Berechnet fuer jedes Element mit Ports die Position jedes Port-Andockpunkts
   relativ zur linken oberen Ecke des Elements (in unskalierten Canvas-Pixeln).
   Muss nach jedem Neu-Rendern der Elemente aufgerufen werden. */
function computePortRelOffsets() {
  portRelOffsets = {};
  elementLayer.querySelectorAll(".net-element").forEach((node) => {
    const dots = node.querySelectorAll(".port-dot");
    if (dots.length === 0) return;
    const id = node.dataset.id;
    portRelOffsets[id] = Array.from(dots).map((dot) => ({
      x: dot.offsetLeft + dot.offsetWidth / 2,
      y: dot.offsetTop + dot.offsetHeight / 2,
    }));
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

/* ------------------------------------------------------------------ */
/* Elemente: Hinzufuegen / Verschieben / Bearbeiten / Loeschen         */
/* ------------------------------------------------------------------ */

function addElement(type) {
  const rect = viewport.getBoundingClientRect();
  const centerX = (rect.width / 2 - panX) / scale - DEFAULT_ELEMENT_W / 2;
  const centerY = (rect.height / 2 - panY) / scale - DEFAULT_ELEMENT_H / 2;

  const el = {
    id: "el-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    type,
    name: ELEMENT_TYPES[type].label + " neu",
    location: "",
    x: snap(Math.max(0, centerX)),
    y: snap(Math.max(0, centerY)),
    links: [],
  };
  if (hasPorts(type)) {
    el.ports = DEFAULT_PORTS[type];
  }
  config.elements.push(el);
  renderElements();
  renderConnections();
  persistConfig();
  openElementModal(el.id);
}

function snap(value) {
  if (!$("#chkSnap").checked) return Math.round(value);
  const size = config.view?.grid_size || 40;
  return Math.round(value / size) * size;
}

function startDraggingElement(id, node, e) {
  const el = config.elements.find((x) => x.id === id);
  if (!el) return;
  draggingEl = { id, node };
  const rect = node.getBoundingClientRect();
  dragOffset.x = (e.clientX - rect.left) / scale;
  dragOffset.y = (e.clientY - rect.top) / scale;
  node.classList.add("dragging");
  node.classList.add("selected");
  e.stopPropagation();
}

function moveDraggingElement(e) {
  const el = config.elements.find((x) => x.id === draggingEl.id);
  if (!el) return;
  const rect = viewport.getBoundingClientRect();
  const x = (e.clientX - rect.left - panX) / scale - dragOffset.x;
  const y = (e.clientY - rect.top - panY) / scale - dragOffset.y;
  el.x = Math.max(0, x);
  el.y = Math.max(0, y);
  draggingEl.node.style.left = el.x + "px";
  draggingEl.node.style.top = el.y + "px";
  renderConnections();
}

function finishDraggingElement() {
  const el = config.elements.find((x) => x.id === draggingEl.id);
  if (el) {
    el.x = snap(el.x);
    el.y = snap(el.y);
    draggingEl.node.style.left = el.x + "px";
    draggingEl.node.style.top = el.y + "px";
  }
  draggingEl.node.classList.remove("dragging");
  draggingEl = null;
  renderConnections();
  persistConfig();
}

function updatePortsFieldVisibility() {
  const type = $("#fType").value;
  const row = $("#fPortsRow");
  if (hasPorts(type)) {
    row.classList.remove("hidden-field");
    if (!$("#fPorts").value) $("#fPorts").value = DEFAULT_PORTS[type];
  } else {
    row.classList.add("hidden-field");
  }
}

function openElementModal(id) {
  editingElementId = id;
  const el = config.elements.find((x) => x.id === id);
  if (!el) return;
  $("#elementModalTitle").textContent = "Element bearbeiten";
  $("#fName").value = el.name || "";
  $("#fLocation").value = el.location || "";
  $("#fType").value = el.type;
  $("#fLinks").value = (el.links || []).join("\n");
  $("#fPorts").value = hasPorts(el.type) ? getPortCount(el) : "";
  updatePortsFieldVisibility();
  $("#elementModal").classList.remove("hidden");
  $("#fName").focus();
}

$("#fType").addEventListener("change", updatePortsFieldVisibility);

$("#fCancel").addEventListener("click", () => $("#elementModal").classList.add("hidden"));

$("#fSave").addEventListener("click", () => {
  const el = config.elements.find((x) => x.id === editingElementId);
  if (!el) return;
  el.name = $("#fName").value.trim() || "(ohne Namen)";
  el.location = $("#fLocation").value.trim();
  el.type = $("#fType").value;
  el.links = $("#fLinks").value.split("\n").map((s) => s.trim()).filter(Boolean);

  if (hasPorts(el.type)) {
    let n = parseInt($("#fPorts").value, 10);
    if (!Number.isFinite(n)) n = DEFAULT_PORTS[el.type];
    n = Math.min(PORT_MAX, Math.max(PORT_MIN, n));
    el.ports = n;
    // Verbindungen, die auf nun nicht mehr existierende Ports zeigen, kappen
    // (Verbindung bleibt bestehen, dockt dann am Element-Mittelpunkt an).
    config.connections.forEach((c) => {
      if (c.from === el.id && c.from_port !== null && c.from_port !== undefined && c.from_port >= n) {
        c.from_port = null;
      }
      if (c.to === el.id && c.to_port !== null && c.to_port !== undefined && c.to_port >= n) {
        c.to_port = null;
      }
    });
  } else {
    delete el.ports;
  }

  $("#elementModal").classList.add("hidden");
  renderElements();
  renderConnections();
  persistConfig();
});

$("#fDelete").addEventListener("click", () => {
  if (!confirm("Dieses Element inklusive aller Verbindungen loeschen?")) return;
  config.elements = config.elements.filter((x) => x.id !== editingElementId);
  config.connections = config.connections.filter(
    (c) => c.from !== editingElementId && c.to !== editingElementId
  );
  $("#elementModal").classList.add("hidden");
  renderAll();
  persistConfig();
});

/* ------------------------------------------------------------------ */
/* Links oeffnen (Nutzungs- und Bearbeitungsmodus)                     */
/* ------------------------------------------------------------------ */

function openLinks(el) {
  const links = (el.links || []).filter(Boolean);
  if (links.length === 0) return;
  if (links.length === 1) {
    window.open(links[0], "_blank", "noopener");
    return;
  }
  editingElementId = el.id;
  $("#linksModalTitle").textContent = el.name + " – Webseiten";
  const list = $("#linksList");
  list.innerHTML = "";
  links.forEach((url) => {
    const row = document.createElement("div");
    row.className = "link-item";
    row.innerHTML = `<span title="${escapeHtml(url)}">${escapeHtml(url)}</span>`;
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "Oeffnen";
    btn.addEventListener("click", () => window.open(url, "_blank", "noopener"));
    row.appendChild(btn);
    list.appendChild(row);
  });
  $("#linksModal").classList.remove("hidden");
}

$("#lCancel").addEventListener("click", () => $("#linksModal").classList.add("hidden"));
$("#lOpenAll").addEventListener("click", () => {
  const el = config.elements.find((x) => x.id === editingElementId);
  if (!el) return;
  (el.links || []).filter(Boolean).forEach((url) => window.open(url, "_blank", "noopener"));
  $("#linksModal").classList.add("hidden");
});

/* ------------------------------------------------------------------ */
/* Verbindungen                                                        */
/* ------------------------------------------------------------------ */

$("#btnConnectMode").addEventListener("click", () => {
  connectMode = !connectMode;
  connectFrom = null;
  viewport.classList.toggle("connect-mode", connectMode);
  $("#btnConnectMode").classList.toggle("btn-primary", connectMode);
  clearConnectPickHighlight();
  setStatus(connectMode
    ? "Verbindungsmodus: Element bzw. bei Switch/Router/Patchfeld einen Port anklicken."
    : "Bereit");
});

function portPickNode(id, port) {
  const node = elementLayer.querySelector(`.net-element[data-id="${id}"]`);
  if (!node) return null;
  if (port === null || port === undefined) return node;
  return node.querySelector(`.port-dot[data-port="${port}"]`);
}

function clearConnectPickHighlight() {
  $$(".net-element.connect-pick").forEach((n) => n.classList.remove("connect-pick"));
  $$(".port-dot.port-picked").forEach((n) => n.classList.remove("port-picked"));
}

function handleConnectPick(id, port) {
  const targetNode = portPickNode(id, port);
  if (!targetNode) return;

  if (!connectFrom) {
    connectFrom = { id, port: port ?? null };
    targetNode.classList.add(port === null || port === undefined ? "connect-pick" : "port-picked");
    setStatus("Zweiten Anschluss / zweites Element fuer die Verbindung anklicken.");
    return;
  }

  // Erneuter Klick auf denselben Startpunkt -> Auswahl aufheben
  if (connectFrom.id === id && (connectFrom.port ?? null) === (port ?? null)) {
    clearConnectPickHighlight();
    connectFrom = null;
    return;
  }

  const conn = {
    id: "conn-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    from: connectFrom.id,
    to: id,
    from_port: connectFrom.port ?? null,
    to_port: port ?? null,
    color: selectedColor,
    thickness: 4,
    label: "",
  };
  config.connections.push(conn);
  clearConnectPickHighlight();
  connectFrom = null;
  renderConnections();
  persistConfig();
  setStatus("Verbindung erstellt. Naechste Verbindung: ersten Anschluss anklicken.");
}

function renderConnections() {
  connectionLayer.innerHTML = "";
  for (const conn of config.connections) {
    const fromEl = config.elements.find((x) => x.id === conn.from);
    const toEl = config.elements.find((x) => x.id === conn.to);
    if (!fromEl || !toEl) continue;

    const p1 = connectionEndpoint(fromEl, conn.from_port);
    const p2 = connectionEndpoint(toEl, conn.to_port);
    const path = buildBezierPath(p1, p2);

    const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitbox.setAttribute("d", path);
    hitbox.setAttribute("class", "conn-hitbox");

    const visible = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visible.setAttribute("d", path);
    visible.setAttribute("class", "conn-path");
    visible.setAttribute("stroke", conn.color || "#3ad6ff");
    visible.setAttribute("stroke-width", conn.thickness || 4);
    visible.style.color = conn.color || "#3ad6ff";
    visible.style.pointerEvents = "none";

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.style.pointerEvents = mode === "edit" ? "auto" : "none";
    if (mode === "edit") {
      hitbox.addEventListener("click", () => openConnModal(conn.id));
    }
    group.appendChild(hitbox);
    group.appendChild(visible);

    if (conn.label) {
      const mid = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2 - 6,
      };
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", mid.x);
      text.setAttribute("y", mid.y);
      text.setAttribute("class", "conn-label");
      text.setAttribute("text-anchor", "middle");
      text.textContent = conn.label;
      group.appendChild(text);
    }

    connectionLayer.appendChild(group);
  }
}

function elementCenter(el) {
  return { x: el.x + DEFAULT_ELEMENT_W / 2, y: el.y + DEFAULT_ELEMENT_H / 2 };
}

/* Liefert den Andockpunkt einer Verbindung: bei Switch/Router/Patchfeld den
   konkreten Port (falls vorhanden), sonst den Element-Mittelpunkt. */
function connectionEndpoint(el, portIndex) {
  const rel = portRelOffsets[el.id];
  if (portIndex !== null && portIndex !== undefined && rel && rel[portIndex]) {
    return { x: el.x + rel[portIndex].x, y: el.y + rel[portIndex].y };
  }
  return elementCenter(el);
}

/* Geschwungene, dicke Verbindungslinien im Stil von harness.design */
function buildBezierPath(p1, p2) {
  const dx = Math.abs(p2.x - p1.x);
  const curve = Math.max(60, dx * 0.4);
  const c1x = p1.x + curve;
  const c1y = p1.y;
  const c2x = p2.x - curve;
  const c2y = p2.y;
  return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

function openConnModal(id) {
  editingConnId = id;
  const conn = config.connections.find((c) => c.id === id);
  if (!conn) return;
  $("#cLabel").value = conn.label || "";
  $("#cThickness").value = conn.thickness || 4;
  $("#cThicknessVal").textContent = conn.thickness || 4;
  selectedColor = conn.color || CONNECTION_COLORS[0];
  $$(".color-swatch").forEach((s) => {
    s.classList.toggle("selected", s.dataset.color === selectedColor);
  });
  $("#connModal").classList.remove("hidden");
}

$("#cThickness").addEventListener("input", (e) => {
  $("#cThicknessVal").textContent = e.target.value;
});

$("#cCancel").addEventListener("click", () => $("#connModal").classList.add("hidden"));

$("#cSave").addEventListener("click", () => {
  const conn = config.connections.find((c) => c.id === editingConnId);
  if (!conn) return;
  conn.label = $("#cLabel").value.trim();
  conn.thickness = parseInt($("#cThickness").value, 10);
  conn.color = selectedColor;
  $("#connModal").classList.add("hidden");
  renderConnections();
  persistConfig();
});

$("#cDelete").addEventListener("click", () => {
  config.connections = config.connections.filter((c) => c.id !== editingConnId);
  $("#connModal").classList.add("hidden");
  renderConnections();
  persistConfig();
});

/* ------------------------------------------------------------------ */
/* Raster / Einrasten Toggle                                           */
/* ------------------------------------------------------------------ */

$("#chkGrid").addEventListener("change", () => {
  config.view.show_grid = $("#chkGrid").checked;
  applyGridVisibility();
  persistConfig();
});
$("#chkSnap").addEventListener("change", () => {
  config.view.snap_to_grid = $("#chkSnap").checked;
  persistConfig();
});

/* ------------------------------------------------------------------ */
/* Speichern                                                            */
/* ------------------------------------------------------------------ */

let saveTimer = null;
function saveViewDebounced() {
  config.view.zoom = scale;
  config.view.pan_x = panX;
  config.view.pan_y = panY;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistConfig, 600);
}

async function persistConfig() {
  config.view.zoom = scale;
  config.view.pan_x = panX;
  config.view.pan_y = panY;
  try {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setStatus("Gespeichert.");
  } catch (err) {
    setStatus("Fehler beim Speichern!");
  }
}

$("#btnSave").addEventListener("click", persistConfig);

function setStatus(text) {
  $("#statusText").textContent = text;
}

/* ------------------------------------------------------------------ */
/* Globale Events                                                      */
/* ------------------------------------------------------------------ */

function bindGlobalEvents() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#elementModal").classList.add("hidden");
      $("#connModal").classList.add("hidden");
      $("#linksModal").classList.add("hidden");
      if (connectMode) {
        connectMode = false;
        connectFrom = null;
        viewport.classList.remove("connect-mode");
        $("#btnConnectMode").classList.remove("btn-primary");
        clearConnectPickHighlight();
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    // Bestes Bemuehen: letzten Stand synchron sichern
    navigator.sendBeacon &&
      navigator.sendBeacon(
        "/api/config",
        new Blob([JSON.stringify(config)], { type: "application/json" })
      );
  });
}

init();
