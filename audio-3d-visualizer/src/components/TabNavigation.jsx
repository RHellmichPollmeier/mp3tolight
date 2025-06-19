// components/TabNavigation.jsx
import React from 'react';

const TabNavigation = ({ tabs, activeTab, onTabChange, analysisData }) => {
    return (
        <div className="px-6 mb-6">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                                }`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            <span className="font-medium">{tab.label}</span>
                            {/* Green dot if analysis is available */}
                            {analysisData[tab.id] && (
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-gray-400 text-sm mt-2 px-2">
                    {tabs.find(tab => tab.id === activeTab)?.description}
                </p>
            </div>
        </div>
    );
};

export default TabNavigation;