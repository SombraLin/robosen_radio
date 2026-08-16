import React, { useState, useEffect } from 'react';
import { runNewsPipeline, getGenerativeConfigApi } from '../../api/newsCenter';
import {
  VOICE_OPTIONS,
  PROMPT_PRESETS,
  LLM_MODEL_OPTIONS,
  TTS_PROVIDER_OPTIONS,
  VoiceOption,
} from '../../data/voiceRegistry';
import { useNewsStore } from '../../features/news-console/store';
import { useNewsActions } from '../../features/news-console/hooks';

interface NewBroadcastModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCompleted?: () => void;
}

const TAGS = [
  ['hot', '热点'],
  ['tech', '科技'],
  ['internet', '互联网'],
  ['finance', '财经'],
  ['china', '国内'],
  ['world', '国际'],
  ['military', '军事'],
  ['sports', '体育'],
  ['entertainment', '娱乐'],
  ['auto', '汽车'],
] as const;

export const NewBroadcastModal: React.FC<NewBroadcastModalProps> = ({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  onCompleted: propsOnCompleted,
}) => {
  const storeIsOpen = useNewsStore((s) => s.isNewBroadcastOpen);
  const setIsOpen = useNewsStore((s) => s.setIsNewBroadcastOpen);
  const { loadNews } = useNewsActions();

  const isOpen = propsIsOpen !== undefined ? propsIsOpen : storeIsOpen;
  const onClose = propsOnClose || (() => setIsOpen(false));
  const onCompleted =
    propsOnCompleted ||
    (() => {
      loadNews();
      setIsOpen(false);
    });
  const [tag, setTag] = useState('hot');
  const [limit, setLimit] = useState(3);
  const [generateAudio, setGenerateAudio] = useState(true);

  // Generative AI Config States
  const [customPrompt, setCustomPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [selectedPromptPresetId, setSelectedPromptPresetId] = useState(PROMPT_PRESETS[0].id);
  const [llmModel, setLlmModel] = useState('qwen-plus');
  const [ttsProvider, setTtsProvider] = useState<'edge' | 'bailian' | 'local'>('edge');
  const [voiceId, setVoiceId] = useState('zh-CN-XiaoxiaoNeural');
  const [showGenerativeConfig, setShowGenerativeConfig] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load stored default generative config from DB
      getGenerativeConfigApi()
        .then((cfg) => {
          if (cfg.default_news_prompt) setCustomPrompt(cfg.default_news_prompt);
          if (cfg.default_llm_model) setLlmModel(cfg.default_llm_model);
          if (cfg.default_tts_provider) setTtsProvider(cfg.default_tts_provider as any);
          if (cfg.default_voice_id) setVoiceId(cfg.default_voice_id);
        })
        .catch(() => {
          // ignore fallback
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPromptPreset = (presetId: string) => {
    setSelectedPromptPresetId(presetId);
    const found = PROMPT_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomPrompt(found.prompt);
    }
  };

  const handleApplyDollPreset = (dollName: string, dollVoiceId: string, promptText: string) => {
    setVoiceId(dollVoiceId);
    setTtsProvider('bailian');
    setCustomPrompt(promptText);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError('');
    setResult('');
    try {
      const value = await runNewsPipeline({
        tag,
        limit,
        generateAudio,
        voiceId,
        customPrompt,
        llmModel,
        ttsProvider,
      });
      const stored = Number(value.fetch.statistics.stored || 0);
      setResult(`抓取与改写完成：新增 ${stored} 条，生成稿件 ${value.items.length} 条，失败 ${value.failures.length} 条。`);
      onCompleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '新闻流水线执行失败');
    } finally {
      setIsRunning(false);
    }
  };

  // Group voice options by category
  const filteredVoices = VOICE_OPTIONS.filter((v) => {
    if (ttsProvider === 'edge') return v.provider === 'edge';
    if (ttsProvider === 'bailian') return v.provider === 'bailian';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm w-full max-w-2xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col my-8">
        <button
          onClick={onClose}
          disabled={isRunning}
          className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4 shrink-0">
          <div className="w-10 h-10 bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold rounded-sm">
            <span className="material-symbols-outlined">newspaper</span>
          </div>
          <div>
            <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
              新闻抓取、LLM 改写与 TTS 生成流水线
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
              从 ZAKER 抓取 24 小时实时新闻，按自定义 LLM Prompt 改写并选择高拟真发音人合成音频。
            </p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
          {/* Tag & Limit */}
          <div className="grid grid-cols-2 gap-4 font-data-mono text-xs">
            <label className="space-y-1.5">
              <span className="text-[var(--accent)] block uppercase tracking-wider font-bold">新闻板块分类</span>
              <select
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                disabled={isRunning}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2.5 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none rounded-sm"
              >
                {TAGS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} ({value})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[var(--accent)] block uppercase tracking-wider font-bold">抓取与生成条数</span>
              <input
                type="number"
                min={1}
                max={20}
                value={limit}
                onChange={(event) => setLimit(Math.max(1, Math.min(20, Number(event.target.value))))}
                disabled={isRunning}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2.5 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none rounded-sm"
              />
            </label>
          </div>

          {/* Doll Quick Preset Bar */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--accent)]/30 rounded-sm p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-data-mono">
              <span className="text-[var(--accent)] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
                快捷套用玩偶角色专属音色与 Prompt
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-sans">一键将生成参数绑定至玩偶</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyDollPreset(
                    '草莓熊',
                    'cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5',
                    '你是一名带着浓郁草莓软糖香味的软萌抱熊草莓熊 Lotso。请把新闻素材改写成充满温暖、童真与甜甜治愈感的口吻短稿，80-150字，不包含Markdown。'
                  )
                }
                className="px-2.5 py-1 bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 text-xs rounded-sm cursor-pointer transition font-serif-editorial font-bold flex items-center gap-1"
              >
                <span>🍓 草莓熊 Lotso 治愈套用</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyDollPreset(
                    '野原新之助',
                    'cosyvoice-v3.5-plus-xiaoxin-38bc6f91ce58475bbc8c9a5d534b3a64',
                    '你是一名充满大象舞与无厘头爆笑魅力的野原新之助！请把新闻素材改写成超酷、爆笑搞笑、带有点动感超人风格的短新闻，80-150字。'
                  )
                }
                className="px-2.5 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-xs rounded-sm cursor-pointer transition font-serif-editorial font-bold flex items-center gap-1"
              >
                <span>⚡ 野原新之助 爆笑套用</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyDollPreset(
                    '樱桃小丸子',
                    'cosyvoice-v3.5-plus-wanzi-2de095b4499040f6b00397ff53f58afe',
                    '你是一名清水市真诚、偶尔带点懒洋洋但极度治愈的樱桃小丸子。请把新闻改写成日常娓娓道来、感悟生活美好的碎碎念播报，80-150字。'
                  )
                }
                className="px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs rounded-sm cursor-pointer transition font-serif-editorial font-bold flex items-center gap-1"
              >
                <span>🌸 樱桃小丸子 生活套用</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyDollPreset(
                    '胡迪警长',
                    'cosyvoice-v3.5-plus-hudi-a528aa91d91e4beab1ef260045ed923e',
                    '我的靴子里有只靴蛇！你是一名正义勇敢、沉稳讲义气的西部胡迪警长。请用正义号角、稳重大气的特派员口吻改写新闻，80-150字。'
                  )
                }
                className="px-2.5 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 text-xs rounded-sm cursor-pointer transition font-serif-editorial font-bold flex items-center gap-1"
              >
                <span>🤠 胡迪警长 正义套用</span>
              </button>
            </div>
          </div>

          {/* Generative Engine & Voice Section */}
          <div className="space-y-3 font-data-mono text-xs bg-[var(--bg-primary)] p-3.5 border border-[var(--border-color)] rounded-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">graphic_eq</span>
                TTS 语音合成引擎与音色库选型
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">持久化落盘至数据库</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">TTS 语音合成引擎</label>
                <select
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value as any)}
                  disabled={isRunning}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                >
                  {TTS_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">发音人音色 (Voice ID)</label>
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  disabled={isRunning || !generateAudio}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                >
                  {filteredVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.category}] {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(event) => setGenerateAudio(event.target.checked)}
                disabled={isRunning}
                className="rounded-sm text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-[var(--text-primary)] font-bold">
                同时生成新闻 TTS 音频文件 (存入 /static/audio/news)
              </span>
            </label>
          </div>

          {/* LLM Script Generation Prompt Section */}
          <div className="space-y-3 font-data-mono text-xs bg-[var(--bg-primary)] p-3.5 border border-[var(--border-color)] rounded-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">psychology</span>
                新闻 LLM 改写 Prompt 与大模型选型
              </span>
              <button
                type="button"
                onClick={() => setShowGenerativeConfig(!showGenerativeConfig)}
                className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{showGenerativeConfig ? '收起配置' : '展开/自定义 Prompt'}</span>
                <span className="material-symbols-outlined text-sm">
                  {showGenerativeConfig ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">大模型选型 (LLM Model)</label>
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                >
                  {LLM_MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">新闻播报 Prompt 预设模板</label>
                <select
                  value={selectedPromptPresetId}
                  onChange={(e) => handleSelectPromptPreset(e.target.value)}
                  disabled={isRunning}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                >
                  {PROMPT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[var(--text-muted)] block mb-1 text-[11px]">
                新闻改写 System Prompt 设定文本 (直接决定改写风格与字数)
              </label>
              <textarea
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isRunning}
                className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] p-2.5 text-[var(--text-primary)] font-sans text-xs focus:border-[var(--accent)] focus:outline-none rounded-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs">{error}</div>}
        {result && <div className="p-3 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs">{result}</div>}

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)] shrink-0">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-muted)] text-xs disabled:opacity-50 cursor-pointer rounded-sm hover:bg-[var(--bg-subcard)]"
          >
            {result ? '完成' : '取消'}
          </button>
          <button
            onClick={() => void handleRun()}
            disabled={isRunning}
            className="px-5 py-2 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer rounded-sm shadow-md active:scale-95 transition-all"
          >
            <span className={`material-symbols-outlined text-base ${isRunning ? 'animate-spin' : ''}`}>
              {isRunning ? 'sync' : 'play_arrow'}
            </span>
            <span>{isRunning ? '抓取、LLM改写与TTS生成中…' : '开始完整生成流水线'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
