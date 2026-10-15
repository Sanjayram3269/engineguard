# EngineGuard — AI-Powered Internal Combustion Engine Fault Detection & 3D Diagnostic Lab

> **Cinematic Automotive Intelligence, Multimodal ML Diagnosis & Interactive 3D Exploded-View Digital Twin**

EngineGuard is an end-to-end automotive intelligence and mechanical condition monitoring platform for four-cylinder spark-ignition internal combustion engines (based on the GM/Opel C14NE 1.4L 8V engine architecture).

The platform bridges real automotive sensor telemetry, acoustic vibration harmonics, and thermodynamic cycle data with a real-time, interactive 3D digital twin rendered in Three.js and React Three Fiber.

---

## 🌟 Key Capabilities & Features

### 1. Cinematic Landing Page & Interactive 3D Hero
- **Industrial Automotive Aesthetic**: Engineered with a disciplined palette of deep blacks (`#08090A`), machine graphite (`#101214`), brushed aluminium accents (`#A4A9AF`), and high-visibility industrial orange highlights (`#D66A32`).
- **Interactive 3D Engine Assembly**: Continuous idle revolving C14NE 1.4L engine with PBR metallic finishes, dynamic studio lighting, and smooth OrbitControls navigation.
- **Story-Driven Section Architecture**:
  - **Cinematic Hero**: Engaging value proposition, direct CTA navigation, and real-time engine digital twin.
  - **Interactive 3D Exploded Inspection**: Exploded-view separation of engine block, cylinder head, pistons, connecting rods, crankshaft, camshaft, and valves.
  - **Multimodal Diagnostic Overview**: Highlighting Tabular Telemetry, Acoustic Analysis, and Vibration Accelerometry.
  - **Benchmark Metrics**: Accuracy, F1-score, inference latency, and validation datasets.
  - **Interactive Architecture & FAQ**: Expandable questions addressing signal processing, sampling rates, and sensor placement.
  - **Google OAuth Simulation**: Functional authentication modal with simulated secure token exchange.

---

### 2. Diagnostic Test Lab (`#test-model`)
- **Full-Viewport 3D WebGL Digital Twin**: Immersive 3D workspace where the engine model dominates 65–80% of the viewport.
- **Layered Ingestion Panel**: Translucent, floating diagnostic card matching modern automotive laboratory diagnostic equipment (`bg-[#101214]/90 backdrop-blur-md`).
- **Live Technical HUD Readout**:
  - `DISPLACEMENT: 1.4 L (1389 cc)`
  - `CYLINDERS: 4 In-Line (8V / OHC)`
  - `FUEL SYSTEM: Multec MPFI`
  - `MAX POWER: 73 kW @ 6000 rpm`
  - `MAX TORQUE: 126 Nm @ 4000 rpm`
  - `FIRING ORDER: 1 - 3 - 4 - 2`
- **Camera View Presets**: One-click camera switches (`Isometric`, `Front`, `Top`) and continuous rotation toggle.

---

### 3. Three Multimodal Ingestion Pipelines

The lab supports three distinct engine data modalities with real file parsing and benchmark datasets:

| Modality | Ingestion Format | Monitored Physical Parameters | Primary Failure Indicators |
| :--- | :--- | :--- | :--- |
| **Tabular Telemetry** | CSV dataset upload | Engine Speed (RPM), Manifold Absolute Pressure (MAP), Engine Coolant Temp (ECT), Dynamic Oil Pressure (PSI), Knock Sensor Voltage (V), Intake Air Temp (IAT) | Pre-ignition knock, hydrodynamic oil wedge collapse, coolant jacket boiling, valve lash vacuum leak |
| **Audio Acoustics** | WAV / MP3 / OGG | Acoustic sound pressure (dBFS), FFT spectral energy distribution, harmonic engine orders, transient impulse spikes | Connecting rod big-end bearing knock (2.0–3.5 kHz), valvetrain bucket/cam tap (0.5X engine order) |
| **Vibration Accelerometry** | CSV timeseries | Tri-axial block acceleration, RMS vibration ($G$), Peak-to-Peak amplitude, Crest Factor, 1X/2X rotational orders | Crankshaft rotational unbalance (1X order ~ 41.6 Hz), piston skirt transverse bore slap (>120 Hz) |

- **Real File Parsing**:
  - Drag-and-drop CSV parser that auto-detects column headers for engine parameters.
  - Audio file metadata and peak dBFS decoding using the Web Audio API.
  - Accelerometer time-series RMS and peak-to-peak calculation.
- **Instant Benchmark Testing**: Single-click "Load Fault Case" and "Load Nominal" buttons for immediate zero-friction evaluation.

---

### 4. Deterministic Physical Fault Attribution & 3D Exploded Highlighting

When the user clicks **Analyze Engine →**:
1. **Validation & Progress Checklist**: Validates signal boundaries, runs inference, and displays a step-by-step progress checklist.
2. **GSAP 3D Camera & Exploded Animation**: The revolving engine halts rotation and smoothly separates into an exploded view ($0.0 \rightarrow 0.65$ separation progress), while the camera dollys forward for close mechanical inspection.
3. **Component-Level Fault Highlighting**: The diagnosed faulty component is dynamically highlighted in pulsing industrial orange:
   - **Cylinder Detonation & Ring Land Damage** $\rightarrow$ `pistons`
   - **Connecting Rod Bearing Play (Rod Knock)** $\rightarrow$ `connectingRods`
   - **Crankshaft 1X Rotational Imbalance & Bearing Scoring** $\rightarrow$ `crankshaft`
   - **Overhead Valvetrain Lash Drift** $\rightarrow$ `valves`
   - **Cylinder Head Gasket Thermal Blow-By** $\rightarrow$ `headGasket`
   - **Nominal Baseline** $\rightarrow$ No faulty component highlight.
4. **Actionable Mechanical Diagnosis Card**:
   - Status verdict (`[FAULT DETECTED]` or `[NOMINAL HEALTH]`) and confidence score.
   - Physical rationale explaining root failure cause.
   - Grounded sensor evidence bullet points.
   - Recommended workshop action (e.g., Plastigauge measurement, borescope inspection).
5. **Run Another Test (Reassemble)**:
   - Smoothly reverses the GSAP explosion back to $0.0$, reassembles the engine, dollys the camera back to idle orbit, clears highlights, and resumes continuous revolving.
6. **Detailed Sensor Telemetry Drawer**:
   - Collapsible panel displaying live harmonic order charts, FFT frequency spectra, and thermodynamic deviation gauges.

---

## 🛠️ Technology Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei)
- **Animation Engine**: [GSAP (GreenSock)](https://greensock.com/gsap/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)

---

## 📂 Project Structure

```text
EnginePulse/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── GoogleAuthModal.tsx          # Google OAuth authentication modal
│   │   ├── engine/
│   │   │   ├── EngineAssembly.tsx           # Master C14NE 3D engine assembly
│   │   │   ├── StudioLighting.tsx           # PBR directional, ambient & rim lights
│   │   │   ├── EngineBlockMesh.tsx          # Cast-iron cylinder block geometry
│   │   │   ├── CylinderHeadMesh.tsx         # Cast-aluminium cylinder head
│   │   │   ├── CrankshaftMesh.tsx           # Forged steel crankshaft with counterweights
│   │   │   ├── PistonsMesh.tsx              # Hypereutectic pistons with wrist pins
│   │   │   ├── ConnectingRodsMesh.tsx       # H-beam connecting rods & bearings
│   │   │   ├── CamshaftMesh.tsx             # Overhead camshaft with lobes
│   │   │   ├── ValvesMesh.tsx               # Poppet intake and exhaust valves
│   │   │   ├── HeadGasketMesh.tsx           # Multi-layer steel (MLS) head gasket
│   │   │   ├── SparkPlugsMesh.tsx           # Ceramic & electrode spark plugs
│   │   │   ├── TimingBeltMesh.tsx           # Toothed timing belt & pulleys
│   │   │   ├── OilPanMesh.tsx               # Stamped steel wet sump oil pan
│   │   │   └── AlternatorMesh.tsx           # Auxiliary alternator unit
│   │   ├── landing/
│   │   │   ├── Navbar.tsx                   # Top navigation bar with direct modal links
│   │   │   ├── HeroSection.tsx              # Cinematic hero section with 3D engine
│   │   │   ├── ExplodedInspectionSection.tsx# Scroll-driven 3D exploded view
│   │   │   ├── ModalityOverview.tsx         # Tabular, Audio, Vibration cards
│   │   │   ├── ModelPerformance.tsx         # Benchmark KPIs & accuracy statistics
│   │   │   ├── ArchitectureSection.tsx      # System architecture & inference diagram
│   │   │   ├── FAQSection.tsx               # Expandable technical FAQ
│   │   │   ├── ClosingCTA.tsx               # Bottom call-to-action banner
│   │   │   └── Footer.tsx                   # Engineering footer & system credits
│   │   └── testing/
│   │       ├── TestingPage.tsx              # Master diagnostic lab with floating UI
│   │       ├── TestingEngineCanvas.tsx      # Full-viewport revolving 3D engine canvas
│   │       ├── TabularInputPanel.tsx        # Telemetry sensor parameter inputs
│   │       ├── AudioInputPanel.tsx          # Acoustic signal inputs & FFT viewer
│   │       ├── VibrationInputPanel.tsx      # Accelerometer timeseries inputs
│   │       ├── DiagnosticResultPanel.tsx    # Mechanical fault summary & actions
│   │       ├── DiagnosticCharts.tsx         # Interactive SVG telemetry & FFT charts
│   │       └── ActionableRecommendations.tsx# Recommended maintenance procedures
│   ├── lib/
│   │   ├── diagnosticEngine.ts              # Deterministic ML inference & CSV parsers
│   │   └── soundEffects.ts                  # Synthesized engine acoustic audio cues
│   ├── types/
│   │   ├── diagnosis.ts                     # TypeScript definitions for telemetry & faults
│   │   └── engine.ts                        # 3D component coordinates & metadata
│   ├── App.tsx                              # Application root & hash routing
│   ├── main.tsx                             # React DOM entry point
│   └── index.css                            # Custom Tailwind & industrial styles
├── index.html                               # HTML document template
├── package.json                             # Dependencies & scripts
├── tsconfig.json                            # TypeScript configuration
├── tailwind.config.js                       # Tailwind configuration & custom palette
└── vite.config.ts                           # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- `npm` or `pnpm`

### Installation
1. Clone the repository:
   ```bash
   git clone -b ui https://github.com/Sanjayram3269/engineguard.git
   cd engineguard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server
Run the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Production Build
To create an optimized production build:
```bash
npm run build
```
Preview the built bundle locally:
```bash
npm run preview
```

---

## 🧭 Navigation & Workflow
- **Landing Page**: Explore the 3D hero engine, view diagnostic modalities, and inspect exploded component subassemblies.
- **Launch Diagnostic Lab**: Click any **"Test The Model"** button in the navbar, hero, or closing CTA, or navigate directly to `http://localhost:5173/#test-model`.
- **Upload / Quick Test**:
  - Drag and drop your own `.csv` or `.wav` dataset.
  - Or click **"Load Fault Case"** to test a known fault profile (Detonation, Rod Knock, or Crank Imbalance).
- **Run Analysis**: Click **Analyze Engine →**. Watch the 3D engine smoothly expand into an exploded view and pinpoint the faulty component.
- **Reassemble**: Click **Run Another Test** to reassemble the engine back into its revolving idle state.

---

## 📄 License
This project is licensed under the MIT License.
