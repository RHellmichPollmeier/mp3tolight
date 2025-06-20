// mesh/spectralMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    addEndCaps,
    validateMeshData
} from './meshGenerator';

export const createSpectralMesh = (analysisData, params) => {
    console.log('Creating spectral mesh...');

    if (!analysisData?.spectralFeatures) {
        throw new Error('No spectral features available for spectral mesh');
    }

    const { spectralFeatures } = analysisData;
    const {
        baseRadius,
        heightScale,
        segments,
        rings,
        brightnessScale,
        amplitudeScale
    } = params;

    const dataStep = Math.max(1, Math.floor(spectralFeatures.centroid.length / rings));
    const actualRings = Math.floor(spectralFeatures.centroid.length / dataStep);

    const vertices = [];
    const indices = [];
    const colors = [];

    // Normalize spectral features for mesh generation
    const normalizedFeatures = normalizeSpectralFeatures(spectralFeatures);

    // Generate vertices with spectral influence
    for (let i = 0; i < actualRings; i++) {
        const frameIndex = i * dataStep;
        const z = (i / (actualRings - 1) - 0.5) * heightScale;

        // Get spectral features for this frame
        const features = {
            centroid: normalizedFeatures.centroid[frameIndex] || 0,
            bandwidth: normalizedFeatures.bandwidth[frameIndex] || 0,
            rolloff: normalizedFeatures.rolloff[frameIndex] || 0,
            flatness: normalizedFeatures.flatness[frameIndex] || 0,
            flux: normalizedFeatures.flux[frameIndex] || 0,
            energy: normalizedFeatures.energy[frameIndex] || 0
        };

        for (let j = 0; j < segments; j++) {
            const angle = (j / segments) * Math.PI * 2;

            // Calculate radius based on spectral features
            const radius = calculateSpectralRadius(
                angle,
                features,
                baseRadius,
                brightnessScale,
                amplitudeScale,
                segments
            );

            // Add spectral texture
            const texture = calculateSpectralTexture(angle, features, i, j);
            const finalRadius = radius + texture * baseRadius * 0.15;

            const x = finalRadius * Math.cos(angle);
            const y = finalRadius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on spectral characteristics
            const color = calculateSpectralColor(features, angle);
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

    // Add spectral feature decorations
    const { decorativeVertices, decorativeColors, decorativeIndices } =
        addSpectralDecorations(spectralFeatures, actualRings, heightScale, baseRadius);

    const finalVertices = [...vertices, ...decorativeVertices];
    const finalColors = [...colors, ...decorativeColors];
    const finalIndices = [...indices, ...decorativeIndices];

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
        opacity: 0.85,
        transparent: true,
        metalness: 0.6,
        roughness: 0.2,
        emissive: new THREE.Color(0x001122),
        emissiveIntensity: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Spectral mesh created: ${meshVertices.length / 3} vertices, ${meshIndices.length / 3} faces`);

    return mesh;
};

const normalizeSpectralFeatures = (spectralFeatures) => {
    const normalized = {};

    Object.keys(spectralFeatures).forEach(feature => {
        if (feature === 'timeStamps') return;

        const data = spectralFeatures[feature];
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min;

        normalized[feature] = range > 0
            ? data.map(value => (value - min) / range)
            : data.map(() => 0);
    });

    return normalized;
};

const calculateSpectralRadius = (angle, features, baseRadius, brightnessScale, amplitudeScale, segments) => {
    // Base radius influenced by spectral energy
    let radius = baseRadius * (0.4 + features.energy * amplitudeScale);

    // Centroid (brightness) affects angular variation
    const brightnessEffect = Math.sin(angle * 4 + features.centroid * Math.PI * 2) *
        features.centroid * brightnessScale * 0.3;
    radius += brightnessEffect * baseRadius;

    // Bandwidth affects overall size variation
    const bandwidthEffect = features.bandwidth * 0.2;
    radius *= (1 + bandwidthEffect);

    // Rolloff creates asymmetric shapes
    const rolloffAngle = features.rolloff * Math.PI * 2;
    const rolloffEffect = Math.cos(angle - rolloffAngle) * features.rolloff * 0.15;
    radius += rolloffEffect * baseRadius;

    // Flatness creates noise-like variations
    const flatnessNoise = (Math.random() - 0.5) * features.flatness * 0.1;
    radius += flatnessNoise * baseRadius;

    return Math.max(radius, baseRadius * 0.2); // Ensure minimum radius
};

const calculateSpectralTexture = (angle, features, ringIndex, segmentIndex) => {
    // Flux creates temporal texture
    const fluxTexture = Math.sin(ringIndex * 0.5) * features.flux * 0.2;

    // Centroid creates angular texture
    const centroidTexture = Math.sin(angle * 8 + features.centroid * 10) * 0.1;

    // Bandwidth creates smooth variations
    const bandwidthTexture = Math.cos(angle * 3 + ringIndex * 0.2) * features.bandwidth * 0.15;

    // Flatness adds noise
    const flatnessTexture = (Math.random() - 0.5) * features.flatness * 0.05;

    return fluxTexture + centroidTexture + bandwidthTexture + flatnessTexture;
};

const calculateSpectralColor = (features, angle) => {
    // Hue based on spectral centroid (brightness)
    let hue = 0.6 + features.centroid * 0.3; // Blue to cyan range

    // Adjust hue based on rolloff
    hue += features.rolloff * 0.1;

    // Saturation based on bandwidth (spectral spread)
    const saturation = 0.5 + features.bandwidth * 0.4;

    // Lightness based on energy and flatness
    let lightness = 0.3 + features.energy * 0.5;

    // Flatness reduces saturation (more noise-like = less colorful)
    const finalSaturation = saturation * (1 - features.flatness * 0.3);

    // Flux affects lightness variation
    lightness += Math.sin(angle * 6) * features.flux * 0.1;

    return new THREE.Color().setHSL(hue, finalSaturation, lightness);
};

const addSpectralDecorations = (spectralFeatures, rings, heightScale, baseRadius) => {
    const decorativeVertices = [];
    const decorativeColors = [];
    const decorativeIndices = [];

    // Find frames with high spectral flux (onset-like events)
    const fluxThreshold = Math.max(...spectralFeatures.flux) * 0.7;
    const highFluxFrames = [];

    spectralFeatures.flux.forEach((flux, index) => {
        if (flux > fluxThreshold) {
            highFluxFrames.push({
                index,
                flux,
                time: spectralFeatures.timeStamps[index]
            });
        }
    });

    // Add flux spikes
    highFluxFrames.forEach((frame, frameIdx) => {
        const z = ((frame.index / spectralFeatures.flux.length) - 0.5) * heightScale;
        const spikeRadius = baseRadius * 1.3;
        const spikeHeight = frame.flux * 0.5;

        // Create spike vertices
        const segments = 8;
        const baseVertexIndex = decorativeVertices.length / 3;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;

            // Base of spike
            decorativeVertices.push(
                spikeRadius * Math.cos(angle),
                spikeRadius * Math.sin(angle),
                z - 0.05
            );

            // Tip of spike
            decorativeVertices.push(
                (spikeRadius + spikeHeight) * Math.cos(angle),
                (spikeRadius + spikeHeight) * Math.sin(angle),
                z
            );

            // Spike colors (bright for flux events)
            const spikeColor = new THREE.Color().setHSL(0.1, 0.9, 0.8);
            decorativeColors.push(spikeColor.r, spikeColor.g, spikeColor.b);
            decorativeColors.push(spikeColor.r, spikeColor.g, spikeColor.b);
        }

        // Create spike triangles
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const base1 = baseVertexIndex + i * 2;
            const tip1 = baseVertexIndex + i * 2 + 1;
            const base2 = baseVertexIndex + next * 2;
            const tip2 = baseVertexIndex + next * 2 + 1;

            // Two triangles per spike face
            decorativeIndices.push(base1, base2, tip1);
            decorativeIndices.push(base2, tip2, tip1);
        }
    });

    return {
        decorativeVertices,
        decorativeColors,
        decorativeIndices
    };
};

// Alternative spectral visualization: Brightness Waves
export const createSpectralWaveMesh = (analysisData, params) => {
    console.log('Creating spectral wave mesh...');

    if (!analysisData?.spectralFeatures) {
        throw new Error('No spectral features available for wave mesh');
    }

    const { spectralFeatures } = analysisData;
    const { baseRadius, heightScale, brightnessScale } = params;

    const vertices = [];
    const colors = [];
    const indices = [];

    const waveResolution = 64;
    const timeResolution = Math.min(128, spectralFeatures.centroid.length);

    // Create wave surface based on spectral centroid
    for (let t = 0; t < timeResolution; t++) {
        const frameIndex = Math.floor(t * spectralFeatures.centroid.length / timeResolution);
        const centroid = spectralFeatures.centroid[frameIndex] || 0;
        const bandwidth = spectralFeatures.bandwidth[frameIndex] || 0;
        const z = (t / (timeResolution - 1) - 0.5) * heightScale;

        for (let w = 0; w < waveResolution; w++) {
            const angle = (w / waveResolution) * Math.PI * 2;

            // Wave amplitude based on spectral centroid
            const waveAmplitude = centroid * brightnessScale * 0.5;
            const radius = baseRadius + Math.sin(angle * 3 + t * 0.1) * waveAmplitude;

            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on brightness
            const hue = 0.6 + centroid * 0.3;
            const saturation = 0.7 + bandwidth * 0.3;
            const lightness = 0.4 + centroid * 0.5;

            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            colors.push(color.r, color.g, color.b);
        }
    }

    // Generate wave surface indices
    for (let t = 0; t < timeResolution - 1; t++) {
        for (let w = 0; w < waveResolution; w++) {
            const v1 = t * waveResolution + w;
            const v2 = t * waveResolution + (w + 1) % waveResolution;
            const v3 = (t + 1) * waveResolution + w;
            const v4 = (t + 1) * waveResolution + (w + 1) % waveResolution;

            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
        }
    }

    const geometry = createBaseGeometry(vertices, indices, colors);
    const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        shininess: 100
    });

    return new THREE.Mesh(geometry, material);
};

// Spectral Complexity Visualization
export const createSpectralComplexityMesh = (analysisData, params) => {
    console.log('Creating spectral complexity mesh...');

    if (!analysisData?.spectralFeatures) {
        throw new Error('No spectral features available for complexity mesh');
    }

    const { spectralFeatures } = analysisData;
    const { baseRadius, heightScale } = params;

    const group = new THREE.Group();

    // Create layers for different spectral features
    const features = ['centroid', 'bandwidth', 'rolloff', 'flatness'];
    const layerRadii = [0.6, 0.7, 0.8, 0.9];
    const layerHues = [0.6, 0.3, 0.1, 0.8];

    features.forEach((featureName, layerIndex) => {
        if (!spectralFeatures[featureName]) return;

        const featureData = spectralFeatures[featureName];
        const vertices = [];
        const colors = [];
        const indices = [];

        const segments = 32;
        const rings = Math.min(64, featureData.length);
        const layerRadius = baseRadius * layerRadii[layerIndex];

        for (let i = 0; i < rings; i++) {
            const value = featureData[Math.floor(i * featureData.length / rings)];
            const normalizedValue = Math.max(0, Math.min(1, value));
            const z = (i / (rings - 1) - 0.5) * heightScale;

            for (let j = 0; j < segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const radius = layerRadius * (0.7 + normalizedValue * 0.5);

                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);

                vertices.push(x, y, z);

                const hue = layerHues[layerIndex];
                const saturation = 0.6 + normalizedValue * 0.3;
                const lightness = 0.3 + normalizedValue * 0.5;

                const color = new THREE.Color().setHSL(hue, saturation, lightness);
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
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        const layerMesh = new THREE.Mesh(geometry, material);
        group.add(layerMesh);
    });

    console.log(`Spectral complexity mesh created: ${features.length} layers`);

    return group;
};