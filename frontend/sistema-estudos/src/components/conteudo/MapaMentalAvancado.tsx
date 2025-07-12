import React, { useMemo } from "react";
import ReactFlow, { Background } from "reactflow";
import "reactflow/dist/style.css";
import type { Node, Edge } from "reactflow";

type Conteudo = {
  topic: string;
  related_topics: string[];
  subtopics: Record<string, string[]>;
};

type Props = {
  conteudo?: Conteudo;
};

const MapaMentalAvancado: React.FC<Props> = ({ conteudo }) => {
  const initialNodes = useMemo(() => {
    if (!conteudo) return { nodes: [] as Node[], edges: [] as Edge[] };

    const { topic, related_topics = [], subtopics = {} } = conteudo;
    const numTopics = related_topics.length;
    const centerX = 600;
    const spacingX = 200;
    const startX = centerX - ((numTopics - 1) * spacingX) / 2;

    const nodes: Node[] = [
      {
        id: "central",
        data: { label: topic },
        position: { x: centerX, y: 50 },
        style: {
          background: "#6366f1",
          color: "#fff",
          padding: 10,
          borderRadius: 12,
          fontWeight: "bold",
        },
      },
    ];

    const edges: Edge[] = [];

    related_topics.forEach((t, index) => {
      const x = startX + index * spacingX;
      const topicId = `topic-${index}`;

      nodes.push({
        id: topicId,
        data: { label: t },
        position: { x, y: 200 },
        style: {
          background: "#e0e7ff",
          color: "#3730a3",
          padding: 10,
          borderRadius: 10,
          fontWeight: "bold",
        },
      });

      edges.push({ id: `e-central-${topicId}`, source: "central", target: topicId });

      (subtopics[t] || []).forEach((sub, i) => {
        const subId = `${topicId}-sub-${i}`;
        nodes.push({
          id: subId,
          data: { label: sub },
          position: { x, y: 300 + i * 100 },
          style: {
            background: "#fef9c3",
            color: "#92400e",
            padding: 8,
            borderRadius: 8,
            fontSize: 12,
          },
        });
        edges.push({ id: `e-${topicId}-${subId}`, source: topicId, target: subId });
      });
    });

    return { nodes, edges };
  }, [conteudo]);

  if (!conteudo) return <p>Nenhum conteúdo disponível</p>;

  return (
    <div style={{ height: "500px", width: "100%", minWidth: 900 }}>
      <ReactFlow
        nodes={initialNodes.nodes}
        edges={initialNodes.edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background />
        {/* <MiniMap /> */}
        {/* <Controls /> */}
      </ReactFlow>
    </div>
  );
};

export default MapaMentalAvancado;