/**
 * radio-ai-shared-spec 使用示例
 * 演示如何在 TypeScript 项目中导入和使用共享类型契约
 */

import { Doll, Channel, PlaylistItem } from '../types';

// 构建一个符合协议规范的玩偶（Strawberry Bear 草莓熊）实例
const demoDoll: Doll = {
  id: 'MINI-LOTSO',
  doll_id: 'MINI-LOTSO',
  name: '草莓熊 Lotso',
  stationCode: 'STATION_LOTSO_01',
  tagline: '治愈系甜品电台',
  roleTitle: '专栏主播',
  status: 'online',
  avatarUrl: '/avatars/MINI-LOTSO.png',
  prompt: '你是一只全身散发草莓香味的温柔粉色毛绒熊，说话充满爱心。',
  channels: [
    {
      id: 'CH-LOTSO-NEWS',
      channel_id: 'CH-LOTSO-NEWS',
      doll_id: 'MINI-LOTSO',
      name: '草莓熊治愈新闻专栏',
      channel_name: '草莓熊治愈新闻专栏',
      code: 'CH-NEWS-01',
      isLive: true,
      category: '新闻频道',
      categories: ['新闻频道', '治愈'],
      prompt: '用软萌温柔的语气做新闻点评',
      introScript: '大家好，我是草莓熊！今天也要甜甜地过哦。',
      outroScript: '感谢收听，送你一颗草莓甜饼干，我们下期见！',
      playlist: [
        {
          id: 'item-01',
          type: 'intro',
          title: '频道开场白',
          speakerRole: '草莓熊',
          durationSeconds: 5,
          durationFormatted: '0:05',
          contentSnippet: '大家好，我是草莓熊！',
        },
      ],
    },
  ],
};

console.log('✅ 成功构造 Doll 契约对象:');
console.log(`玩偶名称: ${demoDoll.name}`);
console.log(`所属频道数: ${demoDoll.channels.length}`);
console.log(`默认开场白: ${demoDoll.channels[0].introScript}`);
