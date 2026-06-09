# 🌌 GALACTIC DEFENDER: Rogue Hangar Edition

An ultra-responsive, arcade-style vertical retro space shooter built entirely with modern vanilla web technologies using **HTML5 Canvas**, **CSS3**, and **JavaScript**.

Take control of modular starfighters, maintain high-speed kill streaks, collect dynamic weapon crates, and harvest cosmic credits to unlock advanced ship blueprints from your persistent hangar bay.

---

## 🚀 Live Demo

🎮 **Play Now:**  
👉 https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/

---

## 📸 Screenshots

### Main Hangar
Add your screenshot here:

```md
![Hangar Screen](screenshots/hangar.png)
```

### Gameplay
```md
![Gameplay](screenshots/gameplay.png)
```

### Ship Selection
```md
![Ships](screenshots/ships.png)
```

---

# ✨ Features

## 🛠️ Blueprint Economy & Hangar Bay

### 💾 Persistent Progress
- Earn Galactic Credits (GC) during gameplay.
- Credits and unlocked ships are automatically saved using the browser's LocalStorage API.
- Continue your progress even after closing the game.

### 🚀 Unlockable Starfighters

| Ship | Cost | Description |
|--------|--------|-------------|
| INTERCEPTOR | Free | Lightweight frame optimized for speed and evasive maneuvers |
| VANGUARD | 500 GC | Heavy armored dreadnought featuring enhanced shield capacity |
| RAIDER | 1200 GC | Aggressive trident-class assault ship built for maximum damage output |

---

## ⚔️ Dynamic Weapon Drop System

Destroy enemies and collect rotating weapon crates to temporarily unlock advanced weapon systems.

### 🔫 Dual Lasers
- Twin-stream laser fire.
- Increased attack coverage.
- Excellent for clearing enemy waves.

### ⚡ Plasma Cannons
- Fires powerful plasma spheres.
- Deals triple damage.
- Effective against high-health enemies.

### 🚀 Missile Launchers
- Fires missiles from both wings.
- High burst damage.
- Great for bosses and elite enemies.

### 🌈 Beam Lasers
- Continuous piercing energy beam.
- Damages multiple enemies simultaneously.
- Penetrates enemy formations.

### 🔥 Flamethrower
- Short-range spread attack.
- Massive crowd-control capability.
- Perfect for close-combat situations.

> All special weapons remain active for **10 seconds** after collection.

---

## ☄️ Advanced Combat Mechanics

### 🎯 Combo Multiplier System
- Chain enemy eliminations together.
- Increase your score multiplier up to **3.0x**.
- Multiplier gradually decays if combat slows down.

### 🛡️ Overcharge Shield System
- Collect shield cells to restore health.
- Picking up a shield at maximum health activates:
  - Overcharge Mode
  - Protective energy barrier
  - One-hit damage immunity

### ☄️ Procedural Asteroid Hazards
- Randomly generated asteroid fields.
- Dynamic scaling based on size and mass.
- Rotating collision objects create additional challenge.

---

## 🎵 Retro Synth Audio Engine

Built entirely using the **Web Audio API**.

### Features
- No external audio files.
- Procedurally generated:
  - Laser sounds
  - Explosions
  - Pickup effects
  - UI tones

### Audio Controls
- Dedicated mute controls in Hangar Mode.
- Separate in-game sound toggle.
- Instant audio switching.

---

# 🎮 Controls

| Key | Action |
|-------|----------|
| ⬅️ Left Arrow / A | Move Left |
| ➡️ Right Arrow / D | Move Right |
| Spacebar | Fire Weapons |
| Esc / P | Pause / Resume Game |

---

# 🏆 Progression System

Earn Galactic Credits by:

- Destroying enemy fighters
- Maintaining combo streaks
- Surviving longer waves
- Collecting bonus rewards

Spend credits to:

- Unlock advanced ships
- Expand your hangar collection
- Improve combat potential

---

# 📂 Project Structure

```bash
Galactic-Defender/
│
├── index.html
├── style.css
├── game.js
├── screenshots/
│   ├── hangar.png
│   ├── gameplay.png
│   └── ships.png
│
└── README.md
```

### File Overview

| File | Purpose |
|--------|----------|
| index.html | Main game layout and UI |
| style.css | Visual effects, animations, and styling |
| game.js | Game engine, physics, rendering, and audio |

---

# 💻 Installation

## Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
```

## Navigate into the Project

```bash
cd YOUR_REPOSITORY_NAME
```

## Launch the Game

### Option 1: Open Directly

Simply open:

```bash
index.html
```

in any modern browser.

### Option 2: Run a Local Server (Recommended)

Python:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

---

# 🌐 Browser Compatibility

✅ Google Chrome

✅ Microsoft Edge

✅ Mozilla Firefox

✅ Safari

---

# 🔮 Future Updates

Planned features include:

- Boss Battles
- Skill Tree Progression
- Daily Missions
- Ship Upgrade System
- Endless Survival Mode
- Achievement System
- Leaderboards
- New Weapon Types
- Special Ultimate Abilities
- Multiplayer Co-op Mode

---

# 🏅 Built With

- HTML5 Canvas
- CSS3
- JavaScript (ES6+)
- Web Audio API
- LocalStorage API

---

# 🤝 Contributing

Contributions, ideas, and pull requests are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

# 📜 License

This project is licensed under the **MIT License**.

Feel free to fork, modify, and build your own galactic adventures.

---

# ⭐ Support

If you enjoyed the project:

⭐ Star the repository

🍴 Fork the project

🚀 Share it with fellow gamers and developers

---

## "Defend the galaxy. Upgrade your fleet. Become a legend."
