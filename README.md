# EnginePulse — Engine Audio Classification

## Overview

EnginePulse is an engine-monitoring project that includes an audio-classification module for identifying engine-related sounds.

The audio module processes recorded engine sounds, extracts Mel-Frequency Cepstral Coefficients (MFCCs), and uses a trained Random Forest classifier to classify the recording into one of three categories:

- **Normal engine** — audio classified as normal engine sound.
- **Engine Issue** — audio classified as an engine-related issue.
- **Non engine issue** — audio classified as a non-engine issue.

This module is intended to serve as the audio-analysis component of the broader EnginePulse project.

## Objectives

- Process engine-related audio recordings.
- Extract meaningful acoustic features from audio signals.
- Train and evaluate machine-learning classifiers.
- Save the trained model for reuse.
- Predict the category of a new audio recording using an inference script.
- Prepare the audio pipeline for integration with the broader EnginePulse application.

## Dataset

The audio dataset contains **297 recordings** distributed across three categories.

| Category | Number of recordings |
|---|---:|
| Engine Issue | 85 |
| Non engine issue | 106 |
| Normal engine | 106 |
| **Total** | **297** |

The recordings are organized into folders according to their categories under `data/Audio/`.

## Audio Preprocessing and Feature Extraction

The audio-processing pipeline uses Librosa to load and process recordings.

### Configuration

| Parameter | Value |
|---|---|
| Sample rate | 22,050 Hz |
| Audio channels | Mono |
| MFCC coefficients | 13 |
| FFT window size (`n_fft`) | 2,048 |
| Hop length | 512 |

### MFCC feature extraction

Mel-Frequency Cepstral Coefficients (MFCCs) represent characteristics of the audio signal and are commonly used in audio-classification tasks.

For each recording, the pipeline calculates:

1. The mean of each of the 13 MFCC coefficients.
2. The standard deviation of each of the 13 MFCC coefficients.

This produces **26 features per recording**.

The extracted features are stored in `audio_csv/audio_mfcc_features.csv` for model development and analysis.

## Model Training and Evaluation

Multiple machine-learning classifiers were evaluated using the extracted audio features.

The best-performing model in the reported held-out evaluation was a Random Forest classifier.

### Reported results

| Model | Test accuracy |
|---|---:|
| Random Forest | 68.33% |
| Extra Trees | 66.67% |
| Support Vector Machine (SVM) | 61.67% |

The Random Forest achieved a reported macro F1-score of **0.6791**.

The reported evaluation used a 60-recording test set and 237-recording training set, with `random_state=42`.

These results are preliminary and should not be interpreted as a guarantee of real-world performance. Additional recordings and independent testing are needed to establish generalization to new engines, recording environments, and operating conditions.

## Audio Inference

The trained Random Forest model is loaded by `src/audio_inference.py` to classify an individual audio recording.

The inference pipeline:

1. Accepts an audio-file path.
2. Loads the recording and converts it to mono at 22,050 Hz.
3. Extracts the 13 MFCC coefficients.
4. Calculates the mean and standard deviation of each coefficient.
5. Arranges the 26 features in the format expected by the trained model.
6. Predicts one of the three audio categories.
7. Returns the predicted category and, when supported by the model, class probabilities.

### Example command

Run the following from the project root:

```powershell
python .\src\audio_inference.py ".\data\Audio\Normal engine\002.mp3"
```

### Example output

```python
{
    'audio_file': 'data\\Audio\\Normal engine\\002.mp3',
    'prediction': 'Normal engine',
    'probabilities': {
        'Engine Issue': 0.1274,
        'Non engine issue': 0.4238,
        'Normal engine': 0.4488
    }
}
```

The example demonstrates that the inference script successfully loads the model and returns a prediction. The probability values are model outputs and should not be interpreted as calibrated real-world confidence.

## Project Structure

This repository is a single integrated EngineGuard project with four active
components: engine telemetry, vibration-based bearing condition, engine audio
classification, and a React frontend. The audio module is part of the same
repository, not a separate project.

```
EngineGuard/
├── .gitignore
├── README.md
├── requirements.txt
├── data/
│   ├── README.md
│   ├── EngineFaultDB_Final.csv
│   ├── Audio/
│   │   ├── Engine Issue/
│   │   ├── Non engine issue/
│   │   └── Normal engine/
│   └── vibration_raw/
├── models/
│   ├── README.md
│   ├── benchmark_classifier_compressed.joblib
│   ├── benchmark_metadata.json
│   ├── vibration_classifier.joblib
│   ├── vibration_metadata.json
│   ├── audio_metadata.json
│   └── audio/
│       ├── audio_random_forest_tuned.joblib
│       ├── audio_random_forest.joblib
│       ├── audio_extra_trees_tuned.joblib
│       ├── audio_svm_model.joblib
│       ├── audio_svm_tuned.joblib
│       └── audio_svm_tuned_v2.joblib
├── reports/
│   └── ...
├── src/
│   ├── __init__.py
│   ├── audio_inference.py
│   ├── inference.py
│   ├── vibration_inference.py
│   ├── test_audio_inference.py
│   ├── test_inference.py
│   └── test_vibration_inference.py
└── tests/
    └── __init__.py
```

Audio recordings and the audio model are under `data/Audio/` and
`models/audio/`. The tabular telemetry dataset used by the main classifier is
`data/EngineFaultDB_Final.csv`. The telemetry dataset is not stored under
`data/EngineFaultDB-main/`.

## Technologies Used

- **Python** — implementation of the audio pipeline.
- **Librosa** — audio loading and MFCC feature extraction.
- **NumPy** — numerical operations.
- **Pandas** — feature-table creation and manipulation.
- **Scikit-learn** — machine-learning classifiers and evaluation.
- **Joblib** — saving and loading the trained model.
- **Matplotlib** — visualizations and analysis.
- **SoundFile** — audio-file support.

## Installation and Setup

### 1. Clone the repository

```powershell
git clone -b Audio/aniruddh https://github.com/Sanjayram3269/engineguard.git
cd engineguard
```

### 2. Create a virtual environment

```powershell
python -m venv .venv
```

### 3. Activate the virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

The installed scikit-learn version should match the version used to save the model. The current model was saved using scikit-learn 1.9.1, so the dependency file should specify:

```text
scikit-learn==1.9.1
```

### 5. Run inference

```powershell
python .\src\audio_inference.py ".\data\Audio\Normal engine\002.mp3"
```

Replace the example path with the path to another supported audio recording.

## Current Status

- [x] Organized the audio dataset into three classification categories.
- [x] Extracted 26 MFCC statistical features per recording.
- [x] Stored extracted features in a CSV file.
- [x] Evaluated Random Forest, Extra Trees, and SVM classifiers.
- [x] Saved the trained Random Forest model.
- [x] Created an audio inference script.
- [x] Successfully tested inference on an example MP3 recording.
- [x] Added the audio module and relevant project assets to the `Audio/aniruddh` branch.
- [ ] Improve classification performance through further evaluation and testing.
- [ ] Test the model on additional independent recordings.
- [ ] Integrate audio inference into the complete EnginePulse application.

## Limitations

- The model currently predicts only the three audio categories defined for this module.
- Classification performance depends on recording quality, engine type, background noise, and similarity to the training data.
- The reported test performance is preliminary and requires further independent validation.
- Class probabilities are not necessarily calibrated confidence scores.
- The audio classifier does not independently identify the detailed fault categories available in the separate EngineFaultDB dataset.
- Integration with the complete application remains a separate development task.

## Future Improvements

- Expand the dataset with recordings from different engines and operating conditions.
- Improve feature engineering and compare additional classification approaches.
- Evaluate the model using independent recordings and more robust validation.
- Explore confidence calibration and handling of uncertain predictions.
- Integrate the inference module into the EnginePulse application.
- Evaluate the audio module alongside other engine-monitoring components without conflating their output labels.

## Conclusion

The EnginePulse audio module establishes an initial machine-learning pipeline for engine-sound classification, from MFCC feature extraction and classifier evaluation to saved-model inference. It provides a foundation for further validation and integration into the broader engine-monitoring system.

## Repository

GitHub: https://github.com/Sanjayram3269/engineguard/tree/Audio/aniruddh
