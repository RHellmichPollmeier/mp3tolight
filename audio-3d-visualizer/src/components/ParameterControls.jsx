// components/ParameterControls.jsx
import React from 'react';

const ParameterControls = ({
    params,
    onParamsChange,
    availableParams,
    activeTab,
    tabs
}) => {

    const handleParameterChange = (key, value) => {
        onParamsChange(prev => ({
            ...prev,
            [key]: parseFloat(value)
        }));
    };

    const getParameterConfig = (key) => {
        const configs = {
            // Basic Parameters
            baseRadius: { min: 0.5, max: 5, step: 0.1 },
            heightScale: { min: 2, max: 20, step: 0.5 },
            segments: { min: 8, max: 64, step: 1 },
            rings: { min: 16, max: 128, step: 1 },
            amplitudeScale: { min: 0.1, max: 5, step: 0.1 },
            waveComplexity: { min: 1, max: 10, step: 1 },
            smoothing: { min: 0, max: 1, step: 0.1 },

            // Tab-specific Parameters
            chromaIntensity: { min: 0.1, max: 3, step: 0.1 },
            beatSensitivity: { min: 0.1, max: 1, step: 0.1 },
            beatRidgeDepth: { min: 0.1, max: 2, step: 0.1 },
            bassWeight: { min: 0.1, max: 3, step: 0.1 },
            midWeight: { min: 0.1, max: 3, step: 0.1 },
            trebleWeight: { min: 0.1, max: 3, step: 0.1 },
            brightnessScale: { min: 0.1, max: 3, step: 0.1 },
            tempoSpiralFactor: { min: 0.1, max: 3, step: 0.1 }
        };

        return configs[key] || { min: 0.1, max: 5, step: 0.1 };
    };

    const formatParameterName = (key) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">
                Parameter - {tabs.find(t => t.id === activeTab)?.label}
            </h3>

            {/* Lampen-Stil Auswahl (nur bei Basic Tab) */}
            {activeTab === 'basic' && availableParams.includes('lampStyle') && (
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Lampen-Stil</label>
                    <select
                        value={params.lampStyle}
                        onChange={(e) => onParamsChange(prev => ({ ...prev, lampStyle: e.target.value }))}
                        className="w-full p-2 bg-gray-800 text-white rounded border border-gray-600"
                    >
                        <option value="organic">🌊 Organisch (Wasser)</option>
                        <option value="spiral">🌀 Spiral</option>
                        <option value="twisted">🔄 Gedreht</option>
                        <option value="crystalline">💎 Kristallin</option>
                        <option value="caustic">✨ Kaustik</option>
                    </select>
                </div>
            )}

            {/* Slider Parameters */}
            {availableParams.filter(key => key !== 'lampStyle').map((key) => {
                const config = getParameterConfig(key);
                return (
                    <div key={key}>
                        <label className="block text-sm text-gray-300 mb-1">
                            {formatParameterName(key)}
                        </label>
                        <input
                            type="range"
                            min={config.min}
                            max={config.max}
                            step={config.step}
                            value={params[key]}
                            onChange={(e) => handleParameterChange(key, e.target.value)}
                            className="w-full"
                        />
                        <span className="text-xs text-gray-400">{params[key]}</span>
                    </div>
                );
            })}

            {/* Parameter Description */}
            <div className="bg-gray-800/30 rounded-lg p-3 mt-4">
                <p className="text-xs text-gray-400">
                    💡 Tipp: Experimentiere mit verschiedenen Parametern, um einzigartige Lampenformen zu erstellen!
                </p>
            </div>
        </div>
    );
};

export default ParameterControls;