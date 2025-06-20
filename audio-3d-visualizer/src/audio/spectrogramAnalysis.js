// audio/spectrogramAnalysis.js

export const analyzeSpectrogram = async (audioBuffer) => {
    console.log('Starting spectrogram analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 1024;
    const hopSize = fftSize / 4; // 75% overlap for better time resolution
    const windowFunction = 'hann';

    // Calculate spectrogram
    const spectrogramData = calculateSpectrogram(channelData, fftSize, hopSize, windowFunction);

    // Generate frequency and time arrays
    const frequencies = generateFrequencyArray(fftSize, sampleRate);
    const timeStamps = generateTimeArray(spectrogramData.length, hopSize, sampleRate);

    // Apply log-frequency scaling for better visualization
    const logSpectrogram = applyLogFrequencyScaling(spectrogramData, frequencies);

    // Calculate mel-scale spectrogram for perceptual analysis
    const melSpectrogram = calculateMelSpectrogram(spectrogramData, frequencies);

    const result = {
        type: 'spectrogram',
        spectrogram: spectrogramData,
        logSpectrogram: logSpectrogram,
        melSpectrogram: melSpectrogram,
        frequencies: frequencies,
        timeStamps: timeStamps,
        dimensions: {
            width: timeStamps.length,
            height: frequencies.length,
            timeResolution: hopSize / sampleRate,
            frequencyResolution: sampleRate / fftSize
        },
        sampleRate,
        duration: audioBuffer.duration,
        fftSize,
        hopSize,
        windowFunction
    };

    console.log('Spectrogram analysis completed:', {
        timeFrames: result.dimensions.width,
        frequencyBins: result.dimensions.height,
        duration: result.duration,
        timeResolution: result.dimensions.timeResolution.toFixed(4) + 's',
        frequencyResolution: result.dimensions.frequencyResolution.toFixed(1) + 'Hz'
    });

    return result;
};

const calculateSpectrogram = (channelData, fftSize, hopSize, windowFunction) => {
    const spectrogram = [];
    const windowFunc = createWindowFunction(fftSize, windowFunction);

    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
        const window = channelData.slice(i, i + fftSize);

        // Apply window function
        const windowedData = window.map((sample, idx) => sample * windowFunc[idx]);

        // Calculate FFT
        const spectrum = performFFT(windowedData);

        // Convert to magnitude spectrum and take only positive frequencies
        const magnitudeSpectrum = spectrum.slice(0, fftSize / 2).map(complex =>
            Math.sqrt(complex.real * complex.real + complex.imag * complex.imag)
        );

        spectrogram.push(magnitudeSpectrum);
    }

    return spectrogram;
};

const createWindowFunction = (size, type) => {
    const window = new Array(size);

    switch (type) {
        case 'hann':
            for (let i = 0; i < size; i++) {
                window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
            }
            break;
        case 'hamming':
            for (let i = 0; i < size; i++) {
                window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
            }
            break;
        case 'blackman':
            for (let i = 0; i < size; i++) {
                window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)) +
                    0.08 * Math.cos(4 * Math.PI * i / (size - 1));
            }
            break;
        default: // rectangular
            window.fill(1);
    }

    return window;
};

const performFFT = (buffer) => {
    const N = buffer.length;
    const result = new Array(N);

    // Simple DFT implementation (for production, use a proper FFT library like Kiss FFT)
    for (let k = 0; k < N; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < N; n++) {
            const angle = -2 * Math.PI * k * n / N;
            real += buffer[n] * Math.cos(angle);
            imag += buffer[n] * Math.sin(angle);
        }
        result[k] = { real, imag };
    }

    return result;
};

const generateFrequencyArray = (fftSize, sampleRate) => {
    const frequencies = [];
    const frequencyResolution = sampleRate / fftSize;

    for (let i = 0; i < fftSize / 2; i++) {
        frequencies.push(i * frequencyResolution);
    }

    return frequencies;
};

const generateTimeArray = (numFrames, hopSize, sampleRate) => {
    const timeStamps = [];
    const timeResolution = hopSize / sampleRate;

    for (let i = 0; i < numFrames; i++) {
        timeStamps.push(i * timeResolution);
    }

    return timeStamps;
};

const applyLogFrequencyScaling = (spectrogram, frequencies) => {
    // Create log-frequency bins
    const minFreq = Math.max(20, frequencies[1]); // Avoid log(0)
    const maxFreq = frequencies[frequencies.length - 1];
    const numLogBins = 128; // Number of log-frequency bins

    const logFrequencies = [];
    const logFactor = Math.log(maxFreq / minFreq) / (numLogBins - 1);

    for (let i = 0; i < numLogBins; i++) {
        logFrequencies.push(minFreq * Math.exp(i * logFactor));
    }

    // Interpolate spectrogram to log-frequency scale
    const logSpectrogram = spectrogram.map(frame => {
        return interpolateToLogScale(frame, frequencies, logFrequencies);
    });

    return {
        data: logSpectrogram,
        frequencies: logFrequencies
    };
};

const interpolateToLogScale = (frame, linearFreqs, logFreqs) => {
    const logFrame = [];

    for (let i = 0; i < logFreqs.length; i++) {
        const targetFreq = logFreqs[i];

        // Find surrounding frequency bins
        let lowerIdx = 0;
        let upperIdx = linearFreqs.length - 1;

        for (let j = 0; j < linearFreqs.length - 1; j++) {
            if (linearFreqs[j] <= targetFreq && linearFreqs[j + 1] >= targetFreq) {
                lowerIdx = j;
                upperIdx = j + 1;
                break;
            }
        }

        // Linear interpolation
        const lowerFreq = linearFreqs[lowerIdx];
        const upperFreq = linearFreqs[upperIdx];
        const lowerMag = frame[lowerIdx];
        const upperMag = frame[upperIdx];

        let interpolatedMag;
        if (upperFreq === lowerFreq) {
            interpolatedMag = lowerMag;
        } else {
            const ratio = (targetFreq - lowerFreq) / (upperFreq - lowerFreq);
            interpolatedMag = lowerMag + ratio * (upperMag - lowerMag);
        }

        logFrame.push(interpolatedMag);
    }

    return logFrame;
};

const calculateMelSpectrogram = (spectrogram, frequencies) => {
    // Create mel-scale filter bank
    const numMelBins = 80;
    const melFilterBank = createMelFilterBank(numMelBins, frequencies);

    // Apply mel filters to each frame
    const melSpectrogram = spectrogram.map(frame => {
        return applyMelFilters(frame, melFilterBank);
    });

    return {
        data: melSpectrogram,
        numBins: numMelBins,
        filterBank: melFilterBank
    };
};

const createMelFilterBank = (numMelBins, frequencies) => {
    const melMin = hzToMel(frequencies[0]);
    const melMax = hzToMel(frequencies[frequencies.length - 1]);

    // Create mel-spaced center frequencies
    const melCenters = [];
    for (let i = 0; i <= numMelBins + 1; i++) {
        const mel = melMin + (i / (numMelBins + 1)) * (melMax - melMin);
        melCenters.push(melToHz(mel));
    }

    // Create triangular filters
    const filterBank = [];
    for (let i = 1; i <= numMelBins; i++) {
        const filter = new Array(frequencies.length).fill(0);

        const leftFreq = melCenters[i - 1];
        const centerFreq = melCenters[i];
        const rightFreq = melCenters[i + 1];

        for (let j = 0; j < frequencies.length; j++) {
            const freq = frequencies[j];

            if (freq >= leftFreq && freq <= centerFreq) {
                filter[j] = (freq - leftFreq) / (centerFreq - leftFreq);
            } else if (freq >= centerFreq && freq <= rightFreq) {
                filter[j] = (rightFreq - freq) / (rightFreq - centerFreq);
            }
        }

        filterBank.push(filter);
    }

    return filterBank;
};

const hzToMel = (hz) => {
    return 2595 * Math.log10(1 + hz / 700);
};

const melToHz = (mel) => {
    return 700 * (Math.pow(10, mel / 2595) - 1);
};

const applyMelFilters = (frame, filterBank) => {
    const melFrame = [];

    for (let i = 0; i < filterBank.length; i++) {
        let melValue = 0;
        for (let j = 0; j < frame.length; j++) {
            melValue += frame[j] * filterBank[i][j];
        }
        melFrame.push(melValue);
    }

    return melFrame;
};

// Spectrogram to ImageData conversion for visualization
export const spectrogramToImageData = (spectrogram, colormap = 'viridis') => {
    if (!spectrogram || spectrogram.length === 0) {
        throw new Error('Invalid spectrogram data');
    }

    const width = spectrogram.length;
    const height = spectrogram[0].length;

    // Find global min/max for normalization
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let frame of spectrogram) {
        for (let bin of frame) {
            minVal = Math.min(minVal, bin);
            maxVal = Math.max(maxVal, bin);
        }
    }

    // Convert to dB scale and normalize
    const dbSpectrogram = spectrogram.map(frame =>
        frame.map(bin => {
            const dbVal = bin > 0 ? 20 * Math.log10(bin / maxVal) : -80;
            return Math.max(-80, dbVal); // Clip at -80 dB
        })
    );

    const dbMin = -80;
    const dbMax = 0;

    // Create ImageData
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Flip y-axis (high frequencies at top)
            const spectrogramY = height - 1 - y;
            const dbValue = dbSpectrogram[x][spectrogramY];

            // Normalize to 0-1
            const normalized = (dbValue - dbMin) / (dbMax - dbMin);

            // Apply colormap
            const color = applyColormap(normalized, colormap);

            const pixelIndex = (y * width + x) * 4;
            data[pixelIndex] = color.r;     // R
            data[pixelIndex + 1] = color.g; // G
            data[pixelIndex + 2] = color.b; // B
            data[pixelIndex + 3] = 255;     // A
        }
    }

    return imageData;
};

const applyColormap = (value, colormap) => {
    // Clamp value to 0-1
    value = Math.max(0, Math.min(1, value));

    switch (colormap) {
        case 'viridis':
            return viridisColormap(value);
        case 'plasma':
            return plasmaColormap(value);
        case 'hot':
            return hotColormap(value);
        case 'cool':
            return coolColormap(value);
        default:
            return viridisColormap(value);
    }
};

const viridisColormap = (t) => {
    // Viridis colormap approximation
    const r = Math.max(0, Math.min(255, Math.round(255 * (0.267 + 0.005 * t + 0.322 * t * t))));
    const g = Math.max(0, Math.min(255, Math.round(255 * (0.005 + 0.628 * t + 0.395 * t * t * t))));
    const b = Math.max(0, Math.min(255, Math.round(255 * (0.329 + 0.718 * t - 0.215 * t * t))));

    return { r, g, b };
};

const plasmaColormap = (t) => {
    // Plasma colormap approximation
    const r = Math.max(0, Math.min(255, Math.round(255 * (0.050 + 0.839 * t))));
    const g = Math.max(0, Math.min(255, Math.round(255 * (0.042 + 0.085 * t + 0.900 * t * t))));
    const b = Math.max(0, Math.min(255, Math.round(255 * (0.608 + 0.543 * t - 0.773 * t * t))));

    return { r, g, b };
};

const hotColormap = (t) => {
    // Hot colormap (black -> red -> yellow -> white)
    let r, g, b;

    if (t < 0.33) {
        r = Math.round(255 * (t / 0.33));
        g = 0;
        b = 0;
    } else if (t < 0.66) {
        r = 255;
        g = Math.round(255 * ((t - 0.33) / 0.33));
        b = 0;
    } else {
        r = 255;
        g = 255;
        b = Math.round(255 * ((t - 0.66) / 0.34));
    }

    return { r, g, b };
};

const coolColormap = (t) => {
    // Cool colormap (cyan -> magenta)
    const r = Math.round(255 * t);
    const g = Math.round(255 * (1 - t));
    const b = 255;

    return { r, g, b };
};

// Utility functions for spectrogram analysis
export const extractSpectrogramRegion = (spectrogramData, regionCoords) => {
    if (!regionCoords || !spectrogramData.spectrogram) return null;

    const { startX, endX, startY, endY } = regionCoords;
    const { spectrogram, timeStamps, frequencies } = spectrogramData;

    // Convert normalized coordinates to array indices
    const startTimeIdx = Math.floor(startX * timeStamps.length);
    const endTimeIdx = Math.floor(endX * timeStamps.length);
    const startFreqIdx = Math.floor((1 - endY) * frequencies.length); // Flip Y
    const endFreqIdx = Math.floor((1 - startY) * frequencies.length);

    // Extract region
    const regionData = [];
    for (let t = startTimeIdx; t < endTimeIdx && t < spectrogram.length; t++) {
        const frameRegion = [];
        for (let f = startFreqIdx; f < endFreqIdx && f < spectrogram[t].length; f++) {
            frameRegion.push(spectrogram[t][f]);
        }
        regionData.push(frameRegion);
    }

    return {
        data: regionData,
        timeRange: {
            start: timeStamps[startTimeIdx],
            end: timeStamps[Math.min(endTimeIdx, timeStamps.length - 1)]
        },
        frequencyRange: {
            start: frequencies[startFreqIdx],
            end: frequencies[Math.min(endFreqIdx, frequencies.length - 1)]
        },
        dimensions: {
            width: regionData.length,
            height: regionData[0]?.length || 0
        }
    };
};

export const calculateSpectrogramStatistics = (spectrogramData) => {
    if (!spectrogramData?.spectrogram) return null;

    const { spectrogram } = spectrogramData;
    const allValues = spectrogram.flat();

    // Convert to dB
    const maxVal = Math.max(...allValues);
    const dbValues = allValues.map(val =>
        val > 0 ? 20 * Math.log10(val / maxVal) : -80
    );

    const sorted = dbValues.sort((a, b) => a - b);
    const len = sorted.length;

    return {
        dynamicRange: sorted[len - 1] - sorted[0],
        meanLevel: dbValues.reduce((a, b) => a + b) / len,
        medianLevel: sorted[Math.floor(len / 2)],
        percentile90: sorted[Math.floor(len * 0.9)],
        percentile10: sorted[Math.floor(len * 0.1)],
        energyDistribution: analyzeEnergyDistribution(spectrogram, spectrogramData.frequencies)
    };
};

const analyzeEnergyDistribution = (spectrogram, frequencies) => {
    const frequencyBands = [
        { name: 'sub-bass', min: 20, max: 60 },
        { name: 'bass', min: 60, max: 250 },
        { name: 'low-mid', min: 250, max: 500 },
        { name: 'mid', min: 500, max: 2000 },
        { name: 'high-mid', min: 2000, max: 4000 },
        { name: 'presence', min: 4000, max: 6000 },
        { name: 'brilliance', min: 6000, max: 20000 }
    ];

    const bandEnergies = {};

    frequencyBands.forEach(band => {
        const startIdx = frequencies.findIndex(f => f >= band.min);
        const endIdx = frequencies.findIndex(f => f > band.max);

        let totalEnergy = 0;
        let sampleCount = 0;

        for (let frame of spectrogram) {
            for (let i = startIdx; i < (endIdx > 0 ? endIdx : frame.length); i++) {
                totalEnergy += frame[i] * frame[i];
                sampleCount++;
            }
        }

        bandEnergies[band.name] = sampleCount > 0 ? totalEnergy / sampleCount : 0;
    });

    return bandEnergies;
};