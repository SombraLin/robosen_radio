export interface VoiceOption {
  id: string;
  name: string;
  provider: 'edge' | 'bailian';
  category: 'Edge-TTS 基础音色' | 'CosyVoice 标准音色' | '玩偶角色专属音色';
  dollId?: string;
  description?: string;
}

export interface PromptPreset {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // Edge-TTS Voices
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓 (温暖女声)',
    provider: 'edge',
    category: 'Edge-TTS 基础音色',
    description: '标准自然亲切的女声，适合广播特刊与日常新闻',
  },
  {
    id: 'zh-CN-YunxiNeural',
    name: '云希 (活泼男声)',
    provider: 'edge',
    category: 'Edge-TTS 基础音色',
    description: '阳光清亮的男声，适合儿童特快与爆笑特刊',
  },
  {
    id: 'zh-CN-YunjianNeural',
    name: '云健 (稳重播报)',
    provider: 'edge',
    category: 'Edge-TTS 基础音色',
    description: '大气庄重的新闻男声，适合科技与严肃快讯',
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    name: '晓伊 (温柔女声)',
    provider: 'edge',
    category: 'Edge-TTS 基础音色',
    description: '柔和细腻的女生，适合晚安故事与治愈专栏',
  },
  {
    id: 'zh-CN-YunyangNeural',
    name: '云扬 (专业新闻)',
    provider: 'edge',
    category: 'Edge-TTS 基础音色',
    description: '电台专业播报员口吻，清晰有力度',
  },
  {
    id: 'zh-CN-XiaochenNeural',
    name: '晓辰 (亲切女声)',
    provider: 'edge',
    category: 'Edge-TTS 基础音色',
    description: '生活化播报口吻，适合美食与休闲频道',
  },

  // CosyVoice Standard Voices
  {
    id: 'longanya_v3',
    name: '龙安雅 (CosyVoice 标准女声)',
    provider: 'bailian',
    category: 'CosyVoice 标准音色',
    description: '阿里百炼 CosyVoice 旗舰女声，极度自然拟真',
  },
  {
    id: 'longchuang_v3',
    name: '龙创 (CosyVoice 标准男声)',
    provider: 'bailian',
    category: 'CosyVoice 标准音色',
    description: '阿里百炼 CosyVoice 旗舰男声，富有磁性',
  },
  {
    id: 'longshu_v3',
    name: '龙硕 (CosyVoice 故事童声)',
    provider: 'bailian',
    category: 'CosyVoice 标准音色',
    description: '清脆童真口吻，适合童话故事与小同桌陪学',
  },

  // Doll Specific Voices
  {
    id: 'cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5',
    name: '草莓熊 Lotso 专属音色',
    provider: 'bailian',
    category: '玩偶角色专属音色',
    dollId: 'MINI-LOTSO',
    description: '温暖憨厚、带着浓郁草莓软糖甜味的软萌抱熊音',
  },
  {
    id: 'cosyvoice-v3.5-plus-xiaoxin-38bc6f91ce58475bbc8c9a5d534b3a64',
    name: '野原新之助 专属音色',
    provider: 'bailian',
    category: '玩偶角色专属音色',
    dollId: 'MINI-ROBOT-A1',
    description: '无厘头搞笑、动感超人风格的大象舞搞怪音',
  },
  {
    id: 'cosyvoice-v3.5-plus-wanzi-2de095b4499040f6b00397ff53f58afe',
    name: '樱桃小丸子 专属音色',
    provider: 'bailian',
    category: '玩偶角色专属音色',
    dollId: 'XWZ-O-WLGZ',
    description: '清水市治愈少女碎碎念、真诚懒洋洋的童年童音',
  },
  {
    id: 'cosyvoice-v3.5-plus-hudi-a528aa91d91e4beab1ef260045ed923e',
    name: '胡迪警长 专属音色',
    provider: 'bailian',
    category: '玩偶角色专属音色',
    dollId: 'MINI-WOODY',
    description: '沉稳义气、西部牛仔风格的正义导播声音',
  },
];

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'standard_news',
    label: '专业新闻播报 (默认)',
    description: '客观口语化、80-150字、只输出正文',
    prompt:
      '你是一名专业的新闻播报稿编辑。请把新闻素材改写成适合语音播报的中文短稿。要求：长度控制在80到150字；语言自然口语化；保留核心事实且不编造；不加入玩偶点评；不使用Markdown；只输出播报稿正文。',
  },
  {
    id: 'healing_warm',
    label: '治愈温暖风格',
    description: '平实感人、像朋友在耳边诉说的温暖短故事',
    prompt:
      '你是一名充满亲和力的治愈系新闻播报员。请将新闻素材改写为温暖自然、接地气的短故事口吻。字数控制在80-150字，语言平实感人，带来正能量。',
  },
  {
    id: 'funny_childlike',
    label: '童趣爆笑风格',
    description: '调侃逗趣、生动夸张、激发童心',
    prompt:
      '你是一名幽默风趣的玩偶大放送主播。请用生动有趣、带有一点调侃和童趣的口吻改写新闻，字数100-150字，让听众忍不住会心一笑。',
  },
  {
    id: 'tech_flash',
    label: '科技快讯风格',
    description: '节奏明快、精炼前沿、突出影响',
    prompt:
      '你是一名敏锐的科技特派员。请用精炼、节奏明快的科技快讯口吻改写新闻，突出核心技术突破与未来影响，字数控制在80-120字。',
  },
];

export const LLM_MODEL_OPTIONS = [
  { id: 'qwen-plus', name: 'Qwen-Plus (阿里云百炼主力大模型)' },
  { id: 'qwen-max', name: 'Qwen-Max (阿里云百炼旗舰超强大模型)' },
  { id: 'qwen-turbo', name: 'Qwen-Turbo (极速低延迟大模型)' },
];

export const TTS_PROVIDER_OPTIONS = [
  { id: 'edge', name: 'Edge-TTS 免费极速语音合成' },
  { id: 'bailian', name: '阿里百炼 CosyVoice 高拟真语音合成' },
  { id: 'local', name: '本地正弦波 Demo WAV 调试引擎' },
];

export function getVoiceOptionById(voiceId: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.id === voiceId);
}

export function getVoicesForDoll(dollId: string): VoiceOption[] {
  return VOICE_OPTIONS.filter((v) => !v.dollId || v.dollId === dollId || v.dollId.replace(/-\w+$/, '') === dollId.replace(/-\w+$/, ''));
}
