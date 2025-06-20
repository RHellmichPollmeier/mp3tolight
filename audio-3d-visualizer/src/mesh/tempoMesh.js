// mesh/tempoMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    addEndCaps,
    validateMeshData
} from './meshGenerator';

export const createTempoMesh = (analysisData, params) => {
    console.log('Creating tempo mesh...');

    if (!analysisData?.beats || !analysisData?.tempoAnalysis) {
        throw new Error('No tempo data available for tempo mesh');
    }

    const { beats, tempoAnalysis, tempoEvolution, tempoChanges } = analysisData;
    const {
        baseRadius,
        heightScale,
        segments,
        rings,
        tempoSpiralFactor,
        amplitudeScale
    } = params;

    const { mainTempo } = tempoAnalysis;
    const vertices = [];
    const indices = [];
    const colors = [];

    // Create spiral based on tempo
    const spiralTurns = Math.max(2, mainTempo / 60); // More turns for faster tempo
    const timeStep = analysisData.duration / rings;

    // Generate vertices with tempo-influenced spiral
    for (let i = 0; i < rings; i++) {
        const currentTime = i * timeStep;
        const progress = i / (rings - 1);
        const z = (progress - 0.5) * heightScale;

        // Spiral angle based on tempo
        const spiralAngle = progress * spiralTurns * Math.PI * 2 * tempoSpiralFactor;

        // Get tempo at this time point
        const localTempo = getTempoAtTime(currentTime, tempoEvolution, mainTempo);
        const tempoVariation = getTempoVariation(currentTime, tempoChanges);

        for (let j = 0; j < segments; j++) {
            const segmentAngle = (j / segments) * Math.PI * 2;
            const totalAngle = segmentAngle + spiralAngle;

            // Radius influenced by tempo and beat proximity
            const beatInfluence = getBeatInfluence(currentTime, beats);
            const tempoRadius = calculateTempoRadius(
                localTempo,
                mainTempo,
                beatInfluence,
                baseRadius,
                amplitudeScale
            );

            // Add tempo texture
            const tempoTexture = calculateTempoTexture(
                totalAngle,
                currentTime,
                localTempo,
                mainTempo,
                i
            );

            const finalRadius = tempoRadius + tempoTexture * baseRadius * 0.2;

            const x = finalRadius * Math.cos(totalAngle);
            const y = finalRadius * Math.sin(totalAngle);

            vertices.push(x, y, z);

            // Color based on tempo characteristics
            const color = calculateTempoColor(localTempo, mainTempo, tempoVariation, beatInfluence);
            colors.push(color.r, color.g, color.b);
        }
    }

    // Generate face indices
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

    // Add tempo change markers
    const { markerVertices, markerColors, markerIndices } =
        addTempoChangeMarkers(tempoChanges, analysisData.duration, heightScale, baseRadius);

    const finalVertices = [...vertices, ...markerVertices];
    const finalColors = [...colors, ...markerColors];
    const finalIndices = [...indices, ...markerIndices];

    // Add end caps
    const capsData = addEndCaps(finalVertices, finalColors, segments, rings, heightScale);
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
        metalness: 0.3,
        roughness: 0.7,
        emissive: new THREE.Color(0x111100),
        emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Tempo mesh created: ${meshVertices.length / 3} vertices, ${meshIndices.length / 3} faces`);

    return mesh;
};

const getTempoAtTime = (currentTime, tempoEvolution, mainTempo) => {
    if (!tempoEvolution || tempoEvolution.length === 0) return mainTempo;

    // Find the tempo segment for this time
    for (const segment of tempoEvolution) {
        if (currentTime >= segment.startTime && currentTime < segment.endTime) {
            return segment.tempo || mainTempo;
        }
    }

    return mainTempo;
};

const getTempoVariation = (currentTime, tempoChanges) => {
    if (!tempoChanges || tempoChanges.length === 0) return 0;

    // Find the nearest tempo change
    let nearestChange = null;
    let minDistance = Infinity;

    for (const change of tempoChanges) {
        const distance = Math.abs(change.time - currentTime);
        if (distance < minDistance) {
            minDistance = distance;
            nearestChange = change;
        }
    }

    // Return variation strength based on proximity to tempo change
    if (nearestChange && minDistance < 2.0) { // Within 2 seconds
        const proximity = 1 - (minDistance / 2.0);
        return nearestChange.significance * proximity;
    }

    return 0;
};

const getBeatInfluence = (currentTime, beats) => {
    // Find influence of nearby beats
    let influence = 0;
    const influenceRange = 0.2; // 200ms range

    for (const beatTime of beats) {
        const distance = Math.abs(beatTime - currentTime);
        if (distance < influenceRange) {
            influence += Math.exp(-distance * 10) * 0.5;
        }
    }

    return Math.min(influence, 1); // Cap at 1
};

const calculateTempoRadius = (localTempo, mainTempo, beatInfluence, baseRadius, amplitudeScale) => {
    // Base radius influenced by tempo relative to main tempo
    const tempoRatio = localTempo / Math.max(mainTempo, 1);
    const tempoRadius = baseRadius * (0.6 + tempoRatio * 0.4 * amplitudeScale);

    // Add beat expansion
    const beatExpansion = beatInfluence * baseRadius * 0.3;

    return tempoRadius + beatExpansion;
};

const calculateTempoTexture = (angle, time, localTempo, mainTempo, ringIndex) => {
    if (localTempo === 0) return 0;

    // Create rhythmic texture based on local tempo
    const beatFrequency = localTempo / 60; // beats per second
    const rhythmPhase = time * beatFrequency * Math.PI * 2;

    // Multiple rhythm subdivisions
    const quarterNote = Math.sin(rhythmPhase) * 0.3;
    const eighthNote = Math.sin(rhythmPhase * 2) * 0.2;
    const sixteenthNote = Math.sin(rhythmPhase * 4) * 0.1;

    // Angular variation
    const angularTexture = Math.sin(angle * 6 + ringIndex * 0.1) * 0.15;

    // Tempo variation texture
    const tempoVariationTexture = Math.sin(angle * 3 + time * 2) *
        Math.abs(localTempo - mainTempo) / Math.max(mainTempo, 1) * 0.2;

    return quarterNote + eighthNote + sixteenthNote + angularTexture + tempoVariationTexture;
};

const calculateTempoColor = (localTempo, mainTempo, tempoVariation, beatInfluence) => {
    // Hue based on tempo speed
    let hue;
    if (localTempo < 70) hue = 0.8; // Blue for slow
    else if (localTempo < 100) hue = 0.6; // Cyan for moderate
    else if (localTempo < 140) hue = 0.3; // Yellow for fast
    else hue = 0.0; // Red for very fast

    // Adjust hue for tempo changes
    hue += tempoVariation * 0.1;

    // Saturation based on tempo stability
    const tempoStability = 1 - Math.abs(localTempo - mainTempo) / Math.max(mainTempo, 1);
    const saturation = 0.5 + tempoStability * 0.4;

    // Lightness influenced by beat proximity and tempo variation
    const lightness = 0.4 + beatInfluence * 0.3 + tempoVariation * 0.2;

    return new THREE.Color().setHSL(hue, saturation, lightness);
};

const addTempoChangeMarkers = (tempoChanges, duration, heightScale, baseRadius) => {
    const markerVertices = [];
    const markerColors = [];
    const markerIndices = [];

    if (!tempoChanges || tempoChanges.length === 0) {
        return { markerVertices, markerColors, markerIndices };
    }

    let vertexOffset = 0;

    tempoChanges.forEach(change => {
        const z = ((change.time / duration) - 0.5) * heightScale;
        const markerRadius = baseRadius * 1.5;
        const markerHeight = change.significance * 0.5;

        // Create change marker (star-like shape)
        const spikes = 8;
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const isEven = i % 2 === 0;
            const radius = isEven ? markerRadius : markerRadius * 0.6;

            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            markerVertices.push(x, y, z - markerHeight / 2);
            markerVertices.push(x, y, z + markerHeight / 2);

            // Marker color (bright for significant changes)
            const markerColor = new THREE.Color().setHSL(
                0.1,
                0.9,
                0.6 + change.significance * 0.3
            );
            markerColors.push(markerColor.r, markerColor.g, markerColor.b);
            markerColors.push(markerColor.r, markerColor.g, markerColor.b);
        }

        // Connect marker vertices
        for (let i = 0; i < spikes; i++) {
            const next = (i + 1) % spikes;
            const v1 = vertexOffset + i * 2;
            const v2 = vertexOffset + i * 2 + 1;
            const v3 = vertexOffset + next * 2;
            const v4 = vertexOffset + next * 2 + 1;

            // Side faces
            markerIndices.push(v1, v2, v3);
            markerIndices.push(v2, v4, v3);
        }

        vertexOffset += spikes * 2;
    });

    return {
        markerVertices,
        markerColors,
        markerIndices
    };
};

// Alternative tempo visualization: Pulse Waves
export const createTempoPulseMesh = (analysisData, params) => {
    console.log('Creating tempo pulse mesh...');

    if (!analysisData?.beats || !analysisData?.tempoAnalysis) {
        throw new Error('No tempo data available for pulse mesh');
    }

    const { beats, tempoAnalysis } = analysisData;
    const { baseRadius, heightScale } = params;
    const { mainTempo } = tempoAnalysis;

    const vertices = [];
    const colors = [];
    const indices = [];

    // Create pulsing waves based on beat positions
    const waveResolution = 64;
    const pulseWidth = 0.5; // Width of each pulse in seconds

    beats.forEach((beatTime, beatIndex) => {
        const z = ((beatTime / analysisData.duration) - 0.5) * heightScale;

        // Create pulse wave around this beat
        for (let w = 0; w < waveResolution; w++) {
            const angle = (w / waveResolution) * Math.PI * 2;

            // Pulse amplitude decreases with distance from beat
            const pulseAmplitude = Math.exp(-Math.pow((beatTime % 1) * 4, 2)) * 0.5;
            const radius = baseRadius * (1 + pulseAmplitude);

            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on pulse strength
            const hue = (beatIndex / beats.length) * 0.8;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.5 + pulseAmplitude);
            colors.push(color.r, color.g, color.b);
        }
    });

    // Generate indices for pulse rings
    for (let b = 0; b < beats.length - 1; b++) {
        for (let w = 0; w < waveResolution; w++) {
            const v1 = b * waveResolution + w;
            const v2 = b * waveResolution + (w + 1) % waveResolution;
            const v3 = (b + 1) * waveResolution + w;
            const v4 = (b + 1) * waveResolution + (w + 1) % waveResolution;

            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
        }
    }

    const geometry = createBaseGeometry(vertices, indices, colors);
    const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
};

// Tempo Rhythm Pattern Visualization
export const createTempoRhythmMesh = (analysisData, params) => {
    console.log('Creating tempo rhythm mesh...');

    if (!analysisData?.rhythmPatterns || !analysisData?.tempoAnalysis) {
        throw new Error('No rhythm pattern data available for rhythm mesh');
    }

    const { rhythmPatterns, tempoAnalysis } = analysisData;
    const { baseRadius, heightScale } = params;
    const { mainTempo } = tempoAnalysis;

    const group = new THREE.Group();

    // Create visual representation of rhythm patterns
    rhythmPatterns.patterns.forEach((pattern, patternIndex) => {
        if (pattern.occurrences < 2) return; // Skip infrequent patterns

        const vertices = [];
        const colors = [];
        const indices = [];

        const patternRadius = baseRadius * (0.8 + patternIndex * 0.1);
        const segments = pattern.pattern.length * 8; // More segments for smoother pattern

        // Create ring representing this rhythm pattern
        for (let s = 0; s < segments; s++) {
            const angle = (s / segments) * Math.PI * 2;

            // Pattern influence on radius
            const patternPosition = (s / segments) * pattern.pattern.length;
            const patternIndex2 = Math.floor(patternPosition);
            const patternValue = pattern.pattern[patternIndex2] || 1;

            const radius = patternRadius * (0.8 + patternValue * 0.4);

            // Height based on pattern occurrence frequency
            const height = (pattern.occurrences / 10) * heightScale * 0.3;

            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            vertices.push(x, y, -height / 2);
            vertices.push(x, y, height / 2);

            // Color based on pattern complexity
            const hue = (patternIndex / rhythmPatterns.patterns.length) * 0.7;
            const saturation = 0.6 + (pattern.length / 8) * 0.3;
            const lightness = 0.4 + (pattern.occurrences / 10) * 0.4;

            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            colors.push(color.r, color.g, color.b);
            colors.push(color.r, color.g, color.b);
        }

        // Generate indices for pattern ring
        for (let s = 0; s < segments; s++) {
            const next = (s + 1) % segments;
            const v1 = s * 2;
            const v2 = s * 2 + 1;
            const v3 = next * 2;
            const v4 = next * 2 + 1;

            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
        }

        const geometry = createBaseGeometry(vertices, indices, colors);
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const patternMesh = new THREE.Mesh(geometry, material);
        group.add(patternMesh);
    });

    console.log(`Tempo rhythm mesh created: ${rhythmPatterns.patterns.length} patterns`);

    return group;
};