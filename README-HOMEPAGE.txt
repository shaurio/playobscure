OBSCURE — FLUID HOMEPAGE UPDATE
================================

Contents (3 source files)
- app/page.tsx               homepage content, only
- app/home.module.css        homepage-only animation and layout
- components/homepage-effects.tsx   mouse-reactive glow and liquid title

No additional packages. No changes to game logic, APIs, or globals.css.

Install
-------
1. Save/commit your current code first.
2. Download this ZIP to ~/Downloads.
3. Run:
   cd ~/playobscure
   unzip -o ~/Downloads/obscure-homepage-update.zip
   npm run dev
4. Visit http://localhost:3000, move mouse over the title, hover the game cards.
5. Run npm run build before deploying.

Source inspiration
------------------
Custom implementation influenced by these public MIT-licensed CodePens:
- glitchworker, Bubbles Background Animation:
  https://codepen.io/glitchworker/pen/jENZGOV
- Robin Delaporte, Fluid text hover:
  https://codepen.io/robin-dela/pen/KKPYoBq

This implementation does not copy external JS, shader code, or images.
Homepage footer credits the two examples by linking to their original Pens.

Notes
-----
- Honors prefers-reduced-motion.
- CSS/SVG effects don't interfere with Daily, Words, or Arcade.
- On touch devices, background animates but title stays readable.
- All three game links are native Next.js Links.
