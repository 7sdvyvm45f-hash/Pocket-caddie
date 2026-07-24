# Pocket Caddie PWA

A phone-friendly, offline-capable club recommendation app.

## Run locally
A service worker requires HTTPS or localhost.

### Python
```bash
cd pocket-caddie-pwa
python3 -m http.server 8080
```
Open http://localhost:8080.

## Install on iPhone
1. Host the folder on an HTTPS site such as GitHub Pages, Netlify, Vercel, or Replit.
2. Open the site in Safari.
3. Tap Share.
4. Tap Add to Home Screen.

## Included
- Pin distance input
- -10, -5, 0, +5, +10 adjustment
- Playing-distance calculation
- Closest-club recommendation
- Editable clubs and carry distances
- Multiple saved bag profiles
- Automatic local saving
- Configurable Green Light range
- Recommendation history
- Offline service worker
