import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Doll, Channel, ChannelCategory, PlaylistItem, PlaylistItemType, NewsClip, NewsStatus, AudioAssetItem, NewsCategory } from '../../types';
import { generateDollPersona, generateAiNodeScriptApi } from '../../services/geminiService';
import { speakTextWithPersona } from '../../utils/audioSynth';
import { PRESET_DOLL_IDS, INITIAL_NEWS_CLIPS, INITIAL_AUDIO_ASSETS } from '../../data/mockData';
import { getAdminNews, isRadioAiApiEnabled, getDollsApi, saveDollApi, deleteDollApi, saveChannelApi, deleteChannelApi, getAudioAssetsApi, freezeChannelApi, runNewsPipeline } from '../../api/newsCenter';
import { requestJson } from '../../shared/api/client';
import { useDollStore } from '../../features/dolls/store';
import { useDollActions } from '../../features/dolls/hooks';
import { useAudioAssetStore } from '../../features/audio-assets/store';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const CHANNEL_CATEGORIES: ChannelCategory[] = [
  '新闻频道',
  '天气频道',
  '电子宠物频道',
  '故事频道',
  '音乐频道',
  '剧场频道',
  '学习频道',
];

function getDefaultPlaylistForCategory(cat: ChannelCategory, dollName: string): PlaylistItem[] {
  switch (cat) {
    case '新闻频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'intro',
          title: `【${dollName}广播站】今日热点新闻片头`,
          speakerRole: `${dollName} (主播)`,
          durationSeconds: 12,
          durationFormatted: '0:12',
          contentSnippet: '每日热点早知道，欢迎收听今日新闻！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'transition',
          title: '全网资讯转场音效',
          speakerRole: '系统音效',
          durationSeconds: 5,
          durationFormatted: '0:05',
          contentSnippet: '[嗖—— 资讯切换音效]',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'news_script',
          title: '科技热点：人工智能玩偶陪伴市场迎来新里程碑',
          speakerRole: '男主持人',
          durationSeconds: 45,
          durationFormatted: '0:45',
          contentSnippet: '随着物联网与智能交互的快速普及，陪伴式桌面智能玩偶正进入千家万户...',
        },
        {
          id: `p-${Date.now()}-4`,
          type: 'commentary',
          title: `玩偶独家点评：${dollName}看新闻！`,
          speakerRole: `${dollName} (主播)`,
          durationSeconds: 30,
          durationFormatted: '0:30',
          contentSnippet: '这个新闻很有意义哦，我觉得科技最重要的是给人带来温暖！',
        },
        {
          id: `p-${Date.now()}-5`,
          type: 'outro',
          title: `【${dollName}广播站】播报完毕与下期预告`,
          speakerRole: `${dollName} (主播)`,
          durationSeconds: 15,
          durationFormatted: '0:15',
          contentSnippet: '今天的新闻播报到此结束，感谢收听！',
        },
      ];
    case '天气频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'intro',
          title: `【${dollName}气象台】天气播报片头曲`,
          speakerRole: `${dollName} (主播)`,
          durationSeconds: 8,
          durationFormatted: '0:08',
          contentSnippet: '天空多美好！一起来看今天的天气吧！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'weather_report',
          title: '全国气象播报：气温宜人，适合户外出行',
          speakerRole: `${dollName} (天气员)`,
          durationSeconds: 55,
          durationFormatted: '0:55',
          contentSnippet: '今日多云转晴，微风3级，出行记得带好心情！',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'outro',
          title: '【气象台结尾】温馨提醒保暖',
          speakerRole: `${dollName} (主播)`,
          durationSeconds: 10,
          durationFormatted: '0:10',
          contentSnippet: '出门别忘了看天气预报哦，下期见！',
        },
      ];
    case '电子宠物频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'pet_event',
          title: '07:00 起床唤醒：主人早安！太阳晒屁股啦！',
          speakerRole: `${dollName} (陪伴宠物)`,
          timeSlot: '07:00',
          durationSeconds: 20,
          durationFormatted: '0:20',
          contentSnippet: '揉揉眼睛，开启美好的一天吧！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'pet_event',
          title: '12:00 午餐干饭：干饭时间到了！今天吃什么好吃的？',
          speakerRole: `${dollName} (陪伴宠物)`,
          timeSlot: '12:00',
          durationSeconds: 22,
          durationFormatted: '0:22',
          contentSnippet: '好好吃饭才能有满满的能量哦！',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'pet_event',
          title: '22:00 晚安道别：时间不早了，盖好被子，晚安梦里见~',
          speakerRole: `${dollName} (陪伴宠物)`,
          timeSlot: '22:00',
          durationSeconds: 22,
          durationFormatted: '0:22',
          contentSnippet: '把手机放下，做个香甜的美梦，晚安！',
        },
      ];
    case '故事频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'intro',
          title: `【${dollName}故事屋】精彩童话故事片头`,
          speakerRole: dollName,
          durationSeconds: 10,
          durationFormatted: '0:10',
          contentSnippet: '欢迎来到小木屋故事会！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'story_body',
          title: '故事主体：神奇小镇的夜间大冒险',
          speakerRole: `${dollName} (讲述人)`,
          durationSeconds: 110,
          durationFormatted: '1:50',
          contentSnippet: '很久很久以前，在一个森林深处的小镇上...',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'outro',
          title: '【故事完结】今天的故事就讲到这里',
          speakerRole: dollName,
          durationSeconds: 12,
          durationFormatted: '0:12',
          contentSnippet: '希望这个故事带给你美好的回忆，晚安。',
        },
      ];
    case '音乐频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'intro',
          title: `【${dollName}音乐时刻】今日主打歌推荐`,
          speakerRole: dollName,
          durationSeconds: 10,
          durationFormatted: '0:10',
          contentSnippet: '戴上耳机，享受纯粹的音乐时光！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'music_track',
          title: '曲目播放：治愈系轻音乐《童年回忆》',
          speakerRole: '音乐原声',
          durationSeconds: 120,
          durationFormatted: '2:00',
          contentSnippet: '[悠扬的钢琴与弦乐合奏...]',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'outro',
          title: '【音乐台退场】愿好音乐陪伴你每一天',
          speakerRole: dollName,
          durationSeconds: 12,
          durationFormatted: '0:12',
          contentSnippet: '我们下期音乐时刻见！',
        },
      ];
    case '剧场频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'intro',
          title: `【${dollName}广播剧场】大幕拉开片头音`,
          speakerRole: dollName,
          durationSeconds: 8,
          durationFormatted: '0:08',
          contentSnippet: '精彩剧场即将上演，请各位观众就座！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'theater_act',
          title: '广播剧第一幕：意外的邂逅',
          speakerRole: '剧场全员',
          durationSeconds: 75,
          durationFormatted: '1:15',
          contentSnippet: '在清晨的街角，一个神秘的包裹打破了沉寂...',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'outro',
          title: '【剧场落幕】全员谢幕',
          speakerRole: dollName,
          durationSeconds: 15,
          durationFormatted: '0:15',
          contentSnippet: '感谢观看，下一期奇幻剧场不见不散！',
        },
      ];
    case '学习频道':
      return [
        {
          id: `p-${Date.now()}-1`,
          type: 'intro',
          title: `【${dollName}学习时间】今天一起学英语`,
          speakerRole: `${dollName} (学习伙伴)`,
          durationSeconds: 12,
          durationFormatted: '0:12',
          contentSnippet: '准备好课本，我们开始今天的英语学习吧！',
        },
        {
          id: `p-${Date.now()}-2`,
          type: 'lesson_audio',
          title: '教材播放：Basic English Hello!',
          speakerRole: '教材原声',
          durationSeconds: 90,
          durationFormatted: '1:30',
          contentSnippet: 'Hello! What is your name?',
        },
        {
          id: `p-${Date.now()}-3`,
          type: 'outro',
          title: '【学习完成】今日知识回顾',
          speakerRole: `${dollName} (学习伙伴)`,
          durationSeconds: 15,
          durationFormatted: '0:15',
          contentSnippet: '今天学会了打招呼，真棒！',
        },
      ];
    default:
      return [];
  }
}

function getItemTypeBadge(type: PlaylistItemType) {
  switch (type) {
    case 'intro':
      return { label: '开场', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', icon: 'campaign' };
    case 'transition':
      return { label: '转场音效', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30', icon: 'graphic_eq' };
    case 'news_script':
      return { label: '新闻稿件', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', icon: 'newspaper' };
    case 'commentary':
      return { label: '玩偶点评', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: 'chat_bubble' };
    case 'outro':
      return { label: '结束谢幕', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', icon: 'output' };
    case 'weather_report':
      return { label: '天气播报', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30', icon: 'wb_sunny' };
    case 'pet_event':
      return { label: '陪伴事件', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30', icon: 'pets' };
    case 'story_body':
      return { label: '故事主体', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', icon: 'menu_book' };
    case 'music_track':
      return { label: '曲目播放', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30', icon: 'library_music' };
    case 'theater_act':
      return { label: '剧场幕数', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30', icon: 'theater_comedy' };
    case 'lesson_audio':
      return { label: '教材播放', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30', icon: 'headphones' };
    case 'lesson_explanation':
      return { label: '知识讲解', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30', icon: 'record_voice_over' };
    case 'learning_practice':
      return { label: '跟读练习', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: 'mic' };
    case 'learning_quiz':
      return { label: '互动问答', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', icon: 'quiz' };
    default:
      return { label: '音轨节点', color: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30', icon: 'audiotrack' };
  }
}

interface NodeTypeOption {
  type: PlaylistItemType;
  group: '基础包装' | '新闻与点评' | '气象与陪伴' | '故事与音乐' | '广播剧场' | '九学王学习';
  label: string;
  icon: string;
  desc: string;
  defaultTitle: string;
  defaultRole: string;
  defaultSnippet: string;
  defaultDuration: number;
}

const NODE_TYPE_OPTIONS: NodeTypeOption[] = [
  // 1. 基础包装
  {
    type: 'intro',
    group: '基础包装',
    label: '开场',
    icon: 'campaign',
    desc: '频道专属片头曲、迎客台词或主播招呼声',
    defaultTitle: '【电台】专属开场 片头曲',
    defaultRole: '主播角色',
    defaultSnippet: '哈喽！欢迎收听今天的电台专栏！',
    defaultDuration: 10,
  },
  {
    type: 'transition',
    group: '基础包装',
    label: '转场音效',
    icon: 'graphic_eq',
    desc: '节点切换、切歌擦拭或场景过渡音效',
    defaultTitle: '频道转场音效',
    defaultRole: '系统音效',
    defaultSnippet: '[嗖—— 频道切场擦拭音效]',
    defaultDuration: 5,
  },
  {
    type: 'outro',
    group: '基础包装',
    label: '结束谢幕',
    icon: 'output',
    desc: '频道播报完毕告别台词、下期预告或音乐告别',
    defaultTitle: '【电台】播报完毕与下期预告',
    defaultRole: '主播角色',
    defaultSnippet: '今天的节目到此结束，感谢收听，我们下期见！',
    defaultDuration: 15,
  },

  // 2. 新闻与点评
  {
    type: 'news_script',
    group: '新闻与点评',
    label: '新闻稿件',
    icon: 'newspaper',
    desc: '全网科技、生活、文化短新闻口语化改写稿',
    defaultTitle: '新闻快讯：全网热点资讯报道',
    defaultRole: '新闻播音员',
    defaultSnippet: '这里是最新新闻快讯。随着人工智能技术的发展...',
    defaultDuration: 45,
  },
  {
    type: 'commentary',
    group: '新闻与点评',
    label: '玩偶独家点评',
    icon: 'chat_bubble',
    desc: '玩偶主播针对新闻、故事或音乐的即兴观点与吐槽',
    defaultTitle: '玩偶独家点评：玩偶看热点！',
    defaultRole: '主播角色',
    defaultSnippet: '我觉得这个非常有意义呢！你怎么看？',
    defaultDuration: 30,
  },

  // 3. 气象与陪伴
  {
    type: 'weather_report',
    group: '气象与陪伴',
    label: '天气播报',
    icon: 'wb_sunny',
    desc: '实时气象数据、生活场景穿着与出行建议',
    defaultTitle: '全国气象播报：气温宜人与出行建议',
    defaultRole: '气象播报员',
    defaultSnippet: '今日多云转晴，微风3级，出行记得带好心情！',
    defaultDuration: 50,
  },
  {
    type: 'pet_event',
    group: '气象与陪伴',
    label: '陪伴事件',
    icon: 'pets',
    desc: '早起唤醒、午餐干饭、伸懒腰、下班欢呼、睡前道别',
    defaultTitle: '12:00 午餐陪伴：干饭时间到了！',
    defaultRole: '陪伴宠物',
    defaultSnippet: '干饭时间到啦！今天吃什么好吃的呢？好好吃饭哦！',
    defaultDuration: 20,
  },

  // 4. 故事与音乐 (喜马拉雅)
  {
    type: 'story_body',
    group: '故事与音乐',
    label: '故事主体',
    icon: 'menu_book',
    desc: '喜马拉雅精选童话故事、睡前故事或成语故事',
    defaultTitle: '故事主体：神奇小镇的夜间大冒险',
    defaultRole: '故事讲述人',
    defaultSnippet: '很久很久以前，在一个森林深处的小镇上...',
    defaultDuration: 120,
  },
  {
    type: 'music_track',
    group: '故事与音乐',
    label: '曲目播放',
    icon: 'library_music',
    desc: '喜马拉雅治愈系轻音乐、怀旧歌单或助眠乐曲',
    defaultTitle: '曲目播放：治愈系轻音乐《童年回忆》',
    defaultRole: '喜马拉雅原声',
    defaultSnippet: '[悠扬的钢琴与弦乐合奏...]',
    defaultDuration: 180,
  },

  // 5. 广播剧场 (多玩偶连线)
  {
    type: 'theater_act',
    group: '广播剧场',
    label: '剧场幕数',
    icon: 'theater_comedy',
    desc: '多玩偶角色连线对话、搞笑剧场或即兴小品幕数',
    defaultTitle: '广播剧第一幕：意外的邂逅',
    defaultRole: '剧场全员',
    defaultSnippet: '在清晨的街角，一个神秘的包裹打破了沉寂...',
    defaultDuration: 90,
  },

  // 6. 九学王学习
  {
    type: 'lesson_audio',
    group: '九学王学习',
    label: '教材播放',
    icon: 'headphones',
    desc: '九学王同步教材原声朗读（英语/语文/多学科）',
    defaultTitle: '九学王教材播放：Grade 3 Unit 1 Hello!',
    defaultRole: '九学王教材原声',
    defaultSnippet: 'Hello! What is your name?',
    defaultDuration: 75,
  },
  {
    type: 'lesson_explanation',
    group: '九学王学习',
    label: '知识讲解',
    icon: 'record_voice_over',
    desc: '玩偶对课文重点词汇、句式或语法的拆解讲解',
    defaultTitle: '玩偶逐句讲解：自我介绍与日常问候',
    defaultRole: '讲解老师',
    defaultSnippet: '“What is your name?” 就是“你叫什么名字？”',
    defaultDuration: 60,
  },
  {
    type: 'learning_practice',
    group: '九学王学习',
    label: '跟读练习',
    icon: 'mic',
    desc: '玩偶陪练示范、跟读比对与口语纠音',
    defaultTitle: '跟读练习：Hello! My name is...',
    defaultRole: '陪练伙伴',
    defaultSnippet: '轮到你啦，跟我一起说：Hello! My name is...',
    defaultDuration: 45,
  },
  {
    type: 'learning_quiz',
    group: '九学王学习',
    label: '互动问答',
    icon: 'quiz',
    desc: '玩偶抛出课后思考题或知识点互动问答',
    defaultTitle: '互动问答：用英语向玩偶介绍自己',
    defaultRole: '提问老师',
    defaultSnippet: 'What is your name? 请用英语回答我吧！',
    defaultDuration: 40,
  },
];

interface ChannelStudioViewProps {
  doll?: Doll;
  channelId?: string | null;
  onBack?: () => void;
  onSaveChannel?: (dollId: string, channel: Channel) => void;
  onDeleteChannel?: (dollId: string, channelId: string) => void;
  audioAssets?: AudioAssetItem[];
}

export const ChannelStudioView: React.FC<ChannelStudioViewProps> = ({
  doll: propsDoll,
  channelId: propsChannelId,
  onBack: propsOnBack,
  onSaveChannel: propsOnSaveChannel,
  onDeleteChannel: propsOnDeleteChannel,
  audioAssets: propsAudioAssets,
}) => {
  const navigate = useNavigate();
  const routeParams = useParams<{ dollId?: string; channelId?: string }>();
  const storeDolls = useDollStore((s) => s.dolls);
  const storeStudioDoll = useDollStore((s) => s.studioDoll);
  const storeStudioChannel = useDollStore((s) => s.studioChannel);
  const { saveChannel: actionSaveChannel, deleteChannel: actionDeleteChannel } = useDollActions();
  const storeAudioAssets = useAudioAssetStore((s) => s.audioAssets);

  const doll =
    propsDoll ||
    storeStudioDoll ||
    storeDolls.find((d) => d.id === routeParams.dollId || d.doll_id === routeParams.dollId) ||
    storeDolls[0];

  const channelId =
    propsChannelId !== undefined
      ? propsChannelId
      : routeParams.channelId || storeStudioChannel?.id || null;

  const onBack = propsOnBack || (() => navigate('/channels'));
  const onSaveChannel =
    propsOnSaveChannel || ((dId: string, ch: Channel) => actionSaveChannel(dId, ch));
  const onDeleteChannel =
    propsOnDeleteChannel || ((dId: string, cId: string) => actionDeleteChannel(dId, cId));
  const audioAssets = propsAudioAssets || storeAudioAssets;

  const isEditingExisting = Boolean(channelId);
  const targetChannel = doll?.channels?.find(
    (c) => c.id === channelId || c.channel_id === channelId
  );

  // Form State
  const [channelNameVal, setChannelNameVal] = useState('新频道');
  const [channelIdVal, setChannelIdVal] = useState('CH-001');
  const [dollIdVal, setDollIdVal] = useState('MINI-LOTSO');
  const [categoryVal, setCategoryVal] = useState<ChannelCategory>('新闻频道');
  const [isLive, setIsLive] = useState(true);

  const [isCustomDollIdMode, setIsCustomDollIdMode] = useState(false);
  const [customDollIdInput, setCustomDollIdInput] = useState('');

  const [prompt, setPrompt] = useState('Energetic, insightful, witty tech host.');
  const [intro, setIntro] = useState('大家好，欢迎收听本频道。');
  const [outro, setOutro] = useState('感谢收听，我们下期见。');

  const [ttsProvider, setTtsProvider] = useState<'edge' | 'bailian' | 'local'>('edge');
  const [speaker, setSpeaker] = useState<string>('zh-CN-XiaoxiaoNeural');
  const [llmModel, setLlmModel] = useState<string>('qwen-plus');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [styleKeyword, setStyleKeyword] = useState('专业幽默的科技主播');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  // Playlist State
  const [playlistVal, setPlaylistVal] = useState<PlaylistItem[]>([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  // Embedded News State
  const [newsClips, setNewsClips] = useState<NewsClip[]>(INITIAL_NEWS_CLIPS);
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>('全部');
  const [newsSearchQuery, setNewsSearchQuery] = useState<string>('');
  const [isFetchingNews, setIsFetchingNews] = useState<boolean>(false);

  const allowedDollIds = useMemo(() => {
    const name = doll.name || '';
    const id = doll.id || '';

    if (name.includes('草莓熊') || id.includes('lotso')) {
      return PRESET_DOLL_IDS.filter((p) => p.doll_id === 'MINI-LOTSO' || p.label.includes('草莓熊'));
    }
    if (name.includes('新之助') || name.includes('小新') || id.includes('shin')) {
      return PRESET_DOLL_IDS.filter(
        (p) => p.doll_id.startsWith('MINI-ROBOT-') || p.label.includes('野原新之助')
      );
    }
    if (name.includes('小丸子') || id.includes('maruko')) {
      return PRESET_DOLL_IDS.filter(
        (p) => p.doll_id.startsWith('XWZ-') || p.label.includes('小丸子')
      );
    }
    return PRESET_DOLL_IDS;
  }, [doll]);

  // Load Channel Data & News Data
  useEffect(() => {
    const defaultDollId = allowedDollIds[0]?.doll_id || 'MINI-LOTSO';

    if (targetChannel) {
      setChannelNameVal(targetChannel.channel_name || targetChannel.name);
      setChannelIdVal(targetChannel.channel_id || targetChannel.code || targetChannel.id);
      setDollIdVal(targetChannel.doll_id || defaultDollId);
      setCategoryVal(targetChannel.category || '新闻频道');
      setIsLive(targetChannel.isLive ?? true);
      setPrompt(targetChannel.prompt || '');
      setIntro(targetChannel.introScript || '');
      setOutro(targetChannel.outroScript || '');
      setTtsProvider(targetChannel.ttsProvider || doll.ttsProvider || 'edge');
      setSpeaker(targetChannel.speaker || doll.speaker || 'zh-CN-XiaoxiaoNeural');
      setLlmModel(targetChannel.llmModel || doll.llmModel || 'qwen-plus');
      setPlaylistVal(
        targetChannel.playlist && targetChannel.playlist.length > 0
          ? targetChannel.playlist
          : getDefaultPlaylistForCategory(targetChannel.category || '新闻频道', doll.name)
      );

      const isKnownPreset = allowedDollIds.some((p) => p.doll_id === targetChannel.doll_id);
      if (!isKnownPreset && targetChannel.doll_id) {
        setIsCustomDollIdMode(true);
        setCustomDollIdInput(targetChannel.doll_id);
      } else {
        setIsCustomDollIdMode(false);
      }
    } else {
      const randomNum = Math.floor(100 + Math.random() * 900);
      setChannelNameVal(`${doll.name} - 新创电台频道`);
      setChannelIdVal(`CH-${randomNum}`);
      setDollIdVal(defaultDollId);
      setCategoryVal('新闻频道');
      setIsLive(true);
      setPrompt('幽默有料，通俗易懂的专业电台主播。');
      setIntro(`大家好！欢迎收听 ${doll.name} 为您播报的频道专栏！`);
      setOutro('感谢收听，我们下期再见！');
      setTtsProvider(doll.ttsProvider || 'edge');
      setSpeaker(doll.speaker || 'zh-CN-XiaoxiaoNeural');
      setLlmModel(doll.llmModel || 'qwen-plus');
      setPlaylistVal(getDefaultPlaylistForCategory('新闻频道', doll.name));
      setIsCustomDollIdMode(false);
      setCustomDollIdInput('');
    }

    fetchEmbeddedNews();
  }, [doll, channelId]);

  const fetchEmbeddedNews = async () => {
    setIsFetchingNews(true);

    const categoryTagMap: Record<string, string> = {
      科技: 'tech',
      市场: 'finance',
      文化: 'hot',
      政治: 'china',
      娱乐: 'entertainment',
      全部: 'hot',
    };

    const targetTag = categoryTagMap[newsCategoryFilter] || 'hot';

    try {
      // Call news pipeline crawler (Backend API or Fallback Engine)
      const res = await runNewsPipeline({
        tag: targetTag,
        limit: 3,
        generateAudio: false,
      });

      if (res && res.items && res.items.length > 0) {
        const freshClips: NewsClip[] = res.items.map((item, i) => ({
          id: item.id || `crawl-${Date.now()}-${i}`,
          category: (newsCategoryFilter === '全部' ? '科技' : newsCategoryFilter) as NewsCategory,
          title: item.title.startsWith('【') ? item.title : `【全网热搜抓取】${item.title}`,
          content: item.script_text || item.raw_summary || item.title,
          durationSeconds: 45,
          durationFormatted: '0:45',
          role: item.source || '全网抓取新闻',
          status: '已就绪' as NewsStatus,
          createdAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        }));

        setNewsClips((prev) => {
          const existingTitles = new Set(prev.map((c) => c.title));
          const newUniqueClips = freshClips.filter((c) => !existingTitles.has(c.title));
          return [...newUniqueClips, ...prev];
        });
      }
    } catch (e) {
      console.error('全网抓取新闻异常:', e);
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleCategoryChange = (newCat: ChannelCategory) => {
    setCategoryVal(newCat);
    setPlaylistVal(getDefaultPlaylistForCategory(newCat, doll.name));
  };

  const handleAiGenerate = async () => {
    setIsAiGenerating(true);
    try {
      const res = await generateDollPersona(doll.name, styleKeyword);
      setPrompt(res.prompt);
      setIntro(res.intro);
      setOutro(res.outro);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Active HTML Audio Element Ref for Physical Audio Playback
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackSessionRef = useRef<number>(0);
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null);

  // Playlist Audio Playback Engine
  const stopAudio = () => {
    playbackSessionRef.current += 1; // Increment session to invalidate pending async fetches
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    setPlayingIndex(null);
    setIsPlayingAll(false);
    setPreviewingAssetId(null);
  };

  const fallbackPlaySpeech = async (item: PlaylistItem, onEndCallback: () => void, nodeIndex: number = 0, currentSession: number) => {
    const text = (item.contentSnippet && item.contentSnippet.trim()) || item.title;
    
    let voiceId = 'zh-CN-XiaoxiaoNeural';
    let effectiveTtsProvider = 'edge';
    
    if (item.type === 'transition' || (item.speakerRole && (item.speakerRole.includes('系统') || item.speakerRole.includes('转场')))) {
       // Transition or system sound effect node -> always use Edge system sound / voice
       effectiveTtsProvider = 'edge';
       voiceId = 'zh-CN-XiaoxiaoNeural';
    } else if (item.type === 'news_script') {
       effectiveTtsProvider = ttsProvider || localStorage.getItem('tts_provider') || 'edge';
       
       // Calculate newsIndex (the 0-indexed position among ONLY news_script nodes in playlistVal)
       let newsCount = 0;
       for (let i = 0; i <= nodeIndex && i < playlistVal.length; i++) {
         if (playlistVal[i].type === 'news_script') {
           newsCount++;
         }
       }
       const newsIndex = newsCount > 0 ? newsCount - 1 : 0;

       const isMale = (item.speakerRole || '').includes('男') || (!(item.speakerRole || '').includes('女') && newsIndex % 2 === 1);
       if (isMale) {
         voiceId = localStorage.getItem('news_male_voice') || 'zh-CN-YunxiNeural';
       } else {
         voiceId = localStorage.getItem('news_female_voice') || 'zh-CN-XiaoxiaoNeural';
       }
    } else {
       // Commentary, intro, outro, etc. (uses doll or channel configured voice)
       effectiveTtsProvider = ttsProvider || doll.ttsProvider || 'bailian';
       voiceId = speaker || doll.speaker || localStorage.getItem('lotso_voice') || 'cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5';
       
       if (!speaker && !doll.speaker) {
         if (doll.name.includes('草莓熊')) voiceId = localStorage.getItem('lotso_voice') || 'cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5';
         else if (doll.name.includes('新之助') || doll.name.includes('小新')) voiceId = localStorage.getItem('xiaoxin_voice') || 'cosyvoice-v3.5-plus-xiaoxin-38bc6f91ce58475bbc8c9a5d534b3a64';
         else if (doll.name.includes('小丸子')) voiceId = localStorage.getItem('wanzi_voice') || 'cosyvoice-v3.5-plus-wanzi-2de095b4499040f6b00397ff53f58afe';
       }
    }

    try {
      const data = await requestJson<{ audio_url?: string; duration?: number }>('/api/v1/radio-ai/tts/preview', {
        method: 'POST',
        body: JSON.stringify({ text, voice_id: voiceId, tts_provider: effectiveTtsProvider }),
      });
      
      // If user stopped playback during fetch, abort.
      if (playbackSessionRef.current !== currentSession) return;

      if (!data.audio_url) throw new Error('No audio URL returned');

      // Persist the generated audio URL back to the playlist node so it won't regenerate next time.
      const serverRelativeUrl = data.audio_url; // e.g. /static/audio/preview/xxx.mp3
      setPlaylistVal((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, audioUrl: serverRelativeUrl } : p
        )
      );

      const audioUrl = `${API_BASE_URL}${serverRelativeUrl}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => {
        if (playbackSessionRef.current === currentSession) {
          activeAudioRef.current = null;
          onEndCallback();
        }
      };
      audio.onerror = () => {
        if (playbackSessionRef.current === currentSession) {
          activeAudioRef.current = null;
          onEndCallback();
        }
      };
      await audio.play();
    } catch (e) {
      console.error(e);
      if (playbackSessionRef.current === currentSession) {
        onEndCallback();
      }
    }
  };

  const playSingleTrack = (index: number) => {
    stopAudio();
    const item = playlistVal[index];
    if (!item) return;

    setPlayingIndex(index);
    const session = playbackSessionRef.current;

    if (item.audioUrl) {
      // Normalize: if audioUrl is a server-relative path (starts with /static/), prepend API_BASE_URL
      const resolvedUrl = item.audioUrl.startsWith('/static/') ? `${API_BASE_URL}${item.audioUrl}` : item.audioUrl;
      const audio = new Audio(resolvedUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        if (playbackSessionRef.current === session) {
          setPlayingIndex(null);
          activeAudioRef.current = null;
        }
      };
      audio.onerror = () => {
        if (playbackSessionRef.current === session) {
           console.error("无法加载节点物理音频文件: " + resolvedUrl);
           setPlayingIndex(null);
        }
      };
      audio.play().catch((err) => {
        if (playbackSessionRef.current === session) {
           console.error("播放节点物理音频失败: ", err);
           setPlayingIndex(null);
        }
      });
    } else {
      fallbackPlaySpeech(item, () => {
        if (playbackSessionRef.current === session) setPlayingIndex(null);
      }, index, session);
    }
  };

  const playAllTracksSequentially = (startIndex = 0) => {
    // Only increment session when starting from 0, otherwise we are just continuing the current session.
    if (startIndex === 0) stopAudio();
    
    if (startIndex >= playlistVal.length) {
      stopAudio();
      return;
    }

    setIsPlayingAll(true);
    setPlayingIndex(startIndex);
    const session = playbackSessionRef.current;

    const item = playlistVal[startIndex];
    if (!item) return;

    const handleNextTrack = () => {
      if (playbackSessionRef.current !== session) return; // User stopped playback
      if (startIndex + 1 < playlistVal.length) {
        playAllTracksSequentially(startIndex + 1);
      } else {
        stopAudio();
      }
    };

    if (item.audioUrl) {
      const resolvedUrl = item.audioUrl.startsWith('/static/') ? `${API_BASE_URL}${item.audioUrl}` : item.audioUrl;
      const audio = new Audio(resolvedUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        if (playbackSessionRef.current === session) {
          activeAudioRef.current = null;
          handleNextTrack();
        }
      };
      audio.onerror = () => {
        if (playbackSessionRef.current === session) {
          console.error("无法加载节点物理音频文件: " + resolvedUrl);
          handleNextTrack();
        }
      };
      audio.play().catch((err) => {
        if (playbackSessionRef.current === session) {
          console.error("播放节点物理音频失败: ", err);
          handleNextTrack();
        }
      });
    } else {
      fallbackPlaySpeech(item, handleNextTrack, startIndex, session);
    }
  };

  // Audition / Preview Audio Asset in Library Modal
  const handleAuditionAsset = (asset: AudioAssetItem) => {
    if (previewingAssetId === asset.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setPreviewingAssetId(asset.id);

    const targetUrl = asset.url || `/audio/${asset.id}.mp3`;
    const audio = new Audio(targetUrl);
    activeAudioRef.current = audio;

    audio.onended = () => {
      setPreviewingAssetId(null);
      activeAudioRef.current = null;
    };

    audio.onerror = () => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`试听音效素材：${asset.title}`);
        utterance.lang = 'zh-CN';
        utterance.onend = () => setPreviewingAssetId(null);
        utterance.onerror = () => setPreviewingAssetId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setPreviewingAssetId(null), 2500);
      }
    };

    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`试听音效素材：${asset.title}`);
        utterance.lang = 'zh-CN';
        utterance.onend = () => setPreviewingAssetId(null);
        utterance.onerror = () => setPreviewingAssetId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setPreviewingAssetId(null), 2500);
      }
    });
  };

  // Playlist Node Type Selector Modal State
  const [isSelectNodeTypeOpen, setIsSelectNodeTypeOpen] = useState(false);
  const [nodeTypeFilterMode, setNodeTypeFilterMode] = useState<'recommended' | 'all'>('recommended');

  // Audio Assets Linking State
  const [audioAssetsList, setAudioAssetsList] = useState<AudioAssetItem[]>(() => {
    if (audioAssets && audioAssets.length > 0) return audioAssets;
    try {
      const saved = localStorage.getItem('radio_ai_audio_assets');
      return saved ? JSON.parse(saved) : INITIAL_AUDIO_ASSETS;
    } catch {
      return INITIAL_AUDIO_ASSETS;
    }
  });
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [targetNodeIdForAssetPicker, setTargetNodeIdForAssetPicker] = useState<string | null>(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('全部');

  // AI Script Generator State per Node
  const [isAiNodeScriptOpen, setIsAiNodeScriptOpen] = useState(false);
  const [targetNodeForAi, setTargetNodeForAi] = useState<PlaylistItem | null>(null);
  const [aiScriptPromptInput, setAiScriptPromptInput] = useState('');
  const [aiScriptResultText, setAiScriptResultText] = useState('');
  const [isGeneratingAiNodeScript, setIsGeneratingAiNodeScript] = useState(false);
  const [aiScriptPresenterVoice, setAiScriptPresenterVoice] = useState<'doll' | 'female' | 'male' | 'alternate'>('doll');

  // Sync Audio Assets from prop or localStorage or API
  useEffect(() => {
    if (audioAssets && audioAssets.length > 0) {
      setAudioAssetsList(audioAssets);
    } else {
      try {
        const saved = localStorage.getItem('radio_ai_audio_assets');
        if (saved) {
          setAudioAssetsList(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (isRadioAiApiEnabled()) {
      getAudioAssetsApi()
        .then((scanned) => {
          if (Array.isArray(scanned) && scanned.length > 0) {
            setAudioAssetsList((prev) => {
              const existingUrls = new Set(prev.map((a) => a.url).filter(Boolean));
              const newScanned = scanned.filter((s) => !existingUrls.has(s.url));
              return [...newScanned, ...prev];
            });
          }
        })
        .catch((err) => console.error('加载扫描音频资产失败:', err));
    }
  }, [audioAssets]);

  // Handlers for Audio Assets Picker
  const handleOpenAssetPicker = (nodeId: string) => {
    setTargetNodeIdForAssetPicker(nodeId);
    setAssetSearchQuery('');
    setAssetCategoryFilter('全部');
    setIsAssetPickerOpen(true);
  };

  const handleSelectAssetForNode = (asset: AudioAssetItem) => {
    if (!targetNodeIdForAssetPicker) return;
    const finalUrl = asset.url || `/audio/${asset.id}.mp3`;

    setPlaylistVal((prev) =>
      prev.map((item) => {
        if (item.id === targetNodeIdForAssetPicker) {
          return {
            ...item,
            audioUrl: finalUrl,
            title: asset.title,
            durationFormatted: asset.duration || '0:10',
            durationSeconds: asset.durationSeconds || 10,
            speakerRole: asset.speakerOrSource || item.speakerRole || '音频库素材',
          };
        }
        return item;
      })
    );
    setIsAssetPickerOpen(false);
  };

  const handleUnbindAudioFromNode = (nodeId: string) => {
    setPlaylistVal((prev) =>
      prev.map((item) => (item.id === nodeId ? { ...item, audioUrl: undefined } : item))
    );
  };

  // Handlers for AI Node Script Generator
  const handleOpenAiScriptGenerator = (node: PlaylistItem) => {
    setTargetNodeForAi(node);
    setAiScriptResultText(node.contentSnippet || '');

    // Default presenter voice selection: 'doll' for doll/regular nodes, 'female' for news_script
    if (node.type === 'news_script') {
      const storedNewsHostPrompt =
        localStorage.getItem('news_host_prompt') ||
        '你是一名专业且生动的电台主持人，请把新闻素材改写为 80-150 字的口语化播报稿。';
      setAiScriptPromptInput(storedNewsHostPrompt);
      setAiScriptPresenterVoice('female');
    } else {
      let defaultPrompt = '';
      switch (node.type) {
        case 'commentary':
          defaultPrompt = `以【${doll.name}】独特的情感与人设视角，对当前新闻进行独家感悟点评解说。`;
          break;
        case 'lesson_explanation':
          defaultPrompt = `为【${doll.name}】撰写一段九学王英语“Hello! What is your name?”知识点的亲切讲解。`;
          break;
        case 'intro':
          defaultPrompt = `为【${doll.name}】撰写一段开启【${categoryVal}】的元气满分开场白。`;
          break;
        case 'outro':
          defaultPrompt = `为【${doll.name}】撰写一段温馨的播报完毕谢幕与下期预告。`;
          break;
        default:
          defaultPrompt = `请为【${doll.name}】生成符合【${categoryVal}】风格的音轨台词。`;
          break;
      }
      setAiScriptPromptInput(defaultPrompt);
      setAiScriptPresenterVoice('doll');
    }

    setIsAiNodeScriptOpen(true);
  };

  const handleGenerateAiNodeScript = async () => {
    if (!aiScriptPromptInput.trim() || !targetNodeForAi) return;
    setIsGeneratingAiNodeScript(true);
    try {
      const generatedText = await generateAiNodeScriptApi(
        doll.name,
        aiScriptPromptInput,
        targetNodeForAi.type,
        categoryVal
      );
      setAiScriptResultText(generatedText);
    } catch (e) {
      setAiScriptResultText(
        `【${doll.name}专属台词】哈喽！我是${doll.name}。针对${aiScriptPromptInput}，我的专属看法是：保持好心情最重要！`
      );
    } finally {
      setIsGeneratingAiNodeScript(false);
    }
  };

  const handleApplyAiScriptToNode = () => {
    if (!targetNodeForAi) return;

    let updatedSpeaker = targetNodeForAi.speakerRole;
    let targetVoiceId: string | undefined = undefined;
    let targetTtsProvider: 'edge' | 'bailian' | undefined = undefined;

    if (aiScriptPresenterVoice === 'doll') {
      updatedSpeaker = `${doll.name} (主播)`;
      targetVoiceId = doll.speaker || localStorage.getItem('lotso_voice') || 'cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5';
      targetTtsProvider = doll.ttsProvider || 'bailian';
    } else if (aiScriptPresenterVoice === 'female') {
      updatedSpeaker = '女声播音员 (晓晓)';
      targetVoiceId = 'zh-CN-XiaoxiaoNeural';
      targetTtsProvider = 'edge';
    } else if (aiScriptPresenterVoice === 'male') {
      updatedSpeaker = '男声播音员 (云希)';
      targetVoiceId = 'zh-CN-YunxiNeural';
      targetTtsProvider = 'edge';
    } else if (aiScriptPresenterVoice === 'alternate') {
      updatedSpeaker = '男女交替播报';
    }

    setPlaylistVal((prev) =>
      prev.map((item) =>
        item.id === targetNodeForAi.id
          ? {
              ...item,
              contentSnippet: aiScriptResultText,
              speakerRole: updatedSpeaker || item.speakerRole,
              voiceId: targetVoiceId || item.voiceId,
              ttsProvider: targetTtsProvider || item.ttsProvider,
              audioUrl: undefined, // Reset audioUrl so new text/voice regenerates frisch
              title: item.title.includes('新音轨') ? `${doll.name}：${aiScriptPromptInput.slice(0, 12)}` : item.title,
            }
          : item
      )
    );
    setIsAiNodeScriptOpen(false);
  };

  // Playlist Node Manipulation
  const handleAddSpecificNodeType = (option: NodeTypeOption) => {
    const role = option.defaultRole === '主播角色' ? doll.name : option.defaultRole;
    const minutes = Math.floor(option.defaultDuration / 60);
    const secs = option.defaultDuration % 60;
    const durFmt = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;

    const newItem: PlaylistItem = {
      id: `p-${Date.now()}`,
      type: option.type,
      title: option.defaultTitle,
      speakerRole: role,
      durationSeconds: option.defaultDuration,
      durationFormatted: durFmt,
      contentSnippet: option.defaultSnippet,
    };

    setPlaylistVal((prev) => {
      const outroIdx = prev.findIndex((i) => i.type === 'outro');
      if (outroIdx !== -1) {
        const next = [...prev];
        next.splice(outroIdx, 0, newItem);
        return next;
      }
      return [...prev, newItem];
    });
    setIsSelectNodeTypeOpen(false);
  };

  const handleAddPlaylistItem = () => {
    setIsSelectNodeTypeOpen(true);
  };

  const handleDeletePlaylistItem = (id: string) => {
    setPlaylistVal((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdatePlaylistItem = (id: string, updatedFields: Partial<PlaylistItem>) => {
    setPlaylistVal((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  const handleReorderPlaylistItem = (fromIdx: number, toIdx: number) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= playlistVal.length || toIdx >= playlistVal.length)
      return;
    setPlaylistVal((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // Embedded News: One-click Add News to Playlist
  const handleAddNewsToPlaylist = (clip: NewsClip) => {
    const isAlreadyIn = playlistVal.some(
      (item) => item.title.includes(clip.title) || item.id === `news-item-${clip.id}`
    );
    if (isAlreadyIn) return;

    const newPlaylistItem: PlaylistItem = {
      id: `news-item-${clip.id}`,
      type: 'news_script',
      title: clip.title,
      speakerRole: clip.role || doll.name,
      durationSeconds: clip.durationSeconds || 45,
      durationFormatted: clip.durationFormatted || '0:45',
      contentSnippet: clip.content,
    };

    // Insert before the last 'outro' item if exists, otherwise append
    setPlaylistVal((prev) => {
      const outroIndex = prev.findIndex((item) => item.type === 'outro');
      if (outroIndex !== -1) {
        const next = [...prev];
        next.splice(outroIndex, 0, newPlaylistItem);
        return next;
      }
      return [...prev, newPlaylistItem];
    });
  };

  const handleSave = async () => {
    const finalDollId = isCustomDollIdMode ? customDollIdInput.trim() || dollIdVal : dollIdVal;
    const finalChannelId = channelIdVal.trim() || `CH-${Date.now()}`;
    const finalChannelName = channelNameVal.trim() || `${doll.name} 频道`;

    const updatedChannel: Channel = {
      id: targetChannel?.id || `channel-${Date.now()}`,
      channel_id: finalChannelId,
      channel_name: finalChannelName,
      name: finalChannelName,
      code: finalChannelId,
      doll_id: finalDollId,
      model_name: finalDollId,
      isLive,
      category: categoryVal,
      categories: targetChannel?.categories || [categoryVal],
      playlist: playlistVal,
      prompt,
      introScript: intro,
      outroScript: outro,
      ttsProvider,
      speaker,
      llmModel,
    };

    setIsFreezing(true);
    try {
      if (isRadioAiApiEnabled()) {
        const res = await freezeChannelApi(finalDollId, finalChannelId, updatedChannel);
        if (res && res.playlist && res.playlist.length > 0) {
          updatedChannel.playlist = res.playlist;
        }
      }
      onSaveChannel(doll.id, updatedChannel);
      onBack();
    } catch (err) {
      console.error('固化频道物理音频资源及生成 ESP32 清单失败:', err);
      alert('频道音频解耦固化失败，使用通用在线配置提交');
      onSaveChannel(doll.id, updatedChannel);
      onBack();
    } finally {
      setIsFreezing(false);
    }
  };

  const handleDelete = () => {
    if (targetChannel && onDeleteChannel) {
      onDeleteChannel(doll.id, targetChannel.id);
      onBack();
    }
  };

  // Filtered Embedded News Clips
  const filteredEmbeddedNews = useMemo(() => {
    return newsClips.filter((clip) => {
      const matchCat = newsCategoryFilter === '全部' || clip.category === newsCategoryFilter;
      const matchSearch =
        !newsSearchQuery ||
        clip.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
        clip.content.toLowerCase().includes(newsSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [newsClips, newsCategoryFilter, newsSearchQuery]);

  const totalPlaylistSeconds = useMemo(
    () => playlistVal.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0),
    [playlistVal]
  );
  const totalPlaylistMins = Math.floor(totalPlaylistSeconds / 60);
  const totalPlaylistSecs = totalPlaylistSeconds % 60;
  const formattedTotalPlaylistTime = `${totalPlaylistMins}:${
    totalPlaylistSecs < 10 ? '0' : ''
  }${totalPlaylistSecs}`;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fadeIn transition-colors duration-300">
      {/* Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-[var(--bg-subcard)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] rounded-sm transition-all flex items-center gap-1 cursor-pointer font-serif-editorial text-xs font-bold"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>返回频道全览</span>
          </button>

          <div className="flex items-center gap-3">
            <img
              src={doll.avatarUrl}
              alt={doll.name}
              className="w-12 h-12 rounded-sm object-cover border border-[var(--accent)]/40 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif-editorial font-bold text-[var(--text-primary)]">
                  {isEditingExisting ? channelNameVal : '新建电台频道'}
                </h2>
                <span className="bg-[var(--accent)]/15 text-[var(--accent)] font-data-mono text-[10px] px-2 py-0.5 rounded-sm border border-[var(--accent)]/30 font-bold uppercase">
                  {doll.name} ({doll.stationCode})
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                频道 ID: <strong className="font-mono text-[var(--accent)]">{channelIdVal}</strong> ·
                模型: <strong className="font-mono text-[var(--text-primary)]">{isCustomDollIdMode ? customDollIdInput : dollIdVal}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Live status toggle & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[var(--bg-subcard)] px-3 py-1.5 rounded-sm border border-[var(--border-color)]">
            <span className={`text-xs font-data-mono font-bold flex items-center gap-1 ${isLive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
              {isLive && <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse"></span>}
              {isLive ? '直播状态: 已开播' : '直播状态: 未开播'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLive}
                onChange={(e) => setIsLive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:after:bg-[var(--accent-text)]"></div>
            </label>
          </div>

          {isEditingExisting && onDeleteChannel && (
            showConfirmDelete ? (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 p-1 rounded-sm">
                <span className="text-xs text-red-400 font-data-mono px-1">确认删除?</span>
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-sm text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  确定
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
                className="px-3.5 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm text-xs font-data-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>删除频道</span>
              </button>
            )
          )}

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-sm bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">save</span>
            <span>保存频道与播放列表</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Side Playlist Centerpiece, Right Side Config & Embedded News */}
      <div className="grid grid-cols-12 gap-8">
        {/* CENTERPIECE: Complete Playlist Player & Timeline (Cols: 7) */}
        <section className="col-span-12 lg:col-span-7 bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm p-6 space-y-6 shadow-xl flex flex-col">
          {/* Playlist Title & Global Audio Player Bar */}
          <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] p-4 rounded-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">queue_music</span>
                </div>
                <div>
                  <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)]">
                    电台播放列表与全轨试听引擎
                  </h3>
                  <p className="text-[11px] font-data-mono text-[var(--accent)]">
                    共 {playlistVal.length} 个节点音轨 · 预计总时长: {formattedTotalPlaylistTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isPlayingAll) stopAudio();
                    else playAllTracksSequentially(0);
                  }}
                  className={`px-4 py-2 rounded-sm text-xs font-serif-editorial font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                    isPlayingAll
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isPlayingAll ? 'pause' : 'play_circle'}
                  </span>
                  <span>{isPlayingAll ? '暂停全轨播报' : '连续播放完整电台'}</span>
                </button>

                <button
                  onClick={handleAddPlaylistItem}
                  className="px-3.5 py-2 bg-[var(--bg-primary)] border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] rounded-sm text-xs font-serif-editorial font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>添加节点</span>
                </button>
              </div>
            </div>

            {/* Currently Playing Status Banner */}
            {playingIndex !== null && (
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 p-2.5 rounded-sm flex items-center justify-between text-xs font-data-mono text-[var(--accent)] animate-fadeIn">
                <span className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-base animate-spin">graphic_eq</span>
                  <span className="font-bold">试听中 [节点 {playingIndex + 1}]:</span>
                  <span className="truncate">{playlistVal[playingIndex]?.title}</span>
                </span>
                <button
                  onClick={stopAudio}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] underline ml-2 shrink-0 cursor-pointer"
                >
                  停止
                </button>
              </div>
            )}

            {/* Quick Template Preset Switchers */}
            <div className="pt-2 border-t border-[var(--border-color)] flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-data-mono text-[var(--text-muted)] shrink-0">
                加载电台排播模版:
              </span>
              {CHANNEL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-serif-editorial transition-all cursor-pointer border ${
                    categoryVal === cat
                      ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)] font-bold'
                      : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Nodes List */}
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-[680px] pr-1">
            {playlistVal.map((item, idx) => {
              const badge = getItemTypeBadge(item.type);
              const isItemPlaying = playingIndex === idx;
              const isAudioMode = Boolean(item.audioUrl);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 bg-[var(--bg-primary)] border rounded-sm space-y-2.5 transition-all ${
                    isItemPlaying
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/50'
                      : 'border-[var(--border-color)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  {/* Single Top Bar: Index + Node Type Badge + TTS/Audio Switcher + Action Buttons */}
                  <div className="flex items-center justify-between gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Index Circle */}
                      <span className="w-5 h-5 rounded-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* 1. Node Type Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[11px] font-serif-editorial font-bold border flex items-center gap-1 shrink-0 ${badge.color}`}
                      >
                        <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>

                      {/* 3. TTS 和 音频库 选择按钮 + AI 按钮 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex items-center bg-[var(--bg-subcard)] p-0.5 rounded border border-[var(--border-color)] text-xs">
                          <button
                            type="button"
                            onClick={() => handleUnbindAudioFromNode(item.id)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              !isAudioMode
                                ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-xs'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[11px]">record_voice_over</span>
                            <span>TTS 语音</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenAssetPicker(item.id)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isAudioMode
                                ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-xs'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[11px]">library_music</span>
                            <span>音频库文件</span>
                          </button>
                        </div>

                        {/* AI 按钮 (仅在 TTS 模式显示，非覆盖式) */}
                        {!isAudioMode && (
                          <button
                            type="button"
                            onClick={() => handleOpenAiScriptGenerator(item)}
                            className="px-2.5 py-0.5 bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-[var(--accent-text)] border border-[var(--accent)]/40 rounded text-[10px] font-serif-editorial font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                            title="使用 AI 智能生成/改写台词"
                          >
                            <span>AI</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Tools: 播放按钮 + 顺序按钮 + 删除按钮 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* 4. 播放按钮 */}
                      <button
                        type="button"
                        onClick={() => {
                          if (playingIndex === idx) {
                            stopAudio();
                          } else {
                            playSingleTrack(idx);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                          isItemPlaying
                            ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] animate-pulse'
                            : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                        }`}
                        title="播放/预听此节点"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isItemPlaying ? 'pause' : 'play_arrow'}
                        </span>
                        <span>{isItemPlaying ? '播放中' : '播放'}</span>
                      </button>

                      {/* 5. 顺序按钮 (Up / Down) */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReorderPlaylistItem(idx, idx - 1)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm cursor-pointer"
                          title="上移"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                      )}
                      {idx < playlistVal.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleReorderPlaylistItem(idx, idx + 1)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm cursor-pointer"
                          title="下移"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                      )}

                      {/* 6. 删除按钮 */}
                      <button
                        type="button"
                        onClick={() => handleDeletePlaylistItem(item.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-red-400 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm cursor-pointer"
                        title="删除节点"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. 节点内容文本或路径 */}
                  {!isAudioMode ? (
                    /* TTS Mode: Clean Textarea without any overlapping overlays */
                    <div>
                      <textarea
                        rows={2}
                        value={item.contentSnippet || ''}
                        onChange={(e) => handleUpdatePlaylistItem(item.id, { contentSnippet: e.target.value })}
                        placeholder="输入 TTS 播报台词文本..."
                        className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-sm p-2 text-xs font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                      />
                    </div>
                  ) : (
                    /* Audio Mode: Audio Title & File Path + Change Button */
                    <div className="flex items-center justify-between gap-2 bg-[var(--bg-subcard)] border border-[var(--accent)]/30 p-2 rounded-sm text-xs font-data-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-sm text-[var(--accent)] shrink-0">audiotrack</span>
                        <span className="font-bold text-[var(--text-primary)] truncate">{item.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono truncate">({item.audioUrl})</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAssetPicker(item.id)}
                        className="px-2 py-0.5 bg-[var(--bg-primary)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] border border-[var(--border-color)] text-[var(--text-muted)] rounded text-[10px] font-serif-editorial transition-all cursor-pointer shrink-0"
                      >
                        更换音频
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {playlistVal.length === 0 && (
              <div className="p-12 text-center text-[var(--text-muted)] font-data-mono text-xs border border-dashed border-[var(--border-color)] rounded-sm">
                当前播放列表为空，请点击右上角「添加节点」或选择模版
              </div>
            )}
          </div>
        </section>

        {/* RIGHT SIDE: Station Persona Config & Embedded News Crawling Studio (Cols: 5) */}
        <section className="col-span-12 lg:col-span-5 space-y-6">
          {/* EMBEDDED NEWS CRAWLING & SELECTION (Embedded when Category === '新闻频道') */}
          {categoryVal === '新闻频道' ? (
            <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm p-6 space-y-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--accent)]">newspaper</span>
                  <span>嵌入新闻抓取与选题中心</span>
                </h3>
                <button
                  onClick={fetchEmbeddedNews}
                  disabled={isFetchingNews}
                  className="px-3 py-1.5 bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-[var(--accent-text)] rounded-sm text-xs font-serif-editorial font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${isFetchingNews ? 'animate-spin' : ''}`}>
                    {isFetchingNews ? 'sync' : 'auto_awesome'}
                  </span>
                  <span>{isFetchingNews ? '抓取中...' : '抓取全网最新新闻'}</span>
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['全部', '科技', '政治', '市场', '文化', '娱乐'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewsCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-sm text-xs font-serif-editorial transition-all cursor-pointer border ${
                        newsCategoryFilter === cat
                          ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold'
                          : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={newsSearchQuery}
                  onChange={(e) => setNewsSearchQuery(e.target.value)}
                  placeholder="搜索热点新闻文案..."
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm px-3 py-1.5 text-xs text-[var(--text-primary)] font-serif-editorial focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* News Items List */}
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {filteredEmbeddedNews.map((clip) => {
                  const inPlaylist = playlistVal.some(
                    (item) => item.title.includes(clip.title) || item.id === `news-item-${clip.id}`
                  );

                  return (
                    <div
                      key={clip.id}
                      className="p-3.5 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2 hover:border-[var(--accent)]/50 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-data-mono text-[10px] font-bold text-[var(--accent)] uppercase">
                          {clip.category}热点
                        </span>
                        <button
                          onClick={() => handleAddNewsToPlaylist(clip)}
                          disabled={inPlaylist}
                          className={`px-2.5 py-1 rounded-sm text-xs font-serif-editorial font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            inPlaylist
                              ? 'bg-[var(--bg-subcard)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed'
                              : 'bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 active:scale-95'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {inPlaylist ? 'check' : 'add'}
                          </span>
                          <span>{inPlaylist ? '已编入排播' : '编入播放列表'}</span>
                        </button>
                      </div>

                      <h4 className="text-xs font-serif-editorial font-bold text-[var(--text-primary)] leading-snug">
                        {clip.title}
                      </h4>
                      <p className="text-[11px] font-sans text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {clip.content}
                      </p>
                    </div>
                  );
                })}

                {filteredEmbeddedNews.length === 0 && (
                  <div className="p-6 text-center text-[var(--text-muted)] font-data-mono text-xs">
                    暂无匹配新闻稿件
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Non-news category notification card */
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-[var(--accent)]">
                settings_suggest
              </span>
              <h4 className="text-sm font-serif-editorial font-bold text-[var(--text-primary)]">
                {categoryVal} 专用排播模式已生效
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                非新闻频道类型无需全网抓取。若需要嵌入全网新闻抓取选题，请将频道类别切换为「新闻频道」。
              </p>
            </div>
          )}

          {/* AI Generator & Station Settings */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-sm p-6 space-y-5 shadow-lg">
            <h3 className="text-base font-serif-editorial font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <span className="material-symbols-outlined text-[var(--accent)]">tune</span>
              <span>频道基础与大模型/音色配置</span>
            </h3>

            {/* AI Generator */}
            <div className="bg-[var(--bg-subcard)] p-3.5 rounded-sm border border-[var(--accent)]/20 space-y-2">
              <span className="text-xs font-data-mono text-[var(--accent)] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                AI 一键生成频道人设 Prompt & 台词
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={styleKeyword}
                  onChange={(e) => setStyleKeyword(e.target.value)}
                  placeholder="如: 专业幽默科技主播..."
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={isAiGenerating}
                  className="px-4 py-1.5 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial text-xs font-bold rounded-sm hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span className="font-bold text-[10px]">AI</span>
                  <span>{isAiGenerating ? '生成中...' : '一键生成'}</span>
                </button>
              </div>
            </div>

            {/* Basic Info Inputs */}
            <div className="space-y-4 text-xs font-data-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--accent)] block mb-1 font-bold">频道名称</label>
                  <input
                    type="text"
                    value={channelNameVal}
                    onChange={(e) => setChannelNameVal(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-serif-editorial font-bold focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-[var(--accent)] block mb-1 font-bold">频道类别</label>
                  <select
                    value={categoryVal}
                    onChange={(e) => handleCategoryChange(e.target.value as ChannelCategory)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-serif-editorial font-bold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                  >
                    {CHANNEL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generative AI & Voice Settings */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--accent)]/30 p-3.5 rounded-sm space-y-3">
                <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-sm">record_voice_over</span>
                  TTS 引擎与大模型配置
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[var(--text-muted)] block mb-1 text-[10px]">TTS 语音引擎</label>
                    <select
                      value={ttsProvider}
                      onChange={(e) => setTtsProvider(e.target.value as any)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="edge">Edge-TTS 免费引擎</option>
                      <option value="bailian">阿里百炼 CosyVoice</option>
                      <option value="local">本地 Demo 音频</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[var(--text-muted)] block mb-1 text-[10px]">大模型选型</label>
                    <select
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none"
                    >
                      <option value="qwen-plus">Qwen-Plus (主力模型)</option>
                      <option value="qwen-max">Qwen-Max (旗舰超强)</option>
                      <option value="qwen-turbo">Qwen-Turbo (极速模型)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[var(--text-muted)] block mb-1 text-[10px]">Voice ID / Speaker</label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="如: zh-CN-XiaoxiaoNeural"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Prompt & Scripts */}
              <div>
                <label className="text-[var(--accent)] block mb-1 font-bold">角色人设提示词 (Prompt)</label>
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2.5 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--accent)] block mb-1 font-bold">开场台词</label>
                  <input
                    type="text"
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-[var(--accent)] block mb-1 font-bold">结束台词</label>
                  <input
                    type="text"
                    value={outro}
                    onChange={(e) => setOutro(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-2 text-[var(--text-primary)] font-sans focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Node Type Selector Modal Overlay */}
      {isSelectNodeTypeOpen && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm w-full max-w-4xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsSelectNodeTypeOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">playlist_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
                    选择要添加的音轨节点类型
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                    已为您智能匹配当前 <strong className="text-[var(--accent)]">【{categoryVal}】</strong> 的专属音轨节点。
                  </p>
                </div>
              </div>

              {/* Category Filter Toggle */}
              <div className="flex items-center bg-[var(--bg-primary)] p-1 rounded-sm border border-[var(--border-color)] text-xs font-serif-editorial shrink-0">
                <button
                  onClick={() => setNodeTypeFilterMode('recommended')}
                  className={`px-3 py-1 rounded-sm transition-all cursor-pointer ${
                    nodeTypeFilterMode === 'recommended'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  【{categoryVal}】推荐节点
                </button>
                <button
                  onClick={() => setNodeTypeFilterMode('all')}
                  className={`px-3 py-1 rounded-sm transition-all cursor-pointer ${
                    nodeTypeFilterMode === 'all'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  全量展示所有节点
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-6 pr-1 custom-scrollbar">
              {(
                [
                  '基础包装',
                  '新闻与点评',
                  '气象与陪伴',
                  '故事与音乐',
                  '广播剧场',
                  '九学王学习',
                ] as const
              ).map((groupName) => {
                const groupItems = NODE_TYPE_OPTIONS.filter((opt) => {
                  if (opt.group !== groupName) return false;
                  if (nodeTypeFilterMode === 'all') return true;

                  // Category-based recommendation rules
                  const categoryRuleMap: Record<ChannelCategory, PlaylistItemType[]> = {
                    新闻频道: ['intro', 'news_script', 'commentary', 'transition', 'outro'],
                    天气频道: ['intro', 'weather_report', 'commentary', 'transition', 'outro'],
                    电子宠物频道: ['intro', 'pet_event', 'commentary', 'transition', 'outro'],
                    故事频道: ['intro', 'story_body', 'commentary', 'transition', 'outro'],
                    音乐频道: ['intro', 'music_track', 'commentary', 'transition', 'outro'],
                    剧场频道: ['intro', 'theater_act', 'commentary', 'transition', 'outro'],
                    学习频道: [
                      'intro',
                      'lesson_audio',
                      'lesson_explanation',
                      'learning_practice',
                      'learning_quiz',
                      'commentary',
                      'transition',
                      'outro',
                    ],
                  };

                  const allowedTypes = categoryRuleMap[categoryVal] || ['intro', 'transition', 'outro'];
                  return allowedTypes.includes(opt.type);
                });

                if (groupItems.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-3">
                    <h4 className="font-data-mono text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-1.5">
                      <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full"></span>
                      <span>{groupName} 节点选型</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupItems.map((opt) => {
                        const badge = getItemTypeBadge(opt.type);

                        return (
                          <div
                            key={opt.type}
                            onClick={() => handleAddSpecificNodeType(opt)}
                            className="p-3.5 rounded-sm bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--bg-subcard)] transition-all cursor-pointer group flex flex-col justify-between space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-sm text-xs font-serif-editorial font-bold border flex items-center gap-1 ${badge.color}`}
                              >
                                <span className="material-symbols-outlined text-sm">{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                ~{opt.defaultDuration}s
                              </span>
                            </div>

                            <div>
                              <h5 className="text-xs font-serif-editorial font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                                {opt.defaultTitle}
                              </h5>
                              <p className="text-[11px] font-sans text-[var(--text-muted)] mt-1 line-clamp-2">
                                {opt.desc}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-data-mono text-[var(--text-muted)]">
                              <span>发声角色: <strong className="text-[var(--accent)]">{opt.defaultRole === '主播角色' ? doll.name : opt.defaultRole}</strong></span>
                              <span className="text-[var(--accent)] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                <span>+ 添加此节点</span>
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)] shrink-0">
              <button
                onClick={() => setIsSelectNodeTypeOpen(false)}
                className="px-5 py-2 rounded-sm border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)] font-serif-editorial text-xs cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Assets Picker Modal */}
      {isAssetPickerOpen && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm w-full max-w-3xl p-6 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsAssetPickerOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4 shrink-0">
              <div className="w-10 h-10 rounded-sm bg-[var(--bg-subcard)] border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">library_music</span>
              </div>
              <div>
                <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
                  选择并链接音频库素材
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                  为当前节点绑定极速、转场音效、背景乐或歌曲文件
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-3 shrink-0">
              <input
                type="text"
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                placeholder="搜索音频标题、标签或来源..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['全部', '片头', '转场音效', '背景乐', '原声曲目', '片尾谢幕'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAssetCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-sm text-xs font-serif-editorial transition-all cursor-pointer border ${
                      assetCategoryFilter === cat
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] font-bold'
                        : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Assets List */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 custom-scrollbar">
              {audioAssetsList
                .filter((asset) => {
                  const matchSearch =
                    !assetSearchQuery ||
                    asset.title.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                    (asset.tags && asset.tags.some((t) => t.toLowerCase().includes(assetSearchQuery.toLowerCase())));
                  const matchCat =
                    assetCategoryFilter === '全部' ||
                    asset.audioType === assetCategoryFilter ||
                    (assetCategoryFilter === '背景乐' && (asset.audioType === '背景音乐' || asset.audioType === '背景乐')) ||
                    (assetCategoryFilter === '背景音乐' && (asset.audioType === '背景音乐' || asset.audioType === '背景乐')) ||
                    asset.category === assetCategoryFilter ||
                    asset.channelCategory === assetCategoryFilter;
                  return matchSearch && matchCat;
                })
                .map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-[var(--bg-primary)] p-3.5 rounded-sm border border-[var(--border-color)] hover:border-[var(--accent)] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">audiotrack</span>
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-serif-editorial font-bold text-[var(--text-primary)] truncate">
                            {asset.title}
                          </h5>
                          {asset.audioType && (
                            <span className="px-1.5 py-0.2 bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-mono rounded border border-[var(--accent)]/30 shrink-0">
                              {asset.audioType}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                          来源: {asset.speakerOrSource || '音频资产'} · 时长: {asset.duration} · 标签: #{asset.tags?.join(' #')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Audition / Preview Button */}
                      <button
                        type="button"
                        onClick={() => handleAuditionAsset(asset)}
                        className={`px-2.5 py-1.5 rounded-sm text-xs font-serif-editorial font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                          previewingAssetId === asset.id
                            ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] animate-pulse'
                            : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                        }`}
                        title="在线试听此音频资产"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {previewingAssetId === asset.id ? 'pause' : 'play_arrow'}
                        </span>
                        <span>{previewingAssetId === asset.id ? '播放中...' : '试听'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectAssetForNode(asset)}
                        className="px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs rounded-sm hover:opacity-90 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">link</span>
                        <span>选中并链接</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)] shrink-0">
              <button
                onClick={() => setIsAssetPickerOpen(false)}
                className="px-5 py-2 rounded-sm border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-serif-editorial text-xs cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Node Script Generator Modal */}
      {isAiNodeScriptOpen && targetNodeForAi && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-sm w-full max-w-2xl p-6 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsAiNodeScriptOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4 shrink-0">
              <div className="w-10 h-10 rounded-sm bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] flex items-center justify-center font-bold">
                <span className="font-serif-editorial font-extrabold text-sm border border-[var(--accent)]/40 px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">AI</span>
              </div>
              <div>
                <h3 className="text-lg font-serif-editorial font-bold text-[var(--text-primary)]">
                  AI 节点文案与播报稿助手
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                  {targetNodeForAi.type === 'news_script' ? (
                    <span>
                      已加载<strong className="text-[var(--accent)]">【新闻发音人 AI 配置】</strong>，为新闻节点 <strong className="text-[var(--accent)]">{targetNodeForAi.title}</strong> 智能生成专业播报文案
                    </span>
                  ) : (
                    <span>
                      为节点 <strong className="text-[var(--accent)]">{targetNodeForAi.title}</strong> 智能生成符合 <strong className="text-[var(--accent)]">{doll.name}</strong> 人设的语言文案
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Presenter Voice Selector */}
            <div className="bg-[var(--bg-primary)] p-3 border border-[var(--border-color)] rounded-sm space-y-2 font-data-mono text-xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">record_voice_over</span>
                  播报发音人选择 (TTS 合成发音人):
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {aiScriptPresenterVoice === 'doll' ? `默认使用【${doll.name}】专属玩偶音色` : '自定义播报发音人'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setAiScriptPresenterVoice('doll')}
                  className={`p-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    aiScriptPresenterVoice === 'doll'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>🧸 {doll.name}</span>
                  <span className="text-[10px] opacity-80">(玩偶)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiScriptPresenterVoice('female')}
                  className={`p-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    aiScriptPresenterVoice === 'female'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>👩 女声播音员</span>
                  <span className="text-[10px] opacity-80">(晓晓)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiScriptPresenterVoice('male')}
                  className={`p-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    aiScriptPresenterVoice === 'male'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>👨 男声播音员</span>
                  <span className="text-[10px] opacity-80">(云希)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAiScriptPresenterVoice('alternate')}
                  className={`p-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    aiScriptPresenterVoice === 'alternate'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>🔄 男女交替播报</span>
                </button>
              </div>
            </div>

            {/* Prompt Input & Presets */}
            <div className="space-y-3 shrink-0 font-data-mono text-xs">
              <label className="text-[var(--accent)] block font-bold">生成需求 Prompt 与主题方向</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiScriptPromptInput}
                  onChange={(e) => setAiScriptPromptInput(e.target.value)}
                  placeholder="输入创作主题或需求，如：生成一段电台新闻短稿..."
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleGenerateAiNodeScript}
                  disabled={isGeneratingAiNodeScript}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs rounded-sm hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span className="font-bold text-[10px] bg-white/20 px-1.5 py-0.5 rounded">AI</span>
                  <span>{isGeneratingAiNodeScript ? '大模型生成中...' : '开始生成'}</span>
                </button>
              </div>

              {/* Quick Prompt Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-[var(--text-muted)]">快捷预设:</span>
                {[
                  `为主播【${doll.name}】撰写新闻短稿`,
                  `【${doll.name}】治愈风格独家点评`,
                  `【九学王】英语知识点亲切讲解`,
                  `【${doll.name}】开场欢迎词`,
                  `【${doll.name}】下播谢幕台词`,
                ].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => setAiScriptPromptInput(pill)}
                    className="px-2 py-0.5 bg-[var(--bg-subcard)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded text-[10px] font-sans transition-colors cursor-pointer"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Output Preview */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              <label className="text-xs font-data-mono font-bold text-[var(--text-primary)] block">
                生成的台词播报文案预览:
              </label>
              <textarea
                rows={5}
                value={aiScriptResultText}
                onChange={(e) => setAiScriptResultText(e.target.value)}
                placeholder="生成的文案将显示在这里，支持直接修改..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-sm p-3 text-xs font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none custom-scrollbar"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)] shrink-0">
              <button
                onClick={() => setIsAiNodeScriptOpen(false)}
                className="px-4 py-2 rounded-sm border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-serif-editorial text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleApplyAiScriptToNode}
                className="px-5 py-2 bg-[var(--accent)] text-[var(--accent-text)] font-serif-editorial font-bold text-xs rounded-sm hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                应用至该节点
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freezing Channel Audio Assets & Manifest Loading Modal Overlay */}
      {isFreezing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn select-none p-6">
          <div className="bg-[var(--bg-card)] border border-[var(--accent)]/50 rounded-sm p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-5">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div>
              <span className="material-symbols-outlined absolute text-xl text-[var(--accent)]">save</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif-editorial font-bold text-base text-[var(--text-primary)]">
                正在固化频道物理音频资源及生成 ESP32 清单...
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-sans leading-relaxed">
                后端正在离线快照化播放节点、同步二进制 MP3 并生成专供 ESP32 设备刷机使用的 <code className="text-[var(--accent)] font-mono font-bold">playlist_resource.json</code>。请稍候...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
