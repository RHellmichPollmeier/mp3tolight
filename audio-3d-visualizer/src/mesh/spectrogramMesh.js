// mesh/spectrogramMesh.js
import * as THREE from 'three';
import {
    createBaseGeometry,
    createBaseMaterial,
    validateMeshData
} from './meshGenerator';

export const createSpectrogramMesh = (analysisData, params) => {
    console.log('Creating spectrogram mesh...');

    if (!analysisData?.spectrogram) {
        throw new Error('No spectrogram data available for spectrogram mesh');
    }

    const { spectrogram, frequencies, timeStamps } = analysisData;
    const {
        selectedShape,
        mappingMode,
        displacementScale,
        colorIntensity,
        normalScale,
        emissionIntensity,
        selectedRegion,
        baseRadius,
        heightScale
    } = params;

    // Create base shape geometry
    const baseGeometry = createBaseShapeGeometry(selectedShape, baseRadius, heightScale);

    // Apply spectrogram mapping based on mode
    const mappedGeometry = applySpectrogramMapping(
        baseGeometry,
        spectrogram,
        frequencies,
        timeStamps,
        mappingMode,
        {
            displacementScale,
            colorIntensity,
            normalScale,
            emissionIntensity,
            selectedRegion
        }
    );

    // Create material based on mapping mode
    const material = createSpectrogramMaterial(mappingMode, {
        colorIntensity,
        emissionIntensity,
        enablePBR: params.enablePBR
    });

    const mesh = new THREE.Mesh(mappedGeometry, material);

    console.log(`Spectrogram mesh created: ${selectedShape} with ${mappingMode} mapping`);

    return mesh;
};

const createBaseShapeGeometry = (shapeType, baseRadius, heightScale) => {
    const segments = 64; // High resolution for smooth mapping
    const rings = 64;

    switch (shapeType) {
        case 'lightbulb':
            return createLightbulbGeometry(baseRadius, heightScale, segments);

        case 'sphere':
            return new THREE.SphereGeometry(baseRadius, segments, rings);

        case 'cylinder':
            return new THREE.CylinderGeometry(baseRadius, baseRadius, heightScale, segments);

        case 'torus':
            return new THREE.TorusGeometry(baseRadius, baseRadius * 0.3, rings / 2, segments);

        case 'cone':
            return new THREE.ConeGeometry(baseRadius, heightScale, segments);

        case 'diamond':
            return createDiamondGeometry(baseRadius, heightScale, segments);

        case 'organic':
            return createOrganicGeometry(baseRadius, heightScale, segments);

        case 'spiral':
            return createSpiralGeometry(baseRadius, heightScale, segments);

        default:
            return new THREE.SphereGeometry(baseRadius, segments, rings);
    }
};

const createLightbulbGeometry = (radius, height, segments) => {
    const vertices = [];
    const indices = [];
    const uvs = [];

    const rings = 32;

    for (let i = 0; i <= rings; i++) {
        const v = i / rings;
        const y = (v - 0.5) * height;

        // Lightbulb profile: wider at bottom, narrower at top
        let currentRadius;
        if (v < 0.7) {
            // Bulb part - spherical
            const angle = (v / 0.7) * Math.PI;
            currentRadius = radius * Math.sin(angle);
        } else {
            // Neck part - narrowing
            const neckProgress = (v - 0.7) / 0.3;
            currentRadius = radius * 0.3 * (1 - neckProgress);
        }

        for (let j = 0; j <= segments; j++) {
            const u = j / segments;
            const angle = u * Math.PI * 2;

            const x = currentRadius * Math.cos(angle);
            const z = currentRadius * Math.sin(angle);

            vertices.push(x, y, z);
            uvs.push(u, v);
        }
    }

    // Generate indices
    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + segments + 1;
            const c = a + 1;
            const d = b + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
};

const createDiamondGeometry = (radius, height, segments) => {
    const vertices = [];
    const indices = [];
    const uvs = [];

    // Diamond shape with faceted sides
    const facets = 8;
    const layers = 16;

    for (let i = 0; i <= layers; i++) {
        const v = i / layers;
        const y = (v - 0.5) * height;

        // Diamond profile
        let currentRadius;
        if (v < 0.5) {
            currentRadius = radius * (v * 2); // Expanding from tip
        } else {
            currentRadius = radius * ((1 - v) * 2); // Contracting to tip
        }

        for (let j = 0; j <= facets; j++) {
            const u = j / facets;
            const angle = u * Math.PI * 2;

            const x = currentRadius * Math.cos(angle);
            const z = currentRadius * Math.sin(angle);

            vertices.push(x, y, z);
            uvs.push(u, v);
        }
    }

    // Generate indices for faceted surface
    for (let i = 0; i < layers; i++) {
        for (let j = 0; j < facets; j++) {
            const a = i * (facets + 1) + j;
            const b = a + facets + 1;
            const c = a + 1;
            const d = b + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
};

const createOrganicGeometry = (radius, height, segments) => {
    const vertices = [];
    const indices = [];
    const uvs = [];

    const rings = 32;

    for (let i = 0; i <= rings; i++) {
        const v = i / rings;
        const y = (v - 0.5) * height;

        // Organic undulating profile
        const baseRadius = radius * (0.5 + 0.5 * Math.sin(v * Math.PI));

        for (let j = 0; j <= segments; j++) {
            const u = j / segments;
            const angle = u * Math.PI * 2;

            // Add organic variations
            const organicVariation = Math.sin(angle * 3 + v * 5) * 0.2;
            const currentRadius = baseRadius * (1 + organicVariation);

            const x = currentRadius * Math.cos(angle);
            const z = currentRadius * Math.sin(angle);

            vertices.push(x, y, z);
            uvs.push(u, v);
        }
    }

    // Generate indices
    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + segments + 1;
            const c = a + 1;
            const d = b + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
};

const createSpiralGeometry = (radius, height, segments) => {
    const vertices = [];
    const indices = [];
    const uvs = [];

    const spiralTurns = 3;
    const points = 128;

    for (let i = 0; i <= points; i++) {
        const t = i / points;
        const spiralAngle = t * spiralTurns * Math.PI * 2;
        const y = (t - 0.5) * height;
        const currentRadius = radius * (0.5 + 0.5 * Math.sin(t * Math.PI));

        for (let j = 0; j <= segments; j++) {
            const u = j / segments;
            const circumferenceAngle = u * Math.PI * 2;
            const totalAngle = circumferenceAngle + spiralAngle;

            const x = currentRadius * Math.cos(totalAngle);
            const z = currentRadius * Math.sin(totalAngle);

            vertices.push(x, y, z);
            uvs.push(u, t);
        }
    }

    // Generate indices
    for (let i = 0; i < points; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + segments + 1;
            const c = a + 1;
            const d = b + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
};

const applySpectrogramMapping = (geometry, spectrogram, frequencies, timeStamps, mappingMode, params) => {
    const positions = geometry.attributes.position.array;
    const uvs = geometry.attributes.uv.array;
    const vertexCount = positions.length / 3;

    // Create color and displacement arrays
    const colors = new Float32Array(vertexCount * 3);
    const displacements = new Float32Array(vertexCount);

    // Get original normals for displacement
    const normals = geometry.attributes.normal.array;

    for (let i = 0; i < vertexCount; i++) {
        const uv_u = uvs[i * 2];
        const uv_v = uvs[i * 2 + 1];

        // Sample spectrogram at UV coordinates
        const spectrogramValue = sampleSpectrogram(spectrogram, uv_u, uv_v, params.selectedRegion);

        // Apply mapping based on mode
        switch (mappingMode) {
            case 'displacement':
                applyDisplacement(positions, normals, i, spectrogramValue, params.displacementScale);
                break;

            case 'color':
                applyColorMapping(colors, i, spectrogramValue, params.colorIntensity);
                break;

            case 'normal':
                applyNormalMapping(geometry, i, spectrogramValue, params.normalScale);
                break;

            case 'emission':
                applyEmissionMapping(colors, i, spectrogramValue, params.emissionIntensity);
                break;

            case 'hybrid':
                applyDisplacement(positions, normals, i, spectrogramValue, params.displacementScale * 0.5);
                applyColorMapping(colors, i, spectrogramValue, params.colorIntensity);
                break;
        }
    }

    // Update geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    if (mappingMode === 'color' || mappingMode === 'emission' || mappingMode === 'hybrid') {
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }

    // Recompute normals if positions changed
    if (mappingMode === 'displacement' || mappingMode === 'hybrid') {
        geometry.computeVertexNormals();
    }

    return geometry;
};

const sampleSpectrogram = (spectrogram, u, v, selectedRegion) => {
    // Handle region selection
    let sampleU = u;
    let sampleV = v;

    if (selectedRegion) {
        sampleU = selectedRegion.startX + u * (selectedRegion.endX - selectedRegion.startX);
        sampleV = selectedRegion.startY + v * (selectedRegion.endY - selectedRegion.startY);
    }

    // Clamp to valid range
    sampleU = Math.max(0, Math.min(1, sampleU));
    sampleV = Math.max(0, Math.min(1, sampleV));

    // Convert to spectrogram indices
    const timeIndex = Math.floor(sampleU * (spectrogram.length - 1));
    const freqIndex = Math.floor((1 - sampleV) * (spectrogram[0]?.length - 1 || 0)); // Flip V for frequency

    if (spectrogram[timeIndex] && spectrogram[timeIndex][freqIndex] !== undefined) {
        return spectrogram[timeIndex][freqIndex];
    }

    return 0;
};

const applyDisplacement = (positions, normals, vertexIndex, value, scale) => {
    const i3 = vertexIndex * 3;

    // Normalize spectrogram value
    const displacement = value * scale * 0.5;

    // Displace along normal
    positions[i3] += normals[i3] * displacement;
    positions[i3 + 1] += normals[i3 + 1] * displacement;
    positions[i3 + 2] += normals[i3 + 2] * displacement;
};

const applyColorMapping = (colors, vertexIndex, value, intensity) => {
    const i3 = vertexIndex * 3;

    // Convert spectrogram value to color using a viridis-like colormap
    const normalizedValue = Math.max(0, Math.min(1, value * intensity));
    const color = spectrogramValueToColor(normalizedValue);

    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
};

const applyNormalMapping = (geometry, vertexIndex, value, scale) => {
    // Create subtle normal variations based on spectrogram data
    // This is a simplified approach - proper normal mapping would require tangent space
    const normals = geometry.attributes.normal.array;
    const i3 = vertexIndex * 3;

    // Add small random variations based on spectrogram value
    const variation = (value - 0.5) * scale * 0.1;
    normals[i3] += variation * (Math.random() - 0.5);
    normals[i3 + 1] += variation * (Math.random() - 0.5);
    normals[i3 + 2] += variation * (Math.random() - 0.5);

    // Normalize
    const length = Math.sqrt(normals[i3] * normals[i3] +
        normals[i3 + 1] * normals[i3 + 1] +
        normals[i3 + 2] * normals[i3 + 2]);
    if (length > 0) {
        normals[i3] /= length;
        normals[i3 + 1] /= length;
        normals[i3 + 2] /= length;
    }
};

const applyEmissionMapping = (colors, vertexIndex, value, intensity) => {
    const i3 = vertexIndex * 3;

    // Create emission color based on spectrogram value
    const emissionStrength = value * intensity;
    const hue = value * 0.7; // Blue to red range

    const color = new THREE.Color().setHSL(hue, 0.8, emissionStrength);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
};

const spectrogramValueToColor = (value) => {
    // Viridis-like colormap
    if (value < 0.25) {
        const t = value / 0.25;
        return {
            r: 0.267004 + t * (0.229739 - 0.267004),
            g: 0.004874 + t * (0.322361 - 0.004874),
            b: 0.329415 + t * (0.545706 - 0.329415)
        };
    } else if (value < 0.5) {
        const t = (value - 0.25) / 0.25;
        return {
            r: 0.229739 + t * (0.127568 - 0.229739),
            g: 0.322361 + t * (0.566949 - 0.322361),
            b: 0.545706 + t * (0.550556 - 0.545706)
        };
    } else if (value < 0.75) {
        const t = (value - 0.5) / 0.25;
        return {
            r: 0.127568 + t * (0.369214 - 0.127568),
            g: 0.566949 + t * (0.788888 - 0.566949),
            b: 0.550556 + t * (0.382914 - 0.550556)
        };
    } else {
        const t = (value - 0.75) / 0.25;
        return {
            r: 0.369214 + t * (0.993248 - 0.369214),
            g: 0.788888 + t * (0.906157 - 0.788888),
            b: 0.382914 + t * (0.143936 - 0.382914)
        };
    }
};

const createSpectrogramMaterial = (mappingMode, params) => {
    const materialProps = {
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    };

    switch (mappingMode) {
        case 'displacement':
            return new THREE.MeshPhongMaterial({
                ...materialProps,
                color: 0x4488ff,
                shininess: 100
            });

        case 'color':
        case 'hybrid':
            return new THREE.MeshPhongMaterial({
                ...materialProps,
                vertexColors: true,
                shininess: 80
            });

        case 'normal':
            return new THREE.MeshPhongMaterial({
                ...materialProps,
                color: 0x6699cc,
                shininess: 120
            });

        case 'emission':
            return new THREE.MeshBasicMaterial({
                ...materialProps,
                vertexColors: true
            });

        default:
            return new THREE.MeshPhongMaterial({
                ...materialProps,
                color: 0x4488ff
            });
    }
};