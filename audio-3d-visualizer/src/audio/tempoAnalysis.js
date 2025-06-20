// audio/tempoAnalysis.js

export const analyzeTempo = async (audioBuffer) => {
    console.log('Starting tempo analysis...');

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const hopSize = Math.floor(windowSize / 4);

    // Calculate onset detection function
    const onsetFunction = calculateOnsetDetectionFunction(channelData, sampleRate, windowSize, hopSize);

    // Detect beats using onset function
    const beats = detectBeatsFromOnsets(onsetFunction, sampleRate, hopSize);

    // Calculate tempo using multiple methods
    const tempoAnalysis = calculateTempoAnalysis(beats, audioBuffer.duration);

    // Analyze tempo variations over time
    const tempoEvolution = analyzeTempoEvolution(beats, audioBuffer.duration);

    // Calculate rhythm patterns
    const rhythmPatterns = analyzeRhythmPatterns(beats);

    // Detect tempo changes
    const tempoChanges = detectTempoChanges(beats, audioBuffer.duration);

    const result = {
        type: 'tempo',
        beats: beats,
        tempoAnalysis: tempoAnalysis,
        tempoEvolution: tempoEvolution,
        rhythmPatterns: rhythmPatterns,
        tempoChanges: tempoChanges,
        onsetFunction: onsetFunction,
        sampleRate,
        duration: audioBuffer.duration,
        windowSize,
        hopSize
    };

    console.log('Tempo analysis completed:', {
        beatsDetected: beats.length,
        mainTempo: tempoAnalysis.mainTempo,
        tempoChanges: tempoChanges.length,
        duration: result.duration
    });

    return result;
};

const calculateOnsetDetectionFunction = (channelData, sampleRate, windowSize, hopSize) => {
    const onsetFunction = [];
    const fftSize = 1024;
    let previousSpectrum = null;

    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
        const window = channelData.slice(i, i + fftSize);

        // Apply window function
        const windowedData = window.map((sample, idx) =>
            sample * 0.5 * (1 - Math.cos(2 * Math.PI * idx / (fftSize - 1)))
        );

        // Calculate spectrum
        const spectrum = calculateMagnitudeSpectrum(windowedData);

        let onsetStrength = 0;

        if (previousSpectrum) {
            // Spectral flux: sum of positive differences
            for (let j = 0; j < spectrum.length; j++) {
                const diff = spectrum[j] - previousSpectrum[j];
                onsetStrength += Math.max(0, diff);
            }

            // High-frequency flux (more sensitive to percussive onsets)
            const hfStart = Math.floor(spectrum.length * 0.3);
            let hfFlux = 0;
            for (let j = hfStart; j < spectrum.length; j++) {
                const diff = spectrum[j] - previousSpectrum[j];
                hfFlux += Math.max(0, diff);
            }

            // Combine regular flux with high-frequency flux
            onsetStrength = onsetStrength * 0.7 + hfFlux * 0.3;
        }

        onsetFunction.push(onsetStrength);
        previousSpectrum = [...spectrum];
    }

    // Normalize onset function
    const maxOnset = Math.max(...onsetFunction);
    return maxOnset > 0 ? onsetFunction.map(val => val / maxOnset) : onsetFunction;
};

const calculateMagnitudeSpectrum = (windowedData) => {
    const N = windowedData.length;
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

const detectBeatsFromOnsets = (onsetFunction, sampleRate, hopSize) => {
    const beats = [];
    const adaptiveThreshold = 0.3;
    const minBeatInterval = Math.floor(0.2 * sampleRate / hopSize); // Minimum 200ms between beats

    // Adaptive thresholding
    const localWindow = Math.floor(sampleRate / hopSize); // 1 second window

    for (let i = localWindow; i < onsetFunction.length - localWindow; i++) {
        // Calculate local average
        let localSum = 0;
        for (let j = i - localWindow; j < i + localWindow; j++) {
            localSum += onsetFunction[j];
        }
        const localAverage = localSum / (2 * localWindow);

        const threshold = Math.max(adaptiveThreshold, localAverage * 1.5);

        // Peak detection
        if (onsetFunction[i] > threshold &&
            onsetFunction[i] > onsetFunction[i - 1] &&
            onsetFunction[i] > onsetFunction[i + 1]) {

            // Check minimum interval constraint
            if (beats.length === 0 || i - beats[beats.length - 1] > minBeatInterval) {
                beats.push(i);
            }
        }
    }

    // Convert to time stamps
    return beats.map(frameIndex => (frameIndex * hopSize) / sampleRate);
};

const calculateTempoAnalysis = (beats, duration) => {
    if (beats.length < 2) {
        return {
            mainTempo: 0,
            tempoConfidence: 0,
            possibleTempos: [],
            beatIntervals: []
        };
    }

    // Calculate all inter-beat intervals
    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    // Histogram of tempos
    const tempoHistogram = createTempoHistogram(intervals);

    // Find the most common tempo
    const mainTempo = findMainTempo(tempoHistogram);

    // Calculate confidence based on histogram peak strength
    const tempoConfidence = calculateTempoConfidence(tempoHistogram, mainTempo);

    // Find other possible tempos (half-time, double-time, etc.)
    const possibleTempos = findPossibleTempos(tempoHistogram, mainTempo);

    return {
        mainTempo,
        tempoConfidence,
        possibleTempos,
        beatIntervals: intervals,
        averageInterval: intervals.reduce((a, b) => a + b) / intervals.length,
        tempoVariability: calculateTempoVariability(intervals)
    };
};

const createTempoHistogram = (intervals) => {
    const tempoHistogram = new Map();

    intervals.forEach(interval => {
        // Convert interval to BPM
        const bpm = Math.round(60 / interval);

        // Consider BPM in reasonable range (60-200)
        if (bpm >= 60 && bpm <= 200) {
            tempoHistogram.set(bpm, (tempoHistogram.get(bpm) || 0) + 1);
        }

        // Also consider half-time and double-time
        const halfTime = Math.round(30 / interval);
        const doubleTime = Math.round(120 / interval);

        if (halfTime >= 60 && halfTime <= 200) {
            tempoHistogram.set(halfTime, (tempoHistogram.get(halfTime) || 0) + 0.5);
        }

        if (doubleTime >= 60 && doubleTime <= 200) {
            tempoHistogram.set(doubleTime, (tempoHistogram.get(doubleTime) || 0) + 0.5);
        }
    });

    return tempoHistogram;
};

const findMainTempo = (tempoHistogram) => {
    let maxCount = 0;
    let mainTempo = 0;

    for (const [tempo, count] of tempoHistogram) {
        if (count > maxCount) {
            maxCount = count;
            mainTempo = tempo;
        }
    }

    return mainTempo;
};

const calculateTempoConfidence = (tempoHistogram, mainTempo) => {
    const totalCounts = Array.from(tempoHistogram.values()).reduce((a, b) => a + b, 0);
    const mainTempoCount = tempoHistogram.get(mainTempo) || 0;

    return totalCounts > 0 ? mainTempoCount / totalCounts : 0;
};

const findPossibleTempos = (tempoHistogram, mainTempo) => {
    const possibleTempos = [];
    const threshold = (tempoHistogram.get(mainTempo) || 0) * 0.3;

    for (const [tempo, count] of tempoHistogram) {
        if (count >= threshold && tempo !== mainTempo) {
            possibleTempos.push({
                tempo,
                confidence: count / (tempoHistogram.get(mainTempo) || 1),
                relationship: classifyTempoRelationship(tempo, mainTempo)
            });
        }
    }

    return possibleTempos.sort((a, b) => b.confidence - a.confidence);
};

const classifyTempoRelationship = (tempo1, tempo2) => {
    const ratio = tempo1 / tempo2;

    if (Math.abs(ratio - 2) < 0.1) return 'double-time';
    if (Math.abs(ratio - 0.5) < 0.1) return 'half-time';
    if (Math.abs(ratio - 1.5) < 0.1) return 'triplet';
    if (Math.abs(ratio - 0.67) < 0.1) return 'triplet-reverse';
    if (Math.abs(ratio - 1) < 0.05) return 'same';

    return 'unrelated';
};

const calculateTempoVariability = (intervals) => {
    const mean = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - mean, 2), 0) / intervals.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
};

const analyzeTempoEvolution = (beats, duration) => {
    const segmentDuration = 10; // 10-second segments
    const numSegments = Math.ceil(duration / segmentDuration);
    const tempoEvolution = [];

    for (let i = 0; i < numSegments; i++) {
        const segmentStart = i * segmentDuration;
        const segmentEnd = (i + 1) * segmentDuration;

        // Get beats in this segment
        const segmentBeats = beats.filter(beat => beat >= segmentStart && beat < segmentEnd);

        if (segmentBeats.length >= 2) {
            // Calculate tempo for this segment
            const intervals = [];
            for (let j = 1; j < segmentBeats.length; j++) {
                intervals.push(segmentBeats[j] - segmentBeats[j - 1]);
            }

            const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
            const segmentTempo = 60 / avgInterval;

            tempoEvolution.push({
                startTime: segmentStart,
                endTime: segmentEnd,
                tempo: segmentTempo,
                beatCount: segmentBeats.length,
                confidence: Math.min(1, segmentBeats.length / 4) // More beats = higher confidence
            });
        } else {
            tempoEvolution.push({
                startTime: segmentStart,
                endTime: segmentEnd,
                tempo: 0,
                beatCount: segmentBeats.length,
                confidence: 0
            });
        }
    }

    return tempoEvolution;
};

const analyzeRhythmPatterns = (beats) => {
    if (beats.length < 4) return { patterns: [], complexity: 0 };

    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    // Quantize intervals to find patterns
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const quantizedIntervals = intervals.map(interval => {
        const ratio = interval / avgInterval;

        // Quantize to common rhythmic values
        if (ratio < 0.6) return 0.5; // Half beat
        if (ratio < 0.8) return 0.67; // Triplet
        if (ratio < 1.2) return 1; // Full beat
        if (ratio < 1.6) return 1.5; // Dotted beat
        if (ratio < 2.2) return 2; // Double beat
        return Math.round(ratio);
    });

    // Find repeating patterns
    const patterns = findRepeatingPatterns(quantizedIntervals);

    // Calculate rhythmic complexity
    const complexity = calculateRhythmicComplexity(quantizedIntervals);

    return {
        patterns,
        complexity,
        quantizedIntervals,
        averageInterval: avgInterval
    };
};

const findRepeatingPatterns = (intervals) => {
    const patterns = [];
    const patternCounts = new Map();

    // Look for patterns of length 2-8
    for (let patternLength = 2; patternLength <= Math.min(8, Math.floor(intervals.length / 2)); patternLength++) {
        for (let i = 0; i <= intervals.length - patternLength; i++) {
            const pattern = intervals.slice(i, i + patternLength);
            const patternKey = pattern.join(',');

            patternCounts.set(patternKey, (patternCounts.get(patternKey) || 0) + 1);
        }
    }

    // Filter for patterns that repeat at least twice
    for (const [patternKey, count] of patternCounts) {
        if (count >= 2) {
            const pattern = patternKey.split(',').map(Number);
            patterns.push({
                pattern,
                occurrences: count,
                length: pattern.length
            });
        }
    }

    return patterns.sort((a, b) => b.occurrences - a.occurrences);
};

const calculateRhythmicComplexity = (intervals) => {
    // Shannon entropy as measure of complexity
    const uniqueIntervals = [...new Set(intervals)];
    const totalIntervals = intervals.length;

    let entropy = 0;
    uniqueIntervals.forEach(interval => {
        const count = intervals.filter(i => i === interval).length;
        const probability = count / totalIntervals;
        entropy -= probability * Math.log2(probability);
    });

    // Normalize to 0-1 range
    const maxEntropy = Math.log2(uniqueIntervals.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
};

const detectTempoChanges = (beats, duration) => {
    const changes = [];
    const windowSize = 8; // Number of beats to analyze

    if (beats.length < windowSize * 2) return changes;

    for (let i = windowSize; i < beats.length - windowSize; i++) {
        // Calculate tempo before and after this point
        const beforeBeats = beats.slice(i - windowSize, i);
        const afterBeats = beats.slice(i, i + windowSize);

        const beforeTempo = calculateLocalTempo(beforeBeats);
        const afterTempo = calculateLocalTempo(afterBeats);

        const tempoChange = Math.abs(afterTempo - beforeTempo);
        const changeRatio = Math.max(beforeTempo, afterTempo) / Math.min(beforeTempo, afterTempo);

        // Detect significant tempo changes (>10 BPM or >15% change)
        if (tempoChange > 10 || changeRatio > 1.15) {
            changes.push({
                time: beats[i],
                beforeTempo,
                afterTempo,
                changeAmount: afterTempo - beforeTempo,
                changeRatio,
                significance: Math.min(tempoChange / 20, 1) // 0-1 scale
            });
        }
    }

    return changes;
};

const calculateLocalTempo = (beats) => {
    if (beats.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    return 60 / avgInterval;
};

// Utility functions for tempo analysis
export const getTempoProfile = (tempoData) => {
    if (!tempoData?.tempoAnalysis) return null;

    const { tempoAnalysis, rhythmPatterns, tempoChanges } = tempoData;

    let tempoCategory = 'unknown';
    const mainTempo = tempoAnalysis.mainTempo;

    if (mainTempo < 70) tempoCategory = 'slow';
    else if (mainTempo < 100) tempoCategory = 'moderate';
    else if (mainTempo < 140) tempoCategory = 'fast';
    else tempoCategory = 'very_fast';

    const stability = 1 - tempoAnalysis.tempoVariability;
    const rhythmicComplexity = rhythmPatterns.complexity;

    return {
        mainTempo: mainTempo,
        category: tempoCategory,
        stability: stability,
        confidence: tempoAnalysis.tempoConfidence,
        rhythmicComplexity: rhythmicComplexity,
        hasTempoChanges: tempoChanges.length > 0,
        changeCount: tempoChanges.length
    };
};

export const extractRhythmicFeatures = (tempoData) => {
    if (!tempoData?.beats) return null;

    const { beats, rhythmPatterns, tempoAnalysis } = tempoData;

    return {
        beatDensity: beats.length / tempoData.duration,
        mainTempo: tempoAnalysis.mainTempo,
        tempoStability: 1 - tempoAnalysis.tempoVariability,
        rhythmicRegularity: rhythmPatterns.patterns.length > 0 ? 1 - rhythmPatterns.complexity : 0,
        dominantPattern: rhythmPatterns.patterns[0] || null,
        syncopation: calculateSyncopation(tempoAnalysis.beatIntervals)
    };
};

const calculateSyncopation = (intervals) => {
    if (intervals.length < 2) return 0;

    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    let syncopationScore = 0;

    intervals.forEach(interval => {
        const deviation = Math.abs(interval - avgInterval) / avgInterval;
        syncopationScore += deviation;
    });

    return syncopationScore / intervals.length;
};