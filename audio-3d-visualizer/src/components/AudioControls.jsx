// components/AudioControls.jsx
import React, { useRef } from 'react';
import { Upload, Play, Pause, Download, Settings } from 'lucide-react';
import { exportSTL } from '../utils/stlExporter';

const AudioControls = ({
    audioFile,
    isPlaying,
    onFileUpload,
    onPlayToggle,
    analysisData,
    meshRef,
    activeTab
}) => {
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);

    // Handle File Upload
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            onFileUpload(file);
        }
    };

    // Toggle Audio Playback
    const togglePlayback = async () => {
        if (!audioFile) return;

        if (isPlaying) {
            audioRef.current?.pause();
            onPlayToggle(false);
        } else {
            if (!audioRef.current) {
                const audio = new Audio(URL.createObjectURL(audioFile));
                audioRef.current = audio;

                // Setup Web Audio API für Visualisierung
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                }

                const source = audioContextRef.current.createMediaElementSource(audio);
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 256;

                source.connect(analyser);
                analyser.connect(audioContextRef.current.destination);
                analyserRef.current = analyser;
            }

            audioRef.current.play();
            onPlayToggle(true);
        }
    };

    // Handle STL Export
    const handleSTLExport = () => {
        if (meshRef?.current && audioFile) {
            exportSTL(meshRef.current, audioFile.name, activeTab);
        }
    };

    return (
        <>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Steuerung
            </h2>

            {/* File Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Audio-Datei
                </label>
                <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="audio-upload"
                />
                <label
                    htmlFor="audio-upload"
                    className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-400 transition-colors"
                >
                    <Upload className="w-5 h-5" />
                    <span className="text-gray-300">
                        {audioFile ? audioFile.name : 'Audio-Datei auswählen'}
                    </span>
                </label>
            </div>

            {/* Playback Controls */}
            {audioFile && (
                <div className="flex gap-2">
                    <button
                        onClick={togglePlayback}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause' : 'Play'}
                    </button>

                    <button
                        onClick={handleSTLExport}
                        disabled={!analysisData}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        STL Export
                    </button>
                </div>
            )}

            {/* Analysis Info */}
            {analysisData && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-white mb-2">Audio-Info</h3>
                    <div className="text-xs text-gray-300 space-y-1">
                        {analysisData.tempo && (
                            <div>BPM: {Math.round(analysisData.tempo)}</div>
                        )}
                        {analysisData.beats && (
                            <div>Beats: {analysisData.beats.length}</div>
                        )}
                        {analysisData.duration && (
                            <div>Dauer: {analysisData.duration.toFixed(1)}s</div>
                        )}
                        <div>Typ: {analysisData.type || 'Basic'}</div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AudioControls;