# 用手機當鏡頭 · 陀螺儀示範

Tech demo: scan a QR code, open an HTTPS page in iPhone Safari (no app), and use the phone gyroscope as a virtual camera in a simple Three.js geometric scene.

## Live URL

https://raw.githack.com/kwanho0125-cloud/qr-gyro-demo/main/site/index.html

QR image (encodes that exact URL): `qr.png` in this folder.

This URL serves the `site/` folder from the public GitHub repo with the correct HTML/JS/CSS types. GitHub Pages could not be auto-enabled from Actions (`GITHUB_TOKEN` cannot create a Pages site). To switch to official Pages later: in the repo, Settings → Pages → Source: GitHub Actions, then re-run the workflow. The Pages URL would be https://kwanho0125-cloud.github.io/qr-gyro-demo/ — regenerate the QR if you switch.

## How to play

1. Open the Camera app (or Safari) and scan the QR code.
2. The page **must** open in **Safari**. If Instagram, WeChat, or another in-app browser opens it, use “Open in Safari”.
3. Tap the large **開始** button and allow **Motion & Orientation / 動態感應器**. The demo will not auto-start.
4. Tilt and turn the phone to look around. Hold **按住前進** to walk forward (movement stays on the ground plane).
5. Aim the centre dot at the five coloured markers (sphere, box, cylinder, cone, torus) and hold your gaze briefly to collect them.

On a computer, drag to look and hold Advance (or press W) to walk. That path is only for checking the scene.

## How it works

- Static site, Three.js r170 from jsDelivr (`site/index.html`, `site/styles.css`, `site/app.js`).
- **No WebXR immersive-AR** (iPhone Safari still does not support it) and **no 8th Wall**.
- Camera rotation uses the classic DeviceOrientationControls conversion: device `alpha` / `beta` / `gamma` plus screen orientation → a quaternion, then a `-π/2` X rotation so the camera looks out the back of the phone. That helper is deprecated in current Three.js, but the maths is still the right approach.
- On iOS 13+, `DeviceOrientationEvent.requestPermission()` runs only from the Start tap.
- The first orientation sample (and the **校正方向** button) sets an offset so the current phone pose looks down the path. This avoids depending on compass north / `webkitCompassHeading`.
- In-app browsers are detected from the user agent and never enter the experience.

## Redeploy

The site is published with GitHub Pages from the `site/` folder of this repository (`kwanho0125-cloud/qr-gyro-demo`), via `.github/workflows/pages.yml` on push to `main`.

```bash
# edit files under site/
git add site .github README.md
git commit -m "Update gyro demo"
git push origin main
# wait for the Pages workflow, then confirm the live URL returns 200
```

If the public URL changes, regenerate the QR image:

```bash
python3 tools/make-qr.py https://NEW-URL /workspace/qr-gyro-game/qr.png
```

`make-qr.py` needs the `qrcode` and `Pillow` packages (`pip install qrcode pillow`).

### Local preview

Sensors require HTTPS, so localhost is only useful for the desktop drag fallback:

```bash
cd site && python3 -m http.server 8080
```

## Caveats (iPhone Safari)

- Permission must be granted; if denied, use 設定 → Safari → 動態感應器 / Motion & Orientation Access, then reload and tap Start again.
- Do not open the page inside Instagram, WeChat, Facebook, Line, etc.
- Hold the phone upright (portrait). Laying it completely flat can hit the usual Euler gimbal oddness of `alpha`/`beta`/`gamma`.
- If the view feels twisted, tap **校正方向** while pointing the phone the way you want to treat as “forward”.
- This is a short tech demo, not a finished game.
