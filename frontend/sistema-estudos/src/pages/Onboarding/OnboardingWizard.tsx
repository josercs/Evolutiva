import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";

const steps = ["Dados Pessoais", "Preferências", "Disponibilidade", "Revisão"];

type OnboardingForm = {
  id: string;
  idade: string;
  escolaridade: string;
  objetivo: string;
  dias_disponiveis: string[];
  tempo_diario: string;
  horario_inicio: string;
  estilo_aprendizagem: string;
  ritmo: string;
  curso_id: string;
  areas_interesse: string;
  dificuldade_preferencia: string;
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
      areas_interesse: "",
      dificuldade_preferencia: "",
    }
  });

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cursos, setCursos] = useState<{ id: number; nome: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/cursos")
      .then((res) => res.json())
      .then((data) => setCursos(Array.isArray(data) ? data : data.cursos || []));
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: OnboardingForm) => {
    setLoading(true);
    setErro(null);

    try {
      const payload = {
        ...data,
        dias_disponiveis: Array.isArray(data.dias_disponiveis)
          ? data.dias_disponiveis
          : [data.dias_disponiveis].filter(Boolean),
        focus_areas: data.areas_interesse.split(',').map(s => s.trim()),
        difficulty_preference: data.dificuldade_preferencia,
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar onboarding.");

      const planoRes = await fetch("/api/plano-estudo/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!planoRes.ok) throw new Error("Erro ao gerar plano de estudo.");

      localStorage.setItem("userId", data.id);
      localStorage.setItem("cursoId", data.curso_id);

      navigate("/trilhas");
    } catch (err: any) {
      setErro(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <input {...methods.register("idade")} placeholder="Idade" className="input w-full" />
            <input {...methods.register("escolaridade")} placeholder="Escolaridade" className="input w-full" />
            <textarea {...methods.register("objetivo")} placeholder="Seu objetivo" className="input w-full min-h-[60px]" />
            <select {...methods.register("curso_id", { required: true })} className="input w-full">
              <option value="">Escolha um curso</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
            {methods.formState.errors.curso_id && (
              <span className="text-red-600 text-sm">Por favor, selecione um curso.</span>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <select {...methods.register("estilo_aprendizagem")} className="input w-full">
              <option value="">Estilo de aprendizagem</option>
              <option value="visual">Visual</option>
              <option value="auditivo">Auditivo</option>
              <option value="leitura">Leitura</option>
              <option value="pratica">Prática</option>
            </select>
            <select {...methods.register("ritmo")} className="input w-full">
              <option value="">Ritmo de estudos</option>
              <option value="leve">Leve</option>
              <option value="equilibrado">Equilibrado</option>
              <option value="desafiador">Desafiador</option>
            </select>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <input {...methods.register("tempo_diario")} placeholder="Tempo diário (min)" className="input w-full" />
            <input {...methods.register("horario_inicio")} placeholder="Horário de início (ex: 08:00)" className="input w-full" />
            <div>
              <label className="block mb-2 font-semibold">Dias disponíveis:</label>
              <div className="flex flex-wrap gap-3">
                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((dia) => (
                  <label key={dia} className="flex items-center gap-2">
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="font-semibold">Confira seus dados:</div>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(methods.getValues(), null, 2)}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="max-w-2xl mx-auto p-6 md:p-8 bg-white rounded-xl shadow-lg space-y-8"
      >
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-blue-700">{steps[step]}</h2>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-4">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {renderStep()}

        {erro && <p className="text-red-600 text-center">{erro}</p>}

        <div className="flex justify-between items-center gap-4">
          {step > 0 && (
            <button type="button" onClick={back} className="btn-secondary px-4 py-2">
              Voltar
            </button>
          )}
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary px-4 py-2 ml-auto">
              Próximo
            </button>
          ) : (
            <button
              type="submit"
              className="btn-primary px-6 py-2 ml-auto"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Concluir Onboarding"}
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
