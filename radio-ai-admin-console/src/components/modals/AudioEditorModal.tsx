import React, { useState, useEffect } from 'react';
import { AudioAssetItem, AudioCategory, AudioType } from '../../types';
import { playSynthPreset, stopCurrentSynth } from '../../utils/audioSynth';
import { uploadAudioAssetApi, isRadioAiApiEnabled } from '../../api/newsCenter';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

interface AudioEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AudioAssetItem | null;
  onSaveAsset: (asset: AudioAssetItem) => void;
  onDeleteAsset?: (id: string) => void;
}

const CHANNEL_CATEGORIES: AudioCategory[] = [
  '新闻频道',
  '天气频道',
  '电子宠物频道',
  '故事频道',
  '音乐频道',
  '剧场频道',
  '学习频道',
  '系统通用'
];

const AUDIO_TYPES: AudioType[] = [
  '片头',
  '转场音效',
  '背景音乐',
  '事件提示音',
  '原声曲目',
  '片尾谢幕'
];

export const AudioEditorModal: React.FC<AudioEditorModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSaveAsset,
  onDeleteAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'tts'>('upload');
  const [title, setTitle] = useState('');
  const [channelCategory, setChannelCategory] = useState<AudioCategory>('新闻频道');
  const [audioType, setAudioType] = useState<AudioType>('片头');
  
  // Upload State
  const [url, setUrl] = useState('');

  // TTS State
  const [sourceText, setSourceText] = useState('');
  const [ttsProvider, setTtsProvider] = useState<'edge' | 'bailian'>('edge');
  const [voiceId, setVoiceId] = useState('zh-CN-XiaoxiaoNeural');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (asset) {
      setTitle(asset.title || '');
      setChannelCategory((asset.channelCategory || asset.category || '新闻频道') as AudioCategory);
      setAudioType(asset.audioType || '片头');
      setUrl(asset.url || '');
      if (asset.sourceText) {
        setActiveTab('tts');
        setSourceText(asset.sourceText);
        setTtsProvider((asset.ttsProvider as any) || 'edge');
        setVoiceId(asset.voiceId || 'zh-CN-XiaoxiaoNeural');
      } else {
        setActiveTab('upload');
      }
    } else {
      setTitle('');
      setChannelCategory('新闻频道');
      setAudioType('片头');
      setUrl('');
      setSourceText('');
      setTtsProvider('edge');
      setVoiceId('zh-CN-XiaoxiaoNeural');
      setActiveTab('upload');
    }
  }, [asset, isOpen]);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stopModalAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    stopCurrentSynth();
    setIsPlaying(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopModalAudio();
    }
  }, [isOpen]);

  const handleTestPlay = () => {
    if (isPlaying) {
      stopModalAudio();
      return;
    }

    stopModalAudio();
    setIsPlaying(true);

    if (url) {
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        audioRef.current = null;
        playSynthPreset('jingle', 3); // using default preset string
        setTimeout(() => setIsPlaying(false), 3000);
      };

      audio.play().catch(() => {
        audioRef.current = null;
        playSynthPreset('jingle', 3);
        setTimeout(() => setIsPlaying(false), 3000);
      });
    } else {
      playSynthPreset('jingle', 3);
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    if (!title.trim()) {
      setTitle(nameWithoutExt);
    }

    // Set immediate preview URL for instant playback
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    setIsUploading(true);
    try {
      const res = await uploadAudioAssetApi(file);
      if (res && res.url) {
        setUrl(res.url);
      }
    } catch (err) {
      console.error('上传物理音频到后端失败，继续使用本地内存链接:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);

  const handleGenerateTts = async () => {
    if (!sourceText.trim()) {
      alert("请输入TTS合成文本");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/radio-ai/tts/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          voice_id: voiceId,
          tts_provider: ttsProvider,
        }),
      });
      if (!response.ok) throw new Error('合成失败');
      const data = await response.json();
      if (data.audio_url) {
        setUrl(`${API_BASE_URL}${data.audio_url}`);
      }
      if (data.duration_seconds) {
        setDetectedDuration(data.duration_seconds);
      }
      if (!title.trim()) {
        const autoTitle = `【${channelCategory}】${sourceText.slice(0, 15)}...`;
        setTitle(autoTitle);
      }
    } catch (e) {
      alert("生成失败，请检查网络或后端日志。");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || (sourceText.trim() ? `【${channelCategory}】${sourceText.trim().slice(0, 15)}` : `【${channelCategory}】未命名音频`);

    const durSec = detectedDuration || asset?.durationSeconds || 8;
    const minutes = Math.floor(durSec / 60);
    const seconds = Math.floor(durSec % 60);
    const durFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    const newOrUpdatedAsset: AudioAssetItem = {
      id: asset ? asset.id : `audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: finalTitle,
      category: channelCategory,
      channelCategory,
      audioType,
      duration: durFormatted,
      durationSeconds: durSec,
      tags: asset?.tags && asset.tags.length > 0 ? asset.tags : [channelCategory, audioType],
      usedInChannels: asset?.usedInChannels || [],
      url: url.trim() || undefined,
      sourceText: activeTab === 'tts' ? sourceText.trim() : undefined,
      ttsProvider: activeTab === 'tts' ? ttsProvider : undefined,
      voiceId: activeTab === 'tts' ? voiceId : undefined,
    };

    onSaveAsset(newOrUpdatedAsset);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn select-none">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent)] text-xl">
              {asset ? 'edit' : 'add_circle'}
            </span>
            <h3 className="font-serif-editorial font-bold text-base text-[var(--text-primary)]">
              {asset ? '编辑音频资产' : '新增音频资产'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-subcard)]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 text-xs font-bold font-serif-editorial transition-colors flex justify-center items-center gap-2 ${
              activeTab === 'upload' ? 'bg-[var(--bg-card)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            本地上传 / 链接
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tts')}
            className={`flex-1 py-3 text-xs font-bold font-serif-editorial transition-colors flex justify-center items-center gap-2 ${
              activeTab === 'tts' ? 'bg-[var(--bg-card)] text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">record_voice_over</span>
            AI 语音合成 (TTS)
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-serif-editorial max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* 1. 音频名称 */}
          <div>
            <label className="block text-[var(--accent)] font-bold mb-1.5 uppercase tracking-wider">
              音频名称 *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入音频名称，如: 欢快舒缓背景乐"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* 2. 频道类别 & 音效类别 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[var(--accent)] font-bold mb-1.5 uppercase tracking-wider">
                频道类别 *
              </label>
              <select
                value={channelCategory}
                onChange={(e) => setChannelCategory(e.target.value as AudioCategory)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                {CHANNEL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[var(--accent)] font-bold mb-1.5 uppercase tracking-wider">
                音效类别 *
              </label>
              <select
                value={audioType}
                onChange={(e) => setAudioType(e.target.value as AudioType)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                {AUDIO_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-3 bg-[var(--bg-primary)] p-4 rounded-sm border border-[var(--border-color)]">
              <label className="block text-[var(--accent)] font-bold uppercase tracking-wider">
                上传文件 / 网络 URL
              </label>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-subcard)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-sm font-bold cursor-pointer transition-all">
                  <span className="material-symbols-outlined text-base">cloud_upload</span>
                  <span>选择本地音频文件</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="或粘贴网络音频 URL (https://...)"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-2 font-data-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />

              </div>
            </div>
          )}

          {/* TTS Tab */}
          {activeTab === 'tts' && (
            <div className="space-y-4 bg-[var(--bg-primary)] p-4 rounded-sm border border-[var(--border-color)]">
              <div>
                <label className="block text-[var(--accent)] font-bold mb-1.5 uppercase tracking-wider">
                  合成文本 (Source Text)
                </label>
                <textarea
                  rows={3}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="请输入要合成的文本..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] font-bold mb-1 uppercase text-[10px]">
                    合成引擎
                  </label>
                  <select
                    value={ttsProvider}
                    onChange={(e) => setTtsProvider(e.target.value as any)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="edge">Edge-TTS (微软免费)</option>
                    <option value="bailian">阿里百炼 (CosyVoice)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] font-bold mb-1 uppercase text-[10px]">
                    发音人 ID
                  </label>
                  <input
                    type="text"
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    placeholder="如: zh-CN-XiaoxiaoNeural"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGenerateTts}
                  disabled={isGenerating || !sourceText.trim()}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-sm font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isGenerating ? 'sync' : 'magic_button'}
                  </span>
                  <span className={isGenerating ? 'animate-pulse' : ''}>
                    {isGenerating ? '正在生成...' : '立即合成'}
                  </span>
                </button>
              </div>

              {url && !isGenerating && activeTab === 'tts' && (
                <div className="mt-2 text-[10px] text-green-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  音频已生成，可进行试听或保存
                </div>
              )}
            </div>
          )}

          {/* 4. 试听按钮 */}
          <div className="flex items-center justify-between bg-[var(--bg-subcard)] p-3 rounded-sm border border-[var(--border-color)]">
            <span className="text-[var(--text-muted)]">准备就绪后可在线试听效果:</span>
            <button
              type="button"
              onClick={handleTestPlay}
              disabled={!url}
              className={`px-4 py-1.5 rounded-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all border disabled:opacity-50 ${
                isPlaying
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs animate-pulse'
                  : 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)]'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isPlaying ? 'pause' : 'volume_up'}
              </span>
              <span>{isPlaying ? '暂停' : '试听'}</span>
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
            {asset && onDeleteAsset ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`确定要删除音频资产 "${asset.title}" 吗？`)) {
                    onDeleteAsset(asset.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-sm font-bold transition-all cursor-pointer"
              >
                删除
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--bg-subcard)] hover:opacity-90 text-[var(--text-muted)] border border-[var(--border-color)] rounded-sm font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!url && activeTab === 'tts'}
                className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-sm font-bold shadow-md hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
