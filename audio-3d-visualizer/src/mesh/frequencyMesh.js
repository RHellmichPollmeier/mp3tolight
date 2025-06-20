// mesh/frequencyMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    addEndCaps,
    validateMeshData
} from './meshGenerator';

export const createFrequencyMesh = (analysisData, params) => {
    console.log('Creating frequency bands mesh...');

    if (!analysisData?.frequencyBands) {
        throw new Error('No frequency band data available for frequency mesh');
    }

    const { frequencyBands, bands } = analysisData;
    const {
        baseRadius,
        heightScale,
        segments,
        rings,
        bassWeight,
        midWeight,
        trebleWeight,
        amplitudeScale
    } = params;

    const dataStep = Math.max(1, Math.floor(frequencyBands.bass.length / rings));
    const actualRings = Math.floor(frequencyBands.bass.length / dataStep);

    const vertices = [];
    const indices = [];
    const colors = [];

    // Weight factors for different frequency bands
    const weights = {
        bass: bassWeight,
        lowMid: midWeight * 0.8,
        mid: midWeight,
        highMid: midWeight * 1.2,
        treble: trebleWeight
    };

    // Generate vertices with frequency band influence
    for (let i = 0; i < actualRings; i++) {
        const frameIndex = i * dataStep;
        const z = (i / (actualRings - 1) - 0.5) * heightScale;

        // Get frequency band values for this frame
        const bandValues = {
            bass: frequencyBands.bass[frameIndex] || 0,
            lowMid: frequencyBands.lowMid[frameIndex] || 0,
            mid: frequencyBands.mid[frameIndex] || 0,
            highMid: frequencyBands.highMid[frameIndex] || 0,
            treble: frequencyBands.treble[frameIndex] || 0
        };

        for (let j = 0; j < segments; j++) {
            const angle = (j / segments) * Math.PI * 2;

            // Calculate radius based on frequency bands and angular position
            const radius = calculateFrequencyRadius(
                angle,
                bandValues,
                weights,
                baseRadius,
                amplitudeScale,
                segments
            );

            // Add frequency-specific texture
            const texture = calculateFrequencyTexture(angle, bandValues, i, j);
            const finalRadius = radius + texture * baseRadius * 0.1;

            const x = finalRadius * Math.cos(angle);
            const y = finalRadius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on dominant frequency band
            const color = calculateFrequencyColor(angle, bandValues, segments);
            colors.push(color.r, color.g, color.b);
        }
    }

    // Generate face indices
    for (let i = 0; i < actualRings - 1; i++) {
        for (let j = 0; j < segments; j++) {
            const v1 = i * segments + j;
            const v2 = i * segments + (j + 1) % segments;
            const v3 = (i + 1) * segments + j;
            const v4 = (i + 1) * segments + (j + 1) % segments;

            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
        }
    }

    // Add frequency band separators
    const { separatorVertices, separatorColors, separatorIndices } =
        addFrequencySeparators(vertices, actualRings, segments, baseRadius, heightScale);

    const finalVertices = [...vertices, ...separatorVertices];
    const finalColors = [...colors, ...separatorColors];
    const finalIndices = [...indices, ...separatorIndices];

    // Add end caps
    const capsData = addEndCaps(finalVertices, finalColors, segments, actualRings, heightScale);
    const meshVertices = capsData.vertices;
    const meshColors = capsData.colors;
    const meshIndices = [...finalIndices, ...capsData.capIndices];

    // Validate mesh data
    validateMeshData(meshVertices, meshIndices, meshColors);

    // Create geometry and material
    const geometry = createBaseGeometry(meshVertices, meshIndices, meshColors);
    const material = createBaseMaterial({
        opacity: 0.8,
        transparent: true,
        metalness: 0.4,
        roughness: 0.6
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Frequency mesh created: ${meshVertices.length / 3} vertices, ${meshIndices.length / 3} faces`);

    return mesh;
};

const calculateFrequencyRadius = (angle, bandValues, weights, baseRadius, amplitudeScale, segments) => {
    // Divide circumference into frequency regions
    const regionSize = (Math.PI * 2) / 5; // 5 frequency bands
    const normalizedAngle = angle % (Math.PI * 2);

    let dominantBand = 'mid';
    let bandValue = bandValues.mid;

    // Determine which frequency region this angle belongs to
    if (normalizedAngle < regionSize) {
        dominantBand = 'bass';
        bandValue = bandValues.bass * weights.bass;
    } else if (normalizedAngle < regionSize * 2) {
        dominantBand = 'lowMid';
        bandValue = bandValues.lowMid * weights.lowMid;
    } else if (normalizedAngle < regionSize * 3) {
        dominantBand = 'mid';
        bandValue = bandValues.mid * weights.mid;
    } else if (normalizedAngle < regionSize * 4) {
        dominantBand = 'highMid';
        bandValue = bandValues.highMid * weights.highMid;
    } else {
        dominantBand = 'treble';
        bandValue = bandValues.treble * weights.treble;
    }

    // Smooth transitions between regions
    const regionPosition = (normalizedAngle % regionSize) / regionSize;
    const smoothing = Math.sin(regionPosition * Math.PI) * 0.2;

    const radiusMultiplier = 0.5 + bandValue * amplitudeScale + smoothing;
    return baseRadius * radiusMultiplier;
};

const calculateFrequencyTexture = (angle, bandValues, ringIndex, segmentIndex) => {
    // Create texture based on frequency content
    const bassTexture = Math.sin(angle * 2 + ringIndex * 0.1) * bandValues.bass * 0.3;
    const midTexture = Math.sin(angle * 4 + ringIndex * 0.2) * bandValues.mid * 0.2;
    const trebleTexture = Math.sin(angle * 8 + ringIndex * 0.3) * bandValues.treble * 0.1;

    return bassTexture + midTexture + trebleTexture;
};

const calculateFrequencyColor = (angle, bandValues, segments) => {
    const regionSize = (Math.PI * 2) / 5;
    const normalizedAngle = angle % (Math.PI * 2);

    let hue, saturation, lightness;

    if (normalizedAngle < regionSize) {
        // Bass region - Red/Orange
        hue = 0.0 + bandValues.bass * 0.1;
        saturation = 0.8;
        lightness = 0.3 + bandValues.bass * 0.5;
    } else if (normalizedAngle < regionSize * 2) {
        // Low-mid region - Orange/Yellow
        hue = 0.1 + bandValues.lowMid * 0.1;
        saturation = 0.7;
        lightness = 0.4 + bandValues.lowMid * 0.4;
    } else if (normalizedAngle < regionSize * 3) {
        // Mid region - Green
        hue = 0.3 + bandValues.mid * 0.1;
        saturation = 0.6;
        lightness = 0.4 + bandValues.mid * 0.4;
    } else if (normalizedAngle < regionSize * 4) {
        // High-mid region - Cyan
        hue = 0.5 + bandValues.highMid * 0.1;
        saturation = 0.7;
        lightness = 0.4 + bandValues.highMid * 0.4;
    } else {
        // Treble region - Blue/Purple
        hue = 0.7 + bandValues.treble * 0.1;
        saturation = 0.8;
        lightness = 0.3 + bandValues.treble * 0.5;
    }

    return new THREE.Color().setHSL(hue, saturation, lightness);
};

const addFrequencySeparators = (vertices, rings, segments, baseRadius, heightScale) => {
    const separatorVertices = [];
    const separatorColors = [];
    const separatorIndices = [];

    const numBands = 5;
    const regionSize = (Math.PI * 2) / numBands;

    // Add vertical separators between frequency regions
    for (let band = 0; band < numBands; band++) {
        const separatorAngle = band * regionSize;
        const separatorRadius = baseRadius * 1.2;

        const x = separatorRadius * Math.cos(separatorAngle);
        const y = separatorRadius * Math.sin(separatorAngle);

        // Create line from bottom to top
        separatorVertices.push(x, y, -heightScale / 2);
        separatorVertices.push(x, y, heightScale / 2);

        // Separator color
        const separatorColor = new THREE.Color(0.8, 0.8, 0.8);
        separatorColors.push(separatorColor.r, separatorColor.g, separatorColor.b);
        separatorColors.push(separatorColor.r, separatorColor.g, separatorColor.b);

        // Line indices
        const baseIndex = band * 2;
        separatorIndices.push(baseIndex, baseIndex + 1);
    }

    return {
        separatorVertices,
        separatorColors,
        separatorIndices
    };
};

// Alternative frequency visualization: Layered Rings
export const createFrequencyLayersMesh = (analysisData, params) => {
    console.log('Creating frequency layers mesh...');

    if (!analysisData?.frequencyBands) {
        throw new Error('No frequency band data available for layers mesh');
    }

    const { frequencyBands } = analysisData;
    const { baseRadius, heightScale, bassWeight, midWeight, trebleWeight } = params;

    const group = new THREE.Group();
    const bandNames = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];
    const radii = [0.6, 0.7, 0.8, 0.9, 1.0]; // Relative radii for each band
    const hues = [0.0, 0.1, 0.3, 0.5, 0.7]; // Colors for each band

    bandNames.forEach((bandName, index) => {
        const bandData = frequencyBands[bandName];
        if (!bandData || bandData.length === 0) return;

        const vertices = [];
        const colors = [];
        const indices = [];

        const layerRadius = baseRadius * radii[index];
        const segments = 32;
        const rings = Math.min(64, bandData.length);

        // Create ring layer for this frequency band
        for (let i = 0; i < rings; i++) {
            const value = bandData[Math.floor(i * bandData.length / rings)] || 0;
            const z = (i / (rings - 1) - 0.5) * heightScale;
            const currentRadius = layerRadius * (0.8 + value * 0.4);

            for (let j = 0; j < segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const x = currentRadius * Math.cos(angle);
                const y = currentRadius * Math.sin(angle);

                vertices.push(x, y, z);

                const color = new THREE.Color().setHSL(hues[index], 0.7, 0.4 + value * 0.4);
                colors.push(color.r, color.g, color.b);
            }
        }

        // Generate indices for this layer
        for (let i = 0; i < rings - 1; i++) {
            for (let j = 0; j < segments; j++) {
                const v1 = i * segments + j;
                const v2 = i * segments + (j + 1) % segments;
                const v3 = (i + 1) * segments + j;
                const v4 = (i + 1) * segments + (j + 1) % segments;

                indices.push(v1, v2, v3);
                indices.push(v2, v4, v3);
            }
        }

        const geometry = createBaseGeometry(vertices, indices, colors);
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const layerMesh = new THREE.Mesh(geometry, material);
        group.add(layerMesh);
    });

    console.log(`Frequency layers mesh created: ${bandNames.length} layers`);

    return group;
};

// Frequency Spectrum Visualization
export const createFrequencySpectrumMesh = (analysisData, params) => {
    console.log('Creating frequency spectrum mesh...');

    if (!analysisData?.frequencyBands) {
        throw new Error('No frequency band data available for spectrum mesh');
    }

    const { frequencyBands, balance } = analysisData;
    const { baseRadius, heightScale } = params;

    // Create spectrum bars
    const vertices = [];
    const colors = [];
    const indices = [];

    const bandNames = ['bass', 'lowMid', 'mid', 'highMid', 'treble'];
    const barWidth = (Math.PI * 2) / bandNames.length;

    bandNames.forEach((bandName, bandIndex) => {
        const bandData = frequencyBands[bandName];
        const averageEnergy = balance?.absolute[bandName] || 0;

        // Create bar for this frequency band
        const startAngle = bandIndex * barWidth;
        const endAngle = (bandIndex + 1) * barWidth;
        const barHeight = heightScale * averageEnergy * 2;

        // Bar vertices (rectangular bar in cylindrical coordinates)
        const innerRadius = baseRadius * 0.8;
        const outerRadius = baseRadius * 1.2;

        const segments = 8;
        for (let s = 0; s < segments; s++) {
            const angle = startAngle + (s / (segments - 1)) * (endAngle - startAngle);

            // Bottom vertices
            vertices.push(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle), -barHeight / 2);
            vertices.push(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle), -barHeight / 2);

            // Top vertices
            vertices.push(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle), barHeight / 2);
            vertices.push(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle), barHeight / 2);

            // Colors
            const hue = bandIndex / bandNames.length;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.5 + averageEnergy * 0.3);

            for (let i = 0; i < 4; i++) {
                colors.push(color.r, color.g, color.b);
            }
        }

        // Generate indices for bar faces
        const baseVertex = bandIndex * segments * 4;
        for (let s = 0; s < segments - 1; s++) {
            const v1 = baseVertex + s * 4;
            const v2 = baseVertex + (s + 1) * 4;

            // Bottom face
            indices.push(v1, v1 + 1, v2);
            indices.push(v1 + 1, v2 + 1, v2);

            // Top face
            indices.push(v1 + 2, v2 + 2, v1 + 3);
            indices.push(v1 + 3, v2 + 2, v2 + 3);

            // Inner side
            indices.push(v1, v2, v1 + 2);
            indices.push(v2, v2 + 2, v1 + 2);

            // Outer side
            indices.push(v1 + 1, v1 + 3, v2 + 1);
            indices.push(v2 + 1, v1 + 3, v2 + 3);
        }
    });

    const geometry = createBaseGeometry(vertices, indices, colors);
    const material = createBaseMaterial({
        opacity: 0.8,
        transparent: true,
        metalness: 0.3,
        roughness: 0.5
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Frequency spectrum mesh created: ${vertices.length / 3} vertices`);

    return mesh;
};