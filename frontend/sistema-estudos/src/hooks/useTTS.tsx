import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";

interface UseTTSProps {
  contentRef: React.RefObject<HTMLElement>;
  lang?: string;
  enableSystemSettings?: boolean;
}

export const useTTS = ({
  contentRef,
  lang = "pt-BR",
  enableSystemSettings = true,
}: UseTTSProps) => {
  const [ttsActive, setTtsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canUseTTS, setCanUseTTS] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState(1.1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Carrega vozes disponíveis
  useEffect(() => {
    const supported = "speechSynthesis" in window;
    setCanUseTTS(supported);

    if (supported) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
    // Carrega preferências do usuário
    const saved = localStorage.getItem("ttsSettings");
    if (saved) {
      try {
        const { rate, pitch, voice, volume } = JSON.parse(saved);
        if (rate) setRate(rate);
        if (pitch) setPitch(pitch);
        if (voice) setSelectedVoice(voice);
        if (volume) setVolume(volume);
      } catch {}
    }

    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Persiste preferências
  useEffect(() => {
    localStorage.setItem(
      "ttsSettings",
      JSON.stringify({ rate, pitch, voice: selectedVoice, volume })
    );
  }, [rate, pitch, selectedVoice, volume]);

  // Seleciona a melhor voz para o idioma/nome
  const getBestVoice = useCallback(() => {
    if (selectedVoice) {
      const selected = voices.find(v => v.name === selectedVoice);
      if (selected) return selected;
    }
    const langVoices = voices.filter(v =>
      v.lang?.toLowerCase().includes(lang.toLowerCase()) ||
      v.lang?.toLowerCase().startsWith(lang.split('-')[0].toLowerCase())
    );
    return langVoices.find(v => v.default) || langVoices[0];
  }, [voices, lang, selectedVoice]);

  const stopTTS = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setTtsActive(false);
    }
  }, [isSpeaking]);

  const handleSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    setTtsActive(false);
  }, []);

  const handleSpeechError = useCallback((event: SpeechSynthesisErrorEvent) => {
    console.error("Erro na síntese de voz:", event.error);
    toast.error(`Erro ao ler em voz alta: ${event.error}`);
    setIsSpeaking(false);
    setTtsActive(false);
  }, []);

  const toggleTTS = useCallback(() => {
    if (!canUseTTS) {
      toast.error("Seu navegador não suporta leitura em voz alta.");
      return;
    }

    if (isSpeaking) {
      stopTTS();
      return;
    }

    const element = contentRef.current;
    if (!element?.innerText?.trim()) {
      toast.info("Não há conteúdo para ler.");
      return;
    }

    // Pré-processamento para pausas naturais
    const processedText = element.innerText
      .replace(/([,.!?])\s*/g, "$1 ")
      .replace(/([;:])\s*/g, "$1 ")
      .replace(/(\n\s*\n)/g, ". ")
      .replace(/\s–\s/g, ", ")
      .replace(/\s{2,}/g, " ");

    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.lang = lang;
    utterance.rate = Math.min(Math.max(rate, 0.5), 2);
    utterance.pitch = Math.min(Math.max(pitch, 0.8), 1.5);
    utterance.volume = Math.min(Math.max(volume, 0), 1);

    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
      console.log("Usando voz:", voice.name, voice.lang);
    }

    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechError;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setTtsActive(true);
  }, [
    canUseTTS,
    isSpeaking,
    lang,
    contentRef,
    getBestVoice,
    rate,
    pitch,
    volume,
    stopTTS,
    handleSpeechEnd,
    handleSpeechError,
  ]);

  // Tenta abrir as configurações do sistema
  const openSystemTTSSettings = useCallback(() => {
    const userAgent = navigator.userAgent;
    try {
      if (/Android/i.test(userAgent)) {
        window.open('intent://com.android.settings/#Intent;scheme=android-app;end');
      } else if (/iPhone|iPad/i.test(userAgent)) {
                toast.info(
                  `Acesse as configurações de voz:
        1. Abra Configurações
        2. Acesse Acessibilidade
        3. Selecione "Conteúdo Falado"`,
                  { autoClose: false }
                );
      } else if (userAgent.includes('Windows')) {
        window.open('ms-settings:easeofaccess-speechrecognition');
      } else if (userAgent.includes('Mac')) {
        window.open('x-apple.systempreferences:com.apple.preference.universalaccess');
      } else if (userAgent.includes('Linux')) {
        window.open('gnome-control-center:text-to-speech');
      } else {
        if (enableSystemSettings) {
          toast.info('Acesse as configurações de acessibilidade do seu sistema para ajustes avançados');
        }
      }
    } catch (error) {
      console.error('Erro ao abrir configurações:', error);
      toast.warning('Não foi possível abrir as configurações do sistema automaticamente');
    }
  }, [enableSystemSettings]);

  // UI para configurações customizadas
  // Para evitar erros de JSX em arquivo .ts, retorne null ou uma string, ou converta o arquivo para .tsx.
  const renderVoiceSettings = () => {
    if (!canUseTTS) return null;
    return (
      <div className="tts-settings-panel" style={{ margin: 16, padding: 16, background: "#f9f9f9", borderRadius: 8 }}>
        <h4>Configurações de Voz</h4>
        {voices.length > 0 && (
          <div>
            <label>Voz:&nbsp;</label>
            <select
              onChange={e => setSelectedVoice(e.target.value)}
              value={selectedVoice}
            >
              <option value="">Automática ({lang})</option>
              {voices.filter(v => v.lang.includes(lang.split('-')[0])).map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label>Velocidade: {rate.toFixed(1)}</label>
          <input
            type="range"
            min="0.5" max="2" step="0.1"
            value={rate}
            onChange={e => setRate(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label>Tom: {pitch.toFixed(2)}</label>
          <input
            type="range"
            min="0.8" max="1.5" step="0.01"
            value={pitch}
            onChange={e => setPitch(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label>Volume: {volume.toFixed(2)}</label>
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
          />
        </div>
        {enableSystemSettings && (
          <button style={{ marginTop: 8 }} onClick={openSystemTTSSettings}>
            Abrir Configurações do Sistema
          </button>
        )}
      </div>
    );
  };

  return {
    ttsActive,
    isSpeaking,
    canUseTTS,
    voices,
    toggleTTS,
    stopTTS,
    openSystemTTSSettings,
    renderVoiceSettings,
    rate,
    pitch,
    volume,
    selectedVoice,
    setRate,
    setPitch,
    setVolume,
    setSelectedVoice,
  };
};

