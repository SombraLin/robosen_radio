import React, { useState } from 'react';
import { ChannelTemplate, ChannelTemplateItem, PlaylistItemType, AudioType } from '../../types';

interface ChannelTemplatesViewProps {
  templates: ChannelTemplate[];
  onAddTemplate?: (template: ChannelTemplate) => void;
  onUpdateTemplate?: (template: ChannelTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
}

export const ChannelTemplatesView: React.FC<ChannelTemplatesViewProps> = ({
  templates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate
}) => {
  const [editingTemplate, setEditingTemplate] = useState<ChannelTemplate | null>(null);

  if (editingTemplate) {
    return (
      <ChannelTemplateEditor
        template={editingTemplate}
        onSave={(updated) => {
          if (templates.find(t => t.id === updated.id)) {
            onUpdateTemplate?.(updated);
          } else {
            onAddTemplate?.(updated);
          }
          setEditingTemplate(null);
        }}
        onCancel={() => setEditingTemplate(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6 md:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-2xl text-[var(--accent)]">view_list</span>
            <h2 className="text-2xl font-serif-editorial font-bold text-[var(--text-primary)] tracking-wide">
              频道内容模板
            </h2>
          </div>
          <p className="text-xs font-serif-editorial text-[var(--text-muted)] max-w-3xl leading-relaxed">
            编辑频道播报骨架与内容编排。模板可用于后续自动化流水线，生成完整的频道播放列表。
          </p>
        </div>
        <button
          onClick={() => {
            const newTpl: ChannelTemplate = {
              id: `tpl-${Date.now()}`,
              name: '新频道模板',
              description: '',
              category: '新闻频道',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              templateItems: []
            };
            setEditingTemplate(newTpl);
          }}
          className="bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 font-serif-editorial font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>新建模板</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-5 hover:border-[var(--accent)]/50 transition-colors shadow-xs flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-data-mono text-[10px] uppercase border px-2 py-0.5 rounded-sm tracking-wider font-bold bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30">
                  {tpl.category}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-data-mono">{tpl.templateItems.length} 个节点</span>
              </div>
              <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)] mb-1">{tpl.name}</h3>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 min-h-[32px]">{tpl.description}</p>
            </div>
            
            <div className="mt-auto pt-4 border-t border-[var(--border-color)] flex justify-end gap-2">
              <button 
                onClick={() => setEditingTemplate(tpl)}
                className="px-3 py-1.5 text-xs bg-[var(--bg-subcard)] hover:bg-[var(--accent)] text-[var(--text-primary)] hover:text-[var(--accent-text)] border border-[var(--border-color)] rounded-sm font-bold transition-colors cursor-pointer"
              >
                编辑模板
              </button>
              {onDeleteTemplate && (
                <button 
                  onClick={() => {
                    if (confirm(`确定要删除模板 "${tpl.name}" 吗？`)) onDeleteTemplate(tpl.id);
                  }}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-sm font-bold transition-colors cursor-pointer"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// Sub-component: ChannelTemplateEditor
// ==========================================
interface ChannelTemplateEditorProps {
  template: ChannelTemplate;
  onSave: (tpl: ChannelTemplate) => void;
  onCancel: () => void;
}

const ChannelTemplateEditor: React.FC<ChannelTemplateEditorProps> = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [category, setCategory] = useState(template.category);
  const [items, setItems] = useState<ChannelTemplateItem[]>(template.templateItems || []);

  const handleAddItem = (kind: 'audio' | 'tts') => {
    const newItem: ChannelTemplateItem = {
      id: `ti-${Date.now()}`,
      itemKind: kind,
      title: kind === 'audio' ? '新建物理音频节点' : '新建AI配音节点',
      audioType: kind === 'audio' ? '片头' : undefined,
      ttsNodeType: kind === 'tts' ? 'news_script' : undefined,
      speakerRole: kind === 'tts' ? '主播' : undefined
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<ChannelTemplateItem>) => {
    setItems(items.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setItems(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setItems(newItems);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer mr-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-[var(--accent)] text-2xl">edit_document</span>
          <h2 className="text-xl font-serif-editorial font-bold text-[var(--text-primary)]">
            编辑模板骨架
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-[var(--bg-subcard)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-sm font-bold hover:text-[var(--text-primary)] cursor-pointer">
            取消
          </button>
          <button 
            onClick={() => onSave({ ...template, name, description, category, templateItems: items, updatedAt: new Date().toISOString() })}
            className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-sm font-bold shadow-md hover:opacity-90 cursor-pointer"
          >
            保存模板
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-sm space-y-4">
        <div>
          <label className="block text-[var(--accent)] font-bold text-xs uppercase mb-1">模板名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-bold" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--accent)] font-bold text-xs uppercase mb-1">所属分类</label>
            <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)]">
              {['新闻频道', '天气频道', '电子宠物频道', '故事频道', '音乐频道', '剧场频道', '学习频道'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[var(--accent)] font-bold text-xs uppercase mb-1">描述说明</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)]" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-serif-editorial font-bold text-[var(--text-primary)]">排播骨架</h3>
          <div className="flex gap-2">
            <button onClick={() => handleAddItem('audio')} className="px-3 py-1.5 text-xs bg-[var(--bg-subcard)] border border-[var(--accent)] text-[var(--accent)] rounded-sm font-bold flex items-center gap-1 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] cursor-pointer">
              <span className="material-symbols-outlined text-[14px]">audio_file</span> 添加物理音频块
            </button>
            <button onClick={() => handleAddItem('tts')} className="px-3 py-1.5 text-xs bg-[var(--bg-subcard)] border border-cyan-500 text-cyan-500 rounded-sm font-bold flex items-center gap-1 hover:bg-cyan-600 hover:text-white cursor-pointer">
              <span className="material-symbols-outlined text-[14px]">record_voice_over</span> 添加AI配音块
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-3 flex gap-4 items-center">
              <div className="flex flex-col gap-1">
                <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer">▲</button>
                <button onClick={() => handleMoveDown(index)} disabled={index === items.length - 1} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer">▼</button>
              </div>
              
              <div className="w-12 h-12 shrink-0 rounded flex items-center justify-center text-xl shadow-inner border border-white/5"
                style={{ backgroundColor: item.itemKind === 'audio' ? '#f59e0b20' : '#06b6d420', color: item.itemKind === 'audio' ? '#f59e0b' : '#06b6d4' }}>
                <span className="material-symbols-outlined">{item.itemKind === 'audio' ? 'music_note' : 'smart_toy'}</span>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <input type="text" value={item.title || ''} onChange={e => handleUpdateItem(item.id, { title: e.target.value })} className="w-full bg-transparent border-b border-[var(--border-color)] focus:border-[var(--accent)] outline-none text-sm font-bold text-[var(--text-primary)] mb-1 pb-1" placeholder="节点标题" />
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{item.itemKind === 'audio' ? '物理音频引用' : 'TTS自动配音生成'}</div>
                </div>
                
                <div className="flex items-end gap-2">
                  {item.itemKind === 'audio' ? (
                    <select value={item.audioType || ''} onChange={e => handleUpdateItem(item.id, { audioType: e.target.value as any })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-xs p-1.5 rounded-sm">
                      <option value="片头">片头</option>
                      <option value="转场音效">转场音效</option>
                      <option value="背景音乐">背景音乐</option>
                      <option value="片尾谢幕">片尾谢幕</option>
                    </select>
                  ) : (
                    <>
                      <select value={item.ttsNodeType || ''} onChange={e => handleUpdateItem(item.id, { ttsNodeType: e.target.value as any })} className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-xs p-1.5 rounded-sm">
                        <option value="intro">开场白 (Intro)</option>
                        <option value="news_script">新闻播报</option>
                        <option value="commentary">评论/互动</option>
                        <option value="story_body">故事正文</option>
                        <option value="outro">结束语 (Outro)</option>
                      </select>
                      <input type="text" value={item.speakerRole || ''} onChange={e => handleUpdateItem(item.id, { speakerRole: e.target.value })} placeholder="角色(如: 主播)" className="w-24 bg-[var(--bg-card)] border border-[var(--border-color)] text-xs p-1.5 rounded-sm" />
                    </>
                  )}
                </div>
              </div>
              
              <button onClick={() => handleRemoveItem(item.id)} className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
          {items.length === 0 && <div className="text-center py-8 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-color)] rounded-sm">暂无骨架节点，请点击上方按钮添加。</div>}
        </div>
      </div>
    </div>
  );
};
