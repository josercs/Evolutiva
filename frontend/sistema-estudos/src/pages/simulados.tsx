import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const disciplinas = ["Matemática", "Português", "História"];
const dificuldades = ["Fácil", "Médio", "Difícil"];

const simulados = [
    { id: 1, nome: "Simulado ENEM", disciplina: "Matemática", dificuldade: "Médio" },
    { id: 2, nome: "Simulado Vestibular", disciplina: "Português", dificuldade: "Fácil" },
];

// Mock de feedback da IA
function getFeedbackMock(simuladoId: number) {
    // Aqui você pode personalizar conforme o simuladoId
    return Promise.resolve({
        dicas: [
            "Revise os conceitos básicos da disciplina.",
            "Pratique mais exercícios sobre os temas em que errou.",
            "Leia atentamente o enunciado das questões."
        ]
    });
}

function FeedbackCard({ simuladoId, onClose }: { simuladoId: number, onClose: () => void }) {
    const [dicas, setDicas] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        getFeedbackMock(simuladoId).then(res => {
            setDicas(res.dicas);
            setLoading(false);
        });
    }, [simuladoId]);

    return (
        <div style={{ border: "2px solid #4caf50", padding: 20, marginTop: 20, background: "#f6fff6" }}>
            <h2>Feedback Personalizado</h2>
            {loading ? <p>Carregando dicas...</p> : (
                <ul>
                    {dicas.map((dica, idx) => <li key={idx}>{dica}</li>)}
                </ul>
            )}
            <button onClick={onClose}>Fechar</button>
        </div>
    );
}

export default function Simulados() {
    const [disciplina, setDisciplina] = useState("");
    const [dificuldade, setDificuldade] = useState("");
    const [showFeedback, setShowFeedback] = useState<{ id: number } | null>(null);
    const navigate = useNavigate();

    const filtrados = simulados.filter(
        s =>
            (!disciplina || s.disciplina === disciplina) &&
            (!dificuldade || s.dificuldade === dificuldade)
    );

    return (
        <div>
            <h1>Simulados</h1>
            <div>
                <select value={disciplina} onChange={e => setDisciplina(e.target.value)}>
                    <option value="">Todas Disciplinas</option>
                    {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={dificuldade} onChange={e => setDificuldade(e.target.value)}>
                    <option value="">Todas Dificuldades</option>
                    {dificuldades.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div style={{ marginTop: 20 }}>
                {filtrados.map(s => (
                    <div
                        key={s.id}
                        style={{ border: "1px solid #ccc", padding: 16, marginBottom: 12, cursor: "pointer" }}
                    >
                        <h3>{s.nome}</h3>
                        <p>Disciplina: {s.disciplina}</p>
                        <p>Dificuldade: {s.dificuldade}</p>
                        <button onClick={() => setShowFeedback({ id: s.id })}>
                            Ver Feedback IA
                        </button>
                        <button style={{ marginLeft: 8 }} onClick={() => navigate(`/simulado/${s.id}`)}>
                            Iniciar Simulado
                        </button>
                    </div>
                ))}
                {filtrados.length === 0 && <p>Nenhum simulado encontrado.</p>}
            </div>
            {showFeedback && (
                <FeedbackCard
                    simuladoId={showFeedback.id}
                    onClose={() => setShowFeedback(null)}
                />
            )}
        </div>
    );
}