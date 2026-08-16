import React, { useEffect, useState } from 'react';
import {
  AdminNewsDetailDto,
  generateNewsScript,
  getAdminNewsDetail,
  moveNewsToTrash,
  regenerateNewsAudio,
  updateNewsScript,
} from '../../api/newsCenter';
import {
  VOICE_OPTIONS,
  PROMPT_PRESETS,
  LLM_MODEL_OPTIONS,
  TTS_PROVIDER_OPTIONS,
} from '../../data/voiceRegistry';
import { useNewsStore } from '../../features/news-console/store';
import { useNewsActions } from '../../features/news-console/hooks';

interface NewsDetailModalProps {
  newsId?: string | null;
  onClose?: () => void;
  onChanged?: () => void;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  newsId: propsNewsId,
  onClose: propsOnClose,
  onChanged: propsOnChanged,
}) => {
  const storeIsOpen = useNewsStore((s) => s.isNewsDetailOpen);
  const storeDetail = useNewsStore((s) => s.selectedNewsDetail);
  const setIsOpen = useNewsStore((s) => s.setIsNewsDetailOpen);
  const setSelectedDetail = useNewsStore((s) => s.setSelectedNewsDetail);
  const { loadNews } = useNewsActions();

  const newsId = propsNewsId !== undefined ? propsNewsId : storeDetail?.id || (storeIsOpen ? 'detail' : null);
  const onClose =
    propsOnClose ||
    (() => {
      setIsOpen(false);
      setSelectedDetail(null);
    });
  const onChanged =
    propsOnChanged ||
    (() => {
      loadNews();
    });
  const [detail, setDetail] = useState<AdminNewsDetailDto | null>(null);
  const [scriptText, setScriptText] = useState('');
  const [commentaryTexts, setCommentaryTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');

  // Generative AI Config States
  const [customPrompt, setCustomPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [llmModel, setLlmModel] = useState('qwen-plus');
  const [ttsProvider, setTtsProvider] = useState<'edge' | 'bailian' | 'local'>('edge');
  const [voiceId, setVoiceId] = useState('zh-CN-XiaoxiaoNeural');
  const [showConfig, setShowConfig] = useState(false);

  const load = async () => {
    if (!newsId) return;
    setLoading(true);
    setError('');
    try {
      const value = await getAdminNewsDetail(newsId);
      setDetail(value);
      setScriptText(value.script_text);
      if (value.custom_prompt) setCustomPrompt(value.custom_prompt);
      if (value.llm_model) setLlmModel(value.llm_model);
      if (value.tts_provider) setTtsProvider(value.tts_provider as any);
      if (value.audio && value.audio.voice_id) setVoiceId(value.audio.voice_id);
      setCommentaryTexts(Object.fromEntries(value.commentaries.map((item) => [item.id, item.commentary_text])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载新闻详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [newsId]);

  if (!newsId) return null;

  const runAction = async (label: string, task: () => Promise<unknown>, closeAfter = false) => {
    setAction(label);
    setError('');
    try {
      await task();
      onChanged();
      if (closeAfter) onClose();
      else await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${label}失败`);
    } finally {
      setAction('');
    }
  };

  const filteredVoices = VOICE_OPTIONS.filter((v) => {
    if (ttsProvider === 'edge') return v.provider === 'edge';
    if (ttsProvider === 'bailian') return v.provider === 'bailian';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="max-w-5xl mx-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm shadow-2xl my-6">
        <div className="sticky top-0 z-10 p-5 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-start justify-between gap-4">
          <div>
            <span className="font-data-mono text-[10px] text-[var(--accent)] uppercase font-bold tracking-wider">
              真实新闻详情与生成式 AI 控制
            </span>
            <h2 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)] mt-1">
              {detail?.title || '正在加载…'}
            </h2>
            {detail && (
              <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                {detail.source} · {detail.tag} · 稿件: {detail.script_status} · 音频: {detail.audio_status}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs">{error}</div>}
          {loading && !detail && <div className="py-16 text-center text-[var(--text-muted)]">正在加载新闻详情…</div>}

          {detail && (
            <>
              {/* Original Summary */}
              <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-sm">
                <div className="flex justify-between gap-4">
                  <h3 className="font-serif-editorial font-bold text-sm text-[var(--text-primary)]">原始抓取新闻</h3>
                  {detail.url && (
                    <a
                      href={detail.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-mono"
                    >
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                      <span>查看来源原文</span>
                    </a>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2.5 leading-relaxed font-sans">
                  {detail.raw_summary || '暂无原始摘要'}
                </p>
              </section>

              {/* Generative AI Configuration Bar */}
              <section className="bg-[var(--bg-subcard)] border border-[var(--accent)]/30 p-4 rounded-sm space-y-3 font-data-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--accent)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>新闻专属生成式 AI 配置 (Prompt / 大模型 / TTS 音色)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>{showConfig ? '收起配置' : '配置与预览'}</span>
                    <span className="material-symbols-outlined text-sm">
                      {showConfig ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[var(--text-muted)] block mb-1 text-[11px]">大模型选型</label>
                    <select
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
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
                    <label className="text-[var(--text-muted)] block mb-1 text-[11px]">TTS 语音引擎</label>
                    <select
                      value={ttsProvider}
                      onChange={(e) => setTtsProvider(e.target.value as any)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                    >
                      {TTS_PROVIDER_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[var(--text-muted)] block mb-1 text-[11px]">播报音色 (Voice ID)</label>
                    <select
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                    >
                      {filteredVoices.map((v) => (
                        <option key={v.id} value={v.id}>
                          [{v.category}] {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {showConfig && (
                  <div>
                    <label className="text-[var(--text-muted)] block mb-1 text-[11px]">
                      播报稿 System Prompt 设定文本 (重新生成稿件时生效)
                    </label>
                    <textarea
                      rows={3}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] font-sans focus:border-[var(--accent)] focus:outline-none rounded-sm resize-none"
                    />
                  </div>
                )}
              </section>

              {/* News Script Editor */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-editorial font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--accent)] text-base">edit_note</span>
                    <span>新闻播报稿正文</span>
                  </h3>
                  <span className="font-data-mono text-[11px] text-[var(--accent)] font-bold">
                    {scriptText.length} 字
                  </span>
                </div>

                <textarea
                  value={scriptText}
                  onChange={(event) => setScriptText(event.target.value)}
                  rows={6}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] font-sans focus:border-[var(--accent)] focus:outline-none rounded-sm leading-relaxed"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={Boolean(action)}
                    onClick={() => runAction('保存播报稿', () => updateNewsScript(detail.id, scriptText))}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-xs font-serif-editorial font-bold disabled:opacity-50 cursor-pointer rounded-sm shadow hover:opacity-90 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>保存播报稿</span>
                  </button>

                  <button
                    disabled={Boolean(action)}
                    onClick={() =>
                      runAction('LLM 重新生成播报稿', () =>
                        generateNewsScript(detail.id, { customPrompt, llmModel })
                      )
                    }
                    className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-serif-editorial font-bold disabled:opacity-50 cursor-pointer rounded-sm hover:bg-[var(--bg-subcard)] transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>按 Prompt 重新生成稿件</span>
                  </button>

                  <button
                    disabled={Boolean(action)}
                    onClick={() =>
                      runAction('TTS 重生成新闻音频', () =>
                        regenerateNewsAudio(detail.id, voiceId, ttsProvider)
                      )
                    }
                    className="px-4 py-2 border border-[var(--accent)] text-[var(--accent)] text-xs font-serif-editorial font-bold disabled:opacity-50 cursor-pointer rounded-sm hover:bg-[var(--accent)]/15 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">volume_up</span>
                    <span>重新合成 TTS 音频</span>
                  </button>

                  {detail.audio.local_url && (
                    <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-1 border border-[var(--border-color)] rounded-sm">
                      <span className="text-[11px] font-data-mono text-[var(--accent)]">音频试听:</span>
                      <audio controls src={detail.audio.local_url} className="h-7 max-w-xs" />
                    </div>
                  )}
                </div>
              </section>

              {/* Doll Commentary Section */}
              <section className="space-y-3">
                <h3 className="font-serif-editorial font-bold text-sm text-[var(--text-primary)]">玩偶频道独家点评</h3>
                {detail.commentaries.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] font-data-mono">当前新闻暂未生成玩偶点评内容。</p>
                )}
                {detail.commentaries.map((commentary) => (
                  <div key={commentary.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 space-y-3 rounded-sm">
                    <div className="flex justify-between text-xs font-data-mono">
                      <strong className="text-[var(--accent)]">{commentary.doll_id} 点评</strong>
                      <span className="text-[var(--text-muted)]">
                        稿件: {commentary.status} / 音频: {commentary.audio.status}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      readOnly
                      value={commentaryTexts[commentary.id] || ''}
                      className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] p-3 text-xs text-[var(--text-primary)] opacity-80 resize-none font-sans"
                    />
                    {commentary.audio.local_url && (
                      <audio controls src={commentary.audio.local_url} className="h-8 max-w-sm" />
                    )}
                  </div>
                ))}
              </section>

              {/* Footer Delete Action */}
              <div className="border-t border-[var(--border-color)] pt-5 flex justify-between items-center font-data-mono text-xs">
                <span className="text-[var(--text-muted)]">
                  {action ? `正在处理: ${action}…` : '所有修改将实时持久化保存至后端 SQLite 数据库'}
                </span>
                <button
                  disabled={Boolean(action)}
                  onClick={() => {
                    if (window.confirm(`确认将《${detail.title}》移入回收站？`)) {
                      void runAction('移入回收站', () => moveNewsToTrash(detail.id), true);
                    }
                  }}
                  className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs disabled:opacity-50 cursor-pointer rounded-sm transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>移入回收站</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
