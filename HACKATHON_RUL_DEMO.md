# EngineGuard bearing RUL demo

## Run it

From `frontend/`:

```bash
npm install
npm test
npm run build
npm run preview
```

Open the displayed local URL, select **Test the Model**, click **Analyze My Engine**, then use the **RUL Simulation ↓** button in the diagnostic report. The default preset works without the Python backend and is labeled as simulated. For a real vibration upload, run the backend and use the existing vibration CSV flow.

The report shows the tabular, audio, and vibration classifications first, then the Health Index, RUL simulation, signal graphs, and collapsed tabular statistics. The Health Index formula opens on demand. **Download PDF Report** exports diagnostic results and sensor readings without the synthetic RUL scenario. For a real audio demonstration, start the backend with `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000`, upload `data/Audio/Normal engine/038.mp3` in the Audio tab, and analyze. The result is the trained MFCC/Random Forest model's classification and vote fraction; the built-in audio preset is simulated.

## One-minute judge demo

1. Replace the illustrative starting values for current odometer, bearing installation odometer, current RMS, healthy RMS, inspection threshold, assumed interval, and operating profile with your own readings and assumptions.
2. Show the projected distance to the *simulated inspection threshold*, 10th–90th percentile range, and inspection category. Change the odometer or RMS; the projection updates immediately.
3. Set current RMS equal to the inspection threshold to show **Urgent inspection / 0 km**; then enter a lower RMS to show another scenario.
4. Download the synthetic training CSV and show its `bearing_id`, `bearing_age_km`, `vibration_rms`, `rul_to_inspection_km`, and `label_source=synthetic` columns.

## Suggested pitch

> “EngineGuard identifies bearing condition from vibration. Our prognosis sandbox asks for mileage and RMS values, then compares them with 600 simulated wear histories. It shows a scenario distance to an inspection trigger and its spread. Every generated record is labeled synthetic. Repeated real readings and maintenance outcomes would be needed to validate vehicle RUL.”

If a judge asks whether the kilometers are validated: **No.** The current vibration dataset has healthy/faulty labels but no distance-to-inspection or failure history. The displayed kilometers depend on the editable assumed interval and RMS threshold. MathWorks describes distance-based RUL and threshold methods, but does not validate these particular values. Scania's anonymized truck component dataset is a different component/feature space and does not validate this bearing estimate.

## What real data would unlock

Repeated sensor readings on the same bearing; installation odometer; odometer at each reading; calibrated sensor position and operating conditions; inspection and replacement dates; and a clearly defined end event. Train and evaluate by physical bearing or vehicle, never by randomly splitting time points from the same bearing.
