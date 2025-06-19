// audio/chromaAnalysis.js

export const analyzeChroma = async (audioBuffer) => {
    console.log('Starting chroma analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 2048;
    const hopSize = fftSize / 2;
    const chromaValues = [];

    // Process audio in windows
    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
        const window = channelData.slice(i, i + fftSize);
        const fft = performFFT(window);
        const chroma = calculateChromaFromFFT(fft, sampleRate, fftSize);

        chromaValues.push(chroma);
    }

    const result = {
        type: 'chroma',
        chromaFeatures: chromaValues,
        sampleRate,
        duration: audioBuffer.duration,
        fftSize,
        hopSize,
        noteNames: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    };

    console.log('Chroma analysis completed:', {
        frames: result.chromaFeatures.length,
        duration: result.duration
    });

    return result;
};

const performFFT = (buffer) => {
    const N = buffer.length;
    const result = new Array(N);

    // Simple DFT implementation (for real use, consider using a proper FFT library)
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

const calculateChromaFromFFT = (fft, sampleRate, fftSize) => {
    const chroma = new Array(12).fill(0);
    const A4_FREQ = 440; // Hz

    // Only use the first half of FFT (positive frequencies)
    for (let i = 1; i < fft.length / 2; i++) {
        const freq = (i * sampleRate) / fftSize;

        // Only consider frequencies in musical range (80 Hz - 2000 Hz)
        if (freq >= 80 && freq <= 2000) {
            const magnitude = Math.sqrt(fft[i].real * fft[i].real + fft[i].imag * fft[i].imag);

            // Convert frequency to MIDI note number
            const midiNote = 69 + 12 * Math.log2(freq / A4_FREQ);

            // Map to chroma (0-11)
            const chromaIndex = Math.round(midiNote) % 12;
            const normalizedChromaIndex = (chromaIndex + 12) % 12;

            chroma[normalizedChromaIndex] += magnitude;
        }
    }

    // Normalize chroma vector
    const maxChroma = Math.max(...chroma);
    if (maxChroma > 0) {
        return chroma.map(c => c / maxChroma);
    } else {
        return new Array(12).fill(0);
    }
};

// Utility functions for chroma analysis
export const getChromaStats = (chromaFeatures) => {
    if (!chromaFeatures || chromaFeatures.length === 0) return null;

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const avgChroma = new Array(12).fill(0);

    // Calculate average chroma
    for (const frame of chromaFeatures) {
        for (let i = 0; i < 12; i++) {
            avgChroma[i] += frame[i];
        }
    }

    for (let i = 0; i < 12; i++) {
        avgChroma[i] /= chromaFeatures.length;
    }

    // Find dominant note
    const dominantNoteIndex = avgChroma.indexOf(Math.max(...avgChroma));

    return {
        averageChroma: avgChroma,
        dominantNote: noteNames[dominantNoteIndex],
        dominantNoteIndex,
        dominantNoteStrength: avgChroma[dominantNoteIndex]
    };
};

export const detectKeyChanges = (chromaFeatures, windowSize = 8) => {
    if (chromaFeatures.length < windowSize * 2) return [];

    const keyChanges = [];

    for (let i = windowSize; i < chromaFeatures.length - windowSize; i++) {
        const beforeWindow = chromaFeatures.slice(i - windowSize, i);
        const afterWindow = chromaFeatures.slice(i, i + windowSize);

        const beforeAvg = calculateAverageChroma(beforeWindow);
        const afterAvg = calculateAverageChroma(afterWindow);

        const correlation = calculateChromaCorrelation(beforeAvg, afterAvg);

        // Low correlation indicates a key change
        if (correlation < 0.7) {
            keyChanges.push({
                frame: i,
                correlation,
                beforeKey: getDominantNote(beforeAvg),
                afterKey: getDominantNote(afterAvg)
            });
        }
    }

    return keyChanges;
};

const calculateAverageChroma = (chromaFrames) => {
    const avg = new Array(12).fill(0);
    for (const frame of chromaFrames) {
        for (let i = 0; i < 12; i++) {
            avg[i] += frame[i];
        }
    }
    return avg.map(v => v / chromaFrames.length);
};

const calculateChromaCorrelation = (chroma1, chroma2) => {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < 12; i++) {
        dotProduct += chroma1[i] * chroma2[i];
        norm1 += chroma1[i] * chroma1[i];
        norm2 += chroma2[i] * chroma2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};

const getDominantNote = (chroma) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const maxIndex = chroma.indexOf(Math.max(...chroma));
    return noteNames[maxIndex];
};