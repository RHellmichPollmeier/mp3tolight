// mesh/basicMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    addEndCaps,
    validateMeshData
} from './meshGenerator';

export const createBasicMesh = (analysisData, params) => {
    console.log('Creating basic mesh...');

    if (!analysisData?.amplitude) {
        throw new Error('No amplitude data available for basic mesh');
    }

    const { amplitude } = analysisData;
    const {
        baseRadius,
        heightScale,
        segments,
        rings,
        amplitudeScale,
        waveComplexity,
        lampStyle
    } = params;

    const dataStep = Math.max(1, Math.floor(amplitude.length / rings));
    const actualRings = Math.floor(amplitude.length / dataStep);

    const vertices = [];
    const indices = [];
    const colors = [];

    // Generate vertices based on lamp style
    for (let i = 0; i < actualRings; i++) {
        const amplitudeValue = amplitude[i * dataStep] || 0;
        const z = (i / (actualRings - 1) - 0.5) * heightScale;
        const ringProgress = i / (actualRings - 1);

        const currentRadius = baseRadius * (0.3 + 0.7 * amplitudeValue * amplitudeScale);

        for (let j = 0; j < segments; j++) {
            const angle = (j / segments) * Math.PI * 2;

            const { x, y, finalZ } = calculateVertexPosition(
                angle,
                currentRadius,
                z,
                ringProgress,
                amplitudeValue,
                lampStyle,
                waveComplexity,
                baseRadius,
                amplitudeScale,
                i
            );

            vertices.push(x, y, finalZ);

            const color = calculateVertexColor(lampStyle, amplitudeValue, ringProgress);
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

    // Add end caps
    const capsData = addEndCaps(vertices, colors, segments, actualRings, heightScale);
    const finalVertices = capsData.vertices;
    const finalColors = capsData.colors;
    const finalIndices = [...indices, ...capsData.capIndices];

    // Validate mesh data
    validateMeshData(finalVertices, finalIndices, finalColors);

    // Create geometry and material
    const geometry = createBaseGeometry(finalVertices, finalIndices, finalColors);
    const material = createBaseMaterial({
        opacity: 0.8,
        reflectivity: 0.8,
        refractionRatio: 0.98
    });

    const mesh = new THREE.Mesh(geometry, material);

    console.log(`Basic mesh created: ${finalVertices.length / 3} vertices, ${finalIndices.length / 3} faces`);

    return mesh;
};

const calculateVertexPosition = (
    angle,
    currentRadius,
    z,
    ringProgress,
    amplitude,
    lampStyle,
    waveComplexity,
    baseRadius,
    amplitudeScale,
    ringIndex
) => {
    let x, y, finalZ = z;

    switch (lampStyle) {
        case 'spiral':
            const spiralAngle = angle + ringProgress * Math.PI * 4;
            const spiralRadius = currentRadius * (1 + Math.sin(ringProgress * Math.PI * 2) * 0.3);
            x = spiralRadius * Math.cos(spiralAngle);
            y = spiralRadius * Math.sin(spiralAngle);
            break;

        case 'twisted':
            const twist = ringProgress * Math.PI * 2;
            const twistedAngle = angle + twist;
            const twistedRadius = currentRadius * (1 + amplitude * 0.5);
            x = twistedRadius * Math.cos(twistedAngle);
            y = twistedRadius * Math.sin(twistedAngle);
            break;

        case 'crystalline':
            const facets = 6;
            const facetAngle = Math.floor(angle / (Math.PI * 2) * facets) * (Math.PI * 2 / facets);
            const crystalRadius = currentRadius * (1 + amplitude * Math.sin(facetAngle * 3) * 0.4);
            x = crystalRadius * Math.cos(facetAngle);
            y = crystalRadius * Math.sin(facetAngle);
            break;

        case 'caustic':
            const caustic1 = Math.sin(angle * 8 + ringProgress * 12) * 0.15;
            const caustic2 = Math.cos(angle * 13 - ringProgress * 8) * 0.1;
            const caustic3 = Math.sin(angle * 21 + ringProgress * 15) * 0.05;
            const causticRadius = currentRadius * (1 + (caustic1 + caustic2 + caustic3) * amplitude);

            x = causticRadius * Math.cos(angle);
            y = causticRadius * Math.sin(angle);
            finalZ = z + Math.sin(angle * 5 + ringProgress * 10) * 0.3 * amplitude;
            break;

        default: // 'organic'
            const wave1 = Math.sin(angle * waveComplexity + ringIndex * 0.1) * 0.2 * amplitude;
            const wave2 = Math.cos(angle * (waveComplexity + 2) - ringIndex * 0.15) * 0.1 * amplitude;
            const wave3 = Math.sin(angle * 7 + ringIndex * 0.05) * 0.05 * amplitude;

            const causticWave = Math.sin(angle * 12 + ringIndex * 0.3) * Math.cos(ringIndex * 0.2) * 0.03 * amplitude;
            const waterRipple = Math.sin(angle * 5 + ringIndex * 0.8) * 0.02 * amplitude;

            const radius = currentRadius + (wave1 + wave2 + wave3 + causticWave + waterRipple) * baseRadius * amplitudeScale;

            const xOffset = Math.sin(ringIndex * 0.1 + angle * 3) * 0.1 * amplitude;
            const yOffset = Math.cos(ringIndex * 0.1 + angle * 3) * 0.1 * amplitude;

            x = radius * Math.cos(angle) + xOffset;
            y = radius * Math.sin(angle) + yOffset;
    }

    return { x, y, finalZ };
};

const calculateVertexColor = (lampStyle, amplitude, ringProgress) => {
    let hue, saturation, lightness;

    switch (lampStyle) {
        case 'spiral':
            hue = 0.8 + amplitude * 0.2; // Purple to blue
            saturation = 0.7;
            lightness = 0.5 + amplitude * 0.3;
            break;

        case 'twisted':
            hue = 0.1 + amplitude * 0.3; // Orange to yellow
            saturation = 0.8;
            lightness = 0.6 + amplitude * 0.2;
            break;

        case 'crystalline':
            hue = 0.7; // Blue
            saturation = 0.5 + amplitude * 0.4;
            lightness = 0.7 + amplitude * 0.2;
            break;

        case 'caustic':
            hue = 0.5 + Math.sin(ringProgress * Math.PI * 4) * 0.1; // Varying cyan
            saturation = 0.8;
            lightness = 0.4 + amplitude * 0.5;
            break;

        default: // organic
            hue = 0.5 + amplitude * 0.2; // Cyan to blue
            saturation = 0.6 + amplitude * 0.3;
            lightness = 0.4 + amplitude * 0.4;
    }

    return new THREE.Color().setHSL(hue, saturation, lightness);
};