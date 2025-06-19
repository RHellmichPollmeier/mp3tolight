// components/ThreeJSViewer.jsx
import React, { useRef, useEffect, useCallback } from 'react';
import { initThreeJS } from '../utils/threeJsSetup';
import { createMeshForTab } from '../mesh/meshGenerator';

const ThreeJSViewer = ({
    analysisData,
    params,
    activeTab,
    isPlaying,
    isProcessing,
    audioFile,
    tabs,
    meshRef
}) => {
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);
    // meshRef wird als Prop übergeben

    // Initialize Three.js
    useEffect(() => {
        if (!canvasRef.current) return;

        const cleanup = initThreeJS({
            canvas: canvasRef.current,
            sceneRef,
            rendererRef,
            cameraRef,
            animationRef,
            analyserRef,
            isPlaying,
            meshRef
        });

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            cleanup?.();
        };
    }, [isPlaying]);

    // Create/Update Mesh when data or parameters change
    const updateMesh = useCallback(async () => {
        if (!analysisData || !sceneRef.current) return;

        // Remove old mesh
        if (meshRef?.current) {
            sceneRef.current.remove(meshRef.current);
            meshRef.current = null;
        }

        try {
            // Create new mesh for active tab
            const mesh = await createMeshForTab(activeTab, analysisData, params);

            if (mesh && meshRef) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                sceneRef.current.add(mesh);
                meshRef.current = mesh;
                console.log(`Mesh erstellt für Tab: ${activeTab}`);
            }
        } catch (error) {
            console.error('Fehler beim Erstellen des Meshes:', error);
        }
    }, [analysisData, params, activeTab]);

    // Update mesh when dependencies change
    useEffect(() => {
        updateMesh();
    }, [updateMesh]);

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
                3D Vorschau - {tabs.find(t => t.id === activeTab)?.label}
            </h2>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    className="w-full h-96 bg-black/50 rounded-lg border border-gray-700"
                />

                {/* Loading Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                        <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p>Analysiere {tabs.find(t => t.id === activeTab)?.label}...</p>
                        </div>
                    </div>
                )}

                {/* No Audio Overlay */}
                {!audioFile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <div className="text-gray-400 text-center">
                            <div className="text-4xl mb-4">🎵</div>
                            <p>Lade eine Audio-Datei hoch, um die 3D-Visualisierung zu sehen</p>
                        </div>
                    </div>
                )}

                {/* No Analysis Data Overlay */}
                {audioFile && !analysisData && !isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <div className="text-gray-400 text-center">
                            <div className="text-4xl mb-4">⏳</div>
                            <p>Klicke auf einen Tab, um die Analyse zu starten</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Info */}
            <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-400">
                    🖱️ Bewege die Maus über die 3D-Ansicht, um das Objekt zu drehen
                </p>
                {analysisData && (
                    <p className="text-sm text-green-400">
                        ✅ {tabs.find(t => t.id === activeTab)?.label} - Analyse abgeschlossen
                    </p>
                )}
            </div>
        </div>
    );
};

export default ThreeJSViewer;