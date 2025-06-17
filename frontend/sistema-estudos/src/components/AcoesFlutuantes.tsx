import React from "react";
import { BotaoAcao } from "./BotaoAcao";


function Divider() {
  return <div className="w-8 border-t border-gray-100 my-1" />;
}

export function AcoesFlutuantes({
  onHighlight, onCopy, onTTS, ttsActive, onQuiz, onMindMap, showMindMap
}: {
  onHighlight: () => void;
  onCopy: () => void;
  onTTS: () => void;
  ttsActive: boolean;
  onQuiz: () => void;
  onMindMap: () => void;
  showMindMap: boolean;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 group">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col items-center py-2 px-1 transition-all duration-200">
        <BotaoAcao onClick={onHighlight} icon="fa-highlighter" color="text-yellow-600" tooltip="Marcar texto" />
        <Divider />
        <BotaoAcao onClick={onCopy} icon="fa-copy" color="text-indigo-600" tooltip="Copiar conteúdo" />
        <Divider />
        <BotaoAcao onClick={onTTS} icon={ttsActive ? "fa-stop" : "fa-volume-up"} color="text-blue-600" tooltip={ttsActive ? "Parar áudio" : "Ouvir conteúdo"} active={ttsActive} />
        <Divider />
        <BotaoAcao onClick={onQuiz} icon="fa-question" color="text-green-600" tooltip="Quiz rápido" />
        <Divider />
        <BotaoAcao onClick={onMindMap} icon="fa-project-diagram" color="text-purple-600" tooltip="Mapa mental" active={showMindMap} />
      </div>
    </div>
  );
}