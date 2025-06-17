import React, { useRef, useEffect } from 'react';

interface ContentDisplayProps {
  contentHtml: string | null | undefined;
  contentRef: React.RefObject<HTMLDivElement>; // Ref para o container do conteúdo
}

/**
 * Componente responsável por renderizar o conteúdo HTML principal.
 *
 * Utiliza `dangerouslySetInnerHTML` para renderizar o HTML recebido.
 * Expõe uma ref (`contentRef`) para que hooks externos (como useHighlighting, useTTS)
 * possam interagir com o DOM renderizado.
 */
export const ContentDisplay: React.FC<ContentDisplayProps> = ({ contentHtml, contentRef }) => {

  if (!contentHtml) {
    // Estado de carregamento aprimorado
    return <div ref={contentRef} className="content-area p-6 text-gray-500 bg-gray-50 rounded-lg shadow-inner">Carregando conteúdo...</div>;
  }

  return (
    <div
      ref={contentRef} // Associa a ref passada ao elemento div
      id="conteudo-html" // Mantém o ID original para compatibilidade
      // Estilos do Prose refinados para melhor legibilidade e apelo visual
      className="prose prose-lg max-w-none p-6 bg-white rounded-lg shadow-sm border border-gray-200 prose-headings:text-gray-800 prose-p:text-gray-700 prose-a:text-indigo-600 hover:prose-a:text-indigo-800 prose-strong:text-gray-800 prose-blockquote:border-l-indigo-500 prose-blockquote:text-gray-600 prose-li:marker:text-indigo-500"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
};

// Exemplo de uso do componente ContentDisplay:
// <ContentDisplay contentHtml={algumConteudo.content_html} contentRef={algumaRef} />

