import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";

const steps = [
  "Dados Pessoais",
  "Preferências",
  "Disponibilidade",
  "Revisão"
];

type OnboardingForm = {
  id: string;
  idade: string;
  escolaridade: string;
  objetivo: string;
  dias_disponiveis: string[];
  tempo_diario: string;
  estilo_aprendizagem: string;
  ritmo: string;
  curso_id: string;
};

export default function OnboardingWizard() {
  const methods = useForm<OnboardingForm>({
    defaultValues: {
      idade: "",
      escolaridade: "",
      objetivo: "",
      dias_disponiveis: [],
      tempo_diario: "",
      estilo_aprendizagem: "",
      ritmo: "",
      curso_id: "",
    }
  });
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cursos, setCursos] = useState<{ id: number; nome: string }[]>([]);

  useEffect(() => {
    fetch("/api/cursos")
      .then((res) => res.json())
      .then((data) => setCursos(Array.isArray(data) ? data : data.cursos || []));
  }, []);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const onSubmit = async (data: OnboardingForm) => {
    setLoading(true);
    setErro(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setErro("Erro ao salvar onboarding.");
      setLoading(false);
      return;
    }
    const planoRes = await fetch("/api/plano-estudo/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!planoRes.ok) {
      setErro("Erro ao gerar plano de estudo.");
      setLoading(false);
      return;
    }
    localStorage.setItem("userId", data.id);
    localStorage.setItem("cursoId", data.curso_id);
    navigate("/trilhas");
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="max-w-xl mx-auto p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="mb-6">
          <div className="font-bold text-2xl text-blue-800 mb-2">{steps[step]}</div>
          <div className="h-3 bg-gray-200 rounded-full mt-2">
            <div
              className="h-3 bg-blue-600 rounded-full transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <input {...methods.register("idade")} placeholder="Idade" className="input w-full" />
            <input {...methods.register("escolaridade")} placeholder="Escolaridade" className="input w-full" />
            <textarea {...methods.register("objetivo")} placeholder="Objetivo" className="input w-full min-h-[60px]" />
            <select {...methods.register("curso_id", { required: true })} className="input w-full">
              <option value="">Selecione o curso</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
            {methods.formState.errors.curso_id && (
              <span className="text-red-600 text-sm">Selecione um curso.</span>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={next} className="btn-primary px-6 py-2">Próximo</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <select {...methods.register("estilo_aprendizagem")} className="input w-full">
              <option value="">Estilo de aprendizagem</option>
              <option value="visual">Visual</option>
              <option value="auditivo">Auditivo</option>
              <option value="leitura">Leitura</option>
              <option value="pratica">Prática</option>
            </select>
            <select {...methods.register("ritmo")} className="input w-full">
              <option value="">Ritmo</option>
              <option value="leve">Leve</option>
              <option value="equilibrado">Equilibrado</option>
              <option value="desafiador">Desafiador</option>
            </select>
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" onClick={back} className="btn-secondary px-6 py-2">Voltar</button>
              <button type="button" onClick={next} className="btn-primary px-6 py-2">Próximo</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <input {...methods.register("tempo_diario")} placeholder="Tempo diário (min)" className="input w-full" />
            <div>
              <span className="block mb-2 font-medium">Dias disponíveis:</span>
              <div className="flex flex-wrap gap-3">
                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((dia) => (
                  <label key={dia} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      value={dia}
                      {...methods.register("dias_disponiveis")}
                      className="accent-blue-600"
                    />
                    {dia}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" onClick={back} className="btn-secondary px-6 py-2">Voltar</button>
              <button type="button" onClick={next} className="btn-primary px-6 py-2">Próximo</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="mb-4">
              <div className="font-semibold mb-2">Revisar dados:</div>
              <pre className="bg-gray-100 p-3 rounded text-xs">{JSON.stringify(methods.getValues(), null, 2)}</pre>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" onClick={back} className="btn-secondary px-6 py-2">Voltar</button>
              <button type="submit" className="btn-primary px-6 py-2" disabled={loading}>
                {loading ? "Salvando e gerando plano..." : "Concluir Onboarding"}
              </button>
            </div>
            {erro && <div className="text-red-600 text-center">{erro}</div>}
          </div>
        )}
      </form>
    </FormProvider>
  );
}
