// mesh/beatsMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    addEndCaps,
    validateMeshData
} from './meshGenerator';

export const createBeatsMesh = (analysisData, params) => {
    console.log('Creating beats mesh...');

    if (!analysisData?.beats) {
        throw new Error('No beat data available for beats mesh');
    }

    const { beats, beatStrengths, tempo, duration } = analysisData;
    const {
        baseRadius,
        heightScale,
        segments,
        rings,
        beatSensitivity,
        beatRidgeDepth,
        amplitudeScale
    } = params;

    // Create base cylindrical structure
    const vertices = [];
    const indices = [];
    const colors = [];

    const timeStep = duration / rings;
    const beatMap = createBeatTimeMap(beats, beatStrengths, duration);

    // Generate vertices with beat-influenced ridges
    for (let i = 0; i < rings; i++) {
        const currentTime = i * timeStep;
        const z = (i / (rings - 1) - 0.5) * heightScale;

        // Find nearest beat and its strength
        const beatInfo = getBeatInfoAtTime(currentTime, beatMap, beatSensitivity);

        for (let j = 0; j < segments; j++) {
            const angle = (j / segments) * Math.PI * 2;

            // Base radius with beat influence
            let currentRadius = baseRadius * (0.6 + beatInfo.strength * amplitudeScale);

            // Add beat ridges (radial expansion at beat times)
            const beatRidge = calculateBeatRidge(beatInfo, angle, beatRidgeDepth);
            currentRadius += beatRidge * baseRadius;

            // Add rhythmic texture based on tempo
            const rhythmicTexture = calculateRhythmicTexture(angle, currentTime, tempo, i);
            currentRadius += rhythmicTexture * baseRadius * 0.1;

            const x = currentRadius * Math.cos(angle);
            const y = currentRadius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on beat strength and rhythm
            const color = calculateBeatColor(beatInfo, rhythmicTexture, tempo);
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

    // Add beat spike decorations
    const { spikeVertices, spikeColors, spikeIndices } =
        addBeatSpikes(beats, beatStrengths, duration, heightScale, baseRadius, segments);

    const finalVertices = [...vertices, ...spikeVertices];
    const finalColors = [...colors, ...spikeColors];
    const finalIndices = [...indices, ...spikeIndices];

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
        opacity: 0.85,
        transparent: true,
        metalness: 0.5,
        roughness: 0.3,
        emissive: new THREE.Color(0x220044),
        emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Beats mesh created: ${meshVertices.length / 3} vertices, ${meshIndices.length / 3} faces`);

    return mesh;
};

const createBeatTimeMap = (beats, beatStrengths, duration) => {
    const beatMap = [];

    beats.forEach((beatTime, index) => {
        beatMap.push({
            time: beatTime,
            strength: beatStrengths[index] || 0.5,
            index: index
        });
    });

    return beatMap.sort((a, b) => a.time - b.time);
};

const getBeatInfoAtTime = (currentTime, beatMap, sensitivity) => {
    // Find the closest beat
    let closestBeat = { time: 0, strength: 0, distance: Infinity };

    for (const beat of beatMap) {
        const distance = Math.abs(beat.time - currentTime);
        if (distance < closestBeat.distance) {
            closestBeat = {
                time: beat.time,
                strength: beat.strength,
                distance: distance
            };
        }
    }

    // Calculate influence based on distance and sensitivity
    const maxInfluenceDistance = 0.2; // 200ms influence range
    const influence = closestBeat.distance < maxInfluenceDistance
        ? Math.exp(-closestBeat.distance * sensitivity * 10) * closestBeat.strength
        : 0;

    return {
        strength: influence,
        distance: closestBeat.distance,
        nearestBeatTime: closestBeat.time
    };
};

const calculateBeatRidge = (beatInfo, angle, ridgeDepth) => {
    // Create radial ridges at beat times
    const ridgeStrength = beatInfo.strength * ridgeDepth;

    // Create 4 main ridges at cardinal directions
    const ridgeAngle1 = 0;
    const ridgeAngle2 = Math.PI / 2;
    const ridgeAngle3 = Math.PI;
    const ridgeAngle4 = 3 * Math.PI / 2;

    const ridge1 = Math.exp(-Math.pow((angle - ridgeAngle1) / 0.5, 2)) * ridgeStrength;
    const ridge2 = Math.exp(-Math.pow((angle - ridgeAngle2) / 0.5, 2)) * ridgeStrength;
    const ridge3 = Math.exp(-Math.pow((angle - ridgeAngle3) / 0.5, 2)) * ridgeStrength;
    const ridge4 = Math.exp(-Math.pow((angle - ridgeAngle4) / 0.5, 2)) * ridgeStrength;

    return Math.max(ridge1, ridge2, ridge3, ridge4);
};

const calculateRhythmicTexture = (angle, time, tempo, ringIndex) => {
    if (tempo === 0) return 0;

    // Create rhythmic patterns based on tempo
    const beatInterval = 60 / tempo; // seconds per beat
    const timeInBeat = (time % beatInterval) / beatInterval;

    // Create subdivisions (eighth notes, sixteenth notes)
    const eighthNote = Math.sin(timeInBeat * Math.PI * 4) * 0.3;
    const sixteenthNote = Math.sin(timeInBeat * Math.PI * 8) * 0.1;

    // Vary texture around the circumference
    const angularVariation = Math.sin(angle * 8 + ringIndex * 0.1) * 0.2;

    return (eighthNote + sixteenthNote + angularVariation) * 0.3;
};

const calculateBeatColor = (beatInfo, rhythmicTexture, tempo) => {
    // Base color depends on tempo
    let hue;
    if (tempo < 80) hue = 0.8; // Blue for slow
    else if (tempo < 120) hue = 0.6; // Cyan for medium
    else if (tempo < 160) hue = 0.3; // Yellow for fast
    else hue = 0.0; // Red for very fast

    const saturation = 0.6 + beatInfo.strength * 0.4;
    const lightness = 0.3 + beatInfo.strength * 0.5 + Math.abs(rhythmicTexture) * 0.2;

    return new THREE.Color().setHSL(hue, saturation, lightness);
};

const addBeatSpikes = (beats, beatStrengths, duration, heightScale, baseRadius, segments) => {
    const spikeVertices = [];
    const spikeColors = [];
    const spikeIndices = [];

    let vertexOffset = 0;

    beats.forEach((beatTime, beatIndex) => {
        const strength = beatStrengths[beatIndex] || 0.5;

        if (strength > 0.4) { // Only create spikes for strong beats
            const z = ((beatTime / duration) - 0.5) * heightScale;
            const spikeHeight = strength * baseRadius * 0.8;

            // Create spike around the circumference
            const spikesPerBeat = 4; // 4 spikes per beat

            for (let s = 0; s < spikesPerBeat; s++) {
                const spikeAngle = (s / spikesPerBeat) * Math.PI * 2;

                // Base of spike
                const baseRadius2 = baseRadius * 1.1;
                const baseX = baseRadius2 * Math.cos(spikeAngle);
                const baseY = baseRadius2 * Math.sin(spikeAngle);

                // Tip of spike
                const tipRadius = baseRadius2 + spikeHeight;
                const tipX = tipRadius * Math.cos(spikeAngle);
                const tipY = tipRadius * Math.sin(spikeAngle);

                // Create triangular spike
                spikeVertices.push(baseX, baseY, z - 0.1);
                spikeVertices.push(baseX, baseY, z + 0.1);
                spikeVertices.push(tipX, tipY, z);

                // Spike color (brighter than base)
                const spikeColor = new THREE.Color().setHSL(0.1, 0.9, 0.7);
                spikeColors.push(spikeColor.r, spikeColor.g, spikeColor.b);
                spikeColors.push(spikeColor.r, spikeColor.g, spikeColor.b);
                spikeColors.push(spikeColor.r, spikeColor.g, spikeColor.b);

                // Spike triangle indices
                spikeIndices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
                vertexOffset += 3;
            }
        }
    });

    return {
        spikeVertices,
        spikeColors,
        spikeIndices
    };
};

// Alternative beat visualization: Pulse Pattern
export const createBeatPulseMesh = (analysisData, params) => {
    console.log('Creating beat pulse mesh...');

    if (!analysisData?.beats) {
        throw new Error('No beat data available for pulse mesh');
    }

    const { beats, tempo, duration } = analysisData;
    const { baseRadius, heightScale, beatSensitivity } = params;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];

    // Create pulsing rings at beat positions
    beats.forEach((beatTime, index) => {
        const z = ((beatTime / duration) - 0.5) * heightScale;
        const ringSegments = 32;
        const pulseRadius = baseRadius * (1 + Math.sin(index) * 0.3);

        for (let i = 0; i < ringSegments; i++) {
            const angle = (i / ringSegments) * Math.PI * 2;
            const x = pulseRadius * Math.cos(angle);
            const y = pulseRadius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on beat index
            const hue = (index / beats.length) * 0.8;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            colors.push(color.r, color.g, color.b);
        }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    return new THREE.Points(geometry, material);
};

// Beat Grid Visualization
export const createBeatGridMesh = (analysisData, params) => {
    console.log('Creating beat grid mesh...');

    if (!analysisData?.beats || !analysisData?.tempo) {
        throw new Error('No beat/tempo data available for grid mesh');
    }

    const { beats, tempo, duration } = analysisData;
    const { baseRadius, heightScale } = params;

    const vertices = [];
    const indices = [];
    const colors = [];

    // Create grid based on tempo
    const beatInterval = 60 / tempo;
    const gridLines = Math.ceil(duration / beatInterval);

    // Vertical lines (time grid)
    for (let i = 0; i <= gridLines; i++) {
        const time = i * beatInterval;
        const z = ((time / duration) - 0.5) * heightScale;

        // Create vertical line
        vertices.push(0, -baseRadius, z);
        vertices.push(0, baseRadius, z);

        const color = new THREE.Color(0.5, 0.5, 1.0);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);

        if (i < gridLines) {
            indices.push(i * 2, i * 2 + 1);
        }
    }

    // Add beat markers at actual beat positions
    beats.forEach((beatTime, index) => {
        const z = ((beatTime / duration) - 0.5) * heightScale;
        const markerRadius = baseRadius * 0.8;

        // Create beat marker circle
        const segments = 16;
        const startVertex = vertices.length / 3;

        for (let j = 0; j < segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            const x = markerRadius * Math.cos(angle);
            const y = markerRadius * Math.sin(angle);

            vertices.push(x, y, z);

            const beatColor = new THREE.Color().setHSL(0.1, 0.8, 0.7);
            colors.push(beatColor.r, beatColor.g, beatColor.b);
        }

        // Connect beat marker vertices
        for (let j = 0; j < segments; j++) {
            const next = (j + 1) % segments;
            indices.push(startVertex + j, startVertex + next);
        }
    });

    const geometry = createBaseGeometry(vertices, indices, colors);
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7
    });

    return new THREE.LineSegments(geometry, material);
};