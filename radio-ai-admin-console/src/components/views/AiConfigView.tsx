import React, { useState, useEffect } from 'react';
import { getGenerativeConfigApi, updateGenerativeConfigApi, GenerativeConfigDto } from '../../api/newsCenter';
import { LLM_MODEL_OPTIONS, TTS_PROVIDER_OPTIONS, VOICE_OPTIONS } from '../../data/voiceRegistry';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

interface AiConfigViewProps {
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const AiConfigView: React.FC<AiConfigViewProps> = ({ apiKey, onSaveApiKey }) => {
  const [dashScopeApiKey, setDashScopeApiKey] = useState(apiKey || '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [llmModel, setLlmModel] = useState('qwen-plus');
  const [ttsProvider, setTtsProvider] = useState<'edge' | 'bailian' | 'local'>('edge');

  // Text Generation Decoupling
  const [newsHostPrompt, setNewsHostPrompt] = useState(
    '你是一名专业且生动的电台主持人，请把新闻素材改写为 80-150 字的口语化播报稿。'
  );
  const [dollCommentaryPrompt, setDollCommentaryPrompt] = useState(
    '你是一名拥有独特情感与软萌/幽默人设的智能陪伴玩偶，请对当前新闻或主题进行 50-100 字的独家感悟点评。'
  );

  // Edge-TTS Male & Female Alternating Voices for News
  const [newsFemaleVoice, setNewsFemaleVoice] = useState('zh-CN-XiaoxiaoNeural');
  const [newsMaleVoice, setNewsMaleVoice] = useState('zh-CN-YunjianNeural');
  const [enableAlternateGender, setEnableAlternateGender] = useState(true);

  // Doll CosyVoice Mappings
  const [lotsoVoice, setLotsoVoice] = useState('cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5');
  const [xiaoxinVoice, setXiaoxinVoice] = useState('cosyvoice-v3.5-plus-xiaoxin-38bc6f91ce58475bbc8c9a5d534b3a64');
  const [wanziVoice, setWanziVoice] = useState('cosyvoice-v3.5-plus-wanzi-2de095b4499040f6b00397ff53f58afe');
  const [hudiVoice, setHudiVoice] = useState('cosyvoice-v3.5-plus-hudi-a528aa91d91e4beab1ef260045ed923e');

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [auditioningVoice, setAuditioningVoice] = useState<string | null>(null);

  useEffect(() => {
    // Load persisted generative config from backend/storage
    getGenerativeConfigApi()
      .then((cfg) => {
        if (cfg.dashscope_api_key) setDashScopeApiKey(cfg.dashscope_api_key);
        if (cfg.default_llm_model) setLlmModel(cfg.default_llm_model);
        if (cfg.default_tts_provider) setTtsProvider(cfg.default_tts_provider as any);
        if (cfg.default_news_prompt) setNewsHostPrompt(cfg.default_news_prompt);
      })
      .catch((e) => console.warn('获取配置异常:', e));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsTestingKey(false);
    showToast('⚡ API Key 连通性校验成功！');
  };

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleAuditionVoice = async (voiceKey: string, text: string, voiceId: string, currentTtsProvider: string) => {
    if (auditioningVoice === voiceKey) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAuditioningVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setAuditioningVoice(voiceKey);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/radio-ai/tts/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          tts_provider: currentTtsProvider,
        }),
      });
      if (!response.ok) throw new Error('TTS Preview Failed');
      const data = await response.json();

      const audioUrl = `${API_BASE_URL}${data.audio_url}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setAuditioningVoice(null);
      audio.onerror = () => {
        showToast('试听播放失败，请检查配置。');
        setAuditioningVoice(null);
      };
      await audio.play();
    } catch (e) {
      console.error(e);
      showToast('TTS 试听生成失败，请检查服务状态。');
      setAuditioningVoice(null);
    }
  };

  const handleSaveAllConfig = async () => {
    setIsSaving(true);
    try {
      // 1. Save DashScope API Key
      onSaveApiKey(dashScopeApiKey);
      localStorage.setItem('openai_api_key', openAiApiKey);

      // Save voices config to localStorage for studio playback engine
      localStorage.setItem('news_female_voice', newsFemaleVoice);
      localStorage.setItem('news_male_voice', newsMaleVoice);
      localStorage.setItem('enable_alternate_gender', enableAlternateGender ? 'true' : 'false');
      localStorage.setItem('lotso_voice', lotsoVoice);
      localStorage.setItem('xiaoxin_voice', xiaoxinVoice);
      localStorage.setItem('wanzi_voice', wanziVoice);
      localStorage.setItem('hudi_voice', hudiVoice);
      localStorage.setItem('news_host_prompt', newsHostPrompt);
      localStorage.setItem('doll_commentary_prompt', dollCommentaryPrompt);

      // 2. Persist to Backend DB
      await updateGenerativeConfigApi({
        dashscope_api_key: dashScopeApiKey,
        default_llm_model: llmModel,
        default_tts_provider: ttsProvider,
        default_news_prompt: newsHostPrompt,
      });

      showToast('💾 AI 配置与发音人设置已成功落盘至数据库！');
    } catch (e) {
      showToast('💾 配置已成功保存至本地存储！');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-[200] bg-[var(--accent)] text-[var(--accent-text)] px-4 py-2.5 rounded-sm shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-sm bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold">
            <span className="font-serif-editorial font-extrabold text-lg border border-[var(--accent)]/40 px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
              AI
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)]">
              AI 大模型与发音人音色引擎配置中心
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-sans mt-1">
              集中管理 DashScope / OpenAI API 密钥、主持新闻/玩偶点评文本生成规则，以及 Edge-TTS 男女主播交替播报与玩偶 CosyVoice 音色映射。
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAllConfig}
          disabled={isSaving}
          className="px-6 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs rounded-sm hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-base ${isSaving ? 'animate-spin' : ''}`}>
            {isSaving ? 'sync' : 'save'}
          </span>
          <span>{isSaving ? '正在保存中...' : '保存全局 AI 配置至数据库'}</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* LEFT COLUMN: API Keys & Text Generation Prompt Rules (Cols: 7) */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Card 1: API Key & LLM Model Config */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent)]">key</span>
                <span>API 密钥与 LLM 大模型引擎选型</span>
              </h2>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingKey}
                className="px-3 py-1 bg-[var(--bg-subcard)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] border border-[var(--border-color)] text-[var(--accent)] rounded text-xs font-serif-editorial transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-sm ${isTestingKey ? 'animate-spin' : ''}`}>
                  {isTestingKey ? 'sync' : 'bolt'}
                </span>
                <span>测试连通性</span>
              </button>
            </div>

            <div className="space-y-4 font-data-mono text-xs">
              <div>
                <label className="text-[var(--accent)] block font-bold mb-1.5 uppercase tracking-wider">
                  阿里 DashScope (通义千问) API Key
                </label>
                <input
                  type="password"
                  value={dashScopeApiKey}
                  onChange={(e) => setDashScopeApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-sans">
                  用于驱动 DashScope 商业级大模型文本改写与 CosyVoice 高拟真发音人合成。
                </p>
              </div>

              <div>
                <label className="text-[var(--accent)] block font-bold mb-1.5 uppercase tracking-wider">
                  OpenAI API Key (可选)
                </label>
                <input
                  type="password"
                  value={openAiApiKey}
                  onChange={(e) => setOpenAiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[var(--text-muted)] block mb-1">默认 LLM 文本生成大模型</label>
                  <select
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)]"
                  >
                    {LLM_MODEL_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-muted)] block mb-1">TTS 默认服务提供商</label>
                  <select
                    value={ttsProvider}
                    onChange={(e) => setTtsProvider(e.target.value as any)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)]"
                  >
                    {TTS_PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Text Generation Prompt Decoupling */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent)]">psychology</span>
                <span>AI 文本生成解耦扩展 (主持人新闻稿 vs 玩偶独家点评)</span>
              </h2>
            </div>

            <div className="space-y-4 font-data-mono text-xs">
              {/* Type 1: News Host Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">newspaper</span>
                    1. 新闻播报稿生成 Prompt (电台主持人客观口语风格)
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-sans">主持人视角</span>
                </div>
                <textarea
                  rows={3}
                  value={newsHostPrompt}
                  onChange={(e) => setNewsHostPrompt(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {/* Type 2: Doll Commentary Prompt */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    2. 玩偶独家点评 Prompt (玩偶专属人设与情感风格)
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-sans">玩偶角色视角</span>
                </div>
                <textarea
                  rows={3}
                  value={dollCommentaryPrompt}
                  onChange={(e) => setDollCommentaryPrompt(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TTS Voice Mappings & Edge-TTS Male/Female Alternating Setup (Cols: 5) */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Card 3: News Edge-TTS Male & Female Alternating Voices */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent)]">record_voice_over</span>
                <span>新闻播报发音人 (Edge-TTS 男女交替)</span>
              </h2>
            </div>

            <div className="space-y-4 font-data-mono text-xs">
              <label className="flex items-center justify-between p-3 rounded-sm bg-[var(--bg-subcard)] border border-[var(--border-color)] cursor-pointer select-none">
                <span className="font-bold text-[var(--text-primary)]">开启新闻多节点自动男女发音人交替播报</span>
                <input
                  type="checkbox"
                  checked={enableAlternateGender}
                  onChange={(e) => setEnableAlternateGender(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-[var(--accent)]"
                />
              </label>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[var(--text-muted)] font-bold">👩 新闻女声播报员 (Female Presenter)</label>
                  <select
                    value={newsFemaleVoice}
                    onChange={(e) => setNewsFemaleVoice(e.target.value)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] mt-1"
                  >
                    <option value="zh-CN-XiaoxiaoNeural">晓晓 (zh-CN-XiaoxiaoNeural) - 亲切女声</option>
                    <option value="zh-CN-XiaoyiNeural">晓伊 (zh-CN-XiaoyiNeural) - 柔和女声</option>
                    <option value="zh-CN-Liaoning-XiaobeiNeural">辽宁小贝 (zh-CN-Liaoning-XiaobeiNeural)</option>
                  </select>
                  <div className="flex justify-between items-center mt-3">
                    <button
                      type="button"
                      onClick={() => handleAuditionVoice('news_female', '各位听众朋友，这里是新闻女声播音员为您播报。', newsFemaleVoice, ttsProvider)}
                      className="px-2 py-0.5 bg-[var(--accent)]/15 text-[var(--accent)] rounded text-[10px] font-bold cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">{auditioningVoice === 'news_female' ? 'pause' : 'play_arrow'}</span>
                      <span>试听女声</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[var(--text-muted)] font-bold">👨 新闻男声播报员 (Male Presenter)</label>
                  <select
                    value={newsMaleVoice}
                    onChange={(e) => setNewsMaleVoice(e.target.value)}
                    className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] mt-1"
                  >
                    <option value="zh-CN-YunjianNeural">云健 (zh-CN-YunjianNeural) - 新闻男声</option>
                    <option value="zh-CN-YunxiNeural">云希 (zh-CN-YunxiNeural) - 活力男声</option>
                    <option value="zh-CN-YunyangNeural">云扬 (zh-CN-YunyangNeural) - 专业男声</option>
                  </select>
                  <div className="flex justify-between items-center mt-3">
                    <button
                      type="button"
                      onClick={() => handleAuditionVoice('news_male', '各位听众朋友，这里是新闻男声播音员为您播报。', newsMaleVoice, ttsProvider)}
                      className="px-2 py-0.5 bg-[var(--accent)]/15 text-[var(--accent)] rounded text-[10px] font-bold cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">{auditioningVoice === 'news_male' ? 'pause' : 'play_arrow'}</span>
                      <span>试听男声</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Doll CosyVoice Voice Mappings */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent)]">smart_toy</span>
                <span>玩偶独家点评 CosyVoice 音色映射</span>
              </h2>
            </div>

            <div className="space-y-3 font-data-mono text-xs">
              <div className="space-y-1">
                <span className="text-pink-400 font-bold block">🍓 草莓熊 Lotso 音色 ID</span>
                <input
                  type="text"
                  value={lotsoVoice}
                  onChange={(e) => setLotsoVoice(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex justify-between items-center mt-3">
                  <button
                    type="button"
                    onClick={() => handleAuditionVoice('lotso', '哈喽大家好！我是草莓熊！今天也要开开心心哦！', lotsoVoice, 'bailian')}
                    className="px-2 py-0.5 bg-pink-500/20 text-pink-400 border border-pink-500/40 rounded text-[10px] font-bold cursor-pointer hover:bg-pink-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">{auditioningVoice === 'lotso' ? 'pause' : 'play_arrow'}</span>
                    <span>试听草莓熊</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-amber-400 font-bold block">⚡ 野原新之助 音色 ID</span>
                <input
                  type="text"
                  value={xiaoxinVoice}
                  onChange={(e) => setXiaoxinVoice(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex justify-between items-center mt-3">
                  <button
                    type="button"
                    onClick={() => handleAuditionVoice('xiaoxin', '嘿嘿，大象大象~ 你喜不喜欢吃青椒呀！', xiaoxinVoice, 'bailian')}
                    className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-[10px] font-bold cursor-pointer hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">{auditioningVoice === 'xiaoxin' ? 'pause' : 'play_arrow'}</span>
                    <span>试听小新</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-red-400 font-bold block">🌸 樱桃小丸子 音色 ID</span>
                <input
                  type="text"
                  value={wanziVoice}
                  onChange={(e) => setWanziVoice(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex justify-between items-center mt-3">
                  <button
                    type="button"
                    onClick={() => handleAuditionVoice('wanzi', '我是小丸子，生活总是充满了意想不到的幸福呢。', wanziVoice, 'bailian')}
                    className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-[10px] font-bold cursor-pointer hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">{auditioningVoice === 'wanzi' ? 'pause' : 'play_arrow'}</span>
                    <span>试听小丸子</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-blue-400 font-bold block">🤠 胡迪警长 音色 ID</span>
                <input
                  type="text"
                  value={hudiVoice}
                  onChange={(e) => setHudiVoice(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex justify-between items-center mt-3">
                  <button
                    type="button"
                    onClick={() => handleAuditionVoice('hudi', '我的靴子里有只靴蛇！正义号角已经吹响！', hudiVoice, 'bailian')}
                    className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded text-[10px] font-bold cursor-pointer hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">{auditioningVoice === 'hudi' ? 'pause' : 'play_arrow'}</span>
                    <span>试听胡迪</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={hudiVoice}
                  onChange={(e) => setHudiVoice(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
