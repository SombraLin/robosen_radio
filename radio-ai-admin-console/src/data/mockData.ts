import {
  Channel,
  Doll,
  ExecutionLog,
  GenerativeConfig,
  PlaylistItem,
  NewsClip,
  AudioAssetItem,
  ChannelTemplate,
  ChannelTemplateItem,
  BroadcastChainItem,
  PipelineConfig,
} from '../types';
import { DOLL_REGISTRY } from './dollRegistry';

export const INITIAL_NEWS_CLIPS: NewsClip[] = [
  {
    id: 'clip-1',
    category: '科技',
    title: 'AI监管法案在参议院通过',
    content: '关于生成式AI模型的新全面法规在参议院以跨党派多数通过，主要针对数据归属和版权。',
    durationSeconds: 45,
    durationFormatted: '0:45',
    role: '默认新闻',
    status: '已就绪',
    createdAt: '10:42:05'
  },
  {
    id: 'clip-2',
    category: '市场',
    title: '科技股因盈利大涨',
    content: '主要科技公司第三季度盈利超预期，推动纳斯达克在早盘上涨2.4%。',
    durationSeconds: 70,
    durationFormatted: '~1:10',
    role: 'Max Market',
    status: '生成中',
    createdAt: '10:38:12'
  },
  {
    id: 'clip-3',
    category: '科技',
    title: '量子计算芯片研发取得重大突破',
    content: '实验室成功将128量子比特的相干时间延长至3.5毫秒，将量子纠错效率提升了40%。',
    durationSeconds: 50,
    durationFormatted: '0:50',
    role: '草莓熊',
    status: '已就绪',
    createdAt: '10:25:30'
  },
  {
    id: 'clip-4',
    category: '政治',
    title: '欧洲清洁能源峰会达成共识',
    content: '27国代表一致同意加快跨国电网建设，预计在2030年前实现零碳能源比例超65%。',
    durationSeconds: 65,
    durationFormatted: '1:05',
    role: 'Atlas Global',
    status: '已就绪',
    createdAt: '10:15:00'
  },
  {
    id: 'clip-5',
    category: '市场',
    title: '全球半导体供应链发布三季度展望',
    content: '先进封装与高性能芯片需求依然强劲，消费电子需求呈现温和复苏趋势。',
    durationSeconds: 55,
    durationFormatted: '0:55',
    role: 'Max Market',
    status: '草稿',
    createdAt: '09:50:11'
  },
  {
    id: 'clip-6',
    category: '文化',
    title: '数字艺术博物馆在上海开幕',
    content: '结合AI互动与生成式声光沉浸工程，展出超百件全球前沿数字人与合成艺术品。',
    durationSeconds: 40,
    durationFormatted: '0:40',
    role: 'Sarah',
    status: '已就绪',
    createdAt: '09:20:00'
  }
];

export const INITIAL_CHAIN_ITEMS: BroadcastChainItem[] = [
  {
    id: 'chain-1',
    type: 'music',
    title: '系统音效',
    subtitle: '标准新闻片头曲',
    durationSeconds: 5,
    durationFormatted: '0:05'
  },
  {
    id: 'chain-2',
    type: 'voice',
    title: '角色开场 (Sarah)',
    subtitle: '"早上好，这是今日头条科技..."',
    durationSeconds: 15,
    durationFormatted: '0:15'
  },
  {
    id: 'chain-3',
    type: 'news',
    title: 'AI监管法案在参议院通过',
    subtitle: '科技新闻 - 0:45 | 角色: 默认新闻',
    durationSeconds: 45,
    durationFormatted: '0:45',
    clipId: 'clip-1'
  }
];

export const PRESET_DOLL_IDS = [
  { doll_id: 'ROBOSEN-BASIC-LIGHT', label: 'ROBOSEN-BASIC-LIGHT (通用机器人)' },
  { doll_id: 'MINI-LOTSO', label: 'MINI-LOTSO (草莓熊 Lotso)' },
  { doll_id: 'MINI-ROBOT-A2', label: 'MINI-ROBOT-A2 (蜡笔小新 A2 新生无奈)' },
  { doll_id: 'MINI-ROBOT-A4', label: 'MINI-ROBOT-A4 (蜡笔小新 A4 新花路放)' },
  { doll_id: 'MINI-ROBOT-A1', label: 'MINI-ROBOT-A1 (蜡笔小新 A1 新高气傲)' },
  { doll_id: 'MINI-ROBOT-A3', label: 'MINI-ROBOT-A3 (蜡笔小新 A3 新驰神往)' },
  { doll_id: 'XWZ-O-WLGZ', label: 'XWZ-O-WLGZ (樱桃小丸子 丸皮公主)' },
  { doll_id: 'XWZ-O-WPJL', label: 'XWZ-O-WPJL (樱桃小丸子 丸皮精灵)' },
  { doll_id: 'XWZ-O-WQGJ', label: 'XWZ-O-WQGJ (樱桃小丸子 丸趣歌姬)' },
  { doll_id: 'XWZ-O-WQBH', label: 'XWZ-O-WQBH (樱桃小丸子 丸全不会)' },
  { doll_id: 'MINI-WOODY', label: 'MINI-WOODY (胡迪 Woody)' },
  { doll_id: 'HD-O-WJZDY5', label: 'HD-O-WJZDY5 (胡迪 Woody 自定义)' },
  { doll_id: 'MINI-ALIEN', label: 'MINI-ALIEN (三眼仔 Alien)' },
  { doll_id: 'MINI-WALLE', label: 'MINI-WALLE (瓦力 Walle)' },
  { doll_id: 'MINI-REX', label: 'MINI-REX (抱抱龙 Rex)' },
  { doll_id: 'MINI-JESSIE', label: 'MINI-JESSIE (翠西 Jessie)' },
  { doll_id: 'MINI-BUZZ', label: 'MINI-BUZZ (巴斯光年 Buzz)' },
  { doll_id: 'BSGN-O-WJZDY5', label: 'BSGN-O-WJZDY5 (巴斯光年 Buzz 自定义)' },
  { doll_id: 'MINI-EVE', label: 'MINI-EVE (伊娃 Eve)' },
  { doll_id: 'ZMS-O-XHR3', label: 'ZMS-O-XHR3 (小黄人M3导演 James)' },
  { doll_id: 'HL-O-XHR3', label: 'HL-O-XHR3 (小黄人M3摄影师 Henry)' },
  { doll_id: 'LUCKY-CHEST', label: 'LUCKY-CHEST (幸运宝箱)' }
];

export const INITIAL_DOLLS: Doll[] = [
  {
    id: 'doll-lotso',
    name: '草莓熊 Lotso',
    stationCode: 'STATION_LOTSO',
    tagline: '草莓香味玩具总动员专栏主播',
    roleTitle: '治愈系主播',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['MINI-LOTSO'].avatar,
    currentBroadcastProgress: 85,
    streamInfo: 'Stream: 1080p | Latency: 10ms',
    channels: [
      {
        id: 'var-lotso-1',
        channel_id: 'CH-LOTSO-01',
        channel_name: '草莓熊治愈特刊频道',
        doll_id: 'MINI-LOTSO',
        model_name: 'MINI-LOTSO',
        name: '草莓熊治愈特刊频道',
        isLive: true,
        code: 'CH-LOTSO-01',
        category: '新闻频道',
        categories: ['玩具特刊', '童趣感语'],
        prompt: '带着浓郁草莓香味的软萌玩偶，用温暖憨厚的语调聊聊生活中的童真与美好。',
        introScript: '你好呀！我是草莓熊，闻到草莓香气了吗？欢迎收听今日特刊。',
        outroScript: '今天也要像草莓一样甜甜的哦，我们下次见！',
        playlist: [
          {
            id: 'lotso-p1',
            type: 'intro',
            title: '【草莓熊广播站】今日热点新闻片头',
            speakerRole: '草莓熊 (主播)',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: '草莓香味广播站，陪伴你的每一刻~'
          },
          {
            id: 'lotso-p2',
            type: 'transition',
            title: '草莓软糖卡顿转场音',
            speakerRole: '系统音效',
            durationSeconds: 5,
            durationFormatted: '0:05',
            contentSnippet: '[啾啾啾~ 草莓软糖碰撞声]'
          },
          {
            id: 'lotso-p3',
            type: 'news_script',
            title: '科技快讯：全球 AI 虚拟玩偶交互技术迎来里程碑',
            speakerRole: '男主持人',
            durationSeconds: 45,
            durationFormatted: '0:45',
            contentSnippet: '今日，新型智能玩偶算法成功实现了声音与情感的高度拟真...'
          },
          {
            id: 'lotso-p4',
            type: 'news_script',
            title: '文化焦点：童趣 IP 结合智能硬件引领消费新浪潮',
            speakerRole: '女主持人',
            durationSeconds: 50,
            durationFormatted: '0:50',
            contentSnippet: '越来越多消费者选择具备语音陪伴功能的实体玩偶作为办公桌治愈伙伴...'
          },
          {
            id: 'lotso-p5',
            type: 'commentary',
            title: '草莓熊独家点评：科技不仅要有速度，更要有温度和草莓香味！',
            speakerRole: '草莓熊 (主播)',
            durationSeconds: 30,
            durationFormatted: '0:30',
            contentSnippet: '哼哼，我觉得嘛，不管算法多厉害，最重要的还是抱起来软软的！'
          },
          {
            id: 'lotso-p6',
            type: 'outro',
            title: '【草莓熊广播站】播报完毕与下期预告',
            speakerRole: '草莓熊 (主播)',
            durationSeconds: 15,
            durationFormatted: '0:15',
            contentSnippet: '今天的新闻就到这里啦，记得给自己买个草莓蛋糕哦！'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-shinchan',
    name: '蜡笔小新 A1 新高气傲',
    stationCode: 'STATION_SHIN',
    tagline: '双叶幼儿园特命主播 / 幽默爆笑特刊',
    roleTitle: '搞笑特派员',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['MINI-ROBOT-A1'].avatar,
    currentBroadcastProgress: 60,
    streamInfo: 'Stream: 1080p | Latency: 15ms',
    channels: [
      {
        id: 'var-shin-1',
        channel_id: 'CH-ROBOT-A1',
        channel_name: '新之助 - 康达姆机器人 A1 频道',
        doll_id: 'MINI-ROBOT-A1',
        model_name: 'MINI-ROBOT-A1',
        name: '新之助 - 康达姆机器人 A1 频道',
        isLive: true,
        code: 'CH-ROBOT-A1',
        category: '新闻频道',
        categories: ['搞笑动漫', '机器人前沿'],
        prompt: '充满童趣与无厘头的搞笑播报风格，充满大象舞与康达姆机器人的幽默活力。',
        introScript: '大姐姐好呀！我是野原新之助，今天为你带来超酷的康达姆机器人 A1 特报！',
        outroScript: '动感超人，beam！今天的新闻就到这里啦！',
        playlist: [
          {
            id: 'shin-a1-p1',
            type: 'intro',
            title: '【新之助新闻站】康达姆机器人出击片头',
            speakerRole: '新之助',
            durationSeconds: 10,
            durationFormatted: '0:10',
            contentSnippet: '大姐姐好呀！康达姆 A1 新闻特报开播啦！'
          },
          {
            id: 'shin-a1-p2',
            type: 'transition',
            title: '动感光波发射音',
            speakerRole: '系统音效',
            durationSeconds: 4,
            durationFormatted: '0:04',
            contentSnippet: '[WA-HA-HA-HA! Beam~]'
          },
          {
            id: 'shin-a1-p3',
            type: 'news_script',
            title: '春日部前线：春日部防卫队第一现场报道',
            speakerRole: '男主持人',
            durationSeconds: 40,
            durationFormatted: '0:40',
            contentSnippet: '据现场报道，双叶幼儿园正举行零食大比拼活动...'
          },
          {
            id: 'shin-a1-p4',
            type: 'news_script',
            title: '娱乐焦点：大姐姐最爱看的流行刊物发布',
            speakerRole: '女主持人',
            durationSeconds: 35,
            durationFormatted: '0:35',
            contentSnippet: '最新一期的时尚杂志引起了美冴和小新的共同关注...'
          },
          {
            id: 'shin-a1-p5',
            type: 'commentary',
            title: '野原新之助点评：风间你看，这个新闻真的很需要大象舞助阵捏！',
            speakerRole: '新之助',
            durationSeconds: 25,
            durationFormatted: '0:25',
            contentSnippet: '风间不要装严肃嘛，来跟小新一起摇屁屁！'
          },
          {
            id: 'shin-a1-p6',
            type: 'outro',
            title: '动感超人结束音',
            speakerRole: '新之助',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: '动感超人，beam！下期再见咯！'
          }
        ]
      },
      {
        id: 'var-shin-2',
        channel_id: 'CH-ROBOT-A2',
        channel_name: '新之助 - 动感超人 A2 专栏',
        doll_id: 'MINI-ROBOT-A2',
        model_name: 'MINI-ROBOT-A2',
        name: '新之助 - 动感超人 A2 专栏',
        isLive: true,
        code: 'CH-ROBOT-A2',
        category: '天气频道',
        categories: ['英雄特快', '儿童爆笑'],
        prompt: '扮演动感超人的忠实粉丝，用活泼夸张的语调解说世界奇闻。',
        introScript: '哇哈哈哈哈！动感新之助 A2 频道开播啦！',
        outroScript: '别忘了吃齐藤老师推荐的巧克力饼干哦！',
        playlist: [
          {
            id: 'shin-a2-p1',
            type: 'intro',
            title: '【新之助气象台】动感超人英雄出场曲',
            speakerRole: '新之助',
            durationSeconds: 8,
            durationFormatted: '0:08',
            contentSnippet: '哇哈哈哈哈！动感气象台来啦！'
          },
          {
            id: 'shin-a2-p2',
            type: 'weather_report',
            title: '全国天气播报：今日多云转晴，适宜跳动感体操，紫外线适中',
            speakerRole: '新之助 (天气员)',
            durationSeconds: 55,
            durationFormatted: '0:55',
            contentSnippet: '今天阳光很好哦！大家出门记得戴帽子，不然会被美冴唠叨哦！'
          },
          {
            id: 'shin-a2-p3',
            type: 'outro',
            title: '【气象台结尾】记得穿外套别感冒啦',
            speakerRole: '新之助',
            durationSeconds: 10,
            durationFormatted: '0:10',
            contentSnippet: '拜拜咯，我要去吃齐藤老师的巧克力饼干了！'
          }
        ]
      },
      {
        id: 'var-shin-3',
        channel_id: 'CH-ROBOT-A3',
        channel_name: '新之助 - 肥嘟嘟左卫门 A3 频道',
        doll_id: 'MINI-ROBOT-A3',
        model_name: 'MINI-ROBOT-A3',
        name: '新之助 - 肥嘟嘟左卫门 A3 频道',
        isLive: false,
        code: 'CH-ROBOT-A3',
        category: '剧场频道',
        categories: ['正义解说', '奇幻冒险'],
        prompt: '肥嘟嘟左卫门救世主特别频道，富有戏谑感与反转风味的即兴播报。',
        introScript: '我是正义的英雄，肥嘟嘟左卫门的主播代理新之助 A3 频道！',
        outroScript: '救援费用是十亿日元，记在风间账上！',
        playlist: [
          {
            id: 'shin-a3-p1',
            type: 'intro',
            title: '拯救世界英雄降临剧场幕布声',
            speakerRole: '肥嘟嘟左卫门 (配音新之助)',
            durationSeconds: 8,
            durationFormatted: '0:08',
            contentSnippet: '正义的救世主降临！剧场拉开帷幕！'
          },
          {
            id: 'shin-a3-p2',
            type: 'theater_act',
            title: '广播剧第一幕：救世主肥嘟嘟左卫门登场，索价十亿日元',
            speakerRole: '广播剧全员',
            durationSeconds: 75,
            durationFormatted: '1:15',
            contentSnippet: '‘我是正义的同伴！救援费用十亿日元，分期付款也不行！’'
          },
          {
            id: 'shin-a3-p3',
            type: 'transition',
            title: '猪蹄卡嗒转场音乐',
            speakerRole: '系统音效',
            durationSeconds: 6,
            durationFormatted: '0:06',
            contentSnippet: '[嗒嗒嗒嗒...]'
          },
          {
            id: 'shin-a3-p4',
            type: 'theater_act',
            title: '广播剧第二幕：强敌突袭！肥嘟嘟左卫门秒投降大作战',
            speakerRole: '广播剧全员',
            durationSeconds: 90,
            durationFormatted: '1:30',
            contentSnippet: '‘不好！敌人太强了，我决定站在强者这一边！’'
          },
          {
            id: 'shin-a3-p5',
            type: 'outro',
            title: '【剧场落幕】救援费用记在风间账上',
            speakerRole: '新之助',
            durationSeconds: 15,
            durationFormatted: '0:15',
            contentSnippet: '谢幕！救援发票已经寄给风间妈妈了捏！'
          }
        ]
      },
      {
        id: 'var-shin-4',
        channel_id: 'CH-ROBOT-A4',
        channel_name: '新之助 - 双叶日常 A4 广播',
        doll_id: 'MINI-ROBOT-A4',
        model_name: 'MINI-ROBOT-A4',
        name: '新之助 - 双叶日常 A4 广播',
        isLive: false,
        code: 'CH-ROBOT-A4',
        category: '电子宠物频道',
        categories: ['春日部防卫队', '生活闲聊'],
        prompt: '春日部防卫队第一线连线报道，轻松无厘头。',
        introScript: '春日部防卫队，Fire！我是 A4 频道的特派员小新。',
        outroScript: '小白，我们回家吃晚饭啦！',
        playlist: [
          {
            id: 'shin-pet-1',
            type: 'pet_event',
            title: '07:00 起床唤醒：美冴不要摇我啦！大姐姐还在梦里等我捏...',
            speakerRole: '新之助 (陪伴宠物)',
            timeSlot: '07:00',
            durationSeconds: 20,
            durationFormatted: '0:20',
            contentSnippet: '唔... 再让我睡五分钟，今天早饭有小熊饼干吗？'
          },
          {
            id: 'shin-pet-2',
            type: 'pet_event',
            title: '09:00 上班/上学发呆：吉永老师在讲课，我在折动感超人',
            speakerRole: '新之助 (陪伴宠物)',
            timeSlot: '09:00',
            durationSeconds: 18,
            durationFormatted: '0:18',
            contentSnippet: '风间一直在看我，难道他也想玩纸飞头吗？'
          },
          {
            id: 'shin-pet-3',
            type: 'pet_event',
            title: '12:00 午餐干饭：哇！今天的便当有香肠和小熊饼干！',
            speakerRole: '新之助 (陪伴宠物)',
            timeSlot: '12:00',
            durationSeconds: 22,
            durationFormatted: '0:22',
            contentSnippet: '正男，你的青椒可以给我妈妈吃吗？我不喜欢青椒！'
          },
          {
            id: 'shin-pet-4',
            type: 'pet_event',
            title: '15:00 伸懒腰打瞌睡：肚子暖洋洋的，跟小白一起睡午觉咯',
            speakerRole: '新之助 (陪伴宠物)',
            timeSlot: '15:00',
            durationSeconds: 25,
            durationFormatted: '0:25',
            contentSnippet: '呼噜噜... 阳光好舒服，小白的毛软软的...'
          },
          {
            id: 'shin-pet-5',
            type: 'pet_event',
            title: '18:00 放学欢呼：放学啦！看我的神速屁屁飞奔回家！',
            speakerRole: '新之助 (陪伴宠物)',
            timeSlot: '18:00',
            durationSeconds: 20,
            durationFormatted: '0:20',
            contentSnippet: '动感超人动画片要开始啦！快跑快跑！'
          },
          {
            id: 'shin-pet-6',
            type: 'pet_event',
            title: '22:00 晚安道别：广志的脚好臭哦... 大家都睡着啦，晚安！',
            speakerRole: '新之助 (陪伴宠物)',
            timeSlot: '22:00',
            durationSeconds: 22,
            durationFormatted: '0:22',
            contentSnippet: '盖好被子，不要把肚脐眼露出来被雷神吃掉哦，晚安~'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-maruko',
    name: '樱桃小丸子 丸皮公主',
    stationCode: 'STATION_XWZ',
    tagline: '清水市生活特刊 / 治愈系少女主播',
    roleTitle: '生活感悟主播',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['XWZ-O-WLGZ'].avatar,
    currentBroadcastProgress: 40,
    streamInfo: 'Stream: 1080p | Latency: 14ms',
    channels: [
      {
        id: 'var-xwz-1',
        channel_id: 'CH-XWZ-WLGZ',
        channel_name: '小丸子 - 未来灵感全天陪伴频道',
        doll_id: 'XWZ-O-WLGZ',
        model_name: 'XWZ-O-WLGZ',
        name: '小丸子 - 未来灵感全天陪伴频道',
        isLive: true,
        code: 'CH-XWZ-WLGZ',
        category: '电子宠物频道',
        categories: ['生活哲学', '奇思妙想'],
        prompt: '带着小丸子招牌的真诚、稍微带点小懒惰但极其治愈的娓娓道来风。',
        introScript: '只要活着就会有好事发生的！大家好，我是小丸子，欢迎听我碎碎念。',
        outroScript: '爷爷说得对，今天也是值得吃一顿好的好日子呢。',
        playlist: [
          {
            id: 'maruko-pet-1',
            type: 'pet_event',
            title: '07:00 起床唤醒：太平洋的太阳都升得高高的了，可我还是想缩在被窝里...',
            speakerRole: '小丸子 (陪伴宠物)',
            timeSlot: '07:00',
            durationSeconds: 22,
            durationFormatted: '0:22',
            contentSnippet: '姐姐已经在洗漱了，再迷糊三分钟就起来！'
          },
          {
            id: 'maruko-pet-2',
            type: 'pet_event',
            title: '09:00 上班/上学发呆：虽然在认真听课，心里一直在算放学能买几个大福',
            speakerRole: '小丸子 (陪伴宠物)',
            timeSlot: '09:00',
            durationSeconds: 20,
            durationFormatted: '0:20',
            contentSnippet: '户川老师讲得很好，但我的肚子已经在咕噜噜叫了。'
          },
          {
            id: 'maruko-pet-3',
            type: 'pet_event',
            title: '12:00 午餐干饭：小玉你快看！今天妈妈给我准备了炸虾便当！',
            speakerRole: '小丸子 (陪伴宠物)',
            timeSlot: '12:00',
            durationSeconds: 25,
            durationFormatted: '0:25',
            contentSnippet: '能吃到美味的炸虾，我觉得我是世界上最幸福的小朋友！'
          },
          {
            id: 'maruko-pet-4',
            type: 'pet_event',
            title: '15:00 伸懒腰打瞌睡：好困呀... 只要活着就会有好事发生的，先睡为敬！',
            speakerRole: '小丸子 (陪伴宠物)',
            timeSlot: '15:00',
            durationSeconds: 22,
            durationFormatted: '0:22',
            contentSnippet: '趴在桌子上眯一会儿，阳光照在后背上好舒服呀。'
          },
          {
            id: 'maruko-pet-5',
            type: 'pet_event',
            title: '18:00 下班/放学欢呼：回家咯！顺路去佐佐木爷爷家看漂亮的树叶~',
            speakerRole: '小丸子 (陪伴宠物)',
            timeSlot: '18:00',
            durationSeconds: 20,
            durationFormatted: '0:20',
            contentSnippet: '和爷爷一起散步回家的路，总是特别漫长又特别开心。'
          },
          {
            id: 'maruko-pet-6',
            type: 'pet_event',
            title: '22:00 晚安道别：爷爷晚安，小玉晚安... 希望做个关于巧克力雪糕的梦',
            speakerRole: '小丸子 (陪伴宠物)',
            timeSlot: '22:00',
            durationSeconds: 24,
            durationFormatted: '0:24',
            contentSnippet: '盖好小被子，明天一定会是充满希望的好日子，晚安。'
          }
        ]
      },
      {
        id: 'var-xwz-2',
        channel_id: 'CH-XWZ-WPJL',
        channel_name: '小丸子 - 校园故事电讯专栏',
        doll_id: 'XWZ-O-WPJL',
        model_name: 'XWZ-O-WPJL',
        name: '小丸子 - 校园故事电讯专栏',
        isLive: false,
        code: 'CH-XWZ-WPJL',
        category: '故事频道',
        categories: ['校园生活', '友情故事'],
        prompt: '分享和小玉、花轮同学的校园搞笑与温馨日常。',
        introScript: '小玉，你听说了吗？今天的新闻广播好像很有趣呢！',
        outroScript: 'Hey baby~ 花轮同学祝大家今天心情愉快！',
        playlist: [
          {
            id: 'maruko-story-1',
            type: 'intro',
            title: '【小丸子故事屋】清水市三年四班片头曲',
            speakerRole: '小丸子',
            durationSeconds: 10,
            durationFormatted: '0:10',
            contentSnippet: '三年四班故事屋，开讲啦！'
          },
          {
            id: 'maruko-story-2',
            type: 'story_body',
            title: '故事主体：小丸子与小玉的秘密基地探险记',
            speakerRole: '小丸子 (讲述人)',
            durationSeconds: 105,
            durationFormatted: '1:45',
            contentSnippet: '那是一个阳光明媚的下午，我和小玉在后山发现了一个树洞...'
          },
          {
            id: 'maruko-story-3',
            type: 'commentary',
            title: '玩偶感悟：友情就像姐姐分给我的半个苹果一样甜',
            speakerRole: '小丸子',
            durationSeconds: 35,
            durationFormatted: '0:35',
            contentSnippet: '只要和小玉在一起，就算是倒霉的事情也会变成美好的回忆。'
          },
          {
            id: 'maruko-story-4',
            type: 'outro',
            title: '【故事完结】Hey Baby~ 花轮同学祝大家晚安',
            speakerRole: '花轮同学 (客串)',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: 'Hey baby, 今天的优雅故事就到这里，明天见。'
          }
        ]
      },
      {
        id: 'var-xwz-3',
        channel_id: 'CH-XWZ-WQGJ',
        channel_name: '小丸子 - 奇境幻想特刊频道',
        doll_id: 'XWZ-O-WQGJ',
        model_name: 'XWZ-O-WQGJ',
        name: '小丸子 - 奇境幻想特刊频道',
        isLive: false,
        code: 'CH-XWZ-WQGJ',
        category: '故事频道',
        categories: ['幻想特刊', '童年回忆'],
        prompt: '充满童年奇思妙想的幻想电台，探讨各种奇怪又可爱的脑洞。',
        introScript: '如果作业可以自己写完就好了，欢迎来到奇境幻想特刊！',
        outroScript: '我要去睡觉了，希望做个关于巧克力雪糕的梦。'
      },
      {
        id: 'var-xwz-4',
        channel_id: 'CH-XWZ-WQBH',
        channel_name: '小丸子 - 治愈深夜音效频道',
        doll_id: 'XWZ-O-WQBH',
        model_name: 'XWZ-O-WQBH',
        name: '小丸子 - 治愈深夜音效频道',
        isLive: false,
        code: 'CH-XWZ-WQBH',
        category: '音乐频道',
        categories: ['深夜治愈', '温情陪伴'],
        prompt: '温柔缓慢的深夜治愈电台，缓解焦虑，抚平情绪。',
        introScript: '黑夜里的小丸子广播，给每一个辛苦了一天的人送上温暖抱抱。',
        outroScript: '晚安，明天一定会是充满希望的一天。'
      },
      {
        id: 'var-xwz-5',
        channel_id: 'CH-XWZ-LEARN',
        channel_name: '小丸子 - 九学王英语学习频道',
        doll_id: 'XWZ-O-WPJL',
        model_name: 'XWZ-O-WPJL',
        name: '小丸子 - 九学王英语学习频道',
        isLive: true,
        code: 'CH-XWZ-LEARN',
        category: '学习频道',
        categories: ['九学王', '英语教材', '小学英语'],
        prompt: '像同桌一样耐心陪伴学习，用轻松、生活化的方式播放和讲解九学王英语教材。',
        introScript: '今天不偷懒啦！小丸子陪你一起学九学王英语。',
        outroScript: '今天的单词都记住了吗？休息一下，明天继续加油！',
        playlist: [
          {
            id: 'maruko-learn-1',
            type: 'intro',
            title: '【小丸子学习时间】今天和九学王一起学英语',
            speakerRole: '小丸子 (学习伙伴)',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: '准备好课本，我们开始今天的英语学习吧！'
          },
          {
            id: 'maruko-learn-2',
            type: 'lesson_audio',
            title: '九学王教材播放：三年级英语 Unit 1 Hello!',
            speakerRole: '九学王教材原声',
            durationSeconds: 90,
            durationFormatted: '1:30',
            contentSnippet: 'Hello! I am Amy. What is your name?'
          },
          {
            id: 'maruko-learn-3',
            type: 'lesson_explanation',
            title: '玩偶逐句讲解：自我介绍与日常问候',
            speakerRole: '小丸子 (讲解老师)',
            durationSeconds: 70,
            durationFormatted: '1:10',
            contentSnippet: '“What is your name?”就是“你叫什么名字？”'
          },
          {
            id: 'maruko-learn-4',
            type: 'learning_practice',
            title: '跟读练习：Hello / My name is...',
            speakerRole: '小丸子 (陪练伙伴)',
            durationSeconds: 45,
            durationFormatted: '0:45',
            contentSnippet: '轮到你啦，跟我一起说：Hello! My name is...'
          },
          {
            id: 'maruko-learn-5',
            type: 'learning_quiz',
            title: '互动问答：用英语向小丸子介绍自己',
            speakerRole: '小丸子 (提问老师)',
            durationSeconds: 40,
            durationFormatted: '0:40',
            contentSnippet: 'What is your name? 请用英语回答我吧！'
          },
          {
            id: 'maruko-learn-6',
            type: 'outro',
            title: '【学习完成】今日知识回顾与鼓励',
            speakerRole: '小丸子 (学习伙伴)',
            durationSeconds: 15,
            durationFormatted: '0:15',
            contentSnippet: '今天学会了打招呼和介绍自己，真棒！'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-woody',
    name: '胡迪 Woody',
    stationCode: 'STATION_WOODY',
    tagline: '西部警长 / 忠诚义气主持人',
    roleTitle: '正义导播',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['MINI-WOODY'].avatar,
    currentBroadcastProgress: 50,
    streamInfo: 'Stream: 1080p | Latency: 11ms',
    channels: [
      {
        id: 'var-woody-1',
        channel_id: 'CH-WOODY-01',
        channel_name: '胡迪警长牛仔音乐电台',
        doll_id: 'MINI-WOODY',
        model_name: 'MINI-WOODY',
        name: '胡迪警长牛仔音乐电台',
        isLive: true,
        code: 'CH-WOODY-01',
        category: '音乐频道',
        categories: ['西部冒险', '正义导播'],
        prompt: '沉稳正义、充满义气与领导力的警长声音，靴子里有只靴蛇的经典幽默。',
        introScript: '我的靴子里有只靴蛇！我是胡迪警长，欢迎收听西部特报。',
        outroScript: '伙伴们，保持警惕，我们是一家人！',
        playlist: [
          {
            id: 'woody-music-1',
            type: 'intro',
            title: '【胡迪西部电台】我是警长胡迪！今日牛仔爵士乐推荐',
            speakerRole: '胡迪警长',
            durationSeconds: 15,
            durationFormatted: '0:15',
            contentSnippet: '我的靴子里有只靴蛇！欢迎来到牛仔音乐频道！'
          },
          {
            id: 'woody-music-2',
            type: 'music_track',
            title: '推荐曲目解析：《You\'ve Got a Friend in Me》友情吉他解析',
            speakerRole: '胡迪警长',
            durationSeconds: 70,
            durationFormatted: '1:10',
            contentSnippet: '这首歌每次听都会想起跟巴斯光年一起冒险的日子...'
          },
          {
            id: 'woody-music-3',
            type: 'music_track',
            title: '玩偶试唱片段：胡迪牛仔吆喝与口琴连奏',
            speakerRole: '胡迪 (吉他独奏)',
            durationSeconds: 45,
            durationFormatted: '0:45',
            contentSnippet: '[口琴与吉他悠扬合奏...]'
          },
          {
            id: 'woody-music-4',
            type: 'outro',
            title: '【牛仔打卡】伙伴们，保持警惕，下期见！',
            speakerRole: '胡迪警长',
            durationSeconds: 15,
            durationFormatted: '0:15',
            contentSnippet: '无论走到哪里，记住你都有我这个好朋友！'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-alien',
    name: '三眼仔 Alien',
    stationCode: 'STATION_ALIEN',
    tagline: '神秘爪子教信徒 / 外星电波播报员',
    roleTitle: '外星连线员',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['MINI-ALIEN'].avatar,
    currentBroadcastProgress: 90,
    streamInfo: 'Stream: 1080p | Latency: 8ms',
    channels: [
      {
        id: 'var-alien-1',
        channel_id: 'CH-ALIEN-01',
        channel_name: '三眼仔 - 太空爪子剧场频道',
        doll_id: 'MINI-ALIEN',
        model_name: 'MINI-ALIEN',
        name: '三眼仔 - 太空爪子剧场频道',
        isLive: true,
        code: 'CH-ALIEN-01',
        category: '剧场频道',
        categories: ['外星奇闻', '爪子信仰'],
        prompt: 'Oooooooh! 充满对大爪子的崇拜与对宇宙的好奇，声音高亢空灵。',
        introScript: 'Oooooooh! 神圣的爪子选择了这个频道！我是三眼仔！',
        outroScript: '永远感谢您的救命之恩！Oooooooh!',
        playlist: [
          {
            id: 'alien-th-1',
            type: 'intro',
            title: '【爪子教剧场】OOOOH! 爪子神降临音效',
            speakerRole: '三眼仔全员',
            durationSeconds: 10,
            durationFormatted: '0:10',
            contentSnippet: 'OOOOH! The Claw~~~~'
          },
          {
            id: 'alien-th-2',
            type: 'theater_act',
            title: '广播剧第一幕：三眼仔太空舱遇险记——被大爪子选中的幸运儿',
            speakerRole: '三眼仔 A & B',
            durationSeconds: 80,
            durationFormatted: '1:20',
            contentSnippet: '‘爪子移动了！它在挑选最幸运的那一个！’'
          },
          {
            id: 'alien-th-3',
            type: 'transition',
            title: '外星电波咕噜转场',
            speakerRole: '系统音效',
            durationSeconds: 5,
            durationFormatted: '0:05',
            contentSnippet: '[咕噜噜... 哔哔哔...]'
          },
          {
            id: 'alien-th-4',
            type: 'theater_act',
            title: '广播剧第二幕：玩具总动员外星人大团聚',
            speakerRole: '三眼仔 C & 蛋头先生',
            durationSeconds: 70,
            durationFormatted: '1:10',
            contentSnippet: '‘你救了我们，我们永远感谢你！’'
          },
          {
            id: 'alien-th-5',
            type: 'outro',
            title: 'OOOOH! 感谢观赏太空剧场',
            speakerRole: '三眼仔全员',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: 'OOOOH! 下期太空剧场再见！'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-walle',
    name: '瓦力 Walle',
    stationCode: 'STATION_WALLE',
    tagline: '废品回收机器人 / 地球遗迹保护主播',
    roleTitle: '废品美学导播',
    status: 'offline',
    avatarUrl: DOLL_REGISTRY['MINI-WALLE'].avatar,
    currentBroadcastProgress: 0,
    streamInfo: 'Stream: Audio Only | Offline',
    channels: [
      {
        id: 'var-walle-1',
        channel_id: 'CH-WALLE-01',
        channel_name: '瓦力地球绿植与废品回收专栏',
        doll_id: 'MINI-WALLE',
        model_name: 'MINI-WALLE',
        name: '瓦力地球绿植与废品回收专栏',
        isLive: false,
        code: 'CH-WALLE-01',
        category: '新闻频道',
        categories: ['环保科技', '废品美学'],
        prompt: '带有经典机械电子合成音与深情的调性，讲诉地球复苏与机械温情。',
        introScript: 'Waaall-e... EVA! 欢迎收听地球垃圾清理与绿色复苏特刊。',
        outroScript: 'E-v-a... 瓦力，完毕！',
        playlist: [
          {
            id: 'walle-p1',
            type: 'intro',
            title: '【瓦力地球连线】太阳能充电音与合成声',
            speakerRole: '瓦力',
            durationSeconds: 10,
            durationFormatted: '0:10',
            contentSnippet: 'Waaall-e... (机械蜂鸣音)'
          },
          {
            id: 'walle-p2',
            type: 'news_script',
            title: '地球环保前线：第一株绿苗在废土土壤中萌芽',
            speakerRole: '男主持人',
            durationSeconds: 40,
            durationFormatted: '0:40',
            contentSnippet: '清理机器人瓦力在700区的金属垃圾堆中发现了一株活生生的绿色植物...'
          },
          {
            id: 'walle-p3',
            type: 'commentary',
            title: '瓦力蜂鸣点评：E-V-A! (机器音翻译：生命的萌芽是全宇宙最美的事物)',
            speakerRole: '瓦力',
            durationSeconds: 20,
            durationFormatted: '0:20',
            contentSnippet: 'Eva! Eva! [欢快的机械滴滴声]'
          },
          {
            id: 'walle-p4',
            type: 'outro',
            title: '【瓦力关机】太阳能低电量休眠音',
            speakerRole: '瓦力',
            durationSeconds: 10,
            durationFormatted: '0:10',
            contentSnippet: 'Wa-ll-e... (降调关机声)'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-rex',
    name: '抱抱龙 Rex',
    stationCode: 'STATION_REX',
    tagline: '电子游戏高手 / 绿恐龙萌爆电台',
    roleTitle: '游戏百科主播',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['MINI-REX'].avatar,
    currentBroadcastProgress: 30,
    streamInfo: 'Stream: 1080p | Latency: 16ms',
    channels: [
      {
        id: 'var-rex-1',
        channel_id: 'CH-REX-01',
        channel_name: '抱抱龙游戏攻略与恐龙快讯',
        doll_id: 'MINI-REX',
        model_name: 'MINI-REX',
        name: '抱抱龙游戏攻略与恐龙快讯',
        isLive: true,
        code: 'CH-REX-01',
        category: '新闻频道',
        categories: ['游戏通关', '恐龙百科'],
        prompt: '虽然外表巨大的恐龙但性格非常害羞和容易焦虑，聊游戏时又非常兴奋。',
        introScript: '别吼！我其实是一只很温和的恐龙！欢迎来到抱抱龙游戏频道！',
        outroScript: '太好了，我终于打通关了！下次见！',
        playlist: [
          {
            id: 'rex-p1',
            type: 'intro',
            title: '【抱抱龙游戏站】恐龙咆哮（其实是尖叫）片头',
            speakerRole: '抱抱龙',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: '呀啊啊！不要害怕，我是很温和的抱抱龙！'
          },
          {
            id: 'rex-p2',
            type: 'news_script',
            title: '电竞快讯：扎克天王 Boss 最强手速通关秘籍首公开',
            speakerRole: '男主持人',
            durationSeconds: 45,
            durationFormatted: '0:45',
            contentSnippet: '在《巴斯光年：星际使命》第 24 关中，连续按住按键A与B可触发无敌盾...'
          },
          {
            id: 'rex-p3',
            type: 'commentary',
            title: '抱抱龙激动点评：我的小短手终于能按到那个连招按键了，太感动了！',
            speakerRole: '抱抱龙',
            durationSeconds: 30,
            durationFormatted: '0:30',
            contentSnippet: '你们不知道，我的手太短了，差点按不到手柄的L2键呢！'
          },
          {
            id: 'rex-p4',
            type: 'outro',
            title: '【抱抱龙退场】呼，今天没有撞翻积木，太好了！',
            speakerRole: '抱抱龙',
            durationSeconds: 12,
            durationFormatted: '0:12',
            contentSnippet: '大家都学会了吗？我要去吃热狗奖励自己了！'
          }
        ]
      }
    ]
  },
  {
    id: 'doll-jessie',
    name: '翠西 Jessie',
    stationCode: 'STATION_JESSIE',
    tagline: '狂野西部女牛仔 / 热情活力主播',
    roleTitle: '狂欢特快主播',
    status: 'offline',
    avatarUrl: DOLL_REGISTRY['MINI-JESSIE'].avatar,
    currentBroadcastProgress: 0,
    streamInfo: 'Stream: Audio Only | Offline',
    channels: [
      {
        id: 'var-jessie-1',
        channel_id: 'CH-JESSIE-01',
        channel_name: '翠西狂野西部欢聚电台',
        doll_id: 'MINI-JESSIE',
        model_name: 'MINI-JESSIE',
        name: '翠西狂野西部欢聚电台',
        isLive: false,
        code: 'CH-JESSIE-01',
        category: '音乐频道',
        categories: ['西部欢歌', '热情挑战'],
        prompt: 'Yodel-ay-hee-hoo! 极具爆发力和感染力的女牛仔欢快嗓音。',
        introScript: 'Yodel-ay-hee-hoo! 翠西带着满满的活力向你问好啦！',
        outroScript: '骑上红心，我们明天继续狂欢！'
      }
    ]
  },
  {
    id: 'doll-buzz',
    name: '巴斯光年 Buzz',
    stationCode: 'STATION_BUZZ',
    tagline: '星际正义联盟总指挥 / 宇宙巡逻主播',
    roleTitle: '星际巡逻指挥',
    status: 'online',
    avatarUrl: DOLL_REGISTRY['MINI-BUZZ'].avatar,
    currentBroadcastProgress: 80,
    streamInfo: 'Stream: 1080p | Latency: 9ms',
    channels: [
      {
        id: 'var-buzz-1',
        channel_id: 'CH-BUZZ-01',
        channel_name: '巴斯光年飞向宇宙专栏',
        doll_id: 'MINI-BUZZ',
        model_name: 'MINI-BUZZ',
        name: '巴斯光年飞向宇宙专栏',
        isLive: true,
        code: 'CH-BUZZ-01',
        categories: ['星际探索', '宇宙正义'],
        prompt: '充满英雄使命感与正义腔调的太空骑警命令式播报，威严而可靠。',
        introScript: '巴斯光年日志：星区 4 收到信号，正向宇宙浩瀚之处播报！',
        outroScript: '飞向宇宙，浩瀚无垠！任务完成！'
      }
    ]
  },
  {
    id: 'doll-eve',
    name: '伊娃 Eve',
    stationCode: 'STATION_EVE',
    tagline: '植物探针搜寻器 / 未来高精尖科技主播',
    roleTitle: '高精尖科技主播',
    status: 'offline',
    avatarUrl: DOLL_REGISTRY['MINI-EVE'].avatar,
    currentBroadcastProgress: 0,
    streamInfo: 'Stream: Audio Only | Offline',
    channels: [
      {
        id: 'var-eve-1',
        channel_id: 'CH-EVE-01',
        channel_name: '伊娃指令与植物探针专栏',
        doll_id: 'MINI-EVE',
        model_name: 'MINI-EVE',
        name: '伊娃指令与植物探针专栏',
        isLive: false,
        code: 'CH-EVE-01',
        categories: ['高精尖科技', '生命探针'],
        prompt: '清脆精准的高科技AI语调，夹杂柔和的对生命与自然的关注。',
        introScript: 'E-V-A! 植物指令确认，启动最新科技数据链播报。',
        outroScript: 'Directive complete. 伊娃离线。'
      }
    ]
  }
];

export const INITIAL_LOGS: ExecutionLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-29 14:00:01',
    category: '玩偶点评',
    duration: '4.2s',
    status: '成功',
    details: 'Doll Alpha 成功对新闻 clip-1 生成了 15 秒短评。'
  },
  {
    id: 'log-2',
    timestamp: '2026-07-29 13:45:00',
    category: '新闻抓取',
    duration: '12.8s',
    status: '成功',
    details: '抓取到 14 条最新科技与金融快讯，已入库。'
  },
  {
    id: 'log-3',
    timestamp: '2026-07-29 13:30:02',
    category: '玩偶点评',
    duration: '0.5s',
    status: '失败',
    details: '网络连接超时：远程语音模型 API 未能响应。'
  },
  {
    id: 'log-4',
    timestamp: '2026-07-29 13:15:00',
    category: '自动化调度',
    duration: '2.1s',
    status: '成功',
    details: '播放链条更新，同步至播报控制台。'
  }
];

export const INITIAL_PIPELINE_CONFIG: PipelineConfig = {
  newsScrapingInterval: 15,
  newsScrapingMaxCount: 50,
  commentaryInterval: 30,
  commentaryTargetDolls: ['NOVA (Alpha)', 'ATLAS (Beta)']
};

export const INITIAL_AUDIO_ASSETS: AudioAssetItem[] = [
  {
    id: 'audio-1',
    title: '【新闻频道】广播站开场 (金黄广播片头)',
    category: '新闻频道',
    channelCategory: '新闻频道',
    audioType: '片头',
    duration: '0:12',
    durationSeconds: 12,
    tags: ['新闻', '片头', '大气', '开场'],
    usedInChannels: ['新闻广播站', '每日科技热点'],
    speakerOrSource: '立体声铜管与电子',
    synthPreset: 'jingle'
  },
  {
    id: 'audio-2',
    title: '【新闻频道】资讯快切扫频过场音 (Sweep FX)',
    category: '新闻频道',
    channelCategory: '新闻频道',
    audioType: '转场音效',
    duration: '0:05',
    durationSeconds: 5,
    tags: ['转场', '脉冲', '快切', '资讯'],
    usedInChannels: ['新闻广播站'],
    speakerOrSource: '高频电子扫频过场',
    synthPreset: 'sweep'
  },
  {
    id: 'audio-3',
    title: '【新闻频道】紧急报道双音调提示音 (Headline Alert)',
    category: '新闻频道',
    channelCategory: '新闻频道',
    audioType: '事件提示音',
    duration: '0:04',
    durationSeconds: 4,
    tags: ['警报', '突发', '快讯', '高优先'],
    usedInChannels: ['每日科技热点'],
    speakerOrSource: '双频警报震音',
    synthPreset: 'alert'
  },
  {
    id: 'audio-4',
    title: '【天气频道】晨间晴空八音盒',
    category: '天气频道',
    channelCategory: '天气频道',
    audioType: '片头',
    duration: '0:08',
    durationSeconds: 8,
    tags: ['天气', '治愈', '晨间', '八音盒'],
    usedInChannels: ['每日气象台'],
    speakerOrSource: '清澈钢片琴/八音盒',
    synthPreset: 'chime'
  },
  {
    id: 'audio-5',
    title: '【天气频道】云端舒缓微风 BGM',
    category: '天气频道',
    channelCategory: '天气频道',
    audioType: '背景音乐',
    duration: '1:45',
    durationSeconds: 105,
    tags: ['天气', '微风', '舒缓', '暖阳'],
    usedInChannels: ['每日气象台'],
    speakerOrSource: '长笛与环境长音垫',
    synthPreset: 'lofi'
  },
  {
    id: 'audio-6',
    title: '【电子宠物】07:00 起床闹铃打卡音 (Wakie Chime)',
    category: '电子宠物频道',
    channelCategory: '电子宠物频道',
    audioType: '事件提示音',
    duration: '0:06',
    durationSeconds: 6,
    tags: ['闹钟', '起床', '唤醒', '07:00'],
    usedInChannels: ['桌面电子宠物小狗', '草莓熊全天陪伴'],
    speakerOrSource: '跳跃双音符闹铃',
    synthPreset: 'chime'
  },
  {
    id: 'audio-7',
    title: '【电子宠物】12:00 干饭时间木琴提醒音',
    category: '电子宠物频道',
    channelCategory: '电子宠物频道',
    audioType: '事件提示音',
    duration: '0:05',
    durationSeconds: 5,
    tags: ['干饭', '午餐', '提示', '12:00'],
    usedInChannels: ['草莓熊全天陪伴'],
    speakerOrSource: '欢快木琴三连音',
    synthPreset: 'chime'
  },
  {
    id: 'audio-8',
    title: '【电子宠物】22:00 星空安眠八音盒 BGM',
    category: '电子宠物频道',
    channelCategory: '电子宠物频道',
    audioType: '背景音乐',
    duration: '2:10',
    durationSeconds: 130,
    tags: ['晚安', '摇篮曲', '催眠', '22:00'],
    usedInChannels: ['桌面电子宠物小狗'],
    speakerOrSource: '柔和八音盒与夜空长音',
    synthPreset: 'outro'
  },
  {
    id: 'audio-9',
    title: '【故事频道】奇幻魔法绘本开场',
    category: '故事频道',
    channelCategory: '故事频道',
    audioType: '片头',
    duration: '0:10',
    durationSeconds: 10,
    tags: ['故事', '魔法', '童话', '绘本'],
    usedInChannels: ['森林小木屋故事屋'],
    speakerOrSource: '竖琴下滑与星光风铃',
    synthPreset: 'jingle'
  },
  {
    id: 'audio-10',
    title: '【故事频道】神秘森林探索氛围背景乐 (BGM)',
    category: '故事频道',
    channelCategory: '故事频道',
    audioType: '背景音乐',
    duration: '2:20',
    durationSeconds: 140,
    tags: ['冒险', '神秘', '氛围', '森林'],
    usedInChannels: ['森林小木屋故事屋'],
    speakerOrSource: '低音大提琴与风声低鸣',
    synthPreset: 'lofi'
  },
  {
    id: 'audio-11',
    title: '【音乐频道】独奏曲目《童年回忆》（纯音乐）',
    category: '音乐频道',
    channelCategory: '音乐频道',
    audioType: '原声曲目',
    duration: '2:00',
    durationSeconds: 120,
    tags: ['纯音乐', '独奏', '怀旧', '吉他'],
    usedInChannels: ['治愈系音乐随身听'],
    speakerOrSource: '原声木吉他与琴弦合奏',
    synthPreset: 'lofi'
  },
  {
    id: 'audio-12',
    title: '【音乐频道】夜读 Chill Lo-Fi 爵士吉他 BGM',
    category: '音乐频道',
    channelCategory: '音乐频道',
    audioType: '背景音乐',
    duration: '2:30',
    durationSeconds: 150,
    tags: ['Lo-Fi', '爵士', '放松', '深夜'],
    usedInChannels: ['治愈系音乐随身听'],
    speakerOrSource: 'Lo-Fi鼓点与润色电钢琴',
    synthPreset: 'lofi'
  },
  {
    id: 'audio-13',
    title: '【剧场频道】广播剧大幕拉开与定音鼓',
    category: '剧场频道',
    channelCategory: '剧场频道',
    audioType: '片头',
    duration: '0:08',
    durationSeconds: 8,
    tags: ['剧场', '开幕', '定音鼓', '重音'],
    usedInChannels: ['奇幻广播剧场'],
    speakerOrSource: '交响定音鼓与开幕重音',
    synthPreset: 'theater'
  },
  {
    id: 'audio-14',
    title: '【剧场频道】灯光暗下与幕间场景切换过场音',
    category: '剧场频道',
    channelCategory: '剧场频道',
    audioType: '转场音效',
    duration: '0:05',
    durationSeconds: 5,
    tags: ['过场', '幕间', '灯光', '咔哒'],
    usedInChannels: ['奇幻广播剧场'],
    speakerOrSource: '咔哒开关与下滑弦乐',
    synthPreset: 'sweep'
  },
  {
    id: 'audio-15',
    title: '【剧场频道】全员谢幕落幕欢呼与尾奏 (Curtain Call)',
    category: '剧场频道',
    channelCategory: '剧场频道',
    audioType: '片尾谢幕',
    duration: '0:15',
    durationSeconds: 15,
    tags: ['谢幕', '掌声', '完结', '尾奏'],
    usedInChannels: ['奇幻广播剧场'],
    speakerOrSource: '观众掌声与大剧场终曲',
    synthPreset: 'outro'
  },
  {
    id: 'audio-16',
    title: '【系统通用】广播台标准播报完毕退场音',
    category: '系统通用',
    channelCategory: '系统通用',
    audioType: '片尾谢幕',
    duration: '0:06',
    durationSeconds: 6,
    tags: ['退场', '系统', '结束', '通用'],
    usedInChannels: ['全频道通用'],
    speakerOrSource: '三音阶合成下行音',
    synthPreset: 'outro'
  }
];

export let CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    id: 'tpl-news-001',
    name: '标准新闻早班车 (包含头条与点评)',
    description: '适用于每日早间新闻频道的自动化骨架，自动串联新闻主播与玩偶评论员。',
    category: '新闻频道',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateItems: [
      {
        id: 't-item-1',
        itemKind: 'audio',
        audioType: '片头',
        title: '频道专属片头'
      },
      {
        id: 't-item-2',
        itemKind: 'tts',
        ttsNodeType: 'intro',
        speakerRole: '主播',
        title: '主播开场白'
      },
      {
        id: 't-item-3',
        itemKind: 'tts',
        ttsNodeType: 'news_script',
        speakerRole: '新闻播音员',
        title: '今日头条热点'
      },
      {
        id: 't-item-4',
        itemKind: 'tts',
        ttsNodeType: 'commentary',
        speakerRole: '玩偶',
        title: '玩偶犀利点评'
      },
      {
        id: 't-item-5',
        itemKind: 'audio',
        audioType: '片尾谢幕',
        title: '频道标准片尾'
      }
    ]
  },
  {
    id: 'tpl-story-001',
    name: '儿童睡前故事排播',
    description: '适用于睡前故事场景，包含安静的背景音及故事正文生成。',
    category: '故事频道',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateItems: [
      {
        id: 'ts-item-1',
        itemKind: 'audio',
        audioType: '片头',
        title: '晚安曲片头'
      },
      {
        id: 'ts-item-2',
        itemKind: 'tts',
        ttsNodeType: 'story_body',
        speakerRole: '玩偶',
        title: 'AI 自动生成童话故事'
      },
      {
        id: 'ts-item-3',
        itemKind: 'audio',
        audioType: '片尾谢幕',
        title: '晚安道别'
      }
    ]
  }
];
