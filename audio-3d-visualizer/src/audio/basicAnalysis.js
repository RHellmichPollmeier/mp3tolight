// audio/basicAnalysis.js

export const analyzeBasic = async (audioBuffer) => {
    console.log('Starting basic analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms window
    const hopSize = Math.floor(windowSize / 4);

    const amplitudes = [];

    // Calculate RMS amplitude for each window
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            sum += channelData[i + j] * channelData[i + j];
        }
        amplitudes.push(Math.sqrt(sum / windowSize));
    }

    // Normalize amplitudes
    const maxAmp = Math.max(...amplitudes);
    const normalizedAmplitudes = maxAmp > 0
        ? amplitudes.map(amp => amp / maxAmp)
        : amplitudes;

    // Apply smoothing
    const smoothedAmplitudes = smoothArray(normalizedAmplitudes, 0.8);

    const result = {
        type: 'basic',
        amplitude: smoothedAmplitudes,
        sampleRate,
        duration: audioBuffer.duration,
        windowSize,
        hopSize,
        maxAmplitude: maxAmp
    };

    console.log('Basic analysis completed:', {
        frames: result.amplitude.length,
        duration: result.duration,
        maxAmp: result.maxAmplitude
    });

    return result;
};

// Smoothing function
const smoothArray = (arr, factor) => {
    if (factor <= 0) return [...arr];

    const smoothed = [...arr];
    for (let i = 1; i < smoothed.length - 1; i++) {
        smoothed[i] = smoothed[i] * (1 - factor) +
            (smoothed[i - 1] + smoothed[i + 1]) * factor * 0.5;
    }
    return smoothed;
};

// Additional utilities for basic analysis
export const getAmplitudeStats = (amplitudes) => {
    if (!amplitudes || amplitudes.length === 0) return null;

    const sorted = [...amplitudes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
        min: sorted[0],
        max: sorted[len - 1],
        mean: sorted.reduce((a, b) => a + b) / len,
        median: len % 2 === 0
            ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
            : sorted[Math.floor(len / 2)],
        q25: sorted[Math.floor(len * 0.25)],
        q75: sorted[Math.floor(len * 0.75)]
    };
};

export const detectSilence = (amplitudes, threshold = 0.01) => {
    const silentRegions = [];
    let silentStart = null;

    for (let i = 0; i < amplitudes.length; i++) {
        if (amplitudes[i] < threshold) {
            if (silentStart === null) silentStart = i;
        } else {
            if (silentStart !== null) {
                silentRegions.push({ start: silentStart, end: i - 1 });
                silentStart = null;
            }
        }
    }

    // Handle silence at the end
    if (silentStart !== null) {
        silentRegions.push({ start: silentStart, end: amplitudes.length - 1 });
    }

    return silentRegions;
};