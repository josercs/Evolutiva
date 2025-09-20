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
        <div className="border-2 border-green-500 p-5 mt-5 bg-green-50 rounded-md">
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
    <div className="ml-sidebar pt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-semibold mb-4">Simulados</h1>
            <div className="flex flex-wrap gap-2 items-center">
                <select value={disciplina} onChange={e => setDisciplina(e.target.value)}>
                    <option value="">Todas Disciplinas</option>
                    {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={dificuldade} onChange={e => setDificuldade(e.target.value)}>
                    <option value="">Todas Dificuldades</option>
                    {dificuldades.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="mt-5 space-y-3">
                {filtrados.map(s => (
                    <div key={s.id} className="border rounded-lg p-4 hover:shadow transition cursor-pointer">
                        <h3 className="font-semibold text-lg">{s.nome}</h3>
                        <p className="text-sm text-gray-600">Disciplina: {s.disciplina}</p>
                        <p className="text-sm text-gray-600">Dificuldade: {s.dificuldade}</p>
                        <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded" onClick={() => setShowFeedback({ id: s.id })}>
                            Ver Feedback IA
                        </button>
                        <button className="mt-2 ml-2 px-3 py-1 bg-green-600 text-white rounded" onClick={() => navigate(`/simulado/${s.id}`)}>
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