import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import axios from "axios";

type Tarefa = {
    id: string;
    titulo: string;
    prioridade: "importante_urgente" | "importante_nao_urgente" | "nao_importante_urgente" | "nao_importante_nao_urgente";
};

const quadrantes = [
    { key: "importante_urgente", label: "Importante & Urgente" },
    { key: "importante_nao_urgente", label: "Importante & Não Urgente" },
    { key: "nao_importante_urgente", label: "Não Importante & Urgente" },
    { key: "nao_importante_nao_urgente", label: "Não Importante & Não Urgente" },
];

const EisenhowerBoard: React.FC = () => {
    const [tarefas, setTarefas] = useState<Tarefa[]>([]);

    useEffect(() => {
        // Carregar tarefas da API (ajuste a URL conforme necessário)
        axios.get("/api/tarefas").then((res) => setTarefas(res.data));
    }, []);

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const tarefaId = result.draggableId;
        const novaPrioridade = result.destination.droppableId as Tarefa["prioridade"];

        setTarefas((prev) =>
            prev.map((t) =>
                t.id === tarefaId ? { ...t, prioridade: novaPrioridade } : t
            )
        );

        // Atualiza prioridade na API
        await axios.post(`/api/tarefas/atualizar-prioridade/${tarefaId}`, {
            prioridade: novaPrioridade,
        });
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: "flex", gap: 16 }}>
                {quadrantes.map((q) => (
                    <Droppable droppableId={q.key} key={q.key}>
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                    flex: 1,
                                    minHeight: 300,
                                    border: "1px solid #ccc",
                                    borderRadius: 8,
                                    padding: 8,
                                    background: "#fafafa",
                                }}
                            >
                                <h3>{q.label}</h3>
                                {tarefas
                                    .filter((t) => t.prioridade === q.key)
                                    .map((t, idx) => (
                                        <Draggable draggableId={t.id} index={idx} key={t.id}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{
                                                        padding: 8,
                                                        margin: "8px 0",
                                                        background: "#fff",
                                                        border: "1px solid #ddd",
                                                        borderRadius: 4,
                                                        ...provided.draggableProps.style,
                                                    }}
                                                >
                                                    {t.titulo}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </DragDropContext>
    );
};

export default EisenhowerBoard;