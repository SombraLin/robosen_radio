import { requestJson, isRadioAiApiEnabled } from '../api/client';
import { NewsCategory, NewsClip } from '../../features/news-console/types';

interface NewsDraftResponse {
  title: string;
  content: string;
  duration_seconds?: number;
}

interface ChannelCopyResponse {
  prompt: string;
  intro: string;
  outro: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${mins}:${String(remainder).padStart(2, '0')}`;
}

export async function generateAINewsClip(
  topicPrompt: string = '热点快讯',
  category: NewsCategory = '科技',
  role: string = '默认新闻'
): Promise<NewsClip> {
  const safeTopic = topicPrompt.trim() || '热点快讯';
  let draft: NewsDraftResponse | null = null;

  if (isRadioAiApiEnabled()) {
    try {
      draft = await requestJson<NewsDraftResponse>('/api/v1/radio-ai/drafts/news', {
        method: 'POST',
        body: JSON.stringify({
          topic: safeTopic,
          category,
          channel_role: role,
        }),
      });
    } catch (e) {
      console.warn('AI news draft generation failed, using mock:', e);
    }
  }

  const seconds = draft?.duration_seconds || 45;
  return {
    id: `clip-ai-${Date.now()}`,
    category,
    title: draft?.title || (safeTopic.length > 18 ? `${safeTopic.slice(0, 18)}...` : safeTopic),
    content: draft?.content || `【待后端生成】${safeTopic}`,
    durationSeconds: seconds,
    durationFormatted: formatDuration(seconds),
    role,
    status: draft ? '已就绪' : '草稿',
    createdAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  };
}

export async function generateDollPersona(
  dollName: string,
  styleKeyword: string
): Promise<{ prompt: string; intro: string; outro: string }> {
  if (isRadioAiApiEnabled()) {
    try {
      return await requestJson<ChannelCopyResponse>('/api/v1/radio-ai/drafts/channel-copy', {
        method: 'POST',
        body: JSON.stringify({
          doll_name: dollName,
          style_keyword: styleKeyword,
        }),
      });
    } catch (e) {
      console.warn('AI doll persona generation failed, fallback to template:', e);
    }
  }

  return {
    prompt: `${styleKeyword}风格的频道主持人`,
    intro: `大家好，我是${dollName}，欢迎收听我的频道。`,
    outro: '感谢收听，我们下期再见。',
  };
}

export async function generateAiNodeScriptApi(
  dollName: string,
  promptInput: string,
  nodeType: string = 'general',
  channelCategory: string = '新闻频道'
): Promise<string> {
  if (isRadioAiApiEnabled()) {
    try {
      const res = await requestJson<{ script_text?: string; content?: string }>('/api/v1/radio-ai/drafts/script', {
        method: 'POST',
        body: JSON.stringify({
          doll_name: dollName,
          prompt: promptInput,
          node_type: nodeType,
          category: channelCategory,
        }),
      });
      if (res && (res.script_text || res.content)) {
        return res.script_text || res.content || '';
      }
    } catch (e) {
      console.warn('Backend draft script generation failed, using mock generator:', e);
    }
  }

  // Fallback mock prompt expander
  const cleanPrompt = promptInput.trim() || '日常播报';
  if (nodeType === 'intro') {
    return `大家好，欢迎来到${dollName}的${channelCategory}！今天我们要聊的是：${cleanPrompt}。准备好开启声音之旅了吗？`;
  }
  if (nodeType === 'outro') {
    return `以上就是本期${dollName}${channelCategory}关于【${cleanPrompt}】的全部内容啦。感谢收听，我们下次见！`;
  }
  if (nodeType === 'commentary') {
    return `关于这个话题，我${dollName}觉得：${cleanPrompt}。虽然大家看法不同，但我觉得保持好奇心最重要！`;
  }
  return `【${dollName} ${nodeType}节点】：${cleanPrompt}。`;
}
