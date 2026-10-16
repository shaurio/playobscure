OBSCURE - HOMEPAGE CSS FIX

The initial homepage update loaded without CSS Module class names in the user's Next.js 16/Turbopack dev session. This replacement uses ordinary CSS, with every class prefixed "ob-" so it stays isolated from other game pages. No changes to game mechanics.

Install in playobscure folder:
  unzip -o ~/Downloads/obscure-homepage-css-fix.zip

Your app/layout.tsx should import only "./globals.css". If you followed an earlier suggestion to add "./home.module.css", remove that extra import.

Then restart npm run dev and open http://localhost:3000.
Run npm run build before deployment.

Files:
- app/page.tsx (homepage with normal CSS import, fixed copyright year)
- app/home.css (new ordinary CSS; namespaced)
- components/homepage-effects.tsx (shared style mapping)
- components/homepage-styles.ts (new explicit class names)

The earlier app/home.module.css is no longer used, but can be left in the folder.
