// mesh/chromaMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    addEndCaps,
    validateMeshData,
    generateCylindricalMesh
} from './meshGenerator';

export const createChromaMesh = (analysisData, params) => {
    console.log('Creating chroma mesh...');

    if (!analysisData?.chromaFeatures) {
        throw new Error('No chroma features available for chroma mesh');
    }

    const { chromaFeatures, noteNames } = analysisData;
    const {
        baseRadius,
        heightScale,
        segments,
        rings,
        chromaIntensity,
        amplitudeScale
    } = params;

    // Use segments = 12 for chroma (12 semitones)
    const chromaSegments = 12;
    const dataStep = Math.max(1, Math.floor(chromaFeatures.length / rings));
    const actualRings = Math.floor(chromaFeatures.length / dataStep);

    const vertices = [];
    const indices = [];
    const colors = [];

    // Generate vertices based on chroma analysis
    for (let i = 0; i < actualRings; i++) {
        const frameIndex = i * dataStep;
        const chromaFrame = chromaFeatures[frameIndex] || new Array(12).fill(0);
        const z = (i / (actualRings - 1) - 0.5) * heightScale;

        // Create ring based on 12 chromatic notes
        for (let j = 0; j < chromaSegments; j++) {
            const angle = (j / chromaSegments) * Math.PI * 2;
            const chromaValue = chromaFrame[j] || 0;

            // Radius varies with chroma intensity
            const radiusMultiplier = 0.3 + chromaValue * chromaIntensity * amplitudeScale;
            const currentRadius = baseRadius * radiusMultiplier;

            // Add harmonic variations for visual interest
            const harmonicOffset = Math.sin(angle * 3 + i * 0.1) * 0.1 * chromaValue;
            const finalRadius = currentRadius + harmonicOffset * baseRadius;

            const x = finalRadius * Math.cos(angle);
            const y = finalRadius * Math.sin(angle);

            vertices.push(x, y, z);

            // Color based on chromatic note (HSL color wheel)
            const hue = j / 12; // Each note gets a different hue
            const saturation = 0.7 + chromaValue * 0.3;
            const lightness = 0.4 + chromaValue * 0.5;

            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            colors.push(color.r, color.g, color.b);
        }
    }

    // Generate face indices (connect rings)
    for (let i = 0; i < actualRings - 1; i++) {
        for (let j = 0; j < chromaSegments; j++) {
            const v1 = i * chromaSegments + j;
            const v2 = i * chromaSegments + (j + 1) % chromaSegments;
            const v3 = (i + 1) * chromaSegments + j;
            const v4 = (i + 1) * chromaSegments + (j + 1) % chromaSegments;

            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
        }
    }

    // Add decorative elements for note emphasis
    const { decorativeVertices, decorativeColors, decorativeIndices } =
        addChromaDecorations(vertices, colors, chromaFeatures, actualRings, chromaSegments, baseRadius);

    const finalVertices = [...vertices, ...decorativeVertices];
    const finalColors = [...colors, ...decorativeColors];
    const finalIndices = [...indices, ...decorativeIndices];

    // Add end caps
    const capsData = addEndCaps(finalVertices, finalColors, chromaSegments, actualRings, heightScale);
    const meshVertices = capsData.vertices;
    const meshColors = capsData.colors;
    const meshIndices = [...finalIndices, ...capsData.capIndices];

    // Validate mesh data
    validateMeshData(meshVertices, meshIndices, meshColors);

    // Create geometry and material
    const geometry = createBaseGeometry(meshVertices, meshIndices, meshColors);
    const material = createBaseMaterial({
        opacity: 0.9,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(0x111122),
        emissiveIntensity: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Chroma mesh created: ${meshVertices.length / 3} vertices, ${meshIndices.length / 3} faces`);

    return mesh;
};

const addChromaDecorations = (vertices, colors, chromaFeatures, rings, segments, baseRadius) => {
    const decorativeVertices = [];
    const decorativeColors = [];
    const decorativeIndices = [];

    // Find dominant notes throughout the piece
    const dominantNotes = findDominantNotes(chromaFeatures);

    // Add note spikes for strong chroma values
    let decorativeVertexCount = vertices.length / 3;

    dominantNotes.forEach((noteInfo, noteIndex) => {
        if (noteInfo.strength > 0.6) { // Only for strong notes
            const angle = (noteIndex / 12) * Math.PI * 2;
            const spikeLength = baseRadius * 0.5 * noteInfo.strength;

            // Create spike for this note through the height
            for (let i = 0; i < rings; i++) {
                const z = (i / (rings - 1) - 0.5) * 10; // Use full height scale
                const frameChroma = chromaFeatures[Math.floor(i * chromaFeatures.length / rings)];
                const localStrength = frameChroma ? frameChroma[noteIndex] : 0;

                if (localStrength > 0.3) {
                    // Base position
                    const baseX = (baseRadius * 0.8) * Math.cos(angle);
                    const baseY = (baseRadius * 0.8) * Math.sin(angle);

                    // Spike tip
                    const tipX = (baseRadius * 0.8 + spikeLength * localStrength) * Math.cos(angle);
                    const tipY = (baseRadius * 0.8 + spikeLength * localStrength) * Math.sin(angle);

                    decorativeVertices.push(baseX, baseY, z);
                    decorativeVertices.push(tipX, tipY, z);

                    // Color for note spike
                    const hue = noteIndex / 12;
                    const noteColor = new THREE.Color().setHSL(hue, 0.9, 0.7);

                    decorativeColors.push(noteColor.r, noteColor.g, noteColor.b);
                    decorativeColors.push(noteColor.r, noteColor.g, noteColor.b);

                    decorativeVertexCount += 2;
                }
            }
        }
    });

    return {
        decorativeVertices,
        decorativeColors,
        decorativeIndices
    };
};

const findDominantNotes = (chromaFeatures) => {
    const noteSums = new Array(12).fill(0);
    const noteCounts = new Array(12).fill(0);

    // Sum chroma values for each note
    chromaFeatures.forEach(frame => {
        frame.forEach((value, noteIndex) => {
            noteSums[noteIndex] += value;
            noteCounts[noteIndex]++;
        });
    });

    // Calculate average strength for each note
    return noteSums.map((sum, index) => ({
        note: index,
        strength: noteCounts[index] > 0 ? sum / noteCounts[index] : 0
    }));
};

// Alternative chroma visualization: Spiral Pattern
export const createChromaSpiralMesh = (analysisData, params) => {
    console.log('Creating chroma spiral mesh...');

    if (!analysisData?.chromaFeatures) {
        throw new Error('No chroma features available for spiral mesh');
    }

    const { chromaFeatures } = analysisData;
    const { baseRadius, heightScale, chromaIntensity } = params;

    const vertices = [];
    const indices = [];
    const colors = [];

    const spiralTurns = 3; // Number of complete turns
    const pointsPerTurn = chromaFeatures.length / spiralTurns;

    chromaFeatures.forEach((frame, frameIndex) => {
        const t = frameIndex / chromaFeatures.length;
        const spiralAngle = t * spiralTurns * Math.PI * 2;
        const z = (t - 0.5) * heightScale;

        // For each chroma note in this frame
        frame.forEach((chromaValue, noteIndex) => {
            if (chromaValue > 0.1) { // Only show significant chroma values
                const noteAngle = spiralAngle + (noteIndex / 12) * Math.PI * 2;
                const radius = baseRadius * (0.5 + chromaValue * chromaIntensity);

                const x = radius * Math.cos(noteAngle);
                const y = radius * Math.sin(noteAngle);

                vertices.push(x, y, z);

                // Color based on note
                const hue = noteIndex / 12;
                const color = new THREE.Color().setHSL(hue, 0.8, 0.5 + chromaValue * 0.4);
                colors.push(color.r, color.g, color.b);
            }
        });
    });

    // Create point cloud or instanced geometry for spiral visualization
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const mesh = new THREE.Points(geometry, material);

    console.log(`Chroma spiral mesh created: ${vertices.length / 3} points`);

    return mesh;
};

// Chroma Circle Visualization
export const createChromaCircleMesh = (analysisData, params) => {
    console.log('Creating chroma circle mesh...');

    if (!analysisData?.chromaFeatures) {
        throw new Error('No chroma features available for circle mesh');
    }

    const { chromaFeatures } = analysisData;
    const { baseRadius, heightScale, chromaIntensity } = params;

    // Use cylindrical mesh generator with chroma-specific functions
    const radiusFunction = (ringIndex, segmentIndex, angle, progress, data) => {
        const frameIndex = Math.floor(ringIndex * data.length / 64); // Assume 64 rings
        const frame = data[frameIndex] || new Array(12).fill(0);
        const noteIndex = Math.floor((angle / (Math.PI * 2)) * 12);
        const chromaValue = frame[noteIndex] || 0;

        return baseRadius * (0.4 + chromaValue * chromaIntensity);
    };

    const colorFunction = (ringIndex, segmentIndex, angle, progress, data) => {
        const noteIndex = Math.floor((angle / (Math.PI * 2)) * 12);
        const frameIndex = Math.floor(ringIndex * data.length / 64);
        const frame = data[frameIndex] || new Array(12).fill(0);
        const chromaValue = frame[noteIndex] || 0;

        const hue = noteIndex / 12;
        const saturation = 0.7 + chromaValue * 0.3;
        const lightness = 0.4 + chromaValue * 0.5;

        return new THREE.Color().setHSL(hue, saturation, lightness);
    };

    const meshData = generateCylindricalMesh(
        chromaFeatures,
        12, // 12 segments for 12 notes
        64, // 64 rings
        radiusFunction,
        colorFunction
    );

    // Add end caps
    const capsData = addEndCaps(
        meshData.vertices,
        meshData.colors,
        12,
        64,
        heightScale
    );

    validateMeshData(capsData.vertices, [...meshData.indices, ...capsData.capIndices], capsData.colors);

    const geometry = createBaseGeometry(
        capsData.vertices,
        [...meshData.indices, ...capsData.capIndices],
        capsData.colors
    );

    const material = createBaseMaterial({
        opacity: 0.85,
        transparent: true,
        metalness: 0.3,
        roughness: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Chroma circle mesh created: ${capsData.vertices.length / 3} vertices`);

    return mesh;
};