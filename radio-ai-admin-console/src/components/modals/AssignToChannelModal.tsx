import React, { useState } from 'react';
import { AudioAssetItem, Doll } from '../../types';

interface AssignToChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AudioAssetItem | null;
  dolls: Doll[];
  onAssignAssetToChannel: (assetId: string, dollId: string, channelId: string, itemType: 'intro' | 'transition' | 'outro' | 'music_track') => void;
}

export const AssignToChannelModal: React.FC<AssignToChannelModalProps> = ({
  isOpen,
  onClose,
  asset,
  dolls,
  onAssignAssetToChannel,
}) => {
  const [selectedDollId, setSelectedDollId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [itemType, setItemType] = useState<'intro' | 'transition' | 'outro' | 'music_track'>('intro');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !asset) return null;

  const currentDoll = dolls.find((d) => d.id === selectedDollId) || dolls[0];
  const channels = currentDoll ? currentDoll.channels : [];
  const currentChannelId = selectedChannelId || (channels[0] ? channels[0].id : '');

  const handleAssign = () => {
    if (!currentDoll || !currentChannelId) return;
    onAssignAssetToChannel(asset.id, currentDoll.id, currentChannelId, itemType);
    setSuccessMessage(`已将 "${asset.title}" 成功关联至 [${currentDoll.name}] 频道的播放节点！`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent)] text-xl">link</span>
            <h3 className="font-serif-editorial font-bold text-base text-[var(--text-primary)]">
              分配非TTS音频到指定频道播放节点
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs font-serif-editorial">
          {successMessage ? (
            <div className="p-4 bg-[var(--accent)]/15 border border-[var(--accent)]/40 rounded-sm text-[var(--accent)] font-bold text-center animate-fadeIn">
              {successMessage}
            </div>
          ) : (
            <>
              {/* Asset Details Box */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-3 rounded-sm space-y-1">
                <span className="text-[10px] font-data-mono text-[var(--accent)] uppercase tracking-wider">
                  待分配音频:
                </span>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">{asset.title}</h4>
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] font-data-mono">
                  <span>分类: {asset.channelCategory || asset.category}</span>
                  <span>|</span>
                  <span>类型: {asset.audioType || '非TTS音效'}</span>
                  <span>|</span>
                  <span>时长: {asset.duration}</span>
                </div>
              </div>

              {/* Target Doll / Channel Selection */}
              <div>
                <label className="block text-[var(--accent)] font-bold mb-1 uppercase tracking-wider">
                  选择目标玩偶 / 频道组:
                </label>
                <select
                  value={currentDoll ? currentDoll.id : ''}
                  onChange={(e) => {
                    setSelectedDollId(e.target.value);
                    const targetDoll = dolls.find((d) => d.id === e.target.value);
                    if (targetDoll && targetDoll.channels[0]) {
                      setSelectedChannelId(targetDoll.channels[0].id);
                    }
                  }}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  {dolls.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.stationCode}) - {d.roleTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-channel Selection */}
              {channels.length > 0 && (
                <div>
                  <label className="block text-[var(--accent)] font-bold mb-1 uppercase tracking-wider">
                    选择具体频道：
                  </label>
                  <select
                    value={currentChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                  >
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.channel_name || channel.name} [{channel.category || '频道'}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Node Type */}
              <div>
                <label className="block text-[var(--accent)] font-bold mb-1 uppercase tracking-wider">
                  插入节目单节点类型：
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as 'intro' | 'transition' | 'outro' | 'music_track')}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  <option value="intro">片头音效 (片头节点)</option>
                  <option value="transition">过场转场音 (转场节点)</option>
                  <option value="music_track">原声背景乐 (配乐节点)</option>
                  <option value="outro">片尾落幕声 (片尾节点)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[var(--bg-subcard)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-sm font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleAssign}
                  className="px-5 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-sm font-bold shadow-md hover:opacity-90 cursor-pointer"
                >
                  确认应用到该频道
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
