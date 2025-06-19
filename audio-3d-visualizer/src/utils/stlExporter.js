// utils/stlExporter.js
import * as THREE from 'three';

export const exportSTL = (mesh, fileName, tabType) => {
    if (!mesh) {
        console.error('Kein Mesh zum Exportieren vorhanden!');
        return false;
    }

    try {
        const geometry = mesh.geometry;
        const vertices = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;

        let stlString = `solid ${tabType}_AudioMesh\n`;

        if (indices) {
            // Indexed geometry
            for (let i = 0; i < indices.length; i += 3) {
                const a = indices[i] * 3;
                const b = indices[i + 1] * 3;
                const c = indices[i + 2] * 3;

                const triangle = createTriangleString(vertices, a, b, c);
                stlString += triangle;
            }
        } else {
            // Non-indexed geometry
            for (let i = 0; i < vertices.length; i += 9) {
                const triangle = createTriangleString(vertices, i, i + 3, i + 6);
                stlString += triangle;
            }
        }

        stlString += `endsolid ${tabType}_AudioMesh\n`;

        // Create and download file
        downloadSTL(stlString, fileName, tabType);

        console.log(`STL Export erfolgreich: ${fileName}_${tabType}_3d_model.stl`);
        return true;

    } catch (error) {
        console.error('Fehler beim STL Export:', error);
        return false;
    }
};

const createTriangleString = (vertices, a, b, c) => {
    // Extract vertices
    const v1 = new THREE.Vector3(vertices[a], vertices[a + 1], vertices[a + 2]);
    const v2 = new THREE.Vector3(vertices[b], vertices[b + 1], vertices[b + 2]);
    const v3 = new THREE.Vector3(vertices[c], vertices[c + 1], vertices[c + 2]);

    // Calculate normal
    const normal = new THREE.Vector3()
        .subVectors(v2, v1)
        .cross(new THREE.Vector3().subVectors(v3, v1))
        .normalize();

    // Format triangle
    let triangleString = `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
    triangleString += '    outer loop\n';
    triangleString += `      vertex ${v1.x.toFixed(6)} ${v1.y.toFixed(6)} ${v1.z.toFixed(6)}\n`;
    triangleString += `      vertex ${v2.x.toFixed(6)} ${v2.y.toFixed(6)} ${v2.z.toFixed(6)}\n`;
    triangleString += `      vertex ${v3.x.toFixed(6)} ${v3.y.toFixed(6)} ${v3.z.toFixed(6)}\n`;
    triangleString += '    endloop\n';
    triangleString += '  endfacet\n';

    return triangleString;
};

const downloadSTL = (stlString, fileName, tabType) => {
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName || 'audio'}_${tabType}_3d_model.stl`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
};

// Utility function to validate mesh before export
export const validateMeshForExport = (mesh) => {
    if (!mesh) return false;
    if (!mesh.geometry) return false;
    if (!mesh.geometry.attributes.position) return false;

    const vertices = mesh.geometry.attributes.position.array;
    if (vertices.length === 0) return false;

    // Check for valid triangles
    const triangleCount = mesh.geometry.index
        ? mesh.geometry.index.array.length / 3
        : vertices.length / 9;

    if (triangleCount < 1) return false;

    return true;
};

// Get mesh statistics for debugging
export const getMeshStats = (mesh) => {
    if (!validateMeshForExport(mesh)) {
        return { error: 'Invalid mesh' };
    }

    const geometry = mesh.geometry;
    const vertices = geometry.attributes.position.array;
    const indices = geometry.index ? geometry.index.array : null;

    const stats = {
        vertexCount: vertices.length / 3,
        triangleCount: indices ? indices.length / 3 : vertices.length / 9,
        hasIndices: !!indices,
        geometryType: geometry.constructor.name
    };

    return stats;
};