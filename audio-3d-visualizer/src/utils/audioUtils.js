// utils/audioUtils.js

// ========================================
// WINDOW FUNCTIONS
// ========================================

export const createWindowFunction = (size, type = 'hann') => {
    const window = new Array(size);
    
    switch (type.toLowerCase()) {
        case 'hann':
        case 'hanning':
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
                const arg = 2 * Math.PI * i / (size - 1);
                window[i] = 0.42 - 0.5 * Math.cos(arg) + 0.08 * Math.cos(2 * arg);
            }
            break;
            
        case 'kaiser':
            // Kaiser window with beta = 8.6
            const beta = 8.6;
            const alpha = (size - 1) / 2;
            const I0_beta = modifiedBesselI0(beta);
            
            for (let i = 0; i < size; i++) {
                const arg = beta * Math.sqrt(1 - Math.pow((i - alpha) / alpha, 2));
                window[i] = modifiedBesselI0(arg) / I0_beta;
            }
            break;
            
        case 'tukey':
            // Tukey window with alpha = 0.5
            const alpha = 0.5;
            const alphaN = alpha * (size - 1) / 2;
            
            for (let i = 0; i < size; i++) {
                if (i <= alphaN) {
                    window[i] = 0.5 * (1 + Math.cos(Math.PI * (i / alphaN - 1)));
                } else if (i >= size - alphaN) {
                    window[i] = 0.5 * (1 + Math.cos(Math.PI * ((i - size + alphaN) / alphaN)));
                } else {
                    window[i] = 1;
                }
            }
            break;
            
        default: // rectangular
            window.fill(1);
    }
    
    return window;
};

// Modified Bessel function of the first kind (for Kaiser window)
const modifiedBesselI0 = (x) => {
    let result = 1;
    let term = 1;
    
    for (let i = 1; i < 50; i++) {
        term *= (x / 2) / i;
        result += term * term;
    }
    
    return result;
};

// ========================================
// FFT IMPLEMENTATION
// ========================================

export class FFT {
    constructor(size) {
        this.size = size;
        this.log2Size = Math.log2(size);
        
        if (!Number.isInteger(this.log2Size)) {
            throw new Error('FFT size must be a power of 2');
        }
        
        // Pre-compute bit-reversal indices
        this.bitReversalIndices = new Array(size);
        for (let i = 0; i < size; i++) {
            this.bitReversalIndices[i] = this.reverseBits(i, this.log2Size);
        }
        
        // Pre-compute twiddle factors
        this.twiddleFactors = new Array(size / 2);
        for (let i = 0; i < size / 2; i++) {
            const angle = -2 * Math.PI * i / size;
            this.twiddleFactors[i] = {
                real: Math.cos(angle),
                imag: Math.sin(angle)
            };
        }
    }
    
    reverseBits(num, bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (num & 1);
            num >>= 1;
        }
        return result;
    }
    
    forward(inputReal, inputImag = null) {
        const N = this.size;
        const real = new Array(N);
        const imag = new Array(N);
        
        // Bit-reversal permutation
        for (let i = 0; i < N; i++) {
            const j = this.bitReversalIndices[i];
            real[i] = inputReal[j];
            imag[i] = inputImag ? inputImag[j] : 0;
        }
        
        // Cooley-Tukey FFT
        for (let stage = 1; stage <= this.log2Size; stage++) {
            const butterflySpan = 1 << stage;
            const butterflyHalfSpan = butterflySpan >> 1;
            const twiddleStride = N / butterflySpan;
            
            for (let butterflyStart = 0; butterflyStart < N; butterflyStart += butterflySpan) {
                for (let k = 0; k < butterflyHalfSpan; k++) {
                    const i = butterflyStart + k;
                    const j = i + butterflyHalfSpan;
                    const twiddleIndex = k * twiddleStride;
                    
                    const twiddle = this.twiddleFactors[twiddleIndex];
                    
                    // Complex multiplication: twiddle * (real[j] + i*imag[j])
                    const tempReal = twiddle.real * real[j] - twiddle.imag * imag[j];
                    const tempImag = twiddle.real * imag[j] + twiddle.imag * real[j];
                    
                    // Butterfly operation
                    const realI = real[i];
                    const imagI = imag[i];
                    
                    real[i] = realI + tempReal;
                    imag[i] = imagI + tempImag;
                    real[j] = realI - tempReal;
                    imag[j] = imagI - tempImag;
                }
            }
        }
        
        return { real, imag };
    }
    
    getMagnitudeSpectrum(inputReal, inputImag = null) {
        const result = this.forward(inputReal, inputImag);
        const magnitude = new Array(this.size / 2);
        
        for (let i = 0; i < this.size / 2; i++) {
            magnitude[i] = Math.sqrt(result.real[i] * result.real[i] + result.imag[i] * result.imag[i]);
        }
        
        return magnitude;
    }
    
    getPowerSpectrum(inputReal, inputImag = null) {
        const result = this.forward(inputReal, inputImag);
        const power = new Array(this.size / 2);
        
        for (let i = 0; i < this.size / 2; i++) {
            power[i] = result.real[i] * result.real[i] + result.imag[i] * result.imag[i];
        }
        
        return power;
    }
}

// ========================================
// AUDIO ANALYSIS UTILITIES
// ========================================

// Calculate RMS (Root Mean Square) energy
export const calculateRMS = (buffer, startSample = 0, endSample = null) => {
    const end = endSample || buffer.length;
    let sum = 0;
    
    for (let i = startSample; i < end; i++) {
        sum += buffer[i] * buffer[i];
    }
    
    return Math.sqrt(sum / (end - startSample));
};

// Calculate zero-crossing rate
export const calculateZCR = (buffer, startSample = 0, endSample = null) => {
    const end = endSample || buffer.length;
    let crossings = 0;
    
    for (let i = startSample + 1; i < end; i++) {
        if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
            crossings++;
        }
    }
    
    return crossings / (end - startSample - 1);
};

// Calculate spectral centroid
export const calculateSpectralCentroid = (magnitudeSpectrum, sampleRate, fftSize) => {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
        const frequency = (i * sampleRate) / fftSize;
        const magnitude = magnitudeSpectrum[i];
        
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
};

// Calculate spectral bandwidth
export const calculateSpectralBandwidth = (magnitudeSpectrum, sampleRate, fftSize, centroid = null) => {
    const spectralCentroid = centroid || calculateSpectralCentroid(magnitudeSpectrum, sampleRate, fftSize);
    
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
        const frequency = (i * sampleRate) / fftSize;
        const magnitude = magnitudeSpectrum[i];
        const deviation = frequency - spectralCentroid;
        
        weightedSum += deviation * deviation * magnitude;
        magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? Math.sqrt(weightedSum / magnitudeSum) : 0;
};

// Calculate spectral rolloff
export const calculateSpectralRolloff = (magnitudeSpectrum, sampleRate, fftSize, rolloffPoint = 0.85) => {
    const totalEnergy = magnitudeSpectrum.reduce((sum, mag) => sum + mag * mag, 0);
    const threshold = totalEnergy * rolloffPoint;
    
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
        cumulativeEnergy += magnitudeSpectrum[i] * magnitudeSpectrum[i];
        
        if (cumulativeEnergy >= threshold) {
            return (i * sampleRate) / fftSize;
        }
    }
    
    return (magnitudeSpectrum.length - 1) * sampleRate / fftSize;
};

// Calculate spectral flux
export const calculateSpectralFlux = (currentSpectrum, previousSpectrum) => {
    if (!previousSpectrum || currentSpectrum.length !== previousSpectrum.length) {
        return 0;
    }
    
    let flux = 0;
    
    for (let i = 0; i < currentSpectrum.length; i++) {
        const diff = currentSpectrum[i] - previousSpectrum[i];
        flux += Math.max(0, diff); // Only positive changes
    }
    
    return flux;
};

// Calculate spectral flatness (Wiener entropy)
export const calculateSpectralFlatness = (magnitudeSpectrum) => {
    let geometricMean = 0;
    let arithmeticMean = 0;
    let validBins = 0;
    
    for (let i = 1; i < magnitudeSpectrum.length; i++) { // Skip DC component
        const magnitude = magnitudeSpectrum[i];
        
        if (magnitude > 0) {
            geometricMean += Math.log(magnitude);
            arithmeticMean += magnitude;
            validBins++;
        }
    }
    
    if (validBins === 0) return 0;
    
    geometricMean = Math.exp(geometricMean / validBins);
    arithmeticMean = arithmeticMean / validBins;
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
};

// ========================================
// FILTER IMPLEMENTATIONS
// ========================================

// Simple moving average filter
export const movingAverage = (data, windowSize) => {
    const filtered = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
            sum += data[j];
            count++;
        }
        
        filtered.push(sum / count);
    }
    
    return filtered;
};

// Median filter
export const medianFilter = (data, windowSize) => {
    const filtered = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < data.length; i++) {
        const window = [];
        
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
            window.push(data[j]);
        }
        
        window.sort((a, b) => a - b);
        const medianIndex = Math.floor(window.length / 2);
        filtered.push(window[medianIndex]);
    }
    
    return filtered;
};

// Exponential moving average filter
export const exponentialMovingAverage = (data, alpha = 0.1) => {
    const filtered = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
        filtered.push(alpha * data[i] + (1 - alpha) * filtered[i - 1]);
    }
    
    return filtered;
};

// ========================================
// ONSET DETECTION
// ========================================

// High Frequency Content (HFC) onset detection
export const calculateHFC = (magnitudeSpectrum) => {
    let hfc = 0;
    
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
        hfc += i * magnitudeSpectrum[i];
    }
    
    return hfc;
};

// Complex Domain onset detection
export const calculateComplexDomain = (currentSpectrum, previousSpectrum) => {
    if (!previousSpectrum || currentSpectrum.length !== previousSpectrum.length) {
        return 0;
    }
    
    let sum = 0;
    
    for (let i = 0; i < currentSpectrum.length; i++) {
        const diff = Math.abs(currentSpectrum[i]) - Math.abs(previousSpectrum[i]);
        sum += Math.max(0, diff);
    }
    
    return sum;
};

// Phase deviation onset detection
export const calculatePhaseDeviation = (currentPhase, previousPhase, previousPhase2) => {
    if (!previousPhase || !previousPhase2 || 
        currentPhase.length !== previousPhase.length || 
        previousPhase.length !== previousPhase2.length) {
        return 0;
    }
    
    let deviation = 0;
    
    for (let i = 0; i < currentPhase.length; i++) {
        const expectedPhase = 2 * previousPhase[i] - previousPhase2[i];
        const actualPhase = currentPhase[i];
        
        // Normalize phase difference to [-π, π]
        let diff = actualPhase - expectedPhase;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        
        deviation += Math.abs(diff);
    }
    
    return deviation;
};

// ========================================
// PITCH DETECTION
// ========================================

// Autocorrelation-based pitch detection
export const autocorrelationPitch = (buffer, sampleRate, minFreq = 80, maxFreq = 1000) => {
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);
    
    let bestPeriod = 0;
    let bestCorrelation = 0;
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
        let correlation = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < buffer.length - period; i++) {
            correlation += buffer[i] * buffer[i + period];
            norm1 += buffer[i] * buffer[i];
            norm2 += buffer[i + period] * buffer[i + period];
        }
        
        const normalizedCorrelation = correlation / Math.sqrt(norm1 * norm2);
        
        if (normalizedCorrelation > bestCorrelation) {
            bestCorrelation = normalizedCorrelation;
            bestPeriod = period;
        }
    }
    
    return bestPeriod > 0 ? {
        frequency: sampleRate / bestPeriod,
        confidence: bestCorrelation,
        period: bestPeriod
    } : null;
};

// ========================================
// TEMPO AND RHYTHM
// ========================================

// Beat tracking using onset detection
export const trackBeats = (onsetFunction, sampleRate, hopSize) => {
    // Smooth onset function
    const smoothed = movingAverage(onsetFunction, 5);
    
    // Find peaks
    const peaks = [];
    const threshold = Math.max(...smoothed) * 0.3;
    
    for (let i = 1; i < smoothed.length - 1; i++) {
        if (smoothed[i] > threshold && 
            smoothed[i] > smoothed[i - 1] && 
            smoothed[i] > smoothed[i + 1]) {
            peaks.push({
                index: i,
                time: (i * hopSize) / sampleRate,
                strength: smoothed[i]
            });
        }
    }
    
    return peaks;
};

// Estimate tempo from beat positions
export const estimateTempo = (beatTimes) => {
    if (beatTimes.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < beatTimes.length; i++) {
        intervals.push(beatTimes[i] - beatTimes[i - 1]);
    }
    
    // Use histogram to find most common interval
    const histogram = new Map();
    
    intervals.forEach(interval => {
        const bpm = Math.round(60 / interval);
        if (bpm >= 60 && bpm <= 200) {
            histogram.set(bpm, (histogram.get(bpm) || 0) + 1);
        }
    });
    
    let maxCount = 0;
    let estimatedTempo = 0;
    
    for (const [bpm, count] of histogram) {
        if (count > maxCount) {
            maxCount = count;
            estimatedTempo = bpm;
        }
    }
    
    return estimatedTempo;
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Convert audio buffer to float array
export const audioBufferToFloat32Array = (audioBuffer, channelIndex = 0) => {
    return audioBuffer.getChannelData(channelIndex);
};

// Normalize audio data
export const normalizeAudio = (data, targetLevel = 0.9) => {
    const maxValue = Math.max(...data.map(Math.abs));
    if (maxValue === 0) return data;
    
    const scaleFactor = targetLevel / maxValue;
    return data.map(sample => sample * scaleFactor);
};

// Apply fade in/out
export const applyFade = (data, fadeInSamples = 0, fadeOutSamples = 0) => {
    const result = [...data];
    
    // Fade in
    for (let i = 0; i < Math.min(fadeInSamples, result.length); i++) {
        const factor = i / fadeInSamples;
        result[i] *= factor;
    }
    
    // Fade out
    for (let i = 0; i < Math.min(fadeOutSamples, result.length); i++) {
        const factor = i / fadeOutSamples;
        const index = result.length - 1 - i;
        result[index] *= factor;
    }
    
    return result;
};

// Resample audio data
export const resampleAudio = (data, originalSampleRate, targetSampleRate) => {
    if (originalSampleRate === targetSampleRate) return data;
    
    const ratio = originalSampleRate / targetSampleRate;
    const outputLength = Math.floor(data.length / ratio);
    const resampled = new Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
        const sourceIndex = i * ratio;
        const lowerIndex = Math.floor(sourceIndex);
        const upperIndex = Math.min(lowerIndex + 1, data.length - 1);
        const fraction = sourceIndex - lowerIndex;
        
        // Linear interpolation
        resampled[i] = data[lowerIndex] + fraction * (data[upperIndex] - data[lowerIndex]);
    }
    
    return resampled;
};