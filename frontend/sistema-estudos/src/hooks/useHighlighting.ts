import { useCallback, useRef } from "react";
import { toast } from "react-toastify";

interface UseHighlightingProps {
  contentRef: React.RefObject<HTMLElement>; // Ref para o container principal do conteúdo
  highlightClassName?: string; // Classe CSS para o span de marcação
  highlightStyle?: React.CSSProperties; // Estilos inline para o span
}

const DEFAULT_HIGHLIGHT_CLASS = "highlighted-text";
const DEFAULT_HIGHLIGHT_STYLE: React.CSSProperties = {
  backgroundColor: "#fff59d", // Amarelo claro
  borderRadius: "4px",
  padding: "0 2px",
  cursor: "pointer",
  // Adicionaremos o title dinamicamente
};

export const useHighlighting = ({
  contentRef,
  highlightClassName = DEFAULT_HIGHLIGHT_CLASS,
  highlightStyle = DEFAULT_HIGHLIGHT_STYLE,
}: UseHighlightingProps) => {

  // Função para aplicar a marcação no texto selecionado
  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.info("Selecione um trecho do texto para marcar.");
      return;
    }

    const range = selection.getRangeAt(0);
    const contentElement = contentRef.current;

    // Verifica se a seleção está dentro do container de conteúdo
    if (!contentElement || !contentElement.contains(range.commonAncestorContainer)) {
      toast.warn("Por favor, selecione apenas o texto dentro da área de conteúdo principal.");
      selection.removeAllRanges(); // Limpa a seleção inválida
      return;
    }

    // Cria o elemento span para a marcação
    const span = document.createElement("span");
    span.className = highlightClassName;
    Object.assign(span.style, highlightStyle); // Aplica estilos inline
    span.title = "Clique para remover esta marcação";

    // Adiciona o evento de clique para remover a marcação
    span.onclick = (event) => {
      event.stopPropagation(); // Impede que eventos de clique se propaguem para elementos pais
      const parent = span.parentNode;
      if (parent) {
        // Substitui o span pelo seu conteúdo de texto
        // Usamos span.childNodes para preservar outros nós (como outros spans aninhados, se houver)
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize(); // Junta nós de texto adjacentes que podem ter sido separados
        toast.info("Marcação removida.");
      } else {
          console.warn("Não foi possível remover a marcação: elemento pai não encontrado.");
      }
    };

    try {
      // Envolve o conteúdo selecionado com o span
      // range.surroundContents(span) pode falhar se a seleção cruzar limites de elementos complexos.
      // Uma abordagem mais robusta seria clonar o conteúdo, limpar a seleção e inserir o span com o clone.
      // Mas para casos simples, surroundContents funciona.
      range.surroundContents(span);
      selection.removeAllRanges(); // Limpa a seleção após marcar
      toast.success("Texto marcado! Clique na marcação para remover.");
    } catch (error) {
      console.error("Erro ao aplicar marcação:", error);
      toast.error("Não foi possível marcar esta seleção. Tente selecionar um trecho contínuo dentro de um único parágrafo.");
      // Limpa a seleção em caso de erro
      selection.removeAllRanges();
    }

  }, [contentRef, highlightClassName, highlightStyle]);

  // Função para remover todas as marcações (opcional)
  const removeAllHighlights = useCallback(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const highlightedSpans = contentElement.querySelectorAll(`span.${highlightClassName}`);
    if (highlightedSpans.length === 0) {
        toast.info("Nenhuma marcação encontrada para remover.");
        return;
    }

    highlightedSpans.forEach(span => {
        const parent = span.parentNode;
        if (parent) {
            while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
            parent.normalize();
        }
    });
    toast.success("Todas as marcações foram removidas.");

  }, [contentRef, highlightClassName]);


  return {
    applyHighlight,
    removeAllHighlights, // Exporta a função de remover tudo, se necessário
  };
};

