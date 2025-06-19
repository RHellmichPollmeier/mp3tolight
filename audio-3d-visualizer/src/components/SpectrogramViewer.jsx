// components/SpectrogramViewer.jsx
import React, { useRef, useEffect, useState } from 'react';
import { spectrogramToImageData } from '../audio/spectrogramAnalysis';

const SpectrogramViewer = ({
    spectrogramData,
    width = 800,
    height = 400,
    colormap = 'viridis',
    onRegionSelect = null
}) => {
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState(null);

    // Available colormaps
    const colormaps = [
        { id: 'viridis', name: 'Viridis', description: 'Lila-Blau-Grün-Gelb' },
        { id: 'plasma', name: 'Plasma', description: 'Lila-Pink-Gelb' },
        { id: 'hot', name: 'Hot', description: 'Schwarz-Rot-Gelb-Weiß' },
        { id: 'cool', name: 'Cool', description: 'Cyan-Magenta' }
    ];

    // Render spectrogram to canvas
    useEffect(() => {
        if (!spectrogramData || !canvasRef.current) return;

        setIsLoading(true);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        try {
            // Convert spectrogram to image data
            const imageData = spectrogramToImageData(spectrogramData.spectrogram, colormap);

            // Create temporary canvas for the spectrogram
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = spectrogramData.dimensions.width;
            tempCanvas.height = spectrogramData.dimensions.height;

            // Draw image data to temp canvas
            tempCtx.putImageData(imageData, 0, 0);

            // Scale and draw to main canvas
            ctx.clearRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = false; // Crisp pixels
            ctx.drawImage(tempCanvas, 0, 0, width, height);

            // Draw grid lines
            drawGrid(ctx, width, height, spectrogramData);

            // Draw selected region
            if (selectedRegion) {
                drawSelectedRegion(ctx, selectedRegion, width, height);
            }

        } catch (error) {
            console.error('Error rendering spectrogram:', error);

            // Draw error state
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Error rendering spectrogram', width / 2, height / 2);
        }

        setIsLoading(false);
    }, [spectrogramData, width, height, colormap, selectedRegion]);

    const drawGrid = (ctx, canvasWidth, canvasHeight, data) => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        // Time grid lines (vertical)
        const timeStep = canvasWidth / 10;
        for (let i = 0; i <= 10; i++) {
            const x = i * timeStep;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }

        // Frequency grid lines (horizontal)
        const freqStep = canvasHeight / 8;
        for (let i = 0; i <= 8; i++) {
            const y = i * freqStep;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
    };

    const drawSelectedRegion = (ctx, region, canvasWidth, canvasHeight) => {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';

        const x = region.startX * canvasWidth;
        const y = region.startY * canvasHeight;
        const w = (region.endX - region.startX) * canvasWidth;
        const h = (region.endY - region.startY) * canvasHeight;

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    };

    // Mouse event handlers for region selection
    const handleMouseDown = (event) => {
        if (!onRegionSelect) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / width;
        const y = (event.clientY - rect.top) / height;

        setIsSelecting(true);
        setStartPos({ x, y });
    };

    const handleMouseMove = (event) => {
        if (!isSelecting || !startPos) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / width;
        const y = (event.clientY - rect.top) / height;

        setSelectedRegion({
            startX: Math.min(startPos.x, x),
            startY: Math.min(startPos.y, y),
            endX: Math.max(startPos.x, x),
            endY: Math.max(startPos.y, y)
        });
    };

    const handleMouseUp = () => {
        if (!isSelecting || !selectedRegion) return;

        setIsSelecting(false);
        setStartPos(null);

        if (onRegionSelect) {
            onRegionSelect(selectedRegion);
        }
    };

    const clearSelection = () => {
        setSelectedRegion(null);
        if (onRegionSelect) {
            onRegionSelect(null);
        }
    };

    const getFrequencyAtY = (y) => {
        if (!spectrogramData) return 0;
        const freqIndex = Math.floor((1 - y) * spectrogramData.frequencies.length);
        return spectrogramData.frequencies[freqIndex] || 0;
    };

    const getTimeAtX = (x) => {
        if (!spectrogramData) return 0;
        const timeIndex = Math.floor(x * spectrogramData.timeStamps.length);
        return spectrogramData.timeStamps[timeIndex] || 0;
    };

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                    Spektrogramm Analyse
                </h3>

                {/* Colormap Selection */}
                <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-300">Farbschema:</label>
                    <select
                        value={colormap}
                        onChange={(e) => {
                            // This would need to be passed up to parent component
                            console.log('Colormap changed to:', e.target.value);
                        }}
                        className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 text-sm"
                    >
                        {colormaps.map(cm => (
                            <option key={cm.id} value={cm.id}>
                                {cm.name} - {cm.description}
                            </option>
                        ))}
                    </select>

                    {selectedRegion && (
                        <button
                            onClick={clearSelection}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                            Auswahl löschen
                        </button>
                    )}
                </div>
            </div>

            {/* Canvas Container */}
            <div className="relative border border-gray-600 rounded">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="w-full h-auto cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="text-white">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">Rendering...</p>
                        </div>
                    </div>
                )}

                {!spectrogramData && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <p className="text-gray-400">Keine Spektrogramm-Daten verfügbar</p>
                    </div>
                )}
            </div>

            {/* Axes Labels */}
            <div className="mt-2 text-xs text-gray-400">
                <div className="flex justify-between">
                    <span>Zeit →</span>
                    <span>Frequenz ↑</span>
                </div>

                {spectrogramData && (
                    <div className="flex justify-between mt-1">
                        <span>0s</span>
                        <span>{spectrogramData.duration.toFixed(1)}s</span>
                    </div>
                )}
            </div>

            {/* Selection Info */}
            {selectedRegion && spectrogramData && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded text-sm text-gray-300">
                    <h4 className="font-medium mb-2">Ausgewählter Bereich:</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div>Zeit: {getTimeAtX(selectedRegion.startX).toFixed(2)}s - {getTimeAtX(selectedRegion.endX).toFixed(2)}s</div>
                            <div>Dauer: {(getTimeAtX(selectedRegion.endX) - getTimeAtX(selectedRegion.startX)).toFixed(2)}s</div>
                        </div>
                        <div>
                            <div>Freq: {getFrequencyAtY(selectedRegion.endY).toFixed(0)}Hz - {getFrequencyAtY(selectedRegion.startY).toFixed(0)}Hz</div>
                            <div>Bereich: {(getFrequencyAtY(selectedRegion.startY) - getFrequencyAtY(selectedRegion.endY)).toFixed(0)}Hz</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-4 text-xs text-gray-500">
                💡 Klicke und ziehe über das Spektrogramm, um einen Bereich für die 3D-Textur auszuwählen
            </div>
        </div>
    );
};

export default SpectrogramViewer;