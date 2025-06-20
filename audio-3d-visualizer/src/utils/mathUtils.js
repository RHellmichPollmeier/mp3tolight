// utils/mathUtils.js
import * as THREE from 'three';

// ========================================
// VECTOR OPERATIONS
// ========================================

export const normalizeVector = (x, y, z) => {
    const length = Math.sqrt(x * x + y * y + z * z);
    return length > 0 ? { x: x / length, y: y / length, z: z / length } : { x: 0, y: 1, z: 0 };
};

export const crossProduct = (a, b) => {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
};

export const dotProduct = (a, b) => {
    return a.x * b.x + a.y * b.y + a.z * b.z;
};

export const vectorDistance = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// ========================================
// INTERPOLATION FUNCTIONS
// ========================================

export const lerp = (a, b, t) => {
    return a + (b - a) * t;
};

export const smoothstep = (edge0, edge1, x) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

export const smootherstep = (edge0, edge1, x) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * t * (t * (t * 6 - 15) + 10);
};

export const bilinearInterpolation = (v00, v10, v01, v11, tx, ty) => {
    const v0 = lerp(v00, v10, tx);
    const v1 = lerp(v01, v11, tx);
    return lerp(v0, v1, ty);
};

// ========================================
// NOISE FUNCTIONS
// ========================================

// Simple 2D noise function (Perlin-like)
export const noise2D = (x, y) => {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1; // Range: -1 to 1
};

// Fractal noise (sum of octaves)
export const fractalNoise2D = (x, y, octaves = 4, persistence = 0.5, scale = 1) => {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        value += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    return value / maxValue;
};

// 3D noise function
export const noise3D = (x, y, z) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
};

// ========================================
// CURVE FUNCTIONS
// ========================================

// Bezier curve interpolation
export const bezierCurve = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const point = {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
        z: uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z
    };

    return point;
};

// Catmull-Rom spline
export const catmullRomSpline = (p0, p1, p2, p3, t) => {
    const tt = t * t;
    const ttt = tt * t;

    return {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * tt + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * ttt)
    };
};

// ========================================
// AUDIO-SPECIFIC MATH
// ========================================

// Convert linear amplitude to decibels
export const amplitudeToDb = (amplitude) => {
    return amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
};

// Convert decibels to linear amplitude
export const dbToAmplitude = (db) => {
    return Math.pow(10, db / 20);
};

// Frequency to musical note conversion
export const frequencyToNote = (frequency) => {
    const A4 = 440;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    const midiNote = 69 + 12 * Math.log2(frequency / A4);
    const noteIndex = Math.round(midiNote) % 12;
    const octave = Math.floor(Math.round(midiNote) / 12) - 1;
    
    return {
        note: noteNames[noteIndex],
        octave: octave,
        midi: Math.round(midiNote),
        cents: (midiNote - Math.round(midiNote)) * 100
    };
};

// Mel scale conversion
export const hzToMel = (hz) => {
    return 2595 * Math.log10(1 + hz / 700);
};

export const melToHz = (mel) => {
    return 700 * (Math.pow(10, mel / 2595) - 1);
};

// Bark scale conversion
export const hzToBark = (hz) => {
    return 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan(Math.pow(hz / 7500, 2));
};

// ========================================
// GEOMETRY HELPERS
// ========================================

// Calculate surface area of triangle
export const triangleArea = (v1, v2, v3) => {
    const a = vectorDistance(v1, v2);
    const b = vectorDistance(v2, v3);
    const c = vectorDistance(v3, v1);
    const s = (a + b + c) / 2;
    return Math.sqrt(s * (s - a) * (s - b) * (s - c));
};

// Calculate normal from three vertices
export const calculateNormal = (v1, v2, v3) => {
    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
    const normal = crossProduct(edge1, edge2);
    return normalizeVector(normal.x, normal.y, normal.z);
};

// UV mapping helpers
export const sphericalUV = (position, radius) => {
    const phi = Math.atan2(position.z, position.x);
    const theta = Math.acos(position.y / radius);
    
    return {
        u: (phi + Math.PI) / (2 * Math.PI),
        v: theta / Math.PI
    };
};

export const cylindricalUV = (position, radius, height) => {
    const phi = Math.atan2(position.z, position.x);
    const u = (phi + Math.PI) / (2 * Math.PI);
    const v = (position.y + height / 2) / height;
    
    return { u, v };
};

// ========================================
// SIGNAL PROCESSING
// ========================================

// Window functions
export const hannWindow = (n, N) => {
    return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
};

export const hammingWindow = (n, N) => {
    return 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
};

export const blackmanWindow = (n, N) => {
    return 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1));
};

// Peak detection
export const findPeaks = (data, threshold = 0.5, minDistance = 1) => {
    const peaks = [];
    
    for (let i = minDistance; i < data.length - minDistance; i++) {
        let isPeak = data[i] > threshold;
        
        // Check if it's a local maximum
        for (let j = i - minDistance; j <= i + minDistance; j++) {
            if (j !== i && data[j] >= data[i]) {
                isPeak = false;
                break;
            }
        }
        
        if (isPeak) {
            peaks.push({
                index: i,
                value: data[i],
                prominence: calculateProminence(data, i)
            });
        }
    }
    
    return peaks.sort((a, b) => b.value - a.value);
};

const calculateProminence = (data, peakIndex) => {
    const peakValue = data[peakIndex];
    let leftMin = peakValue;
    let rightMin = peakValue;
    
    // Find minimum to the left
    for (let i = peakIndex - 1; i >= 0; i--) {
        leftMin = Math.min(leftMin, data[i]);
    }
    
    // Find minimum to the right
    for (let i = peakIndex + 1; i < data.length; i++) {
        rightMin = Math.min(rightMin, data[i]);
    }
    
    return peakValue - Math.max(leftMin, rightMin);
};

// Statistical functions
export const calculateMean = (data) => {
    return data.reduce((sum, value) => sum + value, 0) / data.length;
};

export const calculateStdDev = (data) => {
    const mean = calculateMean(data);
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
};

export const calculateMedian = (data) => {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
};

// ========================================
// COLOR UTILITIES
// ========================================

// HSL to RGB conversion
export const hslToRgb = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    
    let r, g, b;
    
    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }
    
    return {
        r: r + m,
        g: g + m,
        b: b + m
    };
};

// Audio-reactive color palettes
export const audioColorPalette = (audioValue, paletteType = 'spectrum') => {
    const normalizedValue = Math.max(0, Math.min(1, audioValue));
    
    switch (paletteType) {
        case 'spectrum':
            // Rainbow spectrum from red to violet
            const hue = (1 - normalizedValue) * 280; // 280 degrees for violet
            return hslToRgb(hue, 0.8, 0.5);
            
        case 'fire':
            // Fire colors from black through red, orange, yellow to white
            if (normalizedValue < 0.25) {
                const t = normalizedValue / 0.25;
                return { r: t, g: 0, b: 0 };
            } else if (normalizedValue < 0.5) {
                const t = (normalizedValue - 0.25) / 0.25;
                return { r: 1, g: t * 0.5, b: 0 };
            } else if (normalizedValue < 0.75) {
                const t = (normalizedValue - 0.5) / 0.25;
                return { r: 1, g: 0.5 + t * 0.5, b: 0 };
            } else {
                const t = (normalizedValue - 0.75) / 0.25;
                return { r: 1, g: 1, b: t };
            }
            
        case 'ocean':
            // Ocean colors from deep blue to cyan to white
            const oceanHue = 200 + normalizedValue * 40; // Blue to cyan
            const saturation = 1 - normalizedValue * 0.3;
            const lightness = 0.2 + normalizedValue * 0.6;
            return hslToRgb(oceanHue, saturation, lightness);
            
        case 'viridis':
            // Viridis colormap approximation
            return viridisColor(normalizedValue);
            
        default:
            return { r: normalizedValue, g: normalizedValue, b: normalizedValue };
    }
};

const viridisColor = (t) => {
    // Viridis colormap approximation
    const r = 0.267 + t * (0.993 - 0.267) - t * t * 0.4;
    const g = 0.005 + t * (0.906 - 0.005) + t * t * 0.1;
    const b = 0.329 + t * (0.144 - 0.329) - t * t * 0.6;
    
    return {
        r: Math.max(0, Math.min(1, r)),
        g: Math.max(0, Math.min(1, g)),
        b: Math.max(0, Math.min(1, b))
    };
};

// ========================================
// PERFORMANCE HELPERS
// ========================================

// Optimized distance calculation (without sqrt for comparisons)
export const distanceSquared = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
};

// Fast trigonometry approximations
export const fastSin = (x) => {
    // Normalize to [-π, π]
    x = ((x + Math.PI) % (2 * Math.PI)) - Math.PI;
    
    // Taylor series approximation
    const x2 = x * x;
    return x * (1 - x2 / 6 + x2 * x2 / 120);
};

export const fastCos = (x) => {
    return fastSin(x + Math.PI / 2);
};

// Memoization helper for expensive calculations
export const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};