# SignalForge — Virtual Communication Laboratory

SignalForge is an interactive virtual laboratory designed for undergraduate engineering students taking **Data Communication Lab**. It lets students follow a single piece of source information (text, photo, or video) from their keyboard through an entire 8-stage communication system:

```
[Message] → [Encode] → [Encrypt] → [Protect] → [Modulate] → [Channel] → [Demodulate] → [Recover]
```

At every stage, students see:
1. **Where the data is** on the animated pipeline map.
2. **What the data looks like right now** (bits, waveform, or pixel grid).
3. **Which Data Communication concept** is operating.

---

## Technical Architecture

- **Zero Runtime Dependencies:** Plain HTML5, CSS3, and vanilla JavaScript (ES modules).
- **WebAssembly Engine:** High-performance bit-level manipulation written in pure C (`wasm/engine.c`) compiled to standalone WebAssembly (`wasm/engine.wasm`), with a transparent 100% equivalent JavaScript fallback.
- **Pure Math & DSP:** Hardware-accurate coherent correlation demodulation, Box-Muller AWGN noise simulation, and theoretical Q-function BER curves.
- **Web Audio API:** Audible real-time synthesis of modulated digital waveforms (ASK, FSK, PSK).
- **Interactive Labs:** 6 dedicated laboratory modules covering all 8 curriculum practicals.
- **Context-Aware Assistant:** Level 1 offline heuristic knowledge base (44+ entries) with optional Level 2 serverless Gemini API integration (`/api/chat.js`).
- **Static Deployment:** Deploys instantly to Vercel or any static HTTP file server.

---

## Project Structure

```
├── index.html                 # Single-page application router & screen containers
├── css/
│   └── styles.css             # Design tokens, dark lab console theme, animations
├── js/
│   ├── main.js                # App bootstrapper, hash router, and session guards
│   ├── state.js               # Global application state & sessionStorage persistence
│   ├── engine.js              # WebAssembly loader & typed-array bit processing API
│   ├── pipeline.js            # Pure logic: runPipeline(config) -> trace
│   ├── dsp.js                 # Carrier synthesis, AWGN, correlator receiver, Q-function
│   ├── map.js                 # SVG pipeline map with animated packet & particle effects
│   ├── wave.js                # Canvas waveforms, overlays, histograms, and pixel grids
│   ├── tour.js                # Guided tour controller state machine
│   ├── chatbot.js             # Context-aware floating assistant
│   └── labs/
│       ├── pipelineLab.js     # Practical 6: Digital Modulation & 8-stage Pipeline
│       ├── mediaLab.js        # Practical 7: Image & Video Transmission, PCM Quantization
│       ├── signalLab.js       # Practical 5 & 7: Analog Modulation (AM/FM/PM) & PCM
│       ├── networkLab.js      # Practical 1 & 2: Live Ping, Throughput & LAN Topology
│       ├── muxLab.js          # Practical 8: Multiplexing (TDM, FDM, STDM)
│       └── basicsLab.js       # Practical 3 & 4: Binary/Decimal & Keyboard ASCII
├── data/
│   └── knowledge.json         # 44+ Q&A entries for Level 1 offline chatbot tutor
├── wasm/
│   ├── engine.c               # C implementation of XOR, CRC-8, Hamming(7,4)
│   ├── engine.wasm            # Compiled standalone WebAssembly binary
│   └── build.sh               # Compilation script (clang/emcc)
├── assets/
│   ├── ping.txt               # 1-byte file for real latency ping tests
│   └── payload.bin            # 2 MB binary file for throughput measurement
├── api/
│   └── chat.js                # Optional Vercel serverless function (Gemini API)
├── vercel.json                # Vercel deployment headers and MIME types
└── README.md
```

---

## Local Development & Running

Serve the directory with any local static HTTP server:

```bash
# Using Python
python3 -m http.server 8080

# Or using Node
npx serve .
```

Open `http://localhost:8080` in any modern web browser.

---

## Rebuilding WebAssembly

To compile `wasm/engine.c` to `wasm/engine.wasm`:

```bash
bash wasm/build.sh
```

The script automatically detects:
1. `emcc` (Emscripten)
2. `clang --target=wasm32` (LLVM)

---

## Optional: Gemini AI Chatbot Integration

To enable the Level 2 AI assistant on Vercel:
1. Add an environment variable named `GEMINI_API_KEY` in your Vercel project settings.
2. The client automatically detects the API and falls back gracefully to the Level 1 offline knowledge base if the key is not present or if the network times out.

---

## Syllabus Practical Alignment

| Practical | Syllabus Topic | SignalForge Stage / Module |
|---|---|---|
| **Practical 1** | Wired LAN and PING Setup | Network Lab (Live Ping & Switch Learning) |
| **Practical 2** | Media Transmission Speed | Network Lab (Throughput & Media Delay Calculator) |
| **Practical 3** | Binary ↔ Decimal Conversion | Basics Lab (Step-by-step math working) |
| **Practical 4** | Keyboard ASCII Encoding | Basics Lab (Live Keydown Event Capture) |
| **Practical 5** | Analog Modulation (AM/FM/PM) | Signal Lab (AM, FM, PM & Demodulation) |
| **Practical 6** | Digital Modulation (ASK/FSK/PSK) | Pipeline Lab (Modulate & Demodulate Stages) |
| **Practical 7** | Pulse Code Modulation (PCM) | Signal Lab & Media Lab (Quantization & SNR_q) |
| **Practical 8** | Multiplexing (FDM/TDM/STDM) | Multiplexing Lab (TDM, FDM, STDM Allocation) |
