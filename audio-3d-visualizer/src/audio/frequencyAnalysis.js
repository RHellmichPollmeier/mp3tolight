// audio/frequencyAnalysis.js

export const analyzeFrequency = async (audioBuffer) => {
    console.log('Starting frequency band analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 2048;
    const hopSize = fftSize / 2;

    // Define frequency bands
    const bands = {
        bass: { min: 20, max: 250 },      // Bass: 20Hz - 250Hz
        lowMid: { min: 250, max: 500 },   // Low Mid: 250Hz - 500Hz
        mid: { min: 500, max: 2000 },     // Mid: 500Hz - 2kHz
        highMid: { min: 2000, max: 4000 }, // High Mid: 2kHz - 4kHz
        treble: { min: 4000, max: 16000 }  // Treble: 4kHz - 16kHz
    };

    const frequencyData = {
        bass: [],
        lowMid: [],
        mid: [],
        highMid: [],
        treble: [],
        timeStamps: []
    };

    const fullSpectrum = [];

    // Process audio in windows
    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
        const window = channelData.slice(i, i + fftSize);
        const spectrum = performFFT(window);

        // Calculate magnitude spectrum
        const magnitudes = spectrum.map(complex =>
            Math.sqrt(complex.real * complex.real + complex.imag * complex.imag)
        );

        fullSpectrum.push(magnitudes);

        // Extract frequency bands
        const bandData = extractFrequencyBands(magnitudes, sampleRate, fftSize, bands);

        frequencyData.bass.push(bandData.bass);
        frequencyData.lowMid.push(bandData.lowMid);
        frequencyData.mid.push(bandData.mid);
        frequencyData.highMid.push(bandData.highMid);
        frequencyData.treble.push(bandData.treble);
        frequencyData.timeStamps.push((i / sampleRate));
    }

    // Calculate additional metrics
    const dynamics = calculateDynamics(frequencyData);
    const balance = calculateFrequencyBalance(frequencyData);
    const peaks = findFrequencyPeaks(frequencyData);

    const result = {
        type: 'frequency',
        frequencyBands: frequencyData,
        dynamics: dynamics,
        balance: balance,
        peaks: peaks,
        fullSpectrum: fullSpectrum,
        bands: bands,
        sampleRate,
        duration: audioBuffer.duration,
        fftSize,
        hopSize
    };

    console.log('Frequency analysis completed:', {
        frames: frequencyData.bass.length,
        duration: result.duration,
        bandsAnalyzed: Object.keys(bands).length
    });

    return result;
};

const performFFT = (buffer) => {
    const N = buffer.length;
    const result = new Array(N);

    // Apply Hann window
    const windowedBuffer = buffer.map((sample, i) =>
        sample * 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)))
    );

    // Simple DFT implementation (for production, use a proper FFT library)
    for (let k = 0; k < N; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < N; n++) {
            const angle = -2 * Math.PI * k * n / N;
            real += windowedBuffer[n] * Math.cos(angle);
            imag += windowedBuffer[n] * Math.sin(angle);
        }
        result[k] = { real, imag };
    }

    return result;
};

const extractFrequencyBands = (magnitudes, sampleRate, fftSize, bands) => {
    const bandData = {};

    Object.keys(bands).forEach(bandName => {
        const band = bands[bandName];

        // Convert frequency range to bin indices
        const minBin = Math.floor((band.min * fftSize) / sampleRate);
        const maxBin = Math.floor((band.max * fftSize) / sampleRate);

        // Sum energy in this frequency band
        let energy = 0;
        let count = 0;

        for (let bin = minBin; bin <= Math.min(maxBin, magnitudes.length / 2); bin++) {
            energy += magnitudes[bin];
            count++;
        }

        // Average energy in this band
        bandData[bandName] = count > 0 ? energy / count : 0;
    });

    return bandData;
};

const calculateDynamics = (frequencyData) => {
    const dynamics = {};

    Object.keys(frequencyData).forEach(band => {
        if (band === 'timeStamps') return;

        const data = frequencyData[band];
        if (data.length === 0) return;

        const max = Math.max(...data);
        const min = Math.min(...data);
        const avg = data.reduce((a, b) => a + b) / data.length;

        // Calculate dynamic range
        const dynamicRange = max > 0 ? 20 * Math.log10(max / Math.max(min, max * 0.001)) : 0;

        // Calculate RMS
        const rms = Math.sqrt(data.reduce((acc, val) => acc + val * val, 0) / data.length);

        // Calculate variance
        const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / data.length;

        dynamics[band] = {
            max,
            min,
            average: avg,
            rms,
            dynamicRange,
            variance: Math.sqrt(variance)
        };
    });

    return dynamics;
};

const calculateFrequencyBalance = (frequencyData) => {
    const bands = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];
    const averages = {};
    let totalEnergy = 0;

    // Calculate average energy for each band
    bands.forEach(band => {
        const data = frequencyData[band];
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        averages[band] = avg;
        totalEnergy += avg;
    });

    // Calculate relative balance (as percentages)
    const balance = {};
    bands.forEach(band => {
        balance[band] = totalEnergy > 0 ? (averages[band] / totalEnergy) * 100 : 0;
    });

    // Calculate balance metrics
    const bassToTrebleRatio = averages.treble > 0 ? averages.bass / averages.treble : 0;
    const midDominance = averages.mid / Math.max(averages.bass, averages.treble);

    return {
        relative: balance,
        absolute: averages,
        bassToTrebleRatio,
        midDominance,
        totalEnergy
    };
};

const findFrequencyPeaks = (frequencyData) => {
    const peaks = {};

    Object.keys(frequencyData).forEach(band => {
        if (band === 'timeStamps') return;

        const data = frequencyData[band];
        const bandPeaks = [];

        // Simple peak detection
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
                // Check if it's a significant peak
                const localMax = Math.max(...data.slice(Math.max(0, i - 5), Math.min(data.length, i + 6)));
                if (data[i] > localMax * 0.8) {
                    bandPeaks.push({
                        time: frequencyData.timeStamps[i],
                        value: data[i],
                        index: i
                    });
                }
            }
        }

        peaks[band] = bandPeaks;
    });

    return peaks;
};

// Utility functions for frequency analysis
export const getFrequencyStats = (frequencyData) => {
    if (!frequencyData?.frequencyBands) return null;

    const { dynamics, balance } = frequencyData;
    const bands = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];

    // Overall energy distribution
    const energyDistribution = bands.map(band => ({
        band,
        percentage: balance.relative[band],
        energy: balance.absolute[band]
    })).sort((a, b) => b.percentage - a.percentage);

    // Dominant frequency band
    const dominantBand = energyDistribution[0];

    // Calculate spectral centroid (brightness indicator)
    const spectralCentroid = calculateSpectralCentroid(balance.absolute);

    return {
        dominantBand: dominantBand.band,
        energyDistribution,
        spectralCentroid,
        bassToTrebleRatio: balance.bassToTrebleRatio,
        midDominance: balance.midDominance,
        overallDynamicRange: Math.max(...bands.map(band => dynamics[band]?.dynamicRange || 0))
    };
};

const calculateSpectralCentroid = (bandAverages) => {
    const bands = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];
    const frequencies = [135, 375, 1250, 3000, 10000]; // Representative frequencies for each band

    let weightedSum = 0;
    let totalWeight = 0;

    bands.forEach((band, i) => {
        const energy = bandAverages[band] || 0;
        weightedSum += frequencies[i] * energy;
        totalWeight += energy;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

export const detectFrequencyEvents = (frequencyData, threshold = 1.5) => {
    const events = [];
    const bands = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];

    bands.forEach(band => {
        const data = frequencyData.frequencyBands[band];
        const average = data.reduce((a, b) => a + b) / data.length;
        const stdDev = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / data.length);

        const eventThreshold = average + threshold * stdDev;

        for (let i = 0; i < data.length; i++) {
            if (data[i] > eventThreshold) {
                events.push({
                    time: frequencyData.frequencyBands.timeStamps[i],
                    band,
                    intensity: data[i],
                    relativeIntensity: (data[i] - average) / stdDev
                });
            }
        }
    });

    // Sort events by time
    return events.sort((a, b) => a.time - b.time);
};

export const getFrequencyEvolution = (frequencyData, smoothingWindow = 5) => {
    const bands = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];
    const evolution = {};

    bands.forEach(band => {
        const data = frequencyData.frequencyBands[band];
        const smoothed = [];

        // Apply moving average smoothing
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(smoothingWindow / 2));
            const end = Math.min(data.length, i + Math.ceil(smoothingWindow / 2));

            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += data[j];
            }

            smoothed.push(sum / (end - start));
        }

        evolution[band] = smoothed;
    });

    evolution.timeStamps = frequencyData.frequencyBands.timeStamps;
    return evolution;
};