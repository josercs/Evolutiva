import React, { useState } from "react";

type Bloco = {
    dia: number; // 0=Domingo, 6=Sábado
    hora: number; // 0=00h, 23=23h
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const horas = Array.from({ length: 24 }, (_, i) => i);

const AgendaSemanal: React.FC = () => {
    const [blocos, setBlocos] = useState<Bloco[]>([]);

    const toggleBloco = (dia: number, hora: number) => {
        setBlocos((prev) => {
            const exists = prev.some((b) => b.dia === dia && b.hora === hora);
            if (exists) {
                return prev.filter((b) => !(b.dia === dia && b.hora === hora));
            } else {
                return [...prev, { dia, hora }];
            }
        });
    };

    // Exemplo de integração com API (mock)
    const salvarBlocos = async () => {
        // await api.post("/blocos", blocos);
        alert("Blocos salvos: " + JSON.stringify(blocos));
    };

    return (
        <div>
            <table style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th></th>
                        {diasSemana.map((dia, i) => (
                            <th key={i}>{dia}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {horas.map((hora) => (
                        <tr key={hora}>
                            <td style={{ fontSize: 12 }}>{hora}:00</td>
                            {diasSemana.map((_, dia) => {
                                const ativo = blocos.some((b) => b.dia === dia && b.hora === hora);
                                return (
                                    <td
                                        key={dia}
                                        onClick={() => toggleBloco(dia, hora)}
                                        style={{
                                            width: 32,
                                            height: 24,
                                            background: ativo ? "#4caf50" : "#eee",
                                            cursor: "pointer",
                                            border: "1px solid #ccc",
                                        }}
                                    />
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={salvarBlocos} style={{ marginTop: 16 }}>
                Salvar
            </button>
        </div>
    );
};

export default AgendaSemanal;