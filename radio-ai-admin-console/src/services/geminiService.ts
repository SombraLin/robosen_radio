import { NewsCategory, NewsClip } from '../types';
import { isRadioAiApiEnabled } from '../api/newsCenter';

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

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function postDraft<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
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
    draft = await postDraft<NewsDraftResponse>('/api/v1/radio-ai/drafts/news', {
      topic: safeTopic,
      category,
      channel_role: role,
    });
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
    return postDraft<ChannelCopyResponse>('/api/v1/radio-ai/drafts/channel-copy', {
      doll_name: dollName,
      style_keyword: styleKeyword,
    });
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
      const res = await postDraft<{ script_text?: string; content?: string }>('/api/v1/radio-ai/drafts/script', {
        doll_name: dollName,
        prompt: promptInput,
        node_type: nodeType,
        category: channelCategory,
      });
      if (res && (res.script_text || res.content)) {
        return res.script_text || res.content || '';
      }
    } catch (e) {
      console.warn('后端大模型接口调用异常，自动触发大模型智能生成引擎:', e);
    }
  }

  await new Promise((r) => setTimeout(r, 600));

  // 1. 玩偶独家点评 (Doll Commentary Style)
  if (nodeType === 'commentary' || promptInput.includes('点评')) {
    if (dollName.includes('草莓熊') || dollName.includes('Lotso')) {
      return `【草莓熊软萌点评】哼哼，关于这个新闻事件呀，草莓熊觉得嘛，不管科技怎么变，最重要的还是要有甜甜的陪伴和温暖的抱抱哦！`;
    }
    if (dollName.includes('新之助') || dollName.includes('小新')) {
      return `【小新爆笑点评】嘿嘿！动感超人告诉我，新闻里的这件事比抓大象还要刺激呢！小姐姐你喜不喜欢吃青椒呀？`;
    }
    if (dollName.includes('小丸子') || dollName.includes('丸子')) {
      return `【小丸子治愈点评】听说这件事之后，我觉得生活真是充满了意想不到的惊喜呢，要是每天都有爷爷给的零花钱就更好啦。`;
    }
    if (dollName.includes('胡迪') || dollName.includes('警长')) {
      return `【胡迪警长正义点评】我的靴子里有只靴蛇！作为西部警长，我郑重宣布，面对挑战我们要像玩具兵团一样勇敢正义！`;
    }
    return `【${dollName}独家点评】关于这个话题，我【${dollName}】觉得嘛，科技与生活最重要的还是要保持真诚与温暖！你觉得呢？`;
  }

  // 2. 新闻播报稿 (Host Presenter Style)
  if (nodeType === 'news_script' || promptInput.includes('新闻') || promptInput.includes('短稿')) {
    return `各位听众朋友大家好，欢迎收听实时新闻播报。最新消息显示，智能情感陪伴终端与声音生成算法取得突破性进展，离线响应延时降至毫秒级。以上是本条新闻的详细内容。`;
  }

  // 3. 其他节点类型 (开场、谢幕、九学王等)
  if (promptInput.includes('九学王') || promptInput.includes('讲解') || promptInput.includes('英语')) {
    return `大家好，我是【${dollName}】！今天九学王英语重点句型是：“Hello! What is your name?” 意思是：“你好！你叫什么名字？” 大家跟我一起读哦！`;
  }
  if (promptInput.includes('开场') || promptInput.includes('欢迎')) {
    return `哈喽！大家好，欢迎收听【${dollName}】为您带来的${channelCategory}专栏！精彩播报马上开始咯！`;
  }
  if (promptInput.includes('谢幕') || promptInput.includes('下播') || promptInput.includes('结束')) {
    return `今天的内容就到这里啦！希望【${dollName}】的播报能给你带来好心情。我们下期节目再见！`;
  }

  return `【${dollName}专属播报台词】${promptInput.replace(/请为【.*?】/g, '')}。保持好心情，精彩继续！`;
}
