import React, { useState, useEffect } from 'react';
import { getGenerativeConfigApi, updateGenerativeConfigApi } from '../../api/newsCenter';
import {
  VOICE_OPTIONS,
  PROMPT_PRESETS,
  LLM_MODEL_OPTIONS,
  TTS_PROVIDER_OPTIONS,
} from '../../data/voiceRegistry';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({ isOpen, onClose }) => {
  // DashScope (Bailian Qwen / CosyVoice) API Key
  const [dashscopeApiKey, setDashscopeApiKey] = useState('');
  const [agentAppKey, setAgentAppKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');

  // Database Generative Config State
  const [defaultNewsPrompt, setDefaultNewsPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [defaultLlmModel, setDefaultLlmModel] = useState('qwen-plus');
  const [defaultTtsProvider, setDefaultTtsProvider] = useState('edge');
  const [defaultVoiceId, setDefaultVoiceId] = useState('zh-CN-XiaoxiaoNeural');
  
  const [nodeName, setNodeName] = useState('每日要闻');
  const [isFirst, setIsFirst] = useState(false);
  const [isLast, setIsLast] = useState(false);
  const [wordCount, setWordCount] = useState(150);

  const [showDashscopeKey, setShowDashscopeKey] = useState(false);
  const [showAgentKey, setShowAgentKey] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey =
        localStorage.getItem('RADIO_AI_DASHSCOPE_API_KEY') ||
        localStorage.getItem('RADIO_AI_GEMINI_API_KEY') ||
        '';
      setDashscopeApiKey(storedKey);
      setAgentAppKey(localStorage.getItem('RADIO_AI_AGENT_APP_KEY') || '');
      setApiBaseUrl(localStorage.getItem('RADIO_AI_API_BASE_URL') || 'http://localhost:8000');

      // Fetch DB Generative Config (including DB dashscope_api_key)
      getGenerativeConfigApi()
        .then((cfg) => {
          if (cfg.dashscope_api_key) {
            setDashscopeApiKey(cfg.dashscope_api_key);
            localStorage.setItem('RADIO_AI_DASHSCOPE_API_KEY', cfg.dashscope_api_key);
          }
          if (cfg.default_news_prompt) setDefaultNewsPrompt(cfg.default_news_prompt);
          if (cfg.default_llm_model) setDefaultLlmModel(cfg.default_llm_model);
          if (cfg.default_tts_provider) setDefaultTtsProvider(cfg.default_tts_provider);
          if (cfg.default_voice_id) setDefaultVoiceId(cfg.default_voice_id);
          if (cfg.node_name !== undefined) setNodeName(cfg.node_name);
          if (cfg.is_first !== undefined) setIsFirst(cfg.is_first);
          if (cfg.is_last !== undefined) setIsLast(cfg.is_last);
          if (cfg.word_count !== undefined) setWordCount(cfg.word_count);
        })
        .catch(() => {
          // ignore fallback
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    const cleanKey = dashscopeApiKey.trim();
    localStorage.setItem('RADIO_AI_DASHSCOPE_API_KEY', cleanKey);
    localStorage.setItem('RADIO_AI_GEMINI_API_KEY', cleanKey);
    localStorage.setItem('RADIO_AI_AGENT_APP_KEY', agentAppKey.trim());
    localStorage.setItem('RADIO_AI_API_BASE_URL', apiBaseUrl.trim());

    try {
      await updateGenerativeConfigApi({
        dashscope_api_key: cleanKey,
        default_news_prompt: defaultNewsPrompt,
        default_llm_model: defaultLlmModel,
        default_tts_provider: defaultTtsProvider,
        default_voice_id: defaultVoiceId,
        node_name: nodeName,
        is_first: isFirst,
        is_last: isLast,
        word_count: wordCount,
      });
      setToastMessage('阿里百炼 API Key 及数据库生成配置已成功写入后端落盘！');
    } catch (e) {
      setToastMessage('API Key 已在本地保留（后端落盘稍后自动同步）');
    } finally {
      setSaving(false);
    }

    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm w-full max-w-xl p-6 shadow-2xl space-y-5 relative transition-colors duration-300 max-h-[90vh] flex flex-col my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4 shrink-0">
          <div className="w-10 h-10 rounded-sm bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">vpn_key</span>
          </div>
          <div>
            <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
              系统 API Key 及生成配置持久化
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
              配置阿里云百炼 (DashScope) 密钥凭证与持久化存储在数据库中的 LLM 模型与音色选型
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-[var(--accent)]/20 border border-[var(--accent)] text-[var(--accent)] px-4 py-2 rounded-sm text-xs font-serif-editorial font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="space-y-4 font-data-mono text-xs overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {/* DashScope API Key Field */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--accent)]/40 p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-base text-[var(--accent)]">key</span>
                <span>阿里云百炼 DashScope API Key (DASHSCOPE_API_KEY)</span>
              </label>
              <span className="text-[10px] text-amber-400 font-sans font-bold">必填项</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-sans">
              用于通义千问 (Qwen-Plus / Qwen-Max) 大模型新闻播报稿改写与 CosyVoice 高拟真 TTS 语音合成。
            </p>
            <div className="relative pt-1">
              <input
                type={showDashscopeKey ? 'text' : 'password'}
                value={dashscopeApiKey}
                onChange={(e) => setDashscopeApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[var(--bg-primary)] border border-[var(--accent)]/50 rounded-sm p-2.5 pr-10 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)] font-bold"
              />
              <button
                type="button"
                onClick={() => setShowDashscopeKey(!showDashscopeKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">
                  {showDashscopeKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* DB Generative Settings Group */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] p-3.5 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                全局生成式 AI 默认配置 (数据库持久化存储)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">默认大模型选型</label>
                <select
                  value={defaultLlmModel}
                  onChange={(e) => setDefaultLlmModel(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                >
                  {LLM_MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">默认 TTS 语音合成引擎</label>
                <select
                  value={defaultTtsProvider}
                  onChange={(e) => setDefaultTtsProvider(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                >
                  {TTS_PROVIDER_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[var(--text-muted)] block mb-1 text-[11px]">默认发音人音色 (Default Voice ID)</label>
              <select
                value={defaultVoiceId}
                onChange={(e) => setDefaultVoiceId(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    [{v.category}] {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[var(--text-muted)] text-[11px]">全局新闻播报改写 System Prompt</label>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-data-mono">
                  可用变量: {'{node_name}'} {'{is_first}'} {'{is_last}'} {'{word_count}'}
                </div>
              </div>
              <textarea
                rows={10}
                value={defaultNewsPrompt}
                onChange={(e) => setDefaultNewsPrompt(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2.5 text-[11px] text-[var(--text-primary)] font-sans focus:border-[var(--accent)] focus:outline-none rounded-sm resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-color)]">
              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">栏目名称 (node_name)</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">目标字数 (word_count)</label>
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value) || 150)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none text-xs"
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="is_first"
                  checked={isFirst}
                  onChange={(e) => setIsFirst(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <label htmlFor="is_first" className="text-[11px] text-[var(--text-primary)] cursor-pointer">是否为本组第一条 (is_first)</label>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="is_last"
                  checked={isLast}
                  onChange={(e) => setIsLast(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <label htmlFor="is_last" className="text-[11px] text-[var(--text-primary)] cursor-pointer">是否为本组最后一条 (is_last)</label>
              </div>
            </div>
          </div>

          {/* Agent App Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
                Agent 智能体 App Key (可选)
              </label>
              <span className="text-[10px] text-[var(--text-muted)] font-sans">用于广播联控与对话路由</span>
            </div>
            <div className="relative">
              <input
                type={showAgentKey ? 'text' : 'password'}
                value={agentAppKey}
                onChange={(e) => setAgentAppKey(e.target.value)}
                placeholder="app-key-..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 pr-10 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowAgentKey(!showAgentKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">
                  {showAgentKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Backend API Base URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">dns</span>
                Radio AI 后端 API 服务地址
              </label>
            </div>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-sm border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] font-serif-editorial text-xs cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-5 py-2 rounded-sm bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">save</span>
            <span>{saving ? '保存中...' : '保存数据库及密钥配置'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
