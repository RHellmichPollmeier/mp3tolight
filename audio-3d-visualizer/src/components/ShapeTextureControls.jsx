// components/ShapeTextureControls.jsx
import React from 'react';
import { Palette, Box, Layers, Zap, Eye, Download } from 'lucide-react';

const ShapeTextureControls = ({
    selectedShape,
    selectedMapping,
    textureParams,
    onShapeChange,
    onMappingChange,
    onParamsChange,
    hasSpectrogramData
}) => {

    // Available 3D shapes for spectrogram mapping
    const availableShapes = [
        {
            id: 'lightbulb',
            name: '💡 Glühbirne',
            description: 'Klassische Birnenform mit breiter Basis',
            complexity: 'medium'
        },
        {
            id: 'sphere',
            name: '🌍 Kugel',
            description: 'Perfekte Sphäre für gleichmäßige Mapping',
            complexity: 'simple'
        },
        {
            id: 'cylinder',
            name: '🥤 Zylinder',
            description: 'Gerade Wände, ideal für Zeit-Frequenz Mapping',
            complexity: 'simple'
        },
        {
            id: 'torus',
            name: '🍩 Torus',
            description: 'Donut-Form für zyklische Strukturen',
            complexity: 'medium'
        },
        {
            id: 'cone',
            name: '📐 Kegel',
            description: 'Spitz zulaufend, betont hohe Frequenzen',
            complexity: 'simple'
        },
        {
            id: 'diamond',
            name: '💎 Diamant',
            description: 'Facettierte Kristallform',
            complexity: 'complex'
        },
        {
            id: 'organic',
            name: '🌊 Organisch',
            description: 'Fließende, natürliche Form',
            complexity: 'complex'
        },
        {
            id: 'spiral',
            name: '🌀 Spirale',
            description: 'Spiralförmig für zeitliche Entwicklung',
            complexity: 'complex'
        }
    ];

    // Available mapping modes
    const mappingModes = [
        {
            id: 'displacement',
            name: 'Verschiebung',
            icon: '⬆️',
            description: 'Spektrogramm-Werte verschieben Vertices nach außen'
        },
        {
            id: 'color',
            name: 'Farbe',
            icon: '🎨',
            description: 'Spektrogramm wird auf Farbe gemappt'
        },
        {
            id: 'normal',
            name: 'Normale',
            icon: '🔺',
            description: 'Beeinflusst Oberflächennormalen für Beleuchtung'
        },
        {
            id: 'emission',
            name: 'Emission',
            icon: '✨',
            description: 'Spektrogramm steuert Selbstleuchtung'
        },
        {
            id: 'hybrid',
            name: 'Hybrid',
            icon: '🔀',
            description: 'Kombination aus Verschiebung und Farbe'
        }
    ];

    const handleParamChange = (paramName, value) => {
        onParamsChange({
            [paramName]: parseFloat(value)
        });
    };

    const getComplexityBadge = (complexity) => {
        const styles = {
            simple: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            complex: 'bg-red-100 text-red-800'
        };
        return styles[complexity] || styles.simple;
    };

    return (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Box className="w-5 h-5" />
                Form & Textur Steuerung
            </h3>

            {/* Shape Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    3D-Form auswählen
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {availableShapes.map((shape) => (
                        <button
                            key={shape.id}
                            onClick={() => onShapeChange(shape.id)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${selectedShape === shape.id
                                    ? 'border-purple-400 bg-purple-500/20 text-white'
                                    : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                                }`}
                        >
                            <div className="font-medium text-sm">{shape.name}</div>
                            <div className="text-xs text-gray-400 mt-1">{shape.description}</div>
                            <div className="mt-2">
                                <span className={`px-2 py-1 rounded text-xs ${getComplexityBadge(shape.complexity)}`}>
                                    {shape.complexity}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mapping Mode Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Mapping-Modus
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {mappingModes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => onMappingChange(mode.id)}
                            className={`p-3 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 ${selectedMapping === mode.id
                                    ? 'border-purple-400 bg-purple-500/20 text-white'
                                    : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                                }`}
                        >
                            <span className="text-lg">{mode.icon}</span>
                            <div>
                                <div className="font-medium">{mode.name}</div>
                                <div className="text-sm text-gray-400">{mode.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Texture Parameters */}
            <div className="space-y-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Textur Parameter
                </h4>

                {/* Displacement Scale */}
                {(selectedMapping === 'displacement' || selectedMapping === 'hybrid') && (
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Verschiebungs-Stärke
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={textureParams.displacementScale || 0.5}
                            onChange={(e) => handleParamChange('displacementScale', e.target.value)}
                            className="w-full"
                        />
                        <span className="text-xs text-gray-400">
                            {textureParams.displacementScale || 0.5}
                        </span>
                    </div>
                )}

                {/* Color Intensity */}
                {(selectedMapping === 'color' || selectedMapping === 'hybrid') && (
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Farb-Intensität
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={textureParams.colorIntensity || 1.0}
                            onChange={(e) => handleParamChange('colorIntensity', e.target.value)}
                            className="w-full"
                        />
                        <span className="text-xs text-gray-400">
                            {textureParams.colorIntensity || 1.0}
                        </span>
                    </div>
                )}

                {/* Normal Scale */}
                {selectedMapping === 'normal' && (
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Normal-Stärke
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={textureParams.normalScale || 1.0}
                            onChange={(e) => handleParamChange('normalScale', e.target.value)}
                            className="w-full"
                        />
                        <span className="text-xs text-gray-400">
                            {textureParams.normalScale || 1.0}
                        </span>
                    </div>
                )}

                {/* Emission Intensity */}
                {selectedMapping === 'emission' && (
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Emissions-Intensität
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={textureParams.emissionIntensity || 2.0}
                            onChange={(e) => handleParamChange('emissionIntensity', e.target.value)}
                            className="w-full"
                        />
                        <span className="text-xs text-gray-400">
                            {textureParams.emissionIntensity || 2.0}
                        </span>
                    </div>
                )}

                {/* Universal Parameters */}
                <div>
                    <label className="block text-sm text-gray-300 mb-1">
                        Textur-Auflösung
                    </label>
                    <select
                        value={textureParams.textureResolution || 'medium'}
                        onChange={(e) => onParamsChange({ textureResolution: e.target.value })}
                        className="w-full p-2 bg-gray-800 text-white rounded border border-gray-600"
                    >
                        <option value="low">Niedrig (64x64)</option>
                        <option value="medium">Mittel (128x128)</option>
                        <option value="high">Hoch (256x256)</option>
                        <option value="ultra">Ultra (512x512)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-300 mb-1">
                        Frequenz-Bereich
                    </label>
                    <select
                        value={textureParams.frequencyRange || 'full'}
                        onChange={(e) => onParamsChange({ frequencyRange: e.target.value })}
                        className="w-full p-2 bg-gray-800 text-white rounded border border-gray-600"
                    >
                        <option value="full">Vollspektrum</option>
                        <option value="bass">Bass (20-250 Hz)</option>
                        <option value="mid">Mitten (250-4000 Hz)</option>
                        <option value="treble">Höhen (4000+ Hz)</option>
                        <option value="custom">Benutzerdefiniert</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-300 mb-1">
                        Glättung
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={textureParams.smoothing || 0.3}
                        onChange={(e) => handleParamChange('smoothing', e.target.value)}
                        className="w-full"
                    />
                    <span className="text-xs text-gray-400">
                        {textureParams.smoothing || 0.3}
                    </span>
                </div>
            </div>

            {/* Quality Settings */}
            <div className="border-t border-gray-600 pt-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4" />
                    Qualitäts-Einstellungen
                </h4>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Mesh-Auflösung
                        </label>
                        <select
                            value={textureParams.meshResolution || 'medium'}
                            onChange={(e) => onParamsChange({ meshResolution: e.target.value })}
                            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-600 text-sm"
                        >
                            <option value="low">Niedrig</option>
                            <option value="medium">Mittel</option>
                            <option value="high">Hoch</option>
                            <option value="ultra">Ultra</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Anti-Aliasing
                        </label>
                        <select
                            value={textureParams.antiAliasing || 'on'}
                            onChange={(e) => onParamsChange({ antiAliasing: e.target.value })}
                            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-600 text-sm"
                        >
                            <option value="off">Aus</option>
                            <option value="on">An</option>
                            <option value="high">Hoch</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t border-gray-600 pt-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4" />
                    Erweiterte Optionen
                </h4>

                <div className="space-y-3">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={textureParams.useLogScale || false}
                            onChange={(e) => onParamsChange({ useLogScale: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm text-gray-300">Log-Frequenz Skalierung</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={textureParams.enableAnimation || false}
                            onChange={(e) => onParamsChange({ enableAnimation: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm text-gray-300">Animation aktivieren</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={textureParams.enablePBR || true}
                            onChange={(e) => onParamsChange({ enablePBR: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm text-gray-300">PBR Material verwenden</span>
                    </label>
                </div>
            </div>

            {/* Status and Actions */}
            <div className="border-t border-gray-600 pt-4">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                        {hasSpectrogramData ? (
                            <span className="text-green-400">✅ Spektrogramm bereit</span>
                        ) : (
                            <span className="text-yellow-400">⏳ Warten auf Spektrogramm...</span>
                        )}
                    </div>

                    <button
                        disabled={!hasSpectrogramData}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Textur exportieren
                    </button>
                </div>
            </div>

            {/* Presets */}
            <div className="border-t border-gray-600 pt-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4" />
                    Voreinstellungen
                </h4>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onParamsChange({
                            displacementScale: 0.8,
                            colorIntensity: 1.2,
                            smoothing: 0.2,
                            textureResolution: 'high'
                        })}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                    >
                        🎵 Musik-optimiert
                    </button>

                    <button
                        onClick={() => onParamsChange({
                            displacementScale: 1.5,
                            colorIntensity: 0.8,
                            smoothing: 0.1,
                            textureResolution: 'medium'
                        })}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                    >
                        🎙️ Sprach-optimiert
                    </button>

                    <button
                        onClick={() => onParamsChange({
                            displacementScale: 0.3,
                            colorIntensity: 2.0,
                            smoothing: 0.6,
                            textureResolution: 'ultra'
                        })}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                    >
                        🎨 Künstlerisch
                    </button>

                    <button
                        onClick={() => onParamsChange({
                            displacementScale: 0.5,
                            colorIntensity: 1.0,
                            smoothing: 0.3,
                            textureResolution: 'medium'
                        })}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                    >
                        ⚙️ Standard
                    </button>
                </div>
            </div>

            {/* Help Text */}
            <div className="bg-gray-800/30 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                    💡 <strong>Tipp:</strong> Experimentiere mit verschiedenen Formen und Mapping-Modi!
                    Die Glühbirne eignet sich gut für Musik, während der Zylinder perfekt für
                    Zeit-Frequenz-Analysen ist.
                </p>
            </div>
        </div>
    );
};

export default ShapeTextureControls;