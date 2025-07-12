import React from 'react';

interface FloatingActionsBarProps {

    onHighlight: () => void;
    onToggleTTS: () => void;
    onGenerateQuiz: () => void;
    onToggleMindMap: () => void;
    isTTSActive: boolean;
}

/**
 * Barra de ações flutuantes com ícones claros para cada função.
 */
export const FloatingActionsBar: React.FC<FloatingActionsBarProps> = ({
 
    onHighlight,
    onToggleTTS,
    onGenerateQuiz,
    onToggleMindMap,
    isTTSActive,
}) => {
    return (
        <div className="fixed bottom-4 right-4 z-30 flex flex-col space-y-2">
            {/* Botões de ação flutuantes com ícones e animações sutis */}            
            <button
                onClick={onHighlight}
                title="Marcar Texto Selecionado"
                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75"
            >
                {/* <IconHighlight /> */}
                🖍️
            </button>
            <button
                type="button"
                onClick={() => {
                    console.log("Botão TTS clicado");
                    onToggleTTS();
                }}
                title={isTTSActive ? "Parar Leitura" : "Ler Conteúdo em Voz Alta"}
                className={`${isTTSActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ${isTTSActive ? 'focus:ring-red-400' : 'focus:ring-green-400'} focus:ring-opacity-75`}
            >
                {/* <IconTTS /> */}
                🔊
            </button>
            <button
                onClick={onGenerateQuiz}
                title="Gerar Quiz Rápido"
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75"
            >
                {/* <IconQuiz /> */}
                🏆
            </button>
            
        </div>
    );
};

// Exemplo de uso do FloatingActionsBar (substitua ttsHook por suas funções reais)
const fakeTTSHook = {
    toggleTTS: () => {},
    ttsActive: false,
};

<FloatingActionsBar

    onHighlight={() => {}}
    onToggleTTS={fakeTTSHook.toggleTTS}
    onGenerateQuiz={() => {}}
    onToggleMindMap={() => {}}
    isTTSActive={fakeTTSHook.ttsActive}
/>

