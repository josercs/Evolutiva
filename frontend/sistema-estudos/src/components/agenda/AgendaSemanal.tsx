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
    <div className="ml-sidebar pt-20 px-4">
            <div className="overflow-x-auto">
            <table className="border-collapse min-w-max">
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
                            <td className="text-[12px]">{hora}:00</td>
                            {diasSemana.map((_, dia) => {
                                const ativo = blocos.some((b) => b.dia === dia && b.hora === hora);
                                return (
                                    <td
                                        key={dia}
                                        onClick={() => toggleBloco(dia, hora)}
                                        className={`w-8 h-6 cursor-pointer border border-gray-300 ${ativo ? 'bg-green-500' : 'bg-gray-200'}`}
                                    />
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
            <button onClick={salvarBlocos} className="mt-4 px-3 py-1 rounded bg-blue-600 text-white">
                Salvar
            </button>
        </div>
    );
};

export default AgendaSemanal;