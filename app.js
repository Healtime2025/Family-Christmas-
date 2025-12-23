/* Mirror OS • Family Christmas Tree (v2) — Gentler scrolling & colors
   - Animated tree (2 styles)
   - Rotating family names + affirmations
   - Pause/Play, Next, Shuffle, Speed, Brightness
   - ✅ Words scroll ON the tree (canvas) — slower + multi-color
   - ✅ Cinematic mode (hide UI) + shortcut: C
   - Optional voice (Web Speech API)
   - Offline (service worker)

   Customize:
   - Edit FAMILY array below (names + traits)
*/

const FAMILY = [
  { name: "Dad", traits: ["visionary", "strong", "full of love", "protector", "builder of dreams"] },
  { name: "Mom", traits: ["gentle", "wise", "full of grace", "caring", "holds the home together"] },
  { name: "Daughter (18)", traits: ["bright future", "creative", "confident", "kind heart", "leader in the making"] },
  { name: "Son (10)", traits: ["curious", "brave", "smart", "funny", "likes Spider-Man"] },
  { name: "Son (7)", traits: ["playful", "loving", "imaginative", "joyful", "likes Spider-Man"] },
];

const EXTRA_TRAITS = [
  "deeply appreciated",
  "a blessing to the family",
  "a light in the room",
  "full of purpose",
  "brings joy",
  "brings peace",
  "resilient",
  "courageous",
  "faith-filled",
  "thoughtful",
  "fun to be around",
  "a gift from God",
];

const PHRASE_TEMPLATES = [
  (name, picks) => `${name}… ${picks.join(". ")}.`,
  (name, picks) => `${name} — ${picks.join(" • ")}.`,
  (name, picks) => `We celebrate ${name}: ${picks.join(", ")}.`,
  (name, picks) =>
    `${name}: ${picks[0]}. ${picks[1] ? picks[1] + "." : ""} ${picks[2] ? picks[2] + "." : ""}`.trim(),
];

const SPEEDS = { slow: 5200, normal: 3600, fast: 2400 };

const el = (id) => document.getElementById(id);
const canvas = el("tree");
const ctx = canvas.getContext("2d");

const ui = {
  currentName: el("currentName"),
  currentLine: el("currentLine"),
  btnPlay: el("btnPlay"),
  btnNext: el("btnNext"),
  btnShuffle: el("btnShuffle"),
  btnVoice: el("btnVoice"),
  btnCinematic: el("btnCinematic"),
  treeStyle: el("treeStyle"),
  speed: el("speed"),
  brightness: el("brightness"),
  configPreview: el("configPreview"),
};

let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize, { passive: true });

/* ---------------------------
   State
--------------------------- */
let playing = true;
let voiceOn = false;
let shuffleOn = true;
let treeMode = "gold"; // "gold" | "lights"
let brightness = 1.0;
let speedKey = "normal";
let idx = 0;
let order = [];
let lastSwitch = 0;
let speakToken = 0;

/* ✅ Cinematic mode */
let cinematic = false;

/* ✅ Scrolling words on the tree */
let treeText = [];

function makeOrder() {
  order = FAMILY.map((_, i) => i);
  if (shuffleOn) shuffle(order);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickAffirmation(member) {
  const base = [...member.traits];
  const addN = Math.random() < 0.65 ? 1 : 2;
  for (let i = 0; i < addN; i++) base.push(EXTRA_TRAITS[(Math.random() * EXTRA_TRAITS.length) | 0]);
  const uniq = [...new Set(base)];
  shuffle(uniq);
  const count = 3 + ((Math.random() * 2) | 0);
  const picks = uniq.slice(0, Math.min(count, uniq.length));
  const tmpl = PHRASE_TEMPLATES[(Math.random() * PHRASE_TEMPLATES.length) | 0];
  return tmpl(member.name, picks);
}

function setNow(member, line) {
  ui.currentName.textContent = member.name;
  ui.currentLine.textContent = line;
  if (ui.configPreview) {
    ui.configPreview.textContent = JSON.stringify(
      { treeMode, shuffleOn, voiceOn, cinematic, speed: speedKey, brightness, family: FAMILY },
      null,
      2
    );
  }
}

function speak(text) {
  if (!voiceOn) return;
  if (!("speechSynthesis" in window)) return;
  try {
    const token = ++speakToken;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onend = () => { if (token !== speakToken) return; };
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

/* ==========================================================
   ✅ UPDATED: Gentler scrolling + different colors (your snippet)
========================================================== */

// Slow down the text speed a bit and add color variation
function spawnTreeText(text) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const startU = 0.85; // start lower on the tree
  const spacing = 0.04; // slightly more spacing

  words.forEach((word, i) => {
    treeText.push({
      word,
      u: startU + i * spacing,
      life: 1,
      alpha: 0,
      speed: 0.0001 + Math.random() * 0.00005, // slower speed
      color: `hsl(${Math.random() * 360}, 90%, 70%)`, // random pastel color
    });
  });

  // cap
  if (treeText.length > 260) treeText.splice(0, treeText.length - 260);
}

function renderTreeText(now, dt, cfg) {
  const { cx, topY, h, maxRadius, turns } = cfg;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const fontPx = Math.max(14, Math.min(20, W * 0.018));
  ctx.font = `700 ${fontPx}px system-ui, Inter`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  treeText = treeText.filter((t) => t.life > 0);

  for (const t of treeText) {
    t.u -= t.speed * dt;
    t.life -= 0.0002 * dt; // slower fade
    t.alpha = Math.min(1, t.alpha + 0.01);

    const y = topY + t.u * h;
    const radius = (t.u ** 1.12) * maxRadius;
    const angle = t.u * turns * Math.PI + Math.sin(now / 1200) * 0.1;
    const x = cx + Math.cos(angle) * radius;

    // apply alpha to HSL color (simple + stable)
    ctx.fillStyle = `hsla(${(Math.random()*0 + 0) /*placeholder*/}, 0%, 0%, 1)`;
    // replace above with correct alpha application:
    const a = Math.max(0, Math.min(1, t.alpha * t.life * brightness));
    // parse hsl(...) -> hsla(...)
    // t.color is "hsl(H, S%, L%)"
    const hsla = t.color.replace(/^hsl\(/, "hsla(").replace(/\)$/, `, ${a})`);
    ctx.fillStyle = hsla;

    ctx.shadowColor = "rgba(247,198,107,0.8)";
    ctx.shadowBlur = 18;

    // slight perspective: smaller near top
    const scale = clamp(1.10 - t.u * 0.55, 0.62, 1.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText(t.word, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------------------
   Member cycle
--------------------------- */
function nextMember() {
  if (order.length !== FAMILY.length) makeOrder();
  const member = FAMILY[order[idx % order.length]];
  const line = pickAffirmation(member);
  setNow(member, line);

  // ✅ Words on the tree
  spawnTreeText(line);

  // Voice (optional)
  speak(
    `${member.name}. ${line.replace(member.name, "").replace("…", "").replace("—", "").trim()}`
  );

  idx++;
  if (idx % order.length === 0) makeOrder();
}

/* ---------------------------
   Render helpers
--------------------------- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

const GOLD = { r: 247, g: 198, b: 107 };
const CYAN = { r: 120, g: 215, b: 255 };
function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }

let t0 = performance.now();
let particles = [];
let lights = [];

function initGold() {
  particles = [];
  const cx = W * 0.5, baseY = H * 0.78, topY = H * 0.18;
  const h = baseY - topY;
  const n = Math.floor(900 * clamp((W * H) / 900000, 0.8, 1.6));
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const y = topY + u * h;
    const radius = (u ** 1.15) * (W * 0.22);
    const ang = u * 8.0 * Math.PI + Math.random() * 0.25;
    const x = cx + Math.cos(ang) * radius + (Math.random() - 0.5) * 10;
    const size = 1 + (u * 2.6) + Math.random() * 1.4;
    particles.push({
      baseX: x, baseY: y,
      u, ang, radius, size,
      tw: Math.random() * 2 * Math.PI,
      drift: (Math.random() - 0.5) * 0.35,
    });
  }
}

function initLights() {
  lights = [];
  const cx = W * 0.5, baseY = H * 0.80, topY = H * 0.16;
  const h = baseY - topY;
  const bands = 16;
  for (let b = 0; b < bands; b++) {
    const u = (b + 1) / (bands + 1);
    const y = topY + u * h;
    const radius = (u ** 1.08) * (W * 0.25);
    const count = Math.floor(14 + u * 44);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 2 * Math.PI + (b % 2 ? 0.15 : 0);
      const x = cx + Math.cos(a) * radius;
      const wobble = (Math.random() - 0.5) * 6;
      lights.push({ x, y: y + wobble, a, radius, u, hue: (i * 18 + b * 14) % 360, tw: Math.random() * 2 * Math.PI });
    }
  }
}

function drawBackground(now) {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.25, 10, W * 0.5, H * 0.4, Math.max(W, H) * 0.75);
  g.addColorStop(0, `rgba(120,215,255,${0.10 * brightness})`);
  g.addColorStop(0.35, `rgba(247,198,107,${0.06 * brightness})`);
  g.addColorStop(1, `rgba(0,0,0,1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = now / 2200 + i * 0.77;
    const x = W * (0.15 + 0.7 * (Math.sin(a * 0.9 + i) * 0.5 + 0.5));
    const y = H * (0.08 + 0.35 * (Math.cos(a * 0.7 + i * 2.1) * 0.5 + 0.5));
    const r = 8 + (Math.sin(a + i) * 0.5 + 0.5) * 18;
    ctx.beginPath();
    ctx.fillStyle = `rgba(247,198,107,${0.035 * brightness})`;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStar(cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(CYAN, 0.88 * brightness);
  ctx.shadowColor = rgba(CYAN, 0.55 * brightness);
  ctx.shadowBlur = 22;
  ctx.fill();
  ctx.restore();
}

function renderGold(now, dt) {
  const cx = W * 0.5, baseY = H * 0.80, topY = H * 0.18;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gg = ctx.createRadialGradient(cx, baseY, 10, cx, baseY, W * 0.45);
  gg.addColorStop(0, `rgba(247,198,107,${0.18 * brightness})`);
  gg.addColorStop(1, `rgba(247,198,107,0)`);
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 22, W * 0.26, H * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.tw += dt * (0.0018 + p.u * 0.0015);
    const twk = 0.35 + 0.65 * (Math.sin(p.tw) * 0.5 + 0.5);
    const drift = Math.sin(now / 1200 + p.ang) * (1.2 + p.u * 2.2) + p.drift * 30;
    const x = p.baseX + drift;
    const y = p.baseY + Math.cos(now / 1800 + p.u * 6) * 0.7;
    const a = (0.05 + twk * 0.25) * brightness;
    ctx.fillStyle = `rgba(247,198,107,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, p.size * twk, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx - W * 0.25, baseY);
  ctx.lineTo(cx + W * 0.25, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ✅ words on tree
  renderTreeText(now, dt, { cx, topY: H * 0.18, h: H * 0.62, maxRadius: W * 0.22, turns: 8.0 });

  drawStar(cx, topY - 30, Math.min(W, H) * 0.035);
}

function renderLights(now, dt) {
  const cx = W * 0.5, baseY = H * 0.82, topY = H * 0.16;

  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.08 * brightness})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx - W * 0.23, baseY);
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx + W * 0.23, baseY);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const L of lights) {
    L.tw += dt * 0.0032;
    const twk = 0.25 + 0.75 * (Math.sin(L.tw + L.u * 6 + now / 900) * 0.5 + 0.5);
    const hue = (L.hue + now / 90) % 360;
    ctx.fillStyle = `hsla(${hue}, 95%, 62%, ${(0.08 + 0.35 * twk) * brightness})`;
    const r = 1.3 + twk * (2.8 + L.u * 2.2);
    ctx.beginPath();
    ctx.arc(L.x, L.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsla(${hue}, 95%, 62%, ${(0.02 + 0.10 * twk) * brightness})`;
    ctx.beginPath();
    ctx.arc(L.x, L.y, r * 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = `rgba(130,90,50,${0.85 * brightness})`;
  const tw = W * 0.03, th = H * 0.09;
  ctx.roundRect(cx - tw / 2, baseY, tw, th, 10);
  ctx.fill();
  ctx.restore();

  // ✅ words on tree
  renderTreeText(now, dt, { cx, topY: H * 0.16, h: H * 0.66, maxRadius: W * 0.25, turns: 6.2 });

  drawStar(cx, topY - 22, Math.min(W, H) * 0.04);
}

function draw(now) {
  const dt = now - t0;
  t0 = now;
  drawBackground(now);
  if (treeMode === "lights") renderLights(now, dt);
  else renderGold(now, dt);
}

/* ---------------------------
   UI
--------------------------- */
function syncButtons() {
  ui.btnPlay.textContent = playing ? "⏸ Pause" : "▶️ Play";
  ui.btnPlay.setAttribute("aria-pressed", String(playing));
  ui.btnShuffle.textContent = `🔀 Shuffle: ${shuffleOn ? "On" : "Off"}`;
  ui.btnVoice.textContent = `🔊 Voice: ${voiceOn ? "On" : "Off"}`;
  ui.treeStyle.value = treeMode;
  ui.speed.value = speedKey;
  ui.brightness.value = String(brightness);

  if (ui.btnCinematic) {
    ui.btnCinematic.textContent = `🎬 Cinematic: ${cinematic ? "On" : "Off"}`;
    ui.btnCinematic.setAttribute("aria-pressed", String(cinematic));
  }
  document.body.classList.toggle("cinematic", cinematic);
}

ui.btnPlay.addEventListener("click", () => {
  playing = !playing;
  if (!playing) { try { window.speechSynthesis?.cancel(); } catch(_) {} }
  else { lastSwitch = performance.now(); }
  syncButtons();
});

ui.btnNext.addEventListener("click", () => {
  nextMember();
  lastSwitch = performance.now();
});

ui.btnShuffle.addEventListener("click", () => {
  shuffleOn = !shuffleOn;
  makeOrder();
  idx = 0;
  syncButtons();
});

ui.btnVoice.addEventListener("click", () => {
  voiceOn = !voiceOn;
  if (!voiceOn) { try { window.speechSynthesis?.cancel(); } catch(_) {} }
  else { speak(`${ui.currentName.textContent}. ${ui.currentLine.textContent}`); }
  syncButtons();
});

ui.treeStyle.addEventListener("change", () => {
  treeMode = ui.treeStyle.value;
  if (treeMode === "lights") initLights();
  else initGold();
  syncButtons();
});

ui.speed.addEventListener("change", () => {
  speedKey = ui.speed.value;
  syncButtons();
});

ui.brightness.addEventListener("input", () => {
  brightness = Number(ui.brightness.value);
});

function toggleCinematic() {
  cinematic = !cinematic;
  syncButtons();
}
ui.btnCinematic?.addEventListener("click", toggleCinematic);

window.addEventListener("keydown", (e) => {
  if (e.key && e.key.toLowerCase() === "c") toggleCinematic();
});

function tick(now) {
  if (playing) {
    const interval = SPEEDS[speedKey] || SPEEDS.normal;
    if (!lastSwitch) lastSwitch = now;
    if (now - lastSwitch >= interval) {
      nextMember();
      lastSwitch = now;
    }
  }
  draw(now);
  requestAnimationFrame(tick);
}

/* ---------------------------
   Boot
--------------------------- */
function boot() {
  resize();
  initGold();
  initLights();
  makeOrder();
  nextMember();
  syncButtons();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  requestAnimationFrame((now) => {
    t0 = now;
    lastSwitch = now;
    tick(now);
  });
}

boot();
