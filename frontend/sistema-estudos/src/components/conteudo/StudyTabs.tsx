import React from 'react';
import { BookOpenIcon, ClipboardIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Define os tipos possíveis para as abas
type StudyTab = 'content' | 'summary' | 'qa';

interface StudyTabsProps {
  activeTab: StudyTab;
  setActiveTab: (tab: StudyTab) => void;
  summaryContent: React.ReactNode; // Conteúdo da aba Resumo
  qaContent: React.ReactNode; // Conteúdo da aba Anotações/Perguntas
  contentDisplay: React.ReactNode; // O componente que exibe o conteúdo principal
  middleTabLabel?: string; // Rótulo da aba do meio (padrão: "Resumo")
  renderMiddleHeader?: boolean; // Exibe o título interno da aba do meio
}

/**
 * Componente que gerencia a navegação por abas com estilo visual aprimorado.
 */
export const StudyTabs: React.FC<StudyTabsProps> = ({
  activeTab,
  setActiveTab,
  summaryContent,
  qaContent,
  contentDisplay,
  middleTabLabel = 'Resumo',
  renderMiddleHeader = true,
}) => {

  // Função para obter classes CSS dinâmicas para as abas
  const getTabClassName = (tabName: StudyTab): string => {
    const baseClasses = "px-5 py-2.5 text-sm font-medium leading-5 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 ease-in-out";
    if (activeTab === tabName) {
      // Estilo da aba ativa: fundo branco, texto índigo, borda inferior índigo
      return `${baseClasses} bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm`;
    } else {
      // Estilo da aba inativa: fundo transparente, texto cinza, hover com fundo leve
      return `${baseClasses} text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-b-2 hover:border-indigo-300`;
    }
  };

  return (
    <div className="w-full mt-6">
      {/* Navegação das Abas - com borda inferior para separar */}
      <div className="flex border-b border-gray-200">
        <button
          className={getTabClassName('content')}
          onClick={() => setActiveTab('content')}
        >
          <BookOpenIcon className="h-5 w-5 mr-1" /> Conteúdo
        </button>
        <button
          className={getTabClassName('summary')}
          onClick={() => setActiveTab('summary')}
        >
          <ClipboardIcon className="h-5 w-5 mr-1" /> {middleTabLabel}
        </button>
        <button
          className={getTabClassName('qa')}
          onClick={() => setActiveTab('qa')}
        >
          <QuestionMarkCircleIcon className="h-5 w-5 mr-1" /> Anotações & Perguntas
        </button>
      </div>

      {/* Conteúdo da Aba Ativa - com um padding superior para espaçamento */}
      <div className="tab-content mt-5">
        {activeTab === 'content' && (
          <div>
            {contentDisplay}
          </div>
        )}
        {activeTab === 'summary' && (
          <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
            {renderMiddleHeader && (
              <h3 className="text-xl font-semibold mb-3 text-indigo-700">{middleTabLabel}</h3>
            )}
            <div className="prose prose-sm max-w-none text-gray-800">
              {typeof summaryContent === 'string' ? (
                <pre className="whitespace-pre-wrap font-sans bg-gray-50 p-3 rounded">{summaryContent}</pre>
              ) : (
                summaryContent
              )}
            </div>
          </div>
        )}
        {activeTab === 'qa' && (
           // O conteúdo QA é renderizado pelo componente StudyAids, que terá seu próprio estilo
           // Não precisa de um container extra aqui se StudyAids já tiver um.
          <div>
            {qaContent}
          </div>
        )}
      </div>

      {/* Novo bloco para Anotações Rápidas, sempre visível abaixo das abas */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold text-blue-800 mb-2">📌 Anotações Rápidas</h4>
        <textarea 
          className="w-full p-2 border rounded-lg" 
          placeholder="Escreva suas anotações aqui..."
          rows={3}
        />
        <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition">
          Salvar
        </button>
      </div>
    </div>
  );
};

