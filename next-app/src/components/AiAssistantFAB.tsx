'use client';
import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import AiAnalyzerModal from './AiAnalyzerModal';

export default function AiAssistantFAB() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* FAB Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[90] flex items-center justify-center p-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/50 hover:scale-105 active:scale-95 transition-all group border border-white/20"
                aria-label="Abrir Analizador IA"
            >
                <div className="relative">
                    <Bot size={28} />
                    <Sparkles size={14} className="absolute -top-1 -right-2 text-yellow-300 animate-pulse" />
                </div>
                
                {/* Tooltip on hover (desktop only) */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-xs font-medium text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block border border-gray-700">
                    Analizador de Plantas
                </div>
            </button>

            {/* Modal */}
            {isOpen && <AiAnalyzerModal onClose={() => setIsOpen(false)} />}
        </>
    );
}
