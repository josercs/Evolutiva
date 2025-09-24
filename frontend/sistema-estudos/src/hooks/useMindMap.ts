import { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";

// Estrutura simplificada para o nó do mapa mental (ajustar conforme necessidade)
interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

// Estrutura para os dados do mapa mental (pode ser mais complexa)
interface MindMapData {
  root: MindMapNode;
}

import { API_BASE_URL } from "../../config";

interface UseMindMapProps {
  contentId: string | undefined;
  contentHtml: string | undefined | null;
  fallbackTopic?: string; // Tópico padrão se não encontrar H1
}

export const useMindMap = ({
  contentId,
  contentHtml,
  fallbackTopic = "Conteúdo Principal",
}: UseMindMapProps) => {
  const [showMindMap, setShowMindMap] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false); // Modo simples (extraído) vs. avançado (IA)
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  // Função interna para extrair mapa mental básico do HTML
  const extractSimpleMindMap = useCallback((html: string): MindMapData | null => {
    if (!html) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Tenta encontrar o título principal (H1 ou similar)
      const rootLabel = doc.querySelector("h1")?.textContent?.trim() || fallbackTopic;
      const rootNode: MindMapNode = { id: "root", label: rootLabel, children: [] };

      // Encontra subtópicos (H2 ou similar)
      const h2Elements = doc.querySelectorAll("h2");
      h2Elements.forEach((h2, index) => {
        const h2Label = h2.textContent?.trim();
        if (h2Label) {
          const h2Node: MindMapNode = { id: `h2-${index}`, label: h2Label, children: [] };

          // Tenta encontrar sub-subtópicos (H3) dentro da seção do H2
          let nextElement = h2.nextElementSibling;
          while (nextElement && nextElement.tagName !== "H2") {
            if (nextElement.tagName === "H3") {
              const h3Label = nextElement.textContent?.trim();
              if (h3Label) {
                h2Node.children?.push({ id: `h3-${index}-${h2Node.children.length}`, label: h3Label });
              }
            }
            // Adicionar lógica para outros elementos se necessário (ex: listas ul/ol)
            nextElement = nextElement.nextElementSibling;
          }
          rootNode.children?.push(h2Node);
        }
      });

      // Se não encontrou H2, tenta pegar parágrafos iniciais ou itens de lista como nós
      if (rootNode.children?.length === 0) {
          const firstParagraphs = Array.from(doc.querySelectorAll("p")).slice(0, 5);
          firstParagraphs.forEach((p, index) => {
              const pLabel = p.textContent?.trim().substring(0, 50); // Limita o tamanho
              if (pLabel) {
                  rootNode.children?.push({ id: `p-${index}`, label: pLabel + "..." });
              }
          });
      }

      return { root: rootNode };
    } catch (error) {
      console.error("Erro ao extrair mapa mental simples:", error);
      toast.error("Não foi possível gerar o mapa mental básico do conteúdo.");
      return null;
    }
  }, [fallbackTopic]);

  // Função para buscar mapa mental avançado da API (ex: Gemini)
  const fetchAdvancedMindMap = useCallback(async () => {
    if (!contentId) {
      toast.error("ID do conteúdo não disponível para gerar mapa mental avançado.");
      return;
    }
    setIsLoadingMap(true);
    setMindMapData(null); // Limpa o mapa anterior
    try {
      // Substitua pela chamada real da sua API
      // const response = await fetch(`${API_BASE_URL}/api/generate_mindmap/${contentId}`);
      // if (!response.ok) throw new Error("Erro na API do mapa mental");
      // const data = await response.json();

      // **Simulação de resposta da API**
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simula delay da rede
      const data: MindMapData = {
          root: {
              id: "root-ai",
              label: fallbackTopic + " (Avançado)",
              children: [
                  { id: "ai-1", label: "Conceito Chave 1", children: [{id: "ai-1-1", label: "Detalhe A"}, {id: "ai-1-2", label: "Detalhe B"}] },
                  { id: "ai-2", label: "Conceito Chave 2" },
                  { id: "ai-3", label: "Aplicação Prática" },
              ]
          }
      };
      // **Fim da Simulação**

      setMindMapData(data);
      toast.success("Mapa mental avançado gerado!");
    } catch (error: any) {
      console.error("Erro ao gerar mapa mental avançado:", error);
      toast.error(`Erro ao gerar mapa mental avançado: ${error.message || "Tente novamente."}`);
      // Opcional: Voltar para o modo simples ou limpar
      // setIsAdvancedMode(false);
      // setMindMapData(extractSimpleMindMap(contentHtml || ""));
    } finally {
      setIsLoadingMap(false);
    }
  }, [contentId, fallbackTopic]);

  // Efeito para gerar o mapa mental inicial (simples) quando o conteúdo carrega
  useEffect(() => {
    if (contentHtml && !isAdvancedMode) {
      setIsLoadingMap(true);
      const simpleMap = extractSimpleMindMap(contentHtml);
      setMindMapData(simpleMap);
      setIsLoadingMap(false);
    }
    // Não gerar avançado automaticamente ao carregar
  }, [contentHtml, isAdvancedMode, extractSimpleMindMap]);

  // Função para alternar entre modo simples e avançado
  const toggleMindMapMode = useCallback(() => {
    const nextMode = !isAdvancedMode;
    setIsAdvancedMode(nextMode);
    if (nextMode) {
      // Se está mudando para avançado, busca da API
      fetchAdvancedMindMap();
    } else {
      // Se está voltando para simples, extrai do HTML
      if (contentHtml) {
        setIsLoadingMap(true);
        setMindMapData(extractSimpleMindMap(contentHtml));
        setIsLoadingMap(false);
      }
    }
  }, [isAdvancedMode, fetchAdvancedMindMap, extractSimpleMindMap, contentHtml]);

  // Função para abrir/fechar o visualizador do mapa mental
  const toggleMindMapVisibility = useCallback(() => {
    setShowMindMap(prev => !prev);
    // Gera o mapa simples se ainda não foi gerado e está abrindo
    if (!showMindMap && !mindMapData && contentHtml && !isAdvancedMode) {
        setIsLoadingMap(true);
        setMindMapData(extractSimpleMindMap(contentHtml));
        setIsLoadingMap(false);
    }
  }, [showMindMap, mindMapData, contentHtml, isAdvancedMode, extractSimpleMindMap]);

  return {
    showMindMap,
    mindMapData,
    isAdvancedMode,
    isLoadingMap,
    toggleMindMapMode,
    toggleMindMapVisibility,
    generateMap: isAdvancedMode ? fetchAdvancedMindMap : () => { // Função para (re)gerar manualmente
        if (contentHtml && !isAdvancedMode) {
            setIsLoadingMap(true);
            setMindMapData(extractSimpleMindMap(contentHtml));
            setIsLoadingMap(false);
        }
    }
  };
};

