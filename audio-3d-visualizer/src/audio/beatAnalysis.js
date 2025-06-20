// audio/beatAnalysis.js

export const analyzeBeats = async (audioBuffer) => {
    console.log('Starting beat analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.046); // ~46ms window (good for beat detection)
    const hopSize = Math.floor(windowSize / 4);

    // Energy-based beat detection
    const energyData = calculateEnergyWindows(channelData, windowSize, hopSize);

    // Onset detection using spectral flux
    const onsetData = detectOnsets(channelData, sampleRate, windowSize, hopSize);

    // Combine energy and onset detection
    const beats = findBeats(energyData, onsetData, sampleRate, hopSize);

    // Calculate tempo (BPM)
    const tempo = calculateTempo(beats, audioBuffer.duration);

    // Detect beat strength/intensity
    const beatStrengths = calculateBeatStrengths(beats, energyData);

    const result = {
        type: 'beats',
        beats: beats,
        tempo: tempo,
        beatStrengths: beatStrengths,
        energyData: energyData,
        onsetData: onsetData,
        sampleRate,
        duration: audioBuffer.duration,
        windowSize,
        hopSize,
        averageBeatInterval: beats.length > 1 ? (beats[beats.length - 1] - beats[0]) / (beats.length - 1) : 0
    };

    console.log('Beat analysis completed:', {
        beatsFound: result.beats.length,
        tempo: result.tempo,
        duration: result.duration
    });

    return result;
};

const calculateEnergyWindows = (channelData, windowSize, hopSize) => {
    const energyData = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
        let energy = 0;

        // Calculate RMS energy for this window
        for (let j = 0; j < windowSize; j++) {
            const sample = channelData[i + j];
            energy += sample * sample;
        }

        energy = Math.sqrt(energy / windowSize);
        energyData.push(energy);
    }

    return energyData;
};

const detectOnsets = (channelData, sampleRate, windowSize, hopSize) => {
    const fftSize = 1024;
    const onsetData = [];

    // Previous spectrum for comparison
    let prevSpectrum = null;

    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
        const window = channelData.slice(i, i + fftSize);

        // Apply Hann window
        const windowedData = window.map((sample, idx) =>
            sample * 0.5 * (1 - Math.cos(2 * Math.PI * idx / (fftSize - 1)))
        );

        // Simple FFT approximation for onset detection
        const spectrum = calculateSpectrum(windowedData);

        if (prevSpectrum) {
            // Calculate spectral flux (change in spectrum)
            let flux = 0;
            for (let j = 0; j < spectrum.length; j++) {
                const diff = spectrum[j] - prevSpectrum[j];
                flux += Math.max(0, diff); // Only positive changes (increases)
            }
            onsetData.push(flux);
        } else {
            onsetData.push(0);
        }

        prevSpectrum = [...spectrum];
    }

    return onsetData;
};

const calculateSpectrum = (windowedData) => {
    const spectrum = [];
    const N = windowedData.length;

    // Simple magnitude spectrum calculation
    for (let k = 0; k < N / 2; k++) {
        let real = 0, imag = 0;

        for (let n = 0; n < N; n++) {
            const angle = -2 * Math.PI * k * n / N;
            real += windowedData[n] * Math.cos(angle);
            imag += windowedData[n] * Math.sin(angle);
        }

        spectrum.push(Math.sqrt(real * real + imag * imag));
    }

    return spectrum;
};

const findBeats = (energyData, onsetData, sampleRate, hopSize) => {
    const beats = [];
    const threshold = 0.3;
    const minBeatInterval = Math.floor(0.3 * sampleRate / hopSize); // Min 300ms between beats

    // Combine energy and onset data for better beat detection
    const combinedData = energyData.map((energy, i) => {
        const onset = onsetData[i] || 0;
        return energy * 0.7 + onset * 0.3; // Weight energy more than onset
    });

    // Normalize combined data
    const maxValue = Math.max(...combinedData);
    const normalizedData = combinedData.map(value => value / maxValue);

    // Adaptive threshold based on local average
    const windowSize = Math.floor(sampleRate / hopSize); // 1 second window

    for (let i = windowSize; i < normalizedData.length - windowSize; i++) {
        // Local average for adaptive threshold
        let localSum = 0;
        for (let j = i - windowSize; j < i + windowSize; j++) {
            localSum += normalizedData[j];
        }
        const localAverage = localSum / (2 * windowSize);
        const adaptiveThreshold = Math.max(threshold, localAverage * 1.3);

        // Check for peak
        if (normalizedData[i] > adaptiveThreshold &&
            normalizedData[i] > normalizedData[i - 1] &&
            normalizedData[i] > normalizedData[i + 1]) {

            // Check minimum interval from last beat
            if (beats.length === 0 || i - beats[beats.length - 1] > minBeatInterval) {
                beats.push(i);
            }
        }
    }

    // Convert frame indices to time stamps
    return beats.map(frameIndex => (frameIndex * hopSize) / sampleRate);
};

const calculateTempo = (beats, duration) => {
    if (beats.length < 2) return 0;

    // Calculate intervals between beats
    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    // Find median interval (more robust than average)
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    // Convert to BPM
    const bpm = 60 / medianInterval;

    // Validate BPM range (typical music range)
    if (bpm < 60 || bpm > 200) {
        // Try double or half tempo
        if (bpm < 60 && bpm * 2 <= 200) return bpm * 2;
        if (bpm > 200 && bpm / 2 >= 60) return bpm / 2;
    }

    return Math.round(bpm);
};

const calculateBeatStrengths = (beats, energyData) => {
    const hopSize = 512; // Assume hop size for energy data

    return beats.map(beatTime => {
        // Find corresponding energy frame
        const frameIndex = Math.floor((beatTime * 44100) / hopSize); // Assume 44.1kHz

        if (frameIndex >= 0 && frameIndex < energyData.length) {
            return energyData[frameIndex];
        }
        return 0;
    });
};

// Utility functions for beat analysis
export const getBeatStats = (beatData) => {
    if (!beatData?.beats || beatData.beats.length === 0) return null;

    const { beats, tempo, duration } = beatData;
    const intervals = [];

    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stability = 1 / (1 + variance); // Higher = more stable tempo

    return {
        beatCount: beats.length,
        tempo: tempo,
        averageInterval: avgInterval,
        tempoStability: stability,
        beatsPerSecond: beats.length / duration,
        firstBeat: beats[0],
        lastBeat: beats[beats.length - 1]
    };
};

export const detectTempoChanges = (beatData, windowSize = 8) => {
    if (!beatData?.beats || beatData.beats.length < windowSize * 2) return [];

    const { beats } = beatData;
    const tempoChanges = [];

    for (let i = windowSize; i < beats.length - windowSize; i++) {
        // Calculate tempo before and after this point
        const beforeBeats = beats.slice(i - windowSize, i);
        const afterBeats = beats.slice(i, i + windowSize);

        const beforeTempo = calculateTempoForBeats(beforeBeats);
        const afterTempo = calculateTempoForBeats(afterBeats);

        const tempoChange = Math.abs(afterTempo - beforeTempo);

        // Significant tempo change threshold
        if (tempoChange > 10) {
            tempoChanges.push({
                time: beats[i],
                beforeTempo,
                afterTempo,
                change: tempoChange
            });
        }
    }

    return tempoChanges;
};

const calculateTempoForBeats = (beats) => {
    if (beats.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return 60 / avgInterval;
};