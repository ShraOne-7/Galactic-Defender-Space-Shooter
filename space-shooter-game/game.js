/* ==========================================================================
   1. SETUP, DOM CACHE & STATE ENGINE CONFIG
   ========================================================================== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// DOM Caches
const scoreBoardEl = document.getElementById('score-board');
const highScoreEl = document.getElementById('high-score');
const shieldFillEl = document.getElementById('shield-fill');
const shieldWrapperEl = document.getElementById('shield-wrapper');
const weaponDisplayEl = document.getElementById('weapon-display');
const hudCreditsEl = document.getElementById('hud-credits');
const comboHudEl = document.getElementById('combo-hud');
const comboMultiplierEl = document.getElementById('combo-multiplier');

const menuOverlayEl = document.getElementById('menu-overlay');
const menuHeaderEl = document.getElementById('menu-header');
const menuSubEl = document.getElementById('menu-sub');
const menuBtnEl = document.getElementById('menu-btn');
const menuWalletAmountEl = document.getElementById('menu-wallet-amount');
const shipCards = document.querySelectorAll('.ship-card');

const countdownOverlayEl = document.getElementById('countdown-overlay');
const countdownTextEl = document.getElementById('countdown-text');

const bossHudEl = document.getElementById('boss-hud');
const bossTitleEl = document.getElementById('boss-title');
const bossBarFillEl = document.getElementById('boss-bar-fill');
const achievementToastEl = document.getElementById('achievement-toast');
const toastDescEl = document.getElementById('toast-desc');

const hudPauseBtnEl = document.getElementById('hud-pause-btn');
const hudFullscreenBtnEl = document.getElementById('hud-fullscreen-btn');
const menuMuteBtnEl = document.getElementById('menu-mute-btn');
const hudMuteBtnEl = document.getElementById('hud-mute-btn');

let lastTime = 0;
let score = 0;
let highScore = localStorage.getItem('space_high_score') || 0;
let totalCredits = parseInt(localStorage.getItem('space_total_credits')) || 0;
let gameState = 'START'; 

// Blueprint Economy Trackers
let unlockedShips = JSON.parse(localStorage.getItem('space_unlocked_ships')) || ['INTERCEPTOR'];
let selectedShipClass = 'INTERCEPTOR';

let screenShakeTimer = 0;
let screenShakeIntensity = 0;

let currentPhase = 0; 
const PHASE_STYLES = [
  { spaceBg: '#02020a', stars: '#00f3ff', nebulae: 'rgba(0, 100, 255, 0.04)' },
  { spaceBg: '#08010f', stars: '#ff007f', nebulae: 'rgba(150, 0, 200, 0.05)' },
  { spaceBg: '#0f0101', stars: '#ff5500', nebulae: 'rgba(200, 0, 50, 0.05)' }
];

let nextBossScoreTarget = 500;
let bossCountTotal = 0;
let bossBaseMaxHP = 100;

let comboCount = 0;
let comboMultiplier = 1.0;
let comboTimer = 0.0;
const COMBO_DURATION_MAX = 2.5;

// Background In-Motion Engine
let backgroundStars = [];
const STAR_COUNT = 120;
let warpFactor = 1.0; 
let targetWarpFactor = 1.0;

// Dynamic Audio Tracking Flags
let isAudioMuted = localStorage.getItem('space_audio_muted') === 'true';

// Shield mechanics
let shieldOverchargeTimer = 0.0;
const MAX_OVERCHARGE_DURATION = 7.0;

const SHIP_CLASS_PROFILES = {
  'INTERCEPTOR': { speed: 520, maxHp: 100, color: '#00f3ff', archetype: 'arrow' },
  'VANGUARD':    { speed: 380, maxHp: 160, color: '#e0a000', archetype: 'shield' },
  'RAIDER':      { speed: 460, maxHp: 120, color: '#ff007f', archetype: 'trident' }
};

const player = {
  x: 380, y: 500, w: 46, h: 48,
  speed: 520, color: '#00f3ff', archetype: 'arrow',
  hp: 100, maxHp: 100,
  currentWeapon: 'BASIC BLASTER', weaponTimer: 0
};

const boss = {
  active: false, x: 250, y: -150, w: 300, h: 100,
  hp: 100, maxHp: 100, speed: 90, dir: 1, attackTimer: 0
};

const achievements = {
  firstBlood: { unlocked: false, desc: "FIRST BLOOD - Terminate an invader" },
  comboKing: { unlocked: false, desc: "STRIKE MASTER - Maintained Max Combo" },
  bossSlayer: { unlocked: false, desc: "BOSS SLAYER - Destroy Overlord Flagship" }
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let items = [];
let damageFlashes = []; 
let asteroids = [];

let enemySpawnTimer = 0;
let enemySpawnInterval = 1.2; 
let asteroidSpawnTimer = 0;
let asteroidSpawnInterval = 4.0;

const keys = { ArrowLeft: false, ArrowRight: false, Space: false, lastShotTime: 0 };

const WEAPONS_CONFIG = {
  'BASIC BLASTER':   { fireRate: 0.16, speed: 650, color: '#39ff14', type: 'single' },
  'DUAL LASER':      { fireRate: 0.12, speed: 750, color: '#00f3ff', type: 'dual' },
  'PLASMA CANNON':   { fireRate: 0.35, speed: 450, color: '#e0a000', type: 'plasma' },
  'MISSILE LAUNCHER':{ fireRate: 0.40, speed: 500, color: '#ff007f', type: 'missile' },
  'BEAM LASER':      { fireRate: 0.05, speed: 900, color: '#ff5500', type: 'beam' },
  'FLAMETHROWER':    { fireRate: 0.02, speed: 350, color: '#ffaa00', type: 'flame' }
};
const WEAPON_NAMES = Object.keys(WEAPONS_CONFIG);

if (highScoreEl) highScoreEl.innerText = `HI-SCORE: ${highScore}`;
initializeStarfieldEngine();
updateShopUI();
refreshAudioButtonsUI();

/* ==========================================================================
   2. RETRO AUDIO SYNTH MODULE WITH MUTE CONTROLLER
   ========================================================================== */
let audioCtx = null;
let bgmNode = null;
let bgmGainNode = null;

function initAudioSystem() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startSpaceBgm();
}

function startSpaceBgm() {
  if (!audioCtx) return;
  try {
    if (bgmNode) { bgmNode.stop(); bgmNode.disconnect(); }
    const duration = 2.0; 
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      let t = i / audioCtx.sampleRate;
      data[i] = Math.sin(2 * Math.PI * 65 * t) * 0.12 * Math.sin(2 * Math.PI * 0.5 * t);
    }
    
    bgmNode = audioCtx.createBufferSource();
    bgmNode.buffer = buffer;
    bgmNode.loop = true;
    
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(420, audioCtx.currentTime);
    
    bgmGainNode = audioCtx.createGain();
    bgmGainNode.gain.setValueAtTime(isAudioMuted ? 0 : 1, audioCtx.currentTime);
    
    bgmNode.connect(lowpass);
    lowpass.connect(bgmGainNode);
    bgmGainNode.connect(audioCtx.destination);
    bgmNode.start();
  } catch (err) { console.log("BGM initialization pending user click interaction."); }
}

function toggleAudioMuteState() {
  isAudioMuted = !isAudioMuted;
  localStorage.setItem('space_audio_muted', isAudioMuted);
  refreshAudioButtonsUI();

  if (bgmGainNode && audioCtx) {
    bgmGainNode.gain.setValueAtTime(isAudioMuted ? 0 : 1, audioCtx.currentTime);
  }
}

function refreshAudioButtonsUI() {
  const label = isAudioMuted ? "🔇 AUDIO OFF" : "🎵 AUDIO ON";
  if (menuMuteBtnEl) menuMuteBtnEl.innerText = label;
  if (hudMuteBtnEl) hudMuteBtnEl.innerText = label;
}

function playSynthSound(type) {
  if (!audioCtx || isAudioMuted) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'laser') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      gain.gain.setValueAtTime(0.08, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'explosion') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
      gain.gain.setValueAtTime(0.25, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'boss_defeat') {
      const notes = [220, 277, 329, 440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const nOsc = audioCtx.createOscillator(); const nGain = audioCtx.createGain();
        nOsc.connect(nGain); nGain.connect(audioCtx.destination);
        nOsc.type = 'square'; nOsc.frequency.setValueAtTime(freq, now + (idx * 0.08));
        nGain.gain.setValueAtTime(0.12, now + (idx * 0.08));
        nGain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.08) + 0.35);
        nOsc.start(now + (idx * 0.08)); nOsc.stop(now + (idx * 0.08) + 0.35);
      });
    } else if (type === 'countdown') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'go') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'buy') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  } catch (e) { console.log("Audio pipeline active."); }
}

/* ==========================================================================
   3. BACKGROUND IN-MOTION PARALLAX CONFIGURATION
   ========================================================================== */
function initializeStarfieldEngine() {
  backgroundStars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    backgroundStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 3 + 1, 
      brightness: Math.random() * 0.6 + 0.4
    });
  }
}

function processStarfieldMotion(dt) {
  warpFactor += (targetWarpFactor - warpFactor) * 4.0 * dt;

  backgroundStars.forEach(star => {
    let stepSpeed = (star.z * 45) * warpFactor;
    star.y += stepSpeed * dt;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
      star.brightness = Math.random() * 0.6 + 0.4;
    }
  });
}

/* ==========================================================================
   4. SHOP BLUEPRINTS ENGINE & INTERFACE BINDINGS
   ========================================================================== */
function updateShopUI() {
  if (hudCreditsEl) hudCreditsEl.innerText = `CREDITS: ${totalCredits} GC`;
  if (menuWalletAmountEl) menuWalletAmountEl.innerText = `${totalCredits} GC`;

  shipCards.forEach(card => {
    const id = card.getAttribute('data-ship');
    const actionBtn = card.querySelector('.shop-action-btn');
    
    if (unlockedShips.includes(id)) {
      card.classList.remove('locked');
      card.classList.add('unlocked');
      
      if (selectedShipClass === id) {
        card.classList.add('active');
        if (actionBtn) actionBtn.innerText = "SELECTED";
      } else {
        card.classList.remove('active');
        if (actionBtn) actionBtn.innerText = "EQUIP";
      }
    } else {
      card.classList.add('locked');
      card.classList.remove('unlocked');
      card.classList.remove('active');
      const cost = card.getAttribute('data-cost');
      if (actionBtn) actionBtn.innerText = `BUY (${cost} GC)`;
    }
  });
}

shipCards.forEach(card => {
  const actionBtn = card.querySelector('.shop-action-btn');
  if (!actionBtn) return;

  actionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudioSystem();
    const id = card.getAttribute('data-ship');
    
    if (unlockedShips.includes(id)) {
      selectedShipClass = id;
      updateShopUI();
    } else {
      const cost = parseInt(card.getAttribute('data-cost') || '0');
      if (totalCredits >= cost) {
        totalCredits -= cost;
        unlockedShips.push(id);
        selectedShipClass = id;
        localStorage.setItem('space_total_credits', totalCredits);
        localStorage.setItem('space_unlocked_ships', JSON.stringify(unlockedShips));
        playSynthSound('buy');
        updateShopUI();
      } else {
        const prevText = actionBtn.innerText;
        actionBtn.innerText = "INSUFFICIENT CREDITS";
        actionBtn.style.color = '#ff007f';
        setTimeout(() => {
          actionBtn.innerText = prevText;
          actionBtn.style.color = '';
        }, 1200);
      }
    }
  });

  card.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = card.getAttribute('data-ship');
    if (unlockedShips.includes(id)) {
      selectedShipClass = id;
      updateShopUI();
    }
  });
});

/* ==========================================================================
   5. SYSTEM LIFECYCLE & INPUT CONTROLS
   ========================================================================== */
hudFullscreenBtnEl.addEventListener('click', (e) => {
  e.stopPropagation();
  const container = document.getElementById('game-container');
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => console.log(err));
    hudFullscreenBtnEl.innerText = "📺 WINDOWED";
  } else {
    document.exitFullscreen();
    hudFullscreenBtnEl.innerText = "📺 FULLSCREEN";
  }
});

menuMuteBtnEl.addEventListener('click', (e) => { e.stopPropagation(); initAudioSystem(); toggleAudioMuteState(); });
hudMuteBtnEl.addEventListener('click', (e) => { e.stopPropagation(); initAudioSystem(); toggleAudioMuteState(); });

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a')  keys.ArrowLeft = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.ArrowRight = true;
  if (e.key === ' ') keys.Space = true;
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') togglePauseGame();
});

window.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    hudFullscreenBtnEl.innerText = "📺 FULLSCREEN";
  }
});

window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a')  keys.ArrowLeft = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.ArrowRight = false;
  if (e.key === ' ') keys.Space = false;
});

menuBtnEl.addEventListener('click', (e) => {
  e.stopPropagation();
  initAudioSystem();
  if (gameState === 'START' || gameState === 'GAME_OVER') {
    const profile = SHIP_CLASS_PROFILES[selectedShipClass];
    player.speed = profile.speed;
    player.maxHp = profile.maxHp;
    player.hp = profile.maxHp;
    player.color = profile.color;
    player.archetype = profile.archetype;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = 500;
    shieldOverchargeTimer = 0.0;

    startPreFlightCountdown();
  } else if (gameState === 'PAUSED') {
    togglePauseGame();
  }
});

hudPauseBtnEl.addEventListener('click', (e) => { e.stopPropagation(); togglePauseGame(); });

function startPreFlightCountdown() {
  gameState = 'COUNTDOWN';
  targetWarpFactor = 6.0; 
  menuOverlayEl.classList.add('hidden');
  countdownOverlayEl.classList.remove('hidden');
  
  let currentTickCount = 3;
  countdownTextEl.innerText = currentTickCount;
  playSynthSound('countdown');

  const intervalId = setInterval(() => {
    currentTickCount--;
    if (currentTickCount > 0) {
      countdownTextEl.innerText = currentTickCount;
      playSynthSound('countdown');
    } else if (currentTickCount === 0) {
      countdownTextEl.innerText = "ENGAGE!";
      playSynthSound('go');
      targetWarpFactor = 1.0; 
    } else {
      clearInterval(intervalId);
      countdownOverlayEl.classList.add('hidden');
      gameState = 'PLAYING';
      lastTime = performance.now();
    }
  }, 1000);
}

function togglePauseGame() {
  if (gameState !== 'PLAYING' && gameState !== 'PAUSED') return;
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    targetWarpFactor = 0.08; 
    menuHeaderEl.innerText = "SYSTEM PAUSED";
    menuSubEl.innerText = "WARP VECTOR SUSPENDED";
    menuBtnEl.innerText = "RESUME FLIGHT";
    menuOverlayEl.classList.remove('hidden');
    hudPauseBtnEl.innerText = "▶️ RESUME";
  } else {
    gameState = 'PLAYING';
    targetWarpFactor = 1.0;
    menuOverlayEl.classList.add('hidden');
    hudPauseBtnEl.innerText = "⏸️ PAUSE";
    lastTime = performance.now();
  }
}

function triggerHardEngineReset() {
  gameState = 'START';
  score = 0; 
  bossCountTotal = 0; 
  nextBossScoreTarget = 500; 
  currentPhase = 0; 
  comboCount = 0; 
  comboMultiplier = 1.0;
  targetWarpFactor = 1.0;
  shieldOverchargeTimer = 0.0;
  enemies = []; 
  bullets = []; 
  enemyBullets = []; 
  items = []; 
  particles = [];
  damageFlashes = [];
  asteroids = [];
  player.currentWeapon = 'BASIC BLASTER';
  
  document.getElementById('game-container').style.backgroundColor = PHASE_STYLES[0].spaceBg;
  document.getElementById('critical-hull-filter').classList.remove('active');
  
  menuHeaderEl.innerText = "STARFIGHTER PERISHED";
  menuSubEl.innerText = "ALL COMBAT PROTOCOLS RESET BACK TO PHASE 1";
  menuBtnEl.innerText = "LAUNCH FLIGHT";
  
  updateShopUI();
  menuOverlayEl.classList.remove('hidden');
  updateHUD();
}

function triggerToastNotification(key) {
  if (achievements[key] && !achievements[key].unlocked) {
    achievements[key].unlocked = true;
    toastDescEl.innerText = achievements[key].desc;
    achievementToastEl.classList.remove('hidden');
    setTimeout(() => { achievementToastEl.classList.add('hidden'); }, 3000);
  }
}

/* ==========================================================================
   6. DROPS PIPELINE & WAVE MATHEMATICS
   ========================================================================== */
function triggerScreenShake(duration, intensity) { screenShakeTimer = duration; screenShakeIntensity = intensity; }

function createExplosion(x, y, color, count = 15) {
  playSynthSound('explosion');
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: Math.random() * 3 + 1, alpha: 1, decay: Math.random() * 0.025 + 0.015, color });
  }
}

function spawnFloatingText(x, y, text, color) { damageFlashes.push({ x, y, text, color, alpha: 1, vy: -65 }); }

function registerComboKill() {
  comboCount++;
  comboTimer = COMBO_DURATION_MAX;
  comboMultiplier = Math.min(3.0, 1.0 + (comboCount * 0.2));
  if (comboMultiplier >= 3.0) triggerToastNotification('comboKing');
}

function spawnDynamicEnemy() {
  if (boss.active) return;
  const rand = Math.random();
  let type = { name: 'scout', w: 26, h: 26, hp: 1, speed: 185, color: '#ff007f', score: 10, credits: 2 };

  if (rand > 0.88) { 
    type = { name: 'tank', w: 46, h: 46, hp: 4, speed: 75, color: '#e0a000', score: 40, credits: 10 };
  } else if (rand > 0.65) { 
    type = { name: 'striker', w: 22, h: 32, hp: 1, speed: 295, color: '#ff5500', score: 20, credits: 5 };
  }
  
  // Sine-wave offset tracks unique lateral trajectories
  enemies.push({ 
    x: Math.random() * (canvas.width - type.w), 
    y: -type.h, 
    startX: Math.random() * (canvas.width - type.w),
    waveTime: Math.random() * 10,
    ...type, 
    maxHp: type.hp 
  });
}

function spawnAsteroidHazard() {
  let size = Math.random() * 35 + 20; 
  asteroids.push({
    x: Math.random() * (canvas.width - size),
    y: -size,
    w: size,
    h: size,
    hp: Math.ceil(size / 15),
    speed: Math.random() * 60 + 50,
    rot: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 2.0
  });
}

function spawnDynamicCrate(x, y) {
  const roll = Math.random();
  if (roll > 0.45) return;

  if (roll < 0.14) {
    items.push({ x, y, w: 24, h: 24, type: 'SHIELD_REPAIR', speed: 130, color: '#39ff14', pulseRotation: 0 });
  } else {
    const eligibleWeapons = WEAPON_NAMES.filter(w => w !== 'BASIC BLASTER');
    const selectedWeapon = eligibleWeapons[Math.floor(Math.random() * eligibleWeapons.length)];
    items.push({ x, y, w: 24, h: 24, type: selectedWeapon, speed: 130, color: WEAPONS_CONFIG[selectedWeapon].color, pulseRotation: 0 });
  }
}

function executePlayerFiring(cfg, currentTime) {
  playSynthSound('laser');
  const laserColor = cfg.color;
  if (cfg.type === 'single') {
    bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 16, color: laserColor, type: 'standard', vy: -cfg.speed, vx: 0 });
  } else if (cfg.type === 'dual') {
    bullets.push({ x: player.x + 4, y: player.y + player.h * 0.4, w: 4, h: 16, color: laserColor, type: 'standard', vy: -cfg.speed, vx: 0 });
    bullets.push({ x: player.x + player.w - 8, y: player.y + player.h * 0.4, w: 4, h: 16, color: laserColor, type: 'standard', vy: -cfg.speed, vx: 0 });
  } else if (cfg.type === 'plasma') {
    bullets.push({ x: player.x + player.w / 2 - 8, y: player.y - 4, w: 16, h: 16, color: laserColor, type: 'plasma', vy: -cfg.speed, vx: 0 });
  } else if (cfg.type === 'missile') {
    bullets.push({ x: player.x, y: player.y + 10, w: 6, h: 18, color: laserColor, type: 'missile', vy: -cfg.speed, vx: -80 });
    bullets.push({ x: player.x + player.w - 6, y: player.y + 10, w: 6, h: 18, color: laserColor, type: 'missile', vy: -cfg.speed, vx: 80 });
  } else if (cfg.type === 'beam') {
    bullets.push({ x: player.x + player.w / 2 - 3, y: player.y - 10, w: 6, h: 22, color: laserColor, type: 'beam', vy: -cfg.speed, vx: 0 });
  } else if (cfg.type === 'flame') {
    bullets.push({ x: player.x + player.w / 2 + (Math.random() - 0.5) * 14, y: player.y - 4, w: Math.random() * 8 + 4, h: Math.random() * 8 + 4, color: laserColor, type: 'flame', vy: -cfg.speed, vx: (Math.random() - 0.5) * 120 });
  }
  keys.lastShotTime = currentTime;
}

function updateHUD() {
  if (scoreBoardEl) scoreBoardEl.innerText = `SCORE: ${score}`;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('space_high_score', highScore);
    if (highScoreEl) highScoreEl.innerText = `HI-SCORE: ${highScore}`;
  }

  if (hudCreditsEl) hudCreditsEl.innerText = `CREDITS: ${totalCredits} GC`;

  if (comboMultiplier > 1.0) {
    if (comboHudEl) comboHudEl.classList.remove('hidden');
    if (comboMultiplierEl) comboMultiplierEl.innerText = `${comboMultiplier.toFixed(1)}x`;
  } else {
    if (comboHudEl) comboHudEl.classList.add('hidden');
  }

  if (weaponDisplayEl) {
    if (player.currentWeapon === 'BASIC BLASTER') {
      weaponDisplayEl.innerText = `WEAPON: BASIC BLASTER`;
      weaponDisplayEl.style.color = WEAPONS_CONFIG['BASIC BLASTER'].color;
    } else {
      weaponDisplayEl.innerText = `WEAPON: ${player.currentWeapon} (${Math.ceil(player.weaponTimer)}s)`;
      weaponDisplayEl.style.color = WEAPONS_CONFIG[player.currentWeapon].color;
    }
  }

  if (shieldFillEl) {
    let hpRatio = player.hp / player.maxHp;
    shieldFillEl.style.width = `${Math.max(0, hpRatio * 100)}%`;
    
    if (shieldOverchargeTimer > 0) {
      shieldFillEl.style.background = 'linear-gradient(90deg, #00f3ff 0%, #ffffff 100%)';
    } else {
      shieldFillEl.style.background = 'linear-gradient(90deg, #0044ff 0%, var(--neon-blue) 100%)';
    }
    
    const critFilter = document.getElementById('critical-hull-filter');
    if (hpRatio <= 0.3 && shieldOverchargeTimer <= 0 && gameState === 'PLAYING') {
      if (shieldWrapperEl) shieldWrapperEl.classList.add('shield-critical');
      if (critFilter) critFilter.classList.add('active');
    } else {
      if (shieldWrapperEl) shieldWrapperEl.classList.remove('shield-critical');
      if (critFilter) critFilter.classList.remove('active');
    }
  }

  if (boss.active && boss.y >= 0) {
    if (bossHudEl) bossHudEl.classList.remove('hidden');
    if (bossTitleEl) bossTitleEl.innerText = `⚠️ OVERLORD FLAGSHIP MK-${bossCountTotal + 1} ⚠️`;
    if (bossBarFillEl) bossBarFillEl.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  } else {
    if (bossHudEl) bossHudEl.classList.add('hidden');
  }
}

/* ==========================================================================
   7. CORE SIMULATION STEP TICK RUNTIME
   ========================================================================== */
function update(dt) {
  processStarfieldMotion(dt);

  if (gameState !== 'PLAYING') return;

  if (shieldOverchargeTimer > 0) {
    shieldOverchargeTimer -= dt;
  }

  // Dynamic feature: continuous background warp trails 
  if (targetWarpFactor > 1.0 && !boss.active) {
    if (Math.random() < 0.25) {
      particles.push({
        x: Math.random() * canvas.width, y: 0,
        vx: 0, vy: Math.random() * 12 + 10,
        radius: Math.random() * 2 + 1, alpha: 0.8, decay: 0.02,
        color: PHASE_STYLES[currentPhase].stars
      });
    }
    if (warpFactor > 5.5) targetWarpFactor = 1.0;
  }

  // Generate reactive engine thruster particles
  if (Math.random() < 0.4) {
    particles.push({
      x: player.x + player.w / 2 + (Math.random() - 0.5) * 10,
      y: player.y + player.h - 5,
      vx: (Math.random() - 0.5) * 30 * dt,
      vy: Math.random() * 120 * dt + 4,
      radius: Math.random() * 2.5 + 1,
      alpha: 1.0,
      decay: Math.random() * 0.05 + 0.03,
      color: Math.random() > 0.4 ? '#ff5500' : '#ffaa00'
    });
  }

  if (screenShakeTimer > 0) screenShakeTimer -= dt;

  if (comboMultiplier > 1.0) {
    comboTimer -= dt;
    if (comboTimer <= 0) { comboCount = 0; comboMultiplier = 1.0; }
  }

  if (score >= nextBossScoreTarget && !boss.active) {
    boss.active = true;
    let calculatedMaxHP = Math.round(bossBaseMaxHP * Math.pow(1.35, bossCountTotal));
    boss.hp = calculatedMaxHP; boss.maxHp = calculatedMaxHP;
    boss.x = 250; boss.y = -150; boss.attackTimer = 0;
    enemies = []; 
    asteroids = [];
  }

  if (!boss.active) {
    enemySpawnInterval = Math.max(0.35, 1.2 - (score / 2500));
    enemySpawnTimer += dt;
    if (enemySpawnTimer >= enemySpawnInterval) { spawnDynamicEnemy(); enemySpawnTimer = 0; }

    asteroidSpawnTimer += dt;
    if (asteroidSpawnTimer >= asteroidSpawnInterval) { spawnAsteroidHazard(); asteroidSpawnTimer = 0; }
  } else {
    if (boss.y < 80) { boss.y += 60 * dt; } else {
      boss.x += boss.speed * boss.dir * dt;
      if (boss.x <= 20 || boss.x >= canvas.width - boss.w - 20) boss.dir *= -1;
      
      boss.attackTimer += dt;
      if (boss.attackTimer >= Math.max(0.12, 0.25 - (bossCountTotal * 0.02))) {
        enemyBullets.push({ x: boss.x + boss.w * 0.25, y: boss.y + boss.h, w: 8, h: 8, vx: -45, vy: 270 });
        enemyBullets.push({ x: boss.x + boss.w * 0.50, y: boss.y + boss.h, w: 10, h: 10, vx: (Math.random() - 0.5) * 110, vy: 300 });
        enemyBullets.push({ x: boss.x + boss.w * 0.75, y: boss.y + boss.h, w: 8, h: 8, vx: 45, vy: 270 });
        boss.attackTimer = 0;
      }
    }
  }

  if (player.currentWeapon !== 'BASIC BLASTER') {
    player.weaponTimer -= dt;
    if (player.weaponTimer <= 0) player.currentWeapon = 'BASIC BLASTER';
  }

  if (keys.ArrowLeft)  player.x -= player.speed * dt;
  if (keys.ArrowRight) player.x += player.speed * dt;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  const currentTime = performance.now() / 1000;
  const currentWeaponCfg = WEAPONS_CONFIG[player.currentWeapon];
  if (keys.Space && currentTime - keys.lastShotTime >= currentWeaponCfg.fireRate) {
    executePlayerFiring(currentWeaponCfg, currentTime);
  }

  bullets.forEach(b => { b.y += b.vy * dt; b.x += b.vx * dt; });
  bullets = bullets.filter(b => b.y > -b.h && b.x > 0 && b.x < canvas.width);

  enemyBullets.forEach(eb => { eb.y += eb.vy * dt; eb.x += eb.vx * dt; });
  enemyBullets = enemyBullets.filter(eb => eb.y < canvas.height + eb.h);

  // Advanced dynamic AI trajectory handling loops
  enemies.forEach(en => {
    en.y += en.speed * dt;
    en.waveTime += dt * 2.5;
    if (en.name === 'striker' || en.name === 'scout') {
      en.x = en.startX + Math.sin(en.waveTime) * 60;
    }
  });
  
  items.forEach(it => { it.y += it.speed * dt; it.pulseRotation += 4.5 * dt; });
  items = items.filter(it => it.y < canvas.height);

  asteroids.forEach(ast => { ast.y += ast.speed * dt; ast.rot += ast.rotSpeed * dt; });
  asteroids = asteroids.filter(ast => ast.y < canvas.height + ast.h);

  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; });
  particles = particles.filter(p => p.alpha > 0);

  damageFlashes.forEach(f => { f.y += f.vy * dt; f.alpha -= 1.4 * dt; });
  damageFlashes = damageFlashes.filter(f => f.alpha > 0);

  let deadBullets = new Set(); let deadEnemies = new Set(); let deadItems = new Set(); let deadEnemyBullets = new Set(); let deadAsteroids = new Set();

  for (let bi = 0; bi < bullets.length; bi++) {
    let b = bullets[bi];

    for (let ai = 0; ai < asteroids.length; ai++) {
      let ast = asteroids[ai];
      if (b.x < ast.x + ast.w && b.x + b.w > ast.x && b.y < ast.y + ast.h && b.y + b.h > ast.y) {
        if (player.currentWeapon !== 'BEAM LASER') deadBullets.add(bi);
        ast.hp--;
        createExplosion(b.x, b.y, '#888888', 3);
        if (ast.hp <= 0) {
          deadAsteroids.add(ai);
          score += 5; 
          createExplosion(ast.x + ast.w/2, ast.y + ast.h/2, '#555555', 8);
          if (Math.random() < 0.2) spawnDynamicCrate(ast.x + ast.w/2, ast.y + ast.h/2);
        }
        break;
      }
    }
    if (deadBullets.has(bi)) continue;

    for (let ei = 0; ei < enemies.length; ei++) {
      let en = enemies[ei];
      if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
        if (player.currentWeapon !== 'BEAM LASER') deadBullets.add(bi); 
        en.hp--;
        if (en.hp <= 0) {
          deadEnemies.add(ei); registerComboKill(); 
          let adjustedPoints = Math.round(en.score * comboMultiplier);
          let earnedCredits = Math.round(en.credits * comboMultiplier);
          score += adjustedPoints;
          totalCredits += earnedCredits;
          localStorage.setItem('space_total_credits', totalCredits);
          
          triggerToastNotification('firstBlood');
          spawnFloatingText(en.x + en.w/2, en.y, `+${earnedCredits} GC`, '#ffeb3b');
          createExplosion(en.x + en.w/2, en.y + en.h/2, en.color, 12);
          spawnDynamicCrate(en.x + en.w/2, en.y + en.h/2);
        }
        break;
      }
    }
  }

  if (boss.active && boss.y >= 0) {
    for (let bi = 0; bi < bullets.length; bi++) {
      let b = bullets[bi];
      if (b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
        if (player.currentWeapon !== 'BEAM LASER') deadBullets.add(bi);
        boss.hp -= (player.currentWeapon === 'PLASMA CANNON') ? 3 : 1;
        
        if (boss.hp <= 0) {
          boss.active = false; bossCountTotal++;
          let bossBonus = 500 * bossCountTotal; 
          let bossCredits = 150 * bossCountTotal;
          score += bossBonus;
          totalCredits += bossCredits;
          localStorage.setItem('space_total_credits', totalCredits);
          
          spawnFloatingText(boss.x + boss.w/2, boss.y + boss.h/2, `BOSS CRUSHED +${bossCredits} GC`, '#ffeb3b');
          triggerToastNotification('bossSlayer');
          createExplosion(boss.x + boss.w/2, boss.y + boss.h/2, '#ff007f', 95);
          triggerScreenShake(1.6, 28);
          
          playSynthSound('boss_defeat');
          
          currentPhase = (currentPhase + 1) % PHASE_STYLES.length;
          document.getElementById('game-container').style.backgroundColor = PHASE_STYLES[currentPhase].spaceBg;
          
          targetWarpFactor = 12.0; 
          nextBossScoreTarget += 1000;
        }
      }
    }
  }

  for (let ebi = 0; ebi < enemyBullets.length; ebi++) {
    let eb = enemyBullets[ebi];
    if (eb.x < player.x + player.w && eb.x + eb.w > player.x && eb.y < player.y + player.h && eb.y + eb.h > player.y) {
      deadEnemyBullets.add(ebi);
      if (shieldOverchargeTimer > 0) {
        shieldOverchargeTimer = 0; 
        spawnFloatingText(player.x + player.w/2, player.y, "BUFFER BREAK", '#00f3ff');
      } else {
        player.hp -= 15;
      }
      triggerScreenShake(0.3, 12); comboCount = 0; comboMultiplier = 1.0; 
    }
  }

  for (let iti = 0; iti < items.length; iti++) {
    let it = items[iti];
    if (it.x < player.x + player.w && it.x + it.w > player.x && it.y < player.y + player.h && it.y + it.h > player.y) {
      deadItems.add(iti);
      if (it.type === 'SHIELD_REPAIR') {
        if (player.hp >= player.maxHp) {
          shieldOverchargeTimer = MAX_OVERCHARGE_DURATION;
          spawnFloatingText(player.x + player.w/2, player.y - 15, "SHIELD OVERCHARGED", '#00f3ff');
        } else {
          player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.25)); 
          spawnFloatingText(player.x + player.w/2, player.y - 15, "SHIELD RESTORED", '#39ff14');
        }
      } else {
        player.currentWeapon = it.type; player.weaponTimer = 10; 
        spawnFloatingText(player.x + player.w/2, player.y - 15, player.currentWeapon, it.color);
      }
    }
  }

  bullets = bullets.filter((_, idx) => !deadBullets.has(idx));
  enemies = enemies.filter((_, idx) => !deadEnemies.has(idx));
  items = items.filter((_, idx) => !deadItems.has(idx));
  enemyBullets = enemyBullets.filter((_, idx) => !deadEnemyBullets.has(idx));
  asteroids = asteroids.filter((_, idx) => !deadAsteroids.has(idx));

  asteroids.forEach((ast, ai) => {
    if (player.x < ast.x + ast.w && player.x + player.w > ast.x && player.y < ast.y + ast.h && player.y + player.h > ast.y) {
      if (shieldOverchargeTimer > 0) {
        shieldOverchargeTimer = 0;
      } else {
        player.hp -= 25;
      }
      deadAsteroids.add(ai);
      createExplosion(ast.x + ast.w/2, ast.y + ast.h/2, '#777777', 20);
      triggerScreenShake(0.5, 20); comboCount = 0; comboMultiplier = 1.0;
    }
  });
  if (deadAsteroids.size > 0) asteroids = asteroids.filter((_, idx) => !deadAsteroids.has(idx));

  enemies.forEach((en, ei) => {
    if (en.y > canvas.height) { player.hp -= 15; deadEnemies.add(ei); comboCount = 0; comboMultiplier = 1.0; }
    if (player.x < en.x + en.w && player.x + player.w > en.x && player.y < en.y + en.h && player.y + player.h > en.y) {
      if (shieldOverchargeTimer > 0) {
        shieldOverchargeTimer = 0;
      } else {
        player.hp -= 20;
      }
      deadEnemies.add(ei);
      createExplosion(en.x + en.w/2, en.y + en.h/2, en.color, 15);
      triggerScreenShake(0.4, 16); comboCount = 0; comboMultiplier = 1.0;
    }
  });
  if (deadEnemies.size > 0) enemies = enemies.filter((_, idx) => !deadEnemies.has(idx));

  updateHUD();

  if (player.hp <= 0) {
    triggerHardEngineReset();
  }
}

/* ==========================================================================
   8. CANVAS DESIGNS ENGINE GRAPHICS
   ========================================================================== */
function draw() {
  ctx.save();
  if (screenShakeTimer > 0 && gameState === 'PLAYING') {
    ctx.translate((Math.random() - 0.5) * screenShakeIntensity, (Math.random() - 0.5) * screenShakeIntensity);
  }

  ctx.fillStyle = PHASE_STYLES[currentPhase].spaceBg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = PHASE_STYLES[currentPhase].nebulae; ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  backgroundStars.forEach(star => {
    ctx.fillStyle = PHASE_STYLES[currentPhase].stars;
    ctx.globalAlpha = star.brightness;
    
    if (warpFactor > 3.0) {
      let trailLength = Math.max(2, star.z * 3 * (warpFactor / 2));
      ctx.fillRect(star.x, star.y, star.z * 0.7, trailLength);
    } else {
      ctx.fillRect(star.x, star.y, star.z * 0.8, star.z * 0.8);
    }
  });
  ctx.restore();

  if (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'COUNTDOWN') {
    if (shieldOverchargeTimer > 0) {
      ctx.save();
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#00f3ff';
      ctx.strokeStyle = `rgba(0, 243, 255, ${0.4 + Math.sin(performance.now() / 100) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = player.color;
    ctx.fillStyle = player.color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // PERFECT MATHEMATICAL BOUNDS: Line tracing bug completely fixed
    if (player.archetype === 'arrow') {
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h * 0.85);
      ctx.lineTo(player.x + player.w * 0.75, player.y + player.h * 0.75);
      ctx.lineTo(player.x + player.w / 2, player.y + player.h); 
      ctx.lineTo(player.x + player.w * 0.25, player.y + player.h * 0.75);
      ctx.lineTo(player.x, player.y + player.h * 0.85);
    } else if (player.archetype === 'shield') {
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h * 0.35);
      ctx.lineTo(player.x + player.w * 0.85, player.y + player.h * 0.95);
      ctx.lineTo(player.x + player.w * 0.15, player.y + player.h * 0.95);
      ctx.lineTo(player.x, player.y + player.h * 0.35);
    } else if (player.archetype === 'trident') {
      ctx.moveTo(player.x + player.w / 2, player.y + player.h * 0.3);
      ctx.lineTo(player.x + player.w * 0.7, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h * 0.9);
      ctx.lineTo(player.x + player.w * 0.5, player.y + player.h * 0.7);
      ctx.lineTo(player.x, player.y + player.h * 0.9);
      ctx.lineTo(player.x + player.w * 0.3, player.y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h * 0.5, 6, 0, Math.PI * 2); ctx.fill();

    if (comboMultiplier > 1.0) {
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x + player.w/2, player.y + player.h/2, player.w * 0.8, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * (comboTimer / COMBO_DURATION_MAX)));
      ctx.stroke();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let offset = 20; offset < canvas.width; offset += 40) {
      ctx.moveTo(offset, canvas.height - 120);
      ctx.lineTo(offset - 40, canvas.height);
    }
    ctx.stroke();
    ctx.restore();
  }

  bullets.forEach(b => {
    ctx.shadowColor = b.color; ctx.fillStyle = b.color;
    if (b.type === 'plasma') {
      ctx.beginPath(); ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w, 0, Math.PI*2); ctx.fill();
    } else if (b.type === 'flame') {
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.w, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0;
    } else { ctx.fillRect(b.x, b.y, b.w, b.h); }
  });

  ctx.shadowColor = '#ff0055'; ctx.fillStyle = '#ff0055';
  enemyBullets.forEach(eb => { ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.w, 0, Math.PI * 2); ctx.fill(); });

  enemies.forEach(en => {
    ctx.shadowColor = en.color; ctx.fillStyle = en.color; ctx.beginPath();
    if (en.name === 'tank') { 
      ctx.moveTo(en.x + en.w / 2, en.y); ctx.lineTo(en.x + en.w, en.y + en.h * 0.3); ctx.lineTo(en.x + en.w, en.y + en.h * 0.8); ctx.lineTo(en.x + en.w / 2, en.y + en.h); ctx.lineTo(en.x, en.y + en.h * 0.8); ctx.lineTo(en.x, en.y + en.h * 0.3);
    } else { 
      ctx.moveTo(en.x + en.w / 2, en.y); ctx.lineTo(en.x + en.w, en.y + en.h / 2); ctx.lineTo(en.x + en.w / 2, en.y + en.h); ctx.lineTo(en.x, en.y + en.h / 2);
    }
    ctx.closePath(); ctx.fill();
  });

  asteroids.forEach(ast => {
    ctx.save();
    ctx.translate(ast.x + ast.w / 2, ast.y + ast.h / 2);
    ctx.rotate(ast.rot);
    ctx.shadowColor = '#666666'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#3a3a42'; ctx.strokeStyle = '#555560'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -ast.h / 2);
    ctx.lineTo(ast.w / 2, -ast.h * 0.3);
    ctx.lineTo(ast.w * 0.4, ast.h / 2);
    ctx.lineTo(-ast.w * 0.3, ast.h * 0.4);
    ctx.lineTo(-ast.w / 2, -ast.h * 0.1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  });

  if (boss.active && boss.y >= -boss.h) {
    ctx.shadowColor = '#ff0055'; ctx.fillStyle = '#110318'; ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y); ctx.lineTo(boss.x + boss.w, boss.y); ctx.lineTo(boss.x + boss.w * 0.9, boss.y + boss.h * 0.65); ctx.lineTo(boss.x + boss.w * 0.65, boss.y + boss.h); ctx.lineTo(boss.x + boss.w * 0.35, boss.y + boss.h); ctx.lineTo(boss.x + boss.w * 0.1, boss.y + boss.h * 0.65);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff0055'; ctx.fillRect(boss.x + boss.w * 0.25, boss.y + 28, boss.w * 0.5, 8);
  }

  items.forEach(it => {
    ctx.save(); ctx.translate(it.x + it.w / 2, it.y + it.h / 2); ctx.rotate(it.pulseRotation);
    ctx.shadowColor = it.color; ctx.shadowBlur = 20; ctx.strokeStyle = it.color; ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(4, 4, 20, 0.9)'; ctx.beginPath();
    ctx.moveTo(0, -it.h / 2); ctx.lineTo(it.w / 2, 0); ctx.lineTo(0, it.h / 2); ctx.lineTo(-it.w / 2, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let glyph = (it.type === 'SHIELD_REPAIR') ? '⚡' : it.type[0]; ctx.fillText(glyph, 0, 0); ctx.restore();
  });

  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.alpha; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  });

  ctx.shadowBlur = 0; 
  damageFlashes.forEach(f => {
    ctx.save(); ctx.globalAlpha = f.alpha; ctx.fillStyle = f.color;
    ctx.font = "bold 13px 'Courier New', Courier, monospace"; ctx.fillText(f.text, f.x, f.y); ctx.restore();
  });
  ctx.restore(); 
}

/* ==========================================================================
   9. ANIMATION LOOP DISPATCHER
   ========================================================================== */
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  if (dt > 0.1) dt = 0.1;
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);