# SignalForge — Manual QA & Route Verification Checklist

This document outlines the repeatable quality assurance procedure for SignalForge before deployment.

## 1. Authentication & Session Routing
- [ ] **Default Route:** Navigate to `http://localhost:8000/`. Confirm redirect to `#/login`.
- [ ] **Screen Isolation:** Verify ONLY the login card is visible. No other screens should appear below or stacked.
- [ ] **Protected Routes Guard:** While unauthenticated, attempt navigating to `#/welcome` or `#/lab/pipeline`. Verify immediate redirect back to `#/login`.
- [ ] **Guest Login:** Click "Enter as Guest". Confirm instant login and navigation to `#/welcome`.
- [ ] **Custom Student Login:** Enter student name "Alex" and password. Click "Enter Lab". Confirm header displays "Alex" and avatar "A".
- [ ] **Authenticated Redirect:** While logged in, attempt navigating to `#/login`. Verify redirect to `#/welcome`.
- [ ] **Logout:** Click "Sign out ↗" in the header. Confirm session clears and user returns to `#/login`.

## 2. Onboarding & Tour Flow
- [ ] **Welcome Screen:** Verify the 8-stage flow track is rendered horizontally.
- [ ] **Pick Screen:** Click "Explore" on Welcome screen. Confirm transition to `#/pick` with Text vs Photo options.
- [ ] **Tour Playback:** Click "What happens to a text message?" to enter `#/tour`.
- [ ] **Tour Navigation:**
  - Verify autoplay timer advances through stages 0 to 7.
  - Click "Pause" and confirm dwell timer stops.
  - Click stage dots (0–7) to jump directly to any stage.
  - Press `Space` to toggle Play/Pause.
  - Press `ArrowLeft` and `ArrowRight` to step through stages.
- [ ] **Skip Tour:** Click "Skip" during tour. Confirm navigation to `#/tour-end?skipped=true` with the skip acknowledgment.
- [ ] **Tour Completion:** At stage 7, click "Finish" to navigate to `#/tour-end`.
- [ ] **Start Exploring:** On `#/tour-end`, click "Start exploring" to enter `#/lab/pipeline`.

## 3. Interactive Laboratory Modules
- [ ] **Pipeline Lab (`#/lab/pipeline`):**
  - Change input text to "SIGNAL". Observe real-time trace update.
  - Toggle Hamming FEC off. Observe raw errors pass uncorrected into recovered text.
  - Toggle Hamming FEC on. Observe error correction indicator increment.
  - Drag Eb/N₀ slider from 8 dB down to 0 dB. Observe injected noise errors rise.
  - Switch modulation between ASK, FSK, and PSK. Confirm carrier waveform redraws.
- [ ] **Media Lab (`#/lab/media`):**
  - Verify 32x32 satellite dish grayscale payload renders in canvas.
  - Adjust Eb/N₀ noise slider and observe received image pixel corruption and PSNR metric.
- [ ] **Signal Lab (`#/lab/signal`):**
  - Switch between AM, FM, and PM analog modulation modes.
  - Adjust Carrier Frequency, Message Frequency, and Modulation Index sliders.
- [ ] **Network Lab (`#/lab/network`):**
  - Click "Run HTTP Round-Trip Ping". Confirm measured latency displays with caveat label.
  - Click "Measure Download Throughput". Confirm 2MB payload test runs against `assets/payload.bin`.
- [ ] **Multiplexing Lab (`#/lab/mux`):**
  - Switch between TDM, FDM, and Statistical TDM tabs.
  - Click "Pause / Play" to verify slot animation loop toggle.
- [ ] **Basics Lab (`#/lab/basics`):**
  - Type characters into the interactive keyboard capture box.
  - Verify ASCII decimal, hex, and 8-bit binary representation.

## 4. Syllabus Modal & Mathematical Tests
- [ ] **Syllabus Modal:** Click "Syllabus Map" in header. Confirm modal overlays cleanly with syllabus mapping. Click Close "✕" or outside modal to dismiss.
- [ ] **Math Self-Test:** In Pipeline Lab diagnostic panel, click "Run Section 5.5 Math Self-Test". Confirm test passes across ASK, FSK, and PSK.
- [ ] **Engine Benchmark:** Click "Benchmark: WASM vs JS Speed". Confirm execution times for 1M bits are displayed.
- [ ] **Core Invariants:** Open `http://localhost:8000/tests/core-tests.html`. Confirm all 14 unit test assertions pass.
