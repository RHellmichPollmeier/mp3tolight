// audio/spectralAnalysis.js

export const analyzeSpectral = async (audioBuffer) => {
    console.log('Starting spectral analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 2048;
    const hopSize = fftSize / 2;

    const spectralFeatures = {
        centroid: [],           // Spectral Centroid (brightness)
        bandwidth: [],          // Spectral Bandwidth (spread)
        rolloff: [],           // Spectral Rolloff (energy concentration)
        flux: [],              // Spectral Flux (change rate)
        flatness: [],          // Spectral Flatness (noise-like vs tonal)
        crest: [],             // Spectral Crest Factor
        energy: [],            // Total spectral energy
        slope: [],             // Spectral Slope
        kurtosis: [],          // Spectral Kurtosis (peakiness)
        skewness: [],          // Spectral Skewness (asymmetry)
        timeStamps: []
    };

    let previousSpectrum = null;

    // Process audio in windows
    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
        const window = channelData.slice(i, i + fftSize);
        const spectrum = calculateSpectrum(window);

        // Calculate all spectral features for this frame
        const features = calculateSpectralFeatures(spectrum, sampleRate, fftSize, previousSpectrum);

        spectralFeatures.centroid.push(features.centroid);
        spectralFeatures.bandwidth.push(features.bandwidth);
        spectralFeatures.rolloff.push(features.rolloff);
        spectralFeatures.flux.push(features.flux);
        spectralFeatures.flatness.push(features.flatness);
        spectralFeatures.crest.push(features.crest);
        spectralFeatures.energy.push(features.energy);
        spectralFeatures.slope.push(features.slope);
        spectralFeatures.kurtosis.push(features.kurtosis);
        spectralFeatures.skewness.push(features.skewness);
        spectralFeatures.timeStamps.push(i / sampleRate);

        previousSpectrum = [...spectrum];
    }

    // Calculate statistical summaries
    const statistics = calculateSpectralStatistics(spectralFeatures);

    // Detect spectral events
    const events = detectSpectralEvents(spectralFeatures);

    // Calculate temporal evolution patterns
    const evolution = analyzeSpectralEvolution(spectralFeatures);

    const result = {
        type: 'spectral',
        spectralFeatures: spectralFeatures,
        statistics: statistics,
        events: events,
        evolution: evolution,
        sampleRate,
        duration: audioBuffer.duration,
        fftSize,
        hopSize
    };

    console.log('Spectral analysis completed:', {
        frames: spectralFeatures.centroid.length,
        duration: result.duration,
        featuresAnalyzed: Object.keys(spectralFeatures).length - 1 // -1 for timeStamps
    });

    return result;
};

const calculateSpectrum = (window) => {
    const N = window.length;

    // Apply Hann window
    const windowedData = window.map((sample, i) =>
        sample * 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)))
    );

    // Calculate magnitude spectrum
    const spectrum = [];
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

const calculateSpectralFeatures = (spectrum, sampleRate, fftSize, previousSpectrum) => {
    const features = {};
    const frequencies = spectrum.map((_, i) => (i * sampleRate) / fftSize);

    // Total spectral energy
    const totalEnergy = spectrum.reduce((sum, mag) => sum + mag * mag, 0);
    features.energy = totalEnergy;

    if (totalEnergy === 0) {
        // Return zeros for silent frames
        return {
            centroid: 0, bandwidth: 0, rolloff: 0, flux: 0,
            flatness: 0, crest: 0, energy: 0, slope: 0,
            kurtosis: 0, skewness: 0
        };
    }

    // Spectral Centroid (brightness)
    let weightedSum = 0;
    spectrum.forEach((magnitude, i) => {
        weightedSum += frequencies[i] * magnitude * magnitude;
    });
    features.centroid = weightedSum / totalEnergy;

    // Spectral Bandwidth
    let bandwidthSum = 0;
    spectrum.forEach((magnitude, i) => {
        const deviation = frequencies[i] - features.centroid;
        bandwidthSum += deviation * deviation * magnitude * magnitude;
    });
    features.bandwidth = Math.sqrt(bandwidthSum / totalEnergy);

    // Spectral Rolloff (85% of energy)
    let energySum = 0;
    const rolloffThreshold = totalEnergy * 0.85;
    features.rolloff = 0;
    for (let i = 0; i < spectrum.length; i++) {
        energySum += spectrum[i] * spectrum[i];
        if (energySum >= rolloffThreshold) {
            features.rolloff = frequencies[i];
            break;
        }
    }

    // Spectral Flux (rate of change)
    features.flux = 0;
    if (previousSpectrum) {
        let fluxSum = 0;
        for (let i = 0; i < Math.min(spectrum.length, previousSpectrum.length); i++) {
            const diff = spectrum[i] - previousSpectrum[i];
            fluxSum += diff * diff;
        }
        features.flux = Math.sqrt(fluxSum);
    }

    // Spectral Flatness (measure of noisiness)
    const geometricMean = Math.exp(spectrum.reduce((sum, mag) => sum + Math.log(Math.max(mag, 1e-10)), 0) / spectrum.length);
    const arithmeticMean = spectrum.reduce((sum, mag) => sum + mag, 0) / spectrum.length;
    features.flatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // Spectral Crest Factor
    const maxMagnitude = Math.max(...spectrum);
    const rmsMagnitude = Math.sqrt(spectrum.reduce((sum, mag) => sum + mag * mag, 0) / spectrum.length);
    features.crest = rmsMagnitude > 0 ? maxMagnitude / rmsMagnitude : 0;

    // Spectral Slope (tilt of spectrum)
    features.slope = calculateSpectralSlope(spectrum, frequencies);

    // Spectral Kurtosis and Skewness
    const moments = calculateSpectralMoments(spectrum, frequencies, features.centroid, totalEnergy);
    features.kurtosis = moments.kurtosis;
    features.skewness = moments.skewness;

    return features;
};

const calculateSpectralSlope = (spectrum, frequencies) => {
    // Linear regression to find slope of spectrum in log domain
    const logMagnitudes = spectrum.map(mag => Math.log(Math.max(mag, 1e-10)));
    const logFrequencies = frequencies.map(freq => Math.log(Math.max(freq, 1)));

    const n = logMagnitudes.length;
    const sumX = logFrequencies.reduce((a, b) => a + b, 0);
    const sumY = logMagnitudes.reduce((a, b) => a + b, 0);
    const sumXY = logFrequencies.reduce((sum, x, i) => sum + x * logMagnitudes[i], 0);
    const sumXX = logFrequencies.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isFinite(slope) ? slope : 0;
};

const calculateSpectralMoments = (spectrum, frequencies, centroid, totalEnergy) => {
    // Calculate higher-order moments for kurtosis and skewness
    let moment2 = 0, moment3 = 0, moment4 = 0;

    spectrum.forEach((magnitude, i) => {
        const deviation = frequencies[i] - centroid;
        const weight = (magnitude * magnitude) / totalEnergy;

        moment2 += deviation * deviation * weight;
        moment3 += deviation * deviation * deviation * weight;
        moment4 += deviation * deviation * deviation * deviation * weight;
    });

    const variance = moment2;
    const stdDev = Math.sqrt(variance);

    const skewness = stdDev > 0 ? moment3 / (stdDev * stdDev * stdDev) : 0;
    const kurtosis = variance > 0 ? moment4 / (variance * variance) - 3 : 0; // Excess kurtosis

    return { kurtosis, skewness };
};

const calculateSpectralStatistics = (spectralFeatures) => {
    const stats = {};

    Object.keys(spectralFeatures).forEach(feature => {
        if (feature === 'timeStamps') return;

        const data = spectralFeatures[feature];
        const sorted = [...data].sort((a, b) => a - b);
        const len = sorted.length;

        stats[feature] = {
            mean: data.reduce((a, b) => a + b) / len,
            median: len % 2 === 0 ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2 : sorted[Math.floor(len / 2)],
            min: sorted[0],
            max: sorted[len - 1],
            std: Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - stats[feature]?.mean || 0, 2), 0) / len),
            q25: sorted[Math.floor(len * 0.25)],
            q75: sorted[Math.floor(len * 0.75)]
        };
    });

    return stats;
};

const detectSpectralEvents = (spectralFeatures) => {
    const events = [];
    const features = ['centroid', 'bandwidth', 'rolloff', 'flux', 'flatness'];

    features.forEach(feature => {
        const data = spectralFeatures[feature];
        const mean = data.reduce((a, b) => a + b) / data.length;
        const std = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length);

        const threshold = mean + 2 * std; // 2 standard deviations

        for (let i = 1; i < data.length - 1; i++) {
            // Detect peaks above threshold
            if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
                events.push({
                    time: spectralFeatures.timeStamps[i],
                    feature,
                    value: data[i],
                    intensity: (data[i] - mean) / std,
                    type: 'peak'
                });
            }

            // Detect sudden changes (flux-like detection for other features)
            if (i > 0 && Math.abs(data[i] - data[i - 1]) > 2 * std) {
                events.push({
                    time: spectralFeatures.timeStamps[i],
                    feature,
                    value: data[i],
                    change: data[i] - data[i - 1],
                    type: 'change'
                });
            }
        }
    });

    return events.sort((a, b) => a.time - b.time);
};

const analyzeSpectralEvolution = (spectralFeatures) => {
    const evolution = {};
    const features = ['centroid', 'bandwidth', 'rolloff', 'flux', 'flatness'];
    const windowSize = 20; // Frames for trend analysis

    features.forEach(feature => {
        const data = spectralFeatures[feature];
        const trends = [];

        for (let i = windowSize; i < data.length - windowSize; i++) {
            const before = data.slice(i - windowSize, i);
            const after = data.slice(i, i + windowSize);

            const beforeMean = before.reduce((a, b) => a + b) / before.length;
            const afterMean = after.reduce((a, b) => a + b) / after.length;

            trends.push({
                time: spectralFeatures.timeStamps[i],
                trend: afterMean - beforeMean,
                beforeValue: beforeMean,
                afterValue: afterMean
            });
        }

        evolution[feature] = trends;
    });

    return evolution;
};

// Utility functions for spectral analysis
export const getSpectralProfile = (spectralData) => {
    if (!spectralData?.statistics) return null;

    const { statistics } = spectralData;

    // Classify the spectral character
    const brightness = statistics.centroid.mean;
    const spread = statistics.bandwidth.mean;
    const noisiness = statistics.flatness.mean;
    const dynamism = statistics.flux.mean;

    let character = 'unknown';

    if (brightness > 3000 && spread > 1000) character = 'bright_complex';
    else if (brightness < 1000 && spread < 500) character = 'dark_simple';
    else if (noisiness > 0.3) character = 'noisy';
    else if (dynamism > statistics.flux.std) character = 'dynamic';
    else if (brightness > 2000) character = 'bright';
    else character = 'warm';

    return {
        character,
        brightness: brightness,
        complexity: spread,
        noisiness: noisiness,
        dynamism: dynamism,
        energyLevel: statistics.energy.mean
    };
};

export const detectSpectralTextures = (spectralData, segmentDuration = 2.0) => {
    if (!spectralData?.spectralFeatures) return [];

    const features = spectralData.spectralFeatures;
    const segmentFrames = Math.floor(segmentDuration * features.timeStamps.length / spectralData.duration);
    const textures = [];

    for (let i = 0; i < features.centroid.length - segmentFrames; i += segmentFrames) {
        const segment = {
            startTime: features.timeStamps[i],
            endTime: features.timeStamps[i + segmentFrames - 1],
            centroidVariance: calculateVariance(features.centroid.slice(i, i + segmentFrames)),
            bandwidthVariance: calculateVariance(features.bandwidth.slice(i, i + segmentFrames)),
            flatnessAverage: features.flatness.slice(i, i + segmentFrames).reduce((a, b) => a + b) / segmentFrames,
            fluxAverage: features.flux.slice(i, i + segmentFrames).reduce((a, b) => a + b) / segmentFrames
        };

        // Classify texture
        if (segment.flatnessAverage > 0.4) segment.texture = 'noise';
        else if (segment.centroidVariance < 100000) segment.texture = 'stable';
        else if (segment.fluxAverage > segment.centroidVariance * 0.001) segment.texture = 'dynamic';
        else segment.texture = 'varied';

        textures.push(segment);
    }

    return textures;
};

const calculateVariance = (data) => {
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
};