// hooks/useAudioAnalysis.js
import { useState } from 'react';

export const useAudioAnalysis = () => {
    const [analysisData, setAnalysisData] = useState({
        basic: null,
        chroma: null,
        beats: null,
        frequency: null,
        spectral: null,
        tempo: null
    });

    const [audioBuffer, setAudioBuffer] = useState(null);

    // Lazy load analysis modules
    const loadAnalysisModule = async (tabId) => {
        switch (tabId) {
            case 'basic':
                const { analyzeBasic } = await import('../audio/basicAnalysis.js');
                return analyzeBasic;
            case 'chroma':
                const { analyzeChroma } = await import('../audio/chromaAnalysis.js');
                return analyzeChroma;
            /* case 'beats':
                const { analyzeBeats } = await import('../audio/beatAnalysis.js');
                return analyzeBeats;
            case 'frequency':
                const { analyzeFrequency } = await import('../audio/frequencyAnalysis.js');
                return analyzeFrequency;
            case 'spectral':
                const { analyzeSpectral } = await import('../audio/spectralAnalysis.js');
                return analyzeSpectral;
            case 'tempo':
                const { analyzeTempo } = await import('../audio/tempoAnalysis.js');
                return analyzeTempo; */
            default:
                const { analyzeBasic: defaultAnalyze } = await import('../audio/basicAnalysis.js');
                return defaultAnalyze;
        }
    };

    // Analyze for specific tab
    const analyzeForTab = async (tabId, buffer) => {
        if (!buffer) return null;

        // Store audio buffer
        setAudioBuffer(buffer);

        // Check if analysis already exists
        if (analysisData[tabId]) {
            console.log(`Analysis für ${tabId} bereits vorhanden`);
            return analysisData[tabId];
        }

        try {
            console.log(`Lade Analyse-Modul für: ${tabId}`);

            // Dynamically load analysis module
            const analyzeFunction = await loadAnalysisModule(tabId);

            console.log(`Starte Analyse für: ${tabId}`);

            // Run analysis
            const result = await analyzeFunction(buffer);

            // Store result
            setAnalysisData(prev => ({
                ...prev,
                [tabId]: result
            }));

            console.log(`Analyse abgeschlossen für: ${tabId}`, result);
            return result;

        } catch (error) {
            console.error(`Fehler bei der Analyse für ${tabId}:`, error);
            return null;
        }
    };

    // Clear all analysis data
    const clearAnalysisData = () => {
        setAnalysisData({
            basic: null,
            chroma: null,
            beats: null,
            frequency: null,
            spectral: null,
            tempo: null
        });
        setAudioBuffer(null);
    };

    return {
        analysisData,
        audioBuffer,
        analyzeForTab,
        clearAnalysisData,
        setAudioBuffer
    };
};