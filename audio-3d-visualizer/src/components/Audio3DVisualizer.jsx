import React, { useState, useRef } from 'react';
import TabNavigation from './TabNavigation';
import AudioControls from './AudioControls';
import ParameterControls from './ParameterControls';
import ThreeJSViewer from './ThreeJSViewer';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';

const Audio3DVisualizer = () => {
    const meshRef = useRef(null);
    const [audioFile, setAudioFile] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [isProcessing, setIsProcessing] = useState(false);

    // Audio Analysis Hook
    const {
        analysisData,
        analyzeForTab,
        audioBuffer,
        setAudioBuffer
    } = useAudioAnalysis();

    // Parameter für verschiedene Analysen
    const [params, setParams] = useState({
        // Basic Parameters
        baseRadius: 2,
        heightScale: 8,
        segments: 32,
        rings: 64,
        amplitudeScale: 1.5,
        waveComplexity: 3,
        smoothing: 0.8,
        lampStyle: 'organic',

        // Tab-specific Parameters
        chromaIntensity: 1.0,
        beatSensitivity: 0.8,
        beatRidgeDepth: 0.5,
        bassWeight: 1.0,
        midWeight: 1.0,
        trebleWeight: 1.0,
        brightnessScale: 1.0,
        tempoSpiralFactor: 1.0
    });

    // Available Tabs
    const tabs = [
        {
            id: 'basic',
            label: '3D Basic',
            icon: '🎵',
            description: 'Grundlegende Amplituden-Visualisierung'
        },
        {
            id: 'chroma',
            label: 'Chroma Features',
            icon: '🌈',
            description: 'Tonhöhen-Analyse (12 chromatische Töne)'
        },
        {
            id: 'beats',
            label: 'Beat Detection',
            icon: '🥁',
            description: 'Rhythmus und Schlag-Erkennung'
        },
        {
            id: 'frequency',
            label: 'Frequency Bands',
            icon: '📊',
            description: 'Bass, Mitten, Höhen getrennt'
        },
        {
            id: 'spectral',
            label: 'Spectral Analysis',
            icon: '⚡',
            description: 'Spektrale Eigenschaften (Helligkeit, Bandbreite)'
        },
        {
            id: 'tempo',
            label: 'Tempo Analysis',
            icon: '📈',
            description: 'BPM und Tempo-Variationen'
        }
    ];

    // Handle File Upload
    const handleFileUpload = async (file) => {
        setAudioFile(file);
        setIsProcessing(true);

        try {
            // Lade Audio-Buffer
            const buffer = await loadAudioBuffer(file);
            if (buffer) {
                setAudioBuffer(buffer);
                // Analysiere für den aktuellen Tab
                await analyzeForTab(activeTab, buffer);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Audio-Datei:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Load Audio Buffer
    const loadAudioBuffer = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            return buffer;
        } catch (error) {
            console.error('Fehler beim Laden des Audio-Buffers:', error);
            return null;
        }
    };

    // Handle Tab Change (Lazy Loading)
    const handleTabChange = async (tabId) => {
        setActiveTab(tabId);

        // Wenn noch keine Analyse für diesen Tab und Audio verfügbar
        if (audioBuffer && !analysisData[tabId]) {
            setIsProcessing(true);
            await analyzeForTab(tabId, audioBuffer);
            setIsProcessing(false);
        }
    };

    // Get Tab-specific Parameters
    const getTabParameters = () => {
        switch (activeTab) {
            case 'chroma':
                return ['chromaIntensity'];
            case 'beats':
                return ['beatSensitivity', 'beatRidgeDepth'];
            case 'frequency':
                return ['bassWeight', 'midWeight', 'trebleWeight'];
            case 'spectral':
                return ['brightnessScale'];
            case 'tempo':
                return ['tempoSpiralFactor'];
            default:
                return ['baseRadius', 'heightScale', 'segments', 'rings', 'amplitudeScale', 'waveComplexity', 'smoothing', 'lampStyle'];
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-0">
            <div className="w-full">
                <h1 className="text-4xl font-bold text-white mb-8 text-center px-6">
                    Audio 3D Visualizer & STL Generator
                </h1>

                {/* Tab Navigation */}
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    analysisData={analysisData}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6">
                    {/* Controls */}
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 space-y-4">

                        {/* Audio Controls */}
                        <AudioControls
                            audioFile={audioFile}
                            isPlaying={isPlaying}
                            onFileUpload={handleFileUpload}
                            onPlayToggle={setIsPlaying}
                            analysisData={analysisData[activeTab]}
                            meshRef={meshRef}
                            activeTab={activeTab}
                        />

                        {/* Parameter Controls */}
                        <ParameterControls
                            params={params}
                            onParamsChange={setParams}
                            availableParams={getTabParameters()}
                            activeTab={activeTab}
                            tabs={tabs}
                        />
                    </div>

                    {/* 3D Viewer */}
                    <div className="lg:col-span-2">
                        <ThreeJSViewer
                            analysisData={analysisData[activeTab]}
                            params={params}
                            activeTab={activeTab}
                            isPlaying={isPlaying}
                            isProcessing={isProcessing}
                            audioFile={audioFile}
                            tabs={tabs}
                            meshRef={meshRef}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Audio3DVisualizer;