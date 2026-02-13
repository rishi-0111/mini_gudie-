/**
 * script.js — MiniGuide Navigation Frontend
 * ==========================================
 * Leaflet map with real-time GPS, OSRM routing, WebSocket live updates,
 * driving simulation, map-click point picking, and turn-by-turn steps.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE = `${window.location.protocol}//${window.location.host}`;
const WS_URL   = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/location`;

// ---------------------------------------------------------------------------
// Map setup
// ---------------------------------------------------------------------------
const map = L.map('map', { zoomControl: false }).setView([28.6139, 77.2090], 12);

L.control.zoom({ position: 'topright' }).addTo(map);

// Dark tile layer (CartoDB dark matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO',
  maxZoom: 19,
}).addTo(map);

// ---------------------------------------------------------------------------
// Custom icons
// ---------------------------------------------------------------------------
function svgIcon(emoji, size = 32) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;text-align:center">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const vehicleIcon = svgIcon('🚗', 36);
const startIcon   = svgIcon('🟢', 28);
const endIcon     = svgIcon('📍', 32);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let vehicleMarker = null;
let startMarker   = null;
let endMarker     = null;
let routeLayer    = null;    // primary route polyline
let altLayers     = [];      // alternative route polylines
let ws            = null;
let simInterval   = null;
let pickMode      = null;    // 'start' | 'end' | null
let currentRoute  = null;

// DOM refs
const $startLat   = document.getElementById('start-lat');
const $startLng   = document.getElementById('start-lng');
const $endLat     = document.getElementById('end-lat');
const $endLng     = document.getElementById('end-lng');
const $btnRoute   = document.getElementById('btn-route');
const $btnNav     = document.getElementById('btn-navigate');
const $btnStop    = document.getElementById('btn-stop');
const $btnSim     = document.getElementById('btn-simulate');
const $btnLocate  = document.getElementById('btn-locate');
const $btnPick    = document.getElementById('btn-pick');
const $infoBar    = document.getElementById('info-bar');
const $stepsPanel = document.getElementById('steps-panel');
const $toast      = document.getElementById('toast');
const $wsDot      = document.getElementById('ws-dot');
const $wsText     = document.getElementById('status-text');
const $clickHint  = document.getElementById('click-hint');

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function toast(msg, duration = 3000) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), duration);
}

function formatDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatDuration(s) {
  if (s < 60)   return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function maneuverIcon(type) {
  const icons = {
    'turn': '↩️',  'left': '⬅️',  'right': '➡️',  'straight': '⬆️',
    'slight left': '↖️', 'slight right': '↗️', 'sharp left': '↰',
    'sharp right': '↱', 'uturn': '🔄', 'depart': '🚀', 'arrive': '🏁',
    'roundabout': '🔁', 'merge': '🔀', 'fork': '🍴',
  };
  return icons[type] || '➡️';
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------
function connectWS() {
  if (ws && ws.readyState <= 1) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    $wsDot.classList.add('connected');
    $wsText.textContent = 'Connected';
    toast('🟢 WebSocket connected');
  };

  ws.onclose = () => {
    $wsDot.classList.remove('connected');
    $wsText.textContent = 'Disconnected';
    // Auto-reconnect after 3s
    setTimeout(connectWS, 3000);
  };

  ws.onerror = () => {
    $wsDot.classList.remove('connected');
    $wsText.textContent = 'Error';
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'location') {
      updateVehicle(msg.lat, msg.lng);
    }
    else if (msg.type === 'route_update') {
      drawRoute(msg.route);
      toast('🗺️ Route received');
    }
    else if (msg.type === 'reroute') {
      drawRoute(msg.route);
      toast('🔄 Rerouted — you were off track!');
    }
    else if (msg.type === 'nav_stopped') {
      clearRoute();
      toast('⏹ Navigation stopped');
    }
    else if (msg.type === 'error') {
      toast(`❌ ${msg.detail}`);
    }
  };
}

function sendWS(obj) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

// ---------------------------------------------------------------------------
// Vehicle marker
// ---------------------------------------------------------------------------
function updateVehicle(lat, lng) {
  if (!vehicleMarker) {
    vehicleMarker = L.marker([lat, lng], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map);
  } else {
    vehicleMarker.setLatLng([lat, lng]);
  }
}

// ---------------------------------------------------------------------------
// Route drawing
// ---------------------------------------------------------------------------
function clearRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  altLayers.forEach(l => map.removeLayer(l));
  altLayers = [];
  $infoBar.classList.remove('visible');
  $stepsPanel.classList.remove('visible');
  $stepsPanel.innerHTML = '';
  $btnStop.style.display = 'none';
  currentRoute = null;
}

function drawRoute(data) {
  clearRoute();
  if (!data || !data.routes || !data.routes.length) return;

  currentRoute = data;

  // Draw alternatives first (underneath)
  data.routes.forEach((r, idx) => {
    if (!r.is_alternative) return;
    const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);
    const layer = L.polyline(coords, {
      color: '#6c63ff44',
      weight: 5,
      dashArray: '8 8',
    }).addTo(map);
    layer.bindPopup(`Alt route: ${formatDistance(r.distance_m)}, ${formatDuration(r.traffic?.adjusted_duration_s || r.duration_s)}`);
    altLayers.push(layer);
  });

  // Primary route
  const primary = data.routes[0];
  const coords = primary.geometry.coordinates.map(c => [c[1], c[0]]);
  routeLayer = L.polyline(coords, {
    color: '#6c63ff',
    weight: 6,
    opacity: 0.9,
    lineCap: 'round',
  }).addTo(map);

  // Fit map to route bounds
  map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });

  // Start & end markers
  if (coords.length >= 2) {
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker)   map.removeLayer(endMarker);
    startMarker = L.marker(coords[0], { icon: startIcon }).addTo(map);
    endMarker   = L.marker(coords[coords.length - 1], { icon: endIcon }).addTo(map);
  }

  // Info bar
  const t = primary.traffic || {};
  document.getElementById('info-distance').textContent = formatDistance(primary.distance_m);
  document.getElementById('info-eta').textContent = formatDuration(t.adjusted_duration_s || primary.duration_s);

  const trafficLabel = t.traffic_label || 'unknown';
  document.getElementById('info-traffic').innerHTML =
    `<span class="traffic-badge ${trafficLabel}">${trafficLabel}</span>`;
  document.getElementById('info-alts').textContent = `${data.routes.length - 1}`;
  $infoBar.classList.add('visible');

  // Steps
  if (primary.steps && primary.steps.length > 1) {
    $stepsPanel.innerHTML = primary.steps
      .filter(s => s.distance_m > 5)
      .map(s => `
        <div class="step-item">
          <div class="step-icon">${maneuverIcon(s.instruction)}</div>
          <span>${s.instruction}${s.name ? ' — ' + s.name : ''}</span>
          <span class="step-dist">${formatDistance(s.distance_m)}</span>
        </div>
      `).join('');
    $stepsPanel.classList.add('visible');
  }
}

// ---------------------------------------------------------------------------
// REST route fetch (without WebSocket)
// ---------------------------------------------------------------------------
async function fetchRoute() {
  const sLat = parseFloat($startLat.value);
  const sLng = parseFloat($startLng.value);
  const eLat = parseFloat($endLat.value);
  const eLng = parseFloat($endLng.value);

  if ([sLat, sLng, eLat, eLng].some(isNaN)) {
    toast('⚠️ Enter all coordinates');
    return;
  }

  toast('📡 Fetching route…');
  try {
    const resp = await fetch(
      `${API_BASE}/route?start_lat=${sLat}&start_lng=${sLng}&end_lat=${eLat}&end_lng=${eLng}`
    );
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    drawRoute(data);
    toast('✅ Route loaded');
  } catch (err) {
    toast(`❌ ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Start live navigation via WebSocket
// ---------------------------------------------------------------------------
function startNavigation() {
  const sLat = parseFloat($startLat.value);
  const sLng = parseFloat($startLng.value);
  const eLat = parseFloat($endLat.value);
  const eLng = parseFloat($endLng.value);

  if ([sLat, sLng, eLat, eLng].some(isNaN)) {
    toast('⚠️ Enter all coordinates');
    return;
  }

  connectWS();
  // Small delay to let WS connect
  setTimeout(() => {
    sendWS({
      type: 'start_nav',
      lat: sLat, lng: sLng,
      dest_lat: eLat, dest_lng: eLng,
    });
    $btnStop.style.display = 'inline-block';
    toast('▶️ Navigation started');
  }, 500);
}

function stopNavigation() {
  sendWS({ type: 'stop_nav' });
  stopSimulation();
  $btnStop.style.display = 'none';
}

// ---------------------------------------------------------------------------
// GPS simulation — animate vehicle along the route polyline
// ---------------------------------------------------------------------------
function startSimulation() {
  if (!currentRoute || !currentRoute.routes.length) {
    toast('⚠️ Get a route first');
    return;
  }
  if (simInterval) stopSimulation();

  const coords = currentRoute.routes[0].geometry.coordinates;
  let idx = 0;

  toast('🚗 Simulating drive…');
  connectWS();

  simInterval = setInterval(() => {
    if (idx >= coords.length) {
      stopSimulation();
      toast('🏁 Destination reached!');
      return;
    }
    const [lng, lat] = coords[idx];
    // Send location via WebSocket → broadcasts to all clients
    sendWS({ type: 'location', lat, lng });
    // Also update locally for immediate feedback
    updateVehicle(lat, lng);
    map.panTo([lat, lng], { animate: true, duration: 0.5 });
    idx += Math.max(1, Math.floor(coords.length / 200));  // skip some points for speed
  }, 300);
}

function stopSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
}

// ---------------------------------------------------------------------------
// Geolocation
// ---------------------------------------------------------------------------
function getMyLocation() {
  if (!navigator.geolocation) {
    toast('❌ Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      $startLat.value = latitude.toFixed(6);
      $startLng.value = longitude.toFixed(6);
      map.setView([latitude, longitude], 14);
      updateVehicle(latitude, longitude);
      toast(`📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    },
    (err) => toast(`❌ ${err.message}`),
    { enableHighAccuracy: true }
  );
}

// ---------------------------------------------------------------------------
// Map click — pick start / end
// ---------------------------------------------------------------------------
function enablePickMode() {
  pickMode = 'start';
  $clickHint.textContent = '🟢 Click to set START point';
  $clickHint.classList.add('visible');
  toast('Click map for start point');
}

map.on('click', (e) => {
  if (!pickMode) return;
  const { lat, lng } = e.latlng;

  if (pickMode === 'start') {
    $startLat.value = lat.toFixed(6);
    $startLng.value = lng.toFixed(6);
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker([lat, lng], { icon: startIcon }).addTo(map);
    pickMode = 'end';
    $clickHint.textContent = '📍 Click to set END point';
    toast('Now click for end point');
  } else if (pickMode === 'end') {
    $endLat.value = lat.toFixed(6);
    $endLng.value = lng.toFixed(6);
    if (endMarker) map.removeLayer(endMarker);
    endMarker = L.marker([lat, lng], { icon: endIcon }).addTo(map);
    pickMode = null;
    $clickHint.classList.remove('visible');
    toast('✅ Points set — click Get Route');
  }
});

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
$btnRoute.addEventListener('click', fetchRoute);
$btnNav.addEventListener('click', startNavigation);
$btnStop.addEventListener('click', stopNavigation);
$btnSim.addEventListener('click', startSimulation);
$btnLocate.addEventListener('click', getMyLocation);
$btnPick.addEventListener('click', enablePickMode);

// ---------------------------------------------------------------------------
// Auto-connect WebSocket on load
// ---------------------------------------------------------------------------
connectWS();

// Set default coordinates (New Delhi)
$startLat.value = '28.6139';
$startLng.value = '77.2090';
$endLat.value   = '28.5355';
$endLng.value   = '77.2910';
