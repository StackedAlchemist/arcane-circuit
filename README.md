# ⚗ ARCANE CIRCUIT — Cyberpunk Alchemist Chess

A fully playable, browser-based chess game built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies, no build tools — just open and play.

![Game Theme](https://img.shields.io/badge/theme-Cyberpunk%20Alchemist-bf5fff?style=for-the-badge)
![Tech](https://img.shields.io/badge/built%20with-Vanilla%20JS-00f5ff?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-ffd700?style=for-the-badge)

---

## 👁 Preview

> Dark obsidian board — neon gold Aurum Order vs. violet Void Cult — circuit-grid squares, glowing pieces, and alchemical rune accents.

---

## ✨ Features

- **Full legal chess** — castling (kingside & queenside), en passant, pawn promotion
- **Check / checkmate / stalemate detection** with visual highlighting
- **Two game modes** switchable mid-session:
  - ⚔ **Two Alchemists** — local two-player
  - 🤖 **vs AI Oracle** — minimax engine with alpha-beta pruning
- **Three AI difficulty levels:**
  - `I` — Novice (partially random)
  - `II` — Adept (depth-2 search)
  - `III` — Master (depth-3 search)
- **Undo move** (undoes both player and AI move in AI mode)
- **Move history** log in algebraic notation
- **Captured pieces** display per player
- **Pawn promotion modal** — choose Queen, Rook, Bishop, or Knight
- Cyberpunk aesthetic — neon glows, circuit grid, scan-line overlay, animated turn indicators

---

## 🗂 File Structure

```
arcane-circuit/
├── index.html   # HTML structure & layout
├── style.css    # All styling, animations, and theme variables
├── chess.js     # Chess engine, AI, rendering, and UI logic
└── README.md
```

---

## 🚀 Getting Started

No installation required.

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/arcane-circuit.git
   ```
2. Open `index.html` in any modern browser.

That's it — no `npm install`, no build step, no server needed.

---

## 🧠 How the AI Works

The AI uses the **minimax algorithm** with **alpha-beta pruning** to search ahead and evaluate positions.

- **Evaluation** is based on material value (pawn=1, knight/bishop=3, rook=5, queen=9) plus piece-square tables that reward good positioning (e.g. knights in the center, pawns pushing forward).
- **Difficulty I** has a 50% chance of picking a random legal move, making it beatable for beginners.
- **Difficulty III** searches 3 plies deep, which plays solid opening and middlegame chess.

---

## 🎨 Tech & Design

| Concern | Approach |
|---|---|
| Language | Vanilla JavaScript (ES6+) |
| Styling | Pure CSS with custom properties |
| Fonts | Google Fonts — Cinzel Decorative, Orbitron, Rajdhani |
| AI | Minimax + Alpha-Beta Pruning |
| State | Plain JS objects, no libraries |

---

## 🛠 Customization

All theme colors are defined as CSS variables at the top of `style.css`:

```css
:root {
  --neon-cyan:   #00f5ff;
  --neon-gold:   #ffd700;
  --neon-purple: #bf5fff;
  --neon-red:    #ff2a6d;
  --dark-bg:     #050810;
}
```

Change these to reskin the entire game instantly.

To increase AI search depth, edit the `getBestMove` function in `chess.js`:

```js
const depth = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
```

> ⚠ Depths above 4 may cause noticeable lag in the browser.

---

## 📜 License

MIT — free to use, modify, and distribute.

---

*Forged in the Aurum Order. Tempered by the Void Circuit.*
