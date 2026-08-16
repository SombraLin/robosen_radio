import React, { useState, useEffect, useRef } from 'react';
import { Doll } from '../../types';
import { DOLL_REGISTRY, DollConfig, updateDollAvatar } from '../../data/dollRegistry';
import { saveDollAvatarApi } from '../../api/newsCenter';
import { AvatarCropperModal } from './AvatarCropperModal';
import { Upload, Crop } from 'lucide-react';

interface DollEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doll: Doll | null;
  onSaveDoll: (updatedDoll: Doll) => void;
  onDeleteDoll?: (dollId: string) => void;
}

export const DollEditorModal: React.FC<DollEditorModalProps> = ({
  isOpen,
  onClose,
  doll,
  onSaveDoll,
  onDeleteDoll,
}) => {
  const [selectedDollIdKey, setSelectedDollIdKey] = useState<string>('MINI-LOTSO');
  const [dollName, setDollName] = useState('草莓熊 Lotso');
  const [stationCode, setStationCode] = useState('STATION_LOTSO');
  const [tagline, setTagline] = useState('草莓香味玩具总动员专栏主播');
  const [roleTitle, setRoleTitle] = useState('治愈系主播');
  const [avatarUrl, setAvatarUrl] = useState('/avatars/MINI-LOTSO.png');
  const [promptText, setPromptText] = useState('带着浓郁草莓香味的软萌玩偶，用温暖憨厚的语调聊聊生活中的童真与美好。');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Avatar Image Cropper State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);

  const [ttsProvider, setTtsProvider] = useState<'edge' | 'bailian' | 'local'>('edge');
  const [speaker, setSpeaker] = useState<string>('zh-CN-XiaoxiaoNeural');
  const [llmModel, setLlmModel] = useState<string>('qwen-plus');

  useEffect(() => {
    if (doll && isOpen) {
      setDollName(doll.name);
      setStationCode(doll.stationCode);
      setTagline(doll.tagline);
      setRoleTitle(doll.roleTitle || 'Virtual Host');
      setAvatarUrl(doll.avatarUrl || '/avatars/ROBOSEN-BASIC-LIGHT.png');
      setPromptText(doll.prompt || '全能智能 AI 玩偶主播，用温暖专业的语调播报热点新闻。');
      setTtsProvider(doll.ttsProvider || 'edge');
      setSpeaker(doll.speaker || 'zh-CN-XiaoxiaoNeural');
      setLlmModel(doll.llmModel || 'qwen-plus');
      setShowConfirmDelete(false);

      // Attempt matching registry
      const matchedKey = Object.keys(DOLL_REGISTRY).find((k) => k === doll.doll_id || k === doll.id || DOLL_REGISTRY[k].name === doll.name);
      if (matchedKey) {
        setSelectedDollIdKey(matchedKey);
        if (!doll.prompt) {
          setPromptText(DOLL_REGISTRY[matchedKey].prompt);
        }
      } else {
        setSelectedDollIdKey(doll.doll_id || doll.id || `DOLL-${Date.now()}`);
      }
    }
  }, [doll, isOpen]);

  if (!isOpen || !doll) return null;

  const handleSelectPreset = (key: string) => {
    setSelectedDollIdKey(key);
    const config: DollConfig = DOLL_REGISTRY[key];
    if (config) {
      setDollName(config.name);
      setAvatarUrl(config.avatar);
      setTagline(config.tagline);
      setRoleTitle(config.roleTitle);
      setPromptText(config.prompt);
      setStationCode(`STATION_${config.doll_id.replace(/-/g, '_')}`);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCropSourceImage(event.target.result as string);
          setIsCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const finalDollIdKey = selectedDollIdKey.trim() || doll?.doll_id || doll?.id || `DOLL-${Date.now()}`;
    onSaveDoll({
      ...doll,
      id: doll?.id || `doll-${Date.now()}`,
      doll_id: finalDollIdKey,
      name: dollName.trim() || doll?.name || '新主播',
      stationCode: stationCode.trim() || doll?.stationCode || 'STATION_01',
      tagline: tagline.trim() || doll?.tagline || 'AI 电台专栏主播',
      roleTitle: roleTitle.trim() || doll?.roleTitle || 'Virtual Host',
      avatarUrl: avatarUrl.trim() || doll?.avatarUrl || '/avatars/ROBOSEN-BASIC-LIGHT.png',
      prompt: promptText.trim() || doll?.prompt || '',
      ttsProvider,
      speaker,
      llmModel,
      channels: doll?.channels || [],
      status: doll?.status || 'offline',
    });
    onClose();
  };

  const handleDelete = () => {
    if (doll && onDeleteDoll) {
      onDeleteDoll(doll.id);
      onClose();
    }
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

        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4 shrink-0">
          <div className="w-10 h-10 rounded-sm bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">smart_toy</span>
          </div>
          <div>
            <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
              配置玩偶角色、生成式 AI 音色与人设
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
              支持选预设 DOLL_ID，配置专属 TTS 引擎与 Voice ID 音色、LLM 模型及 Prompt 人设
            </p>
          </div>
        </div>

        <div className="space-y-4 font-data-mono text-xs overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {/* Preset Selector */}
          <div>
            <label className="text-[var(--accent)] block mb-1 uppercase tracking-wider font-bold">
              速选 SERVO 官方预设玩偶 (DOLL_ID)
            </label>
            <select
              value={selectedDollIdKey}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--accent)]/40 rounded-sm p-2.5 text-[var(--text-primary)] font-bold focus:outline-none"
            >
              {Object.keys(DOLL_REGISTRY).map((key) => (
                <option key={key} value={key}>
                  {key} ({DOLL_REGISTRY[key].name}) - [{DOLL_REGISTRY[key].series}]
                </option>
              ))}
            </select>
          </div>

          {/* Avatar Preview, URL & Upload/Crop Action */}
          <div className="flex items-center gap-4 bg-[var(--bg-subcard)] p-3 rounded-sm border border-[var(--border-color)]">
            <div className="w-16 h-16 rounded-sm overflow-hidden border border-[var(--accent)]/40 shrink-0 bg-slate-950 flex items-center justify-center relative group">
              <img
                src={avatarUrl}
                alt={dollName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/avatars/ROBOSEN-BASIC-LIGHT.png';
                }}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[var(--accent)] block uppercase tracking-wider font-bold">玩偶抠图头像路径 (Avatar)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-sans font-medium text-[11px] flex items-center space-x-1 cursor-pointer transition shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上传图片抠图裁剪</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </div>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="/avatars/MINI-LOTSO.png 或上传 Data URL"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[var(--accent)] block mb-1 uppercase tracking-wider font-bold">玩偶角色名称</label>
              <input
                type="text"
                value={dollName}
                onChange={(e) => setDollName(e.target.value)}
                placeholder="例: 草莓熊 Lotso"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-serif-editorial font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[var(--accent)] block mb-1 uppercase tracking-wider font-bold">电台特刊代号</label>
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value)}
                placeholder="例: STATION_LOTSO"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-data-mono font-bold focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[var(--accent)] block mb-1 uppercase tracking-wider font-bold">身份 / 头衔</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="例: 治愈系主播"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="text-[var(--accent)] block mb-1 uppercase tracking-wider font-bold">口号 / 一句话标签</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="例: 草莓香味玩具总动员专栏主播"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Generative AI & Voice Configuration */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--accent)]/30 p-3.5 rounded-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">record_voice_over</span>
                生成式 AI 音色设定 (写入数据库)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">TTS 语音合成引擎</label>
                <select
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value as any)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none rounded-sm"
                >
                  <option value="edge">Edge-TTS 免费极速语音引擎</option>
                  <option value="bailian">阿里百炼 CosyVoice 旗舰拟真引擎</option>
                  <option value="local">本地 Demo 音频引擎</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1 text-[11px]">玩偶专属发音人 Speaker / Voice ID</label>
                {ttsProvider === 'bailian' ? (
                  <select
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none rounded-sm text-xs"
                  >
                    <option value="cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5">草莓熊 (Lotso) - 治愈软萌音</option>
                    <option value="cosyvoice-v3.5-plus-xiaoxin-5b1cf03f44604e769fb696327b87cf06">野原新之助 - 搞怪童音</option>
                    <option value="cosyvoice-v3.5-plus-wanzi-41d99fb3a7584107bcbf5fc48b0a94b3">樱桃小丸子 - 呆萌女孩</option>
                    <option value="longxiaochun">龙小淳 (标准基座音色)</option>
                    <option value="longanya_v3">龙小雅 (标准基座音色)</option>
                  </select>
                ) : (
                  <select
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none rounded-sm text-xs"
                  >
                    <option value="zh-CN-XiaoxiaoNeural">晓晓 (zh-CN-XiaoxiaoNeural) - 亲切女声</option>
                    <option value="zh-CN-XiaoyiNeural">晓伊 (zh-CN-XiaoyiNeural) - 柔和女声</option>
                    <option value="zh-CN-YunjianNeural">云健 (zh-CN-YunjianNeural) - 新闻男声</option>
                    <option value="zh-CN-YunxiNeural">云希 (zh-CN-YunxiNeural) - 活力男声</option>
                    <option value="zh-CN-YunyangNeural">云扬 (zh-CN-YunyangNeural) - 专业男声</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Doll Persona Prompt */}
          <div>
            <label className="text-[var(--accent)] block mb-1 uppercase tracking-wider font-bold">玩偶人设 Prompt 设定 (写入数据库)</label>
            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="输入大模型改写播报稿与随时打断对话的人设 Prompt 设定..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)] text-xs resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
          {onDeleteDoll ? (
            showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-data-mono">确认删除玩偶【{dollName}】?</span>
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-sm text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2 py-1 bg-gray-600 text-white rounded-sm text-xs cursor-pointer"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm text-xs font-data-mono flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>删除此玩偶角色</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-sm border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] font-serif-editorial text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-sm bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-md active:scale-95"
            >
              保存玩偶角色
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Interactive Cropper Modal */}
      <AvatarCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        imageSrc={cropSourceImage}
        onCropComplete={async (croppedResult) => {
          setAvatarUrl(croppedResult);
          try {
            const targetId = selectedDollIdKey || doll.id;
            const res = await saveDollAvatarApi(targetId, croppedResult);
            const savedUrl = res.avatar_url || croppedResult;
            setAvatarUrl(savedUrl);
            updateDollAvatar(targetId, savedUrl);
          } catch {
            updateDollAvatar(selectedDollIdKey || doll.id, croppedResult);
          }
        }}
      />
    </div>
  );
};
