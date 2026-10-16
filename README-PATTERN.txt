Obscure — subtle scrolling X wallpaper for the ORIGINAL homepage

Built for the previous "obscure-minimal-homepage.zip" update.
Only changes app/home-ambient.css and components/home-ambient.tsx and adds public/obscure-x-pattern.svg.
It DOES NOT modify app/page.tsx, components/hero-headline.tsx, game modes, scoring, datasets, or package.json.

Install:
  cd ~/playobscure
  unzip -o ~/Downloads/obscure-x-wallpaper.zip
  npm run dev

Look at http://localhost:3000 and watch the X pattern for 10-15 seconds.

Tuning: app/home-ambient.css
  15s in the obscure-ambient-pattern animation = scroll speed (smaller = faster)
  opacity: 0.76 = strength of the Xs (smaller = darker)
  background: #09130f = base color

Reduced-motion accessibility: background stays still for people who request reduced motion.
