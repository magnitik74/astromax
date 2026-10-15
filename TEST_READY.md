# TEST_READY: AstroMAX 4-Step Cinematic Teaser Intro Flow

**Date**: 2026-10-15  
**Author**: Test Writer 1 (`test_writer_1`)  
**Status**: VERIFIED & READY FOR MERGE (100% GREEN)  
**Standard**: Karpathy Framework Tier 3/4 (RLVR / Verifiable Rewards)

---

## 1. Executive Summary

The automated test infrastructure for the AstroMAX 4-step cinematic teaser intro flow is fully authored, integrated, and verified against the implementation. 

- **Unit/Integration Test Suite (`npm test`)**: **62 passed, 0 failed** across 14 test files.
- **Teaser Integrity Test (`test/teaser_integrity.test.js`)**: **6/6 passed** (DOM containers, canvases, progress indicators, action buttons, local assets & 0 CDN, brand & copy integrity, TVLC lifecycle).
- **Automated Visual & No-Scroll Suite (`test/verify_teaser_flow.cjs`)**: **8/8 screenshots captured** across standard mobile (390×844) and compact iPhone SE (375×667) viewports with **zero vertical scroll overflow** (`scrollHeight <= clientHeight + 1` strictly satisfied on all screens).
- **Interactive Navigation Verification**:
  - Sequential forward navigation («Далее →» 1 → 2 → 3 → 4): **PASSED ✅**
  - Back navigation («← Назад» 2 → 1): **PASSED ✅**
  - Final CTA transition to Step 1 («Создать мою натальную карту →»): **PASSED ✅**
  - Header Discreet Skip («Пропустить»): **PASSED ✅** (jumps directly to Name entry `#obStep1`, instantly pausing 3D loops and hiding teaser containers).

---

## 2. Test Suite Inventory & Coverage

### 2.1. `test/teaser_integrity.test.js` (Node Native Test Runner ESM)
Integrated into `package.json` (`npm.cmd test`).

| Test Case | Scope & Verification | Result |
|---|---|:---:|
| `Teaser DOM: 4 teaser containers and dedicated canvases exist in public/index.html` | Asserts existence of `#obTeasersWrap`, `#obTeaser1`..`#obTeaser4`, and dedicated canvases `#obNatalCanvas`, `#obEmpathyCanvas`, `#obTarotCanvas`, `#obHoroscopeCanvas`. | **PASS** |
| `Teaser Navigation: Header controls, progress segments, and discreet skip button exist` | Asserts `#onboardingStepIndicator`, progress pills `#obSeg1`..`#obSeg4`, and `#obSkipBtn` with label «Пропустить». | **PASS** |
| `Teaser Action Buttons: CTA buttons on screens 1-4 and Back buttons on screens 2-4` | Asserts «Далее →» on screens 1–3, «Создать мою натальную карту →» on screen 4, and «← Назад» on screens 2–4. | **PASS** |
| `Teaser Assets & Security: Local Three.js bundled and 0 external CDN script references` | Asserts `public/three.min.js` exists (>500KB), script tag `<script src="/three.min.js"></script>` is present, and scans all script tags to confirm 0 external CDN references (`https://`, `http://`, `unpkg`, `cdnjs`, `jsdelivr`). | **PASS** |
| `Brand & Psychological Copy Integrity: Zero blacklisted words and zero robotic gender brackets` | Scans `#onboardingModal` and full `public/index.html` for blacklisted words («демон», «NASA», «эфемерид») and robotic gender brackets `/[а-яё]+\((?:а|ла|ся|сь|ось)\)/i`. Scans `src/chat/chatEngine.js` for gender brackets. | **PASS** |
| `TVLC Controller & Lifecycle: switchTeaserAnimation, pauseAllTeaserAnimations and skipToDataEntry exist` | Asserts definitions of `switchTeaserAnimation`, `showTeaserStep`, `pauseAllTeaserAnimations`, and `skipToDataEntry` in client script. | **PASS** |

### 2.2. `test/verify_teaser_flow.cjs` (Headless Edge Puppeteer Visual & No-Scroll Suite)
Automated visual regression and layout verification script.

- **Local Test Server**: Static HTTP server on `http://localhost:4322` serving `public/` with no caching.
- **Headless Browser**: Microsoft Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- **Viewports Tested**:
  1. Standard Mobile: `390×844` (iPhone 12/13/14/15)
  2. Compact Viewport: `375×667` (iPhone SE / small Android devices)
- **Measured Layout Constraints**:
  - `390×844`: Sheet `844px / 844px` (0px overflow), Step `740px / 740px` (0px overflow).
  - `375×667`: Sheet `667px / 667px` (0px overflow), Step `563px / 563px` (0px overflow).
  - Strict compliance: `scrollHeight <= clientHeight + 1` on 100% of teaser views.

---

## 3. High-Resolution Visual Evidence Artifacts

All 8 screenshots were captured into `.agents/teamwork/artifacts/screenshots/`:

| Teaser Step | Title | Viewport (390×844) | Viewport (375×667 iPhone SE) |
|---|---|---|---|
| **Screen 1** | Натальная карта (Большая Тройка) | `teaser_s1_390x844.png` (500 KB) | `teaser_s1_375x667.png` (400 KB) |
| **Screen 2** | Личный Астролог 24/7 | `teaser_s2_390x844.png` (491 KB) | `teaser_s2_375x667.png` (399 KB) |
| **Screen 3** | Храм Таро (3D vortex) | `teaser_s3_390x844.png` (483 KB) | `teaser_s3_375x667.png` (391 KB) |
| **Screen 4** | Персональный Гороскоп | `teaser_s4_390x844.png` (488 KB) | `teaser_s4_375x667.png` (399 KB) |

---

## 4. How to Run the Verification Suites

### 4.1. Run Full Project Test Suite (including Teaser Integrity)
```powershell
npm.cmd test
```
*Expected Output*:
```
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
```

### 4.2. Run Dedicated Teaser Integrity Test
```powershell
node --test test/teaser_integrity.test.js
```
*Expected Output*:
```
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### 4.3. Run E2E Visual & No-Scroll Puppeteer Test
```powershell
node test/verify_teaser_flow.cjs
```
*Expected Output*:
```
Screenshots Captured: 8 / 8
No-Scroll Checks Passed: 8 / 8
Skip Button Test: PASSED ✅
CTA Advance Test: PASSED ✅
Back Button Test: PASSED ✅
🎉 ALL E2E TEASER VERIFICATIONS PASSED SUCCESSFULLY!
```

---

## 5. Golden Lock & Safety Verification

1. **Golden Lock Intact (GEMINI.md Rule 10)**:
   - `vercel.json`: Zero HTTP redirects, framework null, outputDirectory `public`.
   - `public/max-web-app.js`: 100% locally served, zero CDN dependencies.
   - `notifyBridge()`: Lines 10–104 in `public/index.html` strictly preserved.
   - Bot Launcher Gateway: Zero inline link buttons, native button `«✦ Открыть»` guidance.
2. **Brand & Copy Integrity (GEMINI.md Rule 7 & 8)**:
   - Zero blacklisted words (`демон`, `NASA`, `эфемерид`).
   - Zero robotic gender brackets `(а)/(ла)` across onboarding and chat engines.
3. **No-Scroll Standard (GEMINI.md Rule 6)**:
   - 100% full-screen no-scroll on all tested mobile viewports down to 375×667.
