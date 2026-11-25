/**
 * Phone-as-virtual-camera tech demo.
 * Device orientation uses the classic three.js DeviceOrientationControls
 * quaternion conversion (still the known-good approach after that helper
 * was removed). The first sample is calibrated so the current phone pose
 * looks down the path; later samples are relative to that pose.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const MARKER_TOTAL = 5;
const WALK_SPEED = 2.8;
const LOOK_DWELL = 0.55;
const BOUNDS = { minX: -11, maxX: 11, minZ: -14, maxZ: 12 };
const START_POS = new THREE.Vector3(0, 1.6, 10);

const el = {
  landing: document.getElementById('landing'),
  inapp: document.getElementById('inapp'),
  denied: document.getElementById('denied'),
  hud: document.getElementById('hud'),
  startBtn: document.getElementById('start-btn'),
  retryBtn: document.getElementById('retry-btn'),
  fallbackBtn: document.getElementById('desktop-fallback-btn'),
  copyBtn: document.getElementById('copy-link-btn'),
  copyStatus: document.getElementById('copy-status'),
  inappMsg: document.getElementById('inapp-msg'),
  inappHowto: document.getElementById('inapp-howto'),
  foundCount: document.getElementById('found-count'),
  recalibrateBtn: document.getElementById('recalibrate-btn'),
  moveBtn: document.getElementById('move-btn'),
  lookHint: document.getElementById('look-hint'),
  sensorWarn: document.getElementById('sensor-warn'),
  doneMsg: document.getElementById('done-msg'),
  desktopBanner: document.getElementById('desktop-banner'),
  crosshair: document.getElementById('crosshair'),
  loadError: document.getElementById('load-error'),
  canvas: document.getElementById('scene'),
};

const ua = navigator.userAgent || '';
const isIOS =
  /iP(hone|od|ad)/.test(ua) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function detectInAppBrowser() {
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return 'facebook';
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  if (/Line\//i.test(ua)) return 'line';
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/TikTok|BytedanceWebview|musical_ly|Aweme/i.test(ua)) return 'tiktok';
  if (/Weibo/i.test(ua)) return 'weibo';
  if (/Snapchat/i.test(ua)) return 'snapchat';
  if (isIOS && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
    return 'webview';
  }
  return null;
}

const INAPP_HOW = {
  wechat: '撳右上角「⋯」，再揀「喺 Safari 開啟」。',
  instagram: '撳右下角「⋯」，再揀「用 Safari 開啟／在 Safari 中打开」。',
  facebook: '撳右上角「⋯」，再揀用 Safari 開啟。',
  line: '撳右上角選單，再揀用 Safari 開啟。',
  whatsapp: '撳右上角「⋯」，再揀用 Safari 開啟。',
  tiktok: '撳右上角分享／更多，再揀用 Safari 開啟。',
  weibo: '請用系統 Safari 開啟呢個連結。',
  snapchat: '請用系統 Safari 開啟呢個連結。',
  webview: '請複製連結，然後打開 Safari 貼上。',
};

const inApp = detectInAppBrowser();
if (inApp) {
  el.landing.classList.add('hidden');
  el.inapp.classList.remove('hidden');
  el.inappHowto.textContent = INAPP_HOW[inApp] || INAPP_HOW.webview;
}

el.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {
    const input = document.createElement('input');
    input.value = location.href;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  el.copyStatus.hidden = false;
});

// ---------------------------------------------------------------------------
// Three.js scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas: el.canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1020);
scene.fog = new THREE.Fog(0x0a1020, 14, 44);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(window.innerHeight, 1), 0.08, 80);
camera.position.copy(START_POS);

scene.add(new THREE.HemisphereLight(0x9eb6ff, 0x2a3348, 0.85));
const sun = new THREE.DirectionalLight(0xfff1d0, 1.05);
sun.position.set(8, 16, 6);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x3a4a66, 0.22));

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a243c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#2b3b5e';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 252);
  ctx.strokeStyle = '#22304c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(128, 0); ctx.lineTo(128, 256);
  ctx.moveTo(0, 128); ctx.lineTo(256, 128);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = 4;
  return tex;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.95, metalness: 0.0, color: 0xffffff })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const stone = new THREE.MeshStandardMaterial({ color: 0xc9c3b0, roughness: 0.7, metalness: 0.05 });
const stoneDark = new THREE.MeshStandardMaterial({ color: 0x8b8676, roughness: 0.8, metalness: 0.05 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xf0c85a, roughness: 0.35, metalness: 0.35, emissive: 0x5a3c00, emissiveIntensity: 0.25 });

function shadowDisc(x, z, r = 0.7) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  scene.add(m);
}

// Path tiles
for (let i = 0; i <= 22; i++) {
  const z = 10.5 - i * 1.05;
  const tile = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.92), i % 2 === 0 ? stone : stoneDark);
  tile.position.set(0, 0.04, z);
  scene.add(tile);
}

// Edge strips
for (const x of [-1.25, 1.25]) {
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 23.5), goldMat);
  strip.position.set(x, 0.08, -0.7);
  scene.add(strip);
}

// Arches
function addArch(z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8d3c4, roughness: 0.55, metalness: 0.08 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), mat);
  const right = left.clone();
  left.position.set(-1.7, 1.6, z);
  right.position.set(1.7, 1.6, z);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 0.4), mat);
  lintel.position.set(0, 3.2, z);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.08, 10, 48, Math.PI),
    goldMat
  );
  ring.position.set(0, 2.05, z);
  ring.rotation.z = Math.PI;
  scene.add(left, right, lintel, ring);
}
addArch(6);
addArch(-3);

// Decorative pillars and simple trees (sphere + cylinder only)
function addPillar(x, z) {
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 12), stone);
  col.position.set(x, 1.2, z);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), stoneDark);
  cap.position.set(x, 2.45, z);
  scene.add(col, cap);
  shadowDisc(x, z, 0.45);
}
function addTree(x, z, color) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a4433, roughness: 0.9 })
  );
  trunk.position.set(x, 0.55, z);
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
  );
  leaf.position.set(x, 1.55, z);
  scene.add(trunk, leaf);
  shadowDisc(x, z, 0.7);
}
for (const [x, z] of [[-4.5, 8], [4.5, 8], [-5.2, 3], [5.2, 3], [-5, -1.5], [5, -1.5], [-4.2, -7], [4.2, -7]]) {
  addPillar(x, z);
}
addTree(-7, 6, 0x3f8b6a);
addTree(7.2, 5, 0x2f7a58);
addTree(-7.4, -4, 0x4a9a70);
addTree(6.8, -6, 0x357a55);

// Far landmark (not a collectible)
const landmark = new THREE.Group();
landmark.position.set(0, 1.7, -12.2);
const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.9, 0),
  new THREE.MeshStandardMaterial({ color: 0x8ab4ff, roughness: 0.25, metalness: 0.4, emissive: 0x1a3a80, emissiveIntensity: 0.35 })
);
const halo = new THREE.Mesh(
  new THREE.TorusGeometry(1.35, 0.06, 8, 48),
  new THREE.MeshStandardMaterial({ color: 0xf0c85a, emissive: 0xf0c85a, emissiveIntensity: 0.4, roughness: 0.3 })
);
halo.rotation.x = Math.PI / 2.4;
landmark.add(core, halo);
scene.add(landmark);
shadowDisc(0, -12.2, 1.2);

// Collectible markers
const markers = [];
const hitMeshes = [];

function addMarker({ shape, color, x, z, y = 1.25 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.38, 16), stone);
  plinth.position.y = 0.19;
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.32,
    metalness: 0.22,
    emissive: new THREE.Color(color).multiplyScalar(0.25),
    emissiveIntensity: 0.8,
  });
  const mesh = new THREE.Mesh(shape, mat);
  mesh.position.y = y;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.045, 8, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  ring.position.y = y;
  ring.rotation.x = Math.PI / 2;
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = y;
  hit.userData.marker = group;
  group.add(plinth, mesh, ring, hit);
  group.userData = { found: false, mesh, ring, mat, color, bobPhase: Math.random() * Math.PI * 2, baseY: y };
  scene.add(group);
  shadowDisc(x, z, 0.65);
  markers.push(group);
  hitMeshes.push(hit);
}

addMarker({ shape: new THREE.SphereGeometry(0.42, 24, 16), color: 0xff6b57, x: -3.1, z: 4.2, y: 1.2 });
addMarker({ shape: new THREE.BoxGeometry(0.7, 0.7, 0.7), color: 0x3ec6c8, x: 3.2, z: 1.1, y: 1.22 });
addMarker({ shape: new THREE.CylinderGeometry(0.32, 0.32, 0.9, 20), color: 0xf0c85a, x: -2.7, z: -1.6, y: 1.28 });
addMarker({ shape: new THREE.ConeGeometry(0.45, 0.95, 16), color: 0x6adf8c, x: 2.9, z: -5.2, y: 1.3 });
addMarker({ shape: new THREE.TorusGeometry(0.38, 0.16, 12, 28), color: 0xc084fc, x: 0, z: -8.6, y: 1.35 });

// ---------------------------------------------------------------------------
// Device orientation → camera quaternion
// ---------------------------------------------------------------------------
const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 about X
const deviceQ = new THREE.Quaternion();
const calibOffset = new THREE.Quaternion();
const targetQ = new THREE.Quaternion();
let hasCalib = false;
let gyroMode = false;
let gotOrientation = false;
let awaitingGyro = false;
let yaw = 0;
let pitch = 0;
let moving = false;
let started = false;
let foundCount = 0;
let dwell = 0;
let lookTarget = null;
const lookDir = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();

function screenAngleDeg() {
  if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
  if (typeof window.orientation === 'number') return window.orientation;
  return 0;
}

function deviceQuatFromEvent(event, out) {
  const alpha = event.alpha != null ? THREE.MathUtils.degToRad(event.alpha) : 0;
  const beta = event.beta != null ? THREE.MathUtils.degToRad(event.beta) : 0;
  const gamma = event.gamma != null ? THREE.MathUtils.degToRad(event.gamma) : 0;
  const orient = THREE.MathUtils.degToRad(screenAngleDeg());
  // YXZ: device ZXY reported as alpha/beta/gamma, converted the usual way.
  euler.set(beta, alpha, -gamma, 'YXZ');
  out.setFromEuler(euler);
  out.multiply(q1); // look out the back of the phone, not the top
  out.multiply(q0.setFromAxisAngle(zee, -orient));
  return out;
}

function calibrateFromEvent(event) {
  deviceQuatFromEvent(event, deviceQ);
  // Map the current phone pose to "look down the path" (-Z, identity camera).
  calibOffset.copy(deviceQ).invert();
  hasCalib = true;
}

function onDeviceOrientation(event) {
  if (event.alpha == null || event.beta == null || event.gamma == null) return;
  gotOrientation = true;
  el.sensorWarn.hidden = true;
  if (!hasCalib) calibrateFromEvent(event);
  deviceQuatFromEvent(event, deviceQ);
  targetQ.copy(calibOffset).multiply(deviceQ);
  gyroMode = true;
}

function onOrientationChange() {
  hasCalib = false; // next sample re-syncs after a rotate-to-landscape/portrait
}

function attachGyro() {
  window.addEventListener('deviceorientation', onDeviceOrientation, true);
  window.addEventListener('orientationchange', onOrientationChange);
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', onOrientationChange);
  }
  awaitingGyro = true;
  setTimeout(() => {
    if (started && !gotOrientation) {
      enablePointerLook();
      const likelyDesktop = !(/Mobi|Android|iP(hone|od|ad)/.test(ua) || (isIOS && navigator.maxTouchPoints > 1));
      if (!likelyDesktop) el.sensorWarn.hidden = false;
    }
  }, 2500);
}

function applyMouseLook() {
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  targetQ.copy(camera.quaternion);
}

let pointerLookBound = false;
let dragging = false;
let lastPX = 0;
let lastPY = 0;

function enablePointerLook() {
  if (pointerLookBound) return;
  pointerLookBound = true;
  const onDown = (e) => {
    if (e.target.closest && e.target.closest('button')) return;
    dragging = true;
    lastPX = e.clientX;
    lastPY = e.clientY;
  };
  const onMove = (e) => {
    if (!dragging || gyroMode) return;
    const dx = e.clientX - lastPX;
    const dy = e.clientY - lastPY;
    lastPX = e.clientX;
    lastPY = e.clientY;
    yaw -= dx * 0.005;
    pitch -= dy * 0.005;
    pitch = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, pitch));
    applyMouseLook();
  };
  const onUp = () => { dragging = false; };
  el.canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function bindHold(button) {
  const down = (e) => {
    e.preventDefault();
    moving = true;
    button.classList.add('is-held');
  };
  const up = () => {
    moving = false;
    button.classList.remove('is-held');
  };
  button.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  button.addEventListener('contextmenu', (e) => e.preventDefault());
}

bindHold(el.moveBtn);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') moving = true;
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') moving = false;
});

el.recalibrateBtn.addEventListener('click', () => {
  hasCalib = false;
  el.recalibrateBtn.textContent = '已校正';
  setTimeout(() => { el.recalibrateBtn.textContent = '校正方向'; }, 900);
});

function showHud({ desktop }) {
  el.landing.classList.add('hidden');
  el.denied.classList.add('hidden');
  el.inapp.classList.add('hidden');
  el.hud.classList.remove('hidden');
  el.desktopBanner.hidden = !desktop;
}

function enterScene({ useGyro, desktop }) {
  if (started) return;
  started = true;
  showHud({ desktop: !!desktop });
  if (useGyro) attachGyro();
  else enablePointerLook();
  clock.start();
  resize();
  loop();
}

async function requestSensorsAndStart() {
  el.startBtn.disabled = true;
  el.retryBtn.disabled = true;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const state = await DeviceOrientationEvent.requestPermission();
      if (state !== 'granted') {
        el.landing.classList.add('hidden');
        el.denied.classList.remove('hidden');
        el.startBtn.disabled = false;
        el.retryBtn.disabled = false;
        return;
      }
    }
    const desktop = !(/Mobi|Android|iP(hone|od|ad)/.test(ua) || (isIOS && navigator.maxTouchPoints > 1));
    enterScene({ useGyro: true, desktop });
    if (desktop) enablePointerLook();
  } catch (err) {
    console.warn('DeviceOrientation permission failed', err);
    el.landing.classList.add('hidden');
    el.denied.classList.remove('hidden');
    el.startBtn.disabled = false;
    el.retryBtn.disabled = false;
  }
}

el.startBtn.addEventListener('click', requestSensorsAndStart);
el.retryBtn.addEventListener('click', requestSensorsAndStart);
el.fallbackBtn.addEventListener('click', () => {
  enterScene({ useGyro: false, desktop: true });
});

function resize() {
  const w = window.innerWidth;
  const h = Math.max(window.innerHeight, 1);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', resize);

function walk(dt) {
  if (!moving) return;
  camera.getWorldDirection(lookDir);
  lookDir.y = 0;
  if (lookDir.lengthSq() < 1e-5) return;
  lookDir.normalize();
  camera.position.addScaledVector(lookDir, WALK_SPEED * dt);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, BOUNDS.minX, BOUNDS.maxX);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, BOUNDS.minZ, BOUNDS.maxZ);
  camera.position.y = 1.6;
}

function updateMarkers(dt, t) {
  for (const m of markers) {
    const { mesh, ring, found, bobPhase, baseY } = m.userData;
    mesh.position.y = baseY + Math.sin(t * 1.4 + bobPhase) * 0.08;
    ring.position.y = mesh.position.y;
    ring.rotation.z = t * (found ? 0.3 : 1.2);
    if (!found) mesh.rotation.y = t * 0.4;
  }

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  const hit = hits.find((h) => h.object.userData.marker && !h.object.userData.marker.userData.found && h.distance < 11);
  const next = hit ? hit.object.userData.marker : null;
  if (next && next === lookTarget) {
    dwell += dt;
  } else {
    lookTarget = next;
    dwell = next ? dt : 0;
  }

  const locking = !!next && !next.userData.found;
  el.crosshair.classList.toggle('locked', locking);
  el.lookHint.hidden = !locking || foundCount >= MARKER_TOTAL;
  el.lookHint.textContent = locking ? '對準標記，望定一陣就會收錄' : '';

  if (locking && dwell >= LOOK_DWELL) {
    collect(next);
  }
}

function collect(marker) {
  if (marker.userData.found) return;
  marker.userData.found = true;
  foundCount += 1;
  el.foundCount.textContent = String(foundCount);
  const { mat, ring } = marker.userData;
  mat.emissiveIntensity = 1.4;
  ring.material.color.set(0xffffff);
  marker.scale.set(1.12, 1.12, 1.12);
  if (foundCount >= MARKER_TOTAL) {
    el.lookHint.hidden = true;
    el.doneMsg.hidden = false;
  }
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (gyroMode) camera.quaternion.slerp(targetQ, 1 - Math.exp(-dt * 14));
  walk(dt);
  updateMarkers(dt, t);
  halo.rotation.z = t * 0.35;
  core.rotation.y = t * 0.25;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// First frame so the landing overlay has a scene behind it.
resize();
renderer.render(scene, camera);
