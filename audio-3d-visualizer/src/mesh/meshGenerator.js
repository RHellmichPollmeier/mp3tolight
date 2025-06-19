// mesh/meshGenerator.js
import * as THREE from 'three';

export const createMeshForTab = async (tabId, analysisData, params) => {
    console.log(`Creating mesh for tab: ${tabId}`);

    try {
        switch (tabId) {
            case 'basic':
                const { createBasicMesh } = await import('./basicMesh');
                return createBasicMesh(analysisData, params);

            /* case 'chroma':
                const { createChromaMesh } = await import('./chromaMesh');
                return createChromaMesh(analysisData, params);

            case 'beats':
                const { createBeatsMesh } = await import('./beatsMesh');
                return createBeatsMesh(analysisData, params);

            case 'frequency':
                const { createFrequencyMesh } = await import('./frequencyMesh');
                return createFrequencyMesh(analysisData, params);

            case 'spectral':
                const { createSpectralMesh } = await import('./spectralMesh');
                return createSpectralMesh(analysisData, params);

            case 'tempo':
                const { createTempoMesh } = await import('./tempoMesh');
                return createTempoMesh(analysisData, params); */

            default:
                // Fallback to basic mesh
                const { createBasicMesh: fallbackMesh } = await import('./basicMesh');
                return fallbackMesh(analysisData, params);
        }
    } catch (error) {
        console.error(`Error loading mesh for tab ${tabId}:`, error);

        // Fallback to a simple mesh
        return createFallbackMesh(analysisData, params);
    }
};

// Fallback mesh creation
const createFallbackMesh = (analysisData, params) => {
    console.log('Creating fallback mesh...');

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({
        color: 0x8844ff,
        transparent: true,
        opacity: 0.8
    });

    return new THREE.Mesh(geometry, material);
};

// Base mesh utilities
export const createBaseGeometry = (vertices, indices, colors) => {
    const geometry = new THREE.BufferGeometry();

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    if (colors) {
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
};

export const createBaseMaterial = (options = {}) => {
    const defaultOptions = {
        vertexColors: true,
        shininess: 100,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        reflectivity: 0.3
    };

    return new THREE.MeshPhongMaterial({
        ...defaultOptions,
        ...options
    });
};

// Generate end caps for cylindrical meshes
export const addEndCaps = (vertices, colors, segments, rings, heightScale) => {
    const updatedVertices = [...vertices];
    const updatedColors = [...colors];
    const indices = [];

    // Bottom cap
    const centerBottom = updatedVertices.length / 3;
    updatedVertices.push(0, 0, -heightScale / 2);
    updatedColors.push(0.2, 0.4, 0.6);

    for (let j = 0; j < segments; j++) {
        const v1 = j;
        const v2 = (j + 1) % segments;
        indices.push(centerBottom, v2, v1);
    }

    // Top cap
    const centerTop = updatedVertices.length / 3;
    updatedVertices.push(0, 0, heightScale / 2);
    updatedColors.push(0.2, 0.4, 0.6);

    const topRingStart = (rings - 1) * segments;
    for (let j = 0; j < segments; j++) {
        const v1 = topRingStart + j;
        const v2 = topRingStart + (j + 1) % segments;
        indices.push(centerTop, v1, v2);
    }

    return {
        vertices: updatedVertices,
        colors: updatedColors,
        capIndices: indices
    };
};

// Generate cylindrical mesh structure
export const generateCylindricalMesh = (data, segments, rings, radiusFunction, colorFunction) => {
    const vertices = [];
    const indices = [];
    const colors = [];

    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            const progress = i / (rings - 1);

            const radius = radiusFunction(i, j, angle, progress, data);
            const color = colorFunction(i, j, angle, progress, data);

            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            const z = (progress - 0.5) * 10; // Default height scale

            vertices.push(x, y, z);
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

            // Two triangles per quad
            indices.push(v1, v2, v3);
            indices.push(v2, v4, v3);
        }
    }

    return { vertices, indices, colors };
};

// Validate mesh data before creating geometry
export const validateMeshData = (vertices, indices, colors) => {
    if (!vertices || vertices.length === 0) {
        throw new Error('Vertices array is empty or undefined');
    }

    if (vertices.length % 3 !== 0) {
        throw new Error('Vertices array length must be divisible by 3');
    }

    if (indices && indices.length % 3 !== 0) {
        throw new Error('Indices array length must be divisible by 3');
    }

    if (colors && colors.length !== vertices.length) {
        throw new Error('Colors array length must match vertices array length');
    }

    // Check for NaN or infinite values
    for (let i = 0; i < vertices.length; i++) {
        if (!isFinite(vertices[i])) {
            throw new Error(`Invalid vertex value at index ${i}: ${vertices[i]}`);
        }
    }

    return true;
};