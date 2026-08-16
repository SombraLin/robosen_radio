import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Radio,
  Play,
  Pause,
  RefreshCw,
  Send,
  CheckCircle,
  Clock,
  Volume2,
  Cpu,
  Layers,
  Code2
} from 'lucide-react';
import {
  getDeviceDollChannels,
  reportDevicePlaybackStatus,
  DeviceDollChannelsDto,
  DevicePlaylistItemDto,
  isRadioAiApiEnabled
} from '../../api/newsCenter';

const DOLL_OPTIONS = [
  { id: 'MINI-LOTSO', name: '草莓熊 Lotso', desc: '治愈生活与新闻频道主播' },
  { id: 'MINI-ROBOT-A1', name: '蜡笔小新 A1 新高气傲', desc: '搞笑新闻与吐槽专栏' },
  { id: 'MINI-ROBOT-A2', name: '蜡笔小新 A2 新生无奈', desc: '英雄解说与无厘头天气' },
  { id: 'MINI-ROBOT-A3', name: '蜡笔小新 A3 新驰神往', desc: '肥嘟嘟左卫门剧场' },
  { id: 'MINI-ROBOT-A4', name: '蜡笔小新 A4 新花路放', desc: '双叶日常电子宠物' },
  { id: 'XWZ-O-WLGZ', name: '樱桃小丸子 丸皮公主', desc: '全天生活感悟陪伴' },
  { id: 'XWZ-O-WPJL', name: '樱桃小丸子 丸皮精灵', desc: '校园故事与英语陪学' },
  { id: 'XWZ-O-WQGJ', name: '樱桃小丸子 丸趣歌姬', desc: '奇境幻想音乐特刊' },
  { id: 'XWZ-O-WQBH', name: '樱桃小丸子 丸全不会', desc: '深夜治愈音效陪伴' },
  { id: 'MINI-WOODY', name: '胡迪 Woody', desc: '西部牛仔义气主播' },
  { id: 'HD-O-WJZDY5', name: '胡迪 Woody (自定义)', desc: '牛仔专栏主播' },
  { id: 'MINI-ALIEN', name: '三眼仔 Alien', desc: '太空爪子教与奇闻剧场' },
  { id: 'MINI-WALLE', name: '瓦力 Walle', desc: '废品美学与环保连线' },
  { id: 'MINI-REX', name: '抱抱龙 Rex', desc: '游戏通关攻略百科' },
  { id: 'MINI-JESSIE', name: '翠西 Jessie', desc: '狂野西部狂欢主播' },
  { id: 'MINI-BUZZ', name: '巴斯光年 Buzz', desc: '星际巡逻与科学队长' },
  { id: 'BSGN-O-WJZDY5', name: '巴斯光年 Buzz (自定义)', desc: '星际战士专栏' },
  { id: 'MINI-EVE', name: '伊娃 Eve', desc: '高精尖科技探针主播' },
  { id: 'ZMS-O-XHR3', name: '小黄人M3导演 James', desc: '小黄人导演特刊' },
  { id: 'HL-O-XHR3', name: '小黄人M3摄影师 Henry', desc: '小黄人摄影师特刊' },
  { id: 'ROBOSEN-BASIC-LIGHT', name: '通用机器人', desc: '默认通用智能体' },
  { id: 'LUCKY-CHEST', name: '幸运宝箱', desc: '乐森自研IP' }
];

export const DeviceSimulatorView: React.FC = () => {
  const [selectedDollId, setSelectedDollId] = useState<string>('MINI-LOTSO');
  const [deviceSn, setDeviceSn] = useState<string>('DEV-RADIO-9001');
  const [channelsData, setChannelsData] = useState<DeviceDollChannelsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [progressSeconds, setProgressSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<{ status: string; sync_timestamp: string } | null>(null);
  const [reporting, setReporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = async (dollId: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isRadioAiApiEnabled()) {
        const res = await getDeviceDollChannels(dollId);
        setChannelsData(res);
        if (res.channels.length > 0 && res.channels[0].playlist.length > 0) {
          setActiveItemId(res.channels[0].playlist[0].id);
        }
      } else {
        // Mock fallback when API is disabled
        const mockRes: DeviceDollChannelsDto = {
          doll_id: dollId,
          channels: [
            {
              channel_id: `CH-${dollId.toUpperCase()}-NEWS`,
              channel_name: `${dollId} 专属治愈频道`,
              category: '新闻频道',
              playlist: [
                {
                  id: 'jingle-intro',
                  type: 'intro',
                  title: `${dollId} 频道开场语`,
                  speakerRole: dollId,
                  durationSeconds: 5,
                  contentSnippet: `大家好，我是 ${dollId}，欢迎收听我的专属频道！`
                },
                {
                  id: 'news-demo-1',
                  type: 'news_script',
                  title: '最新智能玩偶科技发布会',
                  speakerRole: dollId,
                  durationSeconds: 25,
                  contentSnippet: '这里是 RADIO AI 新闻快讯。最新智能玩偶具备随时打断对话能力...'
                },
                {
                  id: 'jingle-outro',
                  type: 'outro',
                  title: `${dollId} 频道谢幕语`,
                  speakerRole: dollId,
                  durationSeconds: 5,
                  contentSnippet: '感谢收听，我们下期再见！'
                }
              ]
            }
          ]
        };
        setChannelsData(mockRes);
        setActiveItemId('jingle-intro');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '拉取设备频道单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels(selectedDollId);
  }, [selectedDollId]);

  const handleReportStatus = async () => {
    if (!channelsData || !activeItemId) return;
    const currentChannel = channelsData.channels[0];
    setReporting(true);
    setReportResult(null);
    try {
      if (isRadioAiApiEnabled()) {
        const res = await reportDevicePlaybackStatus({
          device_sn: deviceSn,
          doll_id: selectedDollId,
          channel_id: currentChannel.channel_id,
          current_item_id: activeItemId,
          progress_seconds: progressSeconds,
          status: isPlaying ? 'playing' : 'paused'
        });
        setReportResult(res);
      } else {
        setReportResult({
          status: 'acknowledged (Mock)',
          sync_timestamp: new Date().toISOString()
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '状态上报失败');
    } finally {
      setReporting(false);
    }
  };

  const currentChannel = channelsData?.channels[0];
  const activeItem = currentChannel?.playlist.find((item) => item.id === activeItemId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-slate-900/60 p-6 rounded-2xl border border-blue-500/20 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white tracking-wide">硬件玩偶设备模拟器</h1>
            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
              PRD 契约验真
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            模拟物理玩偶底座通过 REST/HTTP 契约拉取频道播放单与上报实时播放状态。
          </p>
        </div>
        <button
          onClick={() => fetchChannels(selectedDollId)}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>重新同步底座</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/40 text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Device & Doll Selector */}
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>1. 玩偶底座设备设置</span>
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">选择绑定玩偶</label>
              <div className="space-y-2">
                {DOLL_OPTIONS.map((doll) => (
                  <button
                    key={doll.id}
                    onClick={() => setSelectedDollId(doll.id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selectedDollId === doll.id
                        ? 'bg-purple-900/30 border-purple-500/60 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-sm">{doll.name} ({doll.id})</div>
                    <div className="text-xs text-slate-500">{doll.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">设备序列号 (device_sn)</label>
              <input
                type="text"
                value={deviceSn}
                onChange={(e) => setDeviceSn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Status Reporter Box */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>2. 模拟底座状态上报</span>
            </h2>
            <p className="text-xs text-slate-400">
              上报当前底层节点的播放进度（POST /api/v1/device/playback/status）。
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">播放进度 (秒)</label>
                <input
                  type="number"
                  min={0}
                  max={activeItem?.durationSeconds || 60}
                  value={progressSeconds}
                  onChange={(e) => setProgressSeconds(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-1.5 transition ${
                    isPlaying
                      ? 'bg-amber-900/30 border-amber-500/50 text-amber-300'
                      : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? '状态: 播放中 (Playing)' : '状态: 暂停 (Paused)'}</span>
                </button>
              </div>

              <button
                onClick={handleReportStatus}
                disabled={reporting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                <Send className={`w-4 h-4 ${reporting ? 'animate-pulse' : ''}`} />
                <span>立即发送上报请求</span>
              </button>

              {reportResult && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>上报回应成功 ({reportResult.status})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    服务端确认时间: {reportResult.sync_timestamp}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Playlist Nodes & Payload Inspection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Playlist Panel */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>3. 玩偶频道播放单 (Playlist Nodes)</span>
              </h2>
              {currentChannel && (
                <span className="px-2.5 py-0.5 text-xs bg-blue-900/40 text-blue-300 rounded-full border border-blue-500/30 font-medium">
                  {currentChannel.channel_name}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                正在从服务端拉取播放单契约...
              </div>
            ) : currentChannel && currentChannel.playlist.length > 0 ? (
              <div className="space-y-3">
                {currentChannel.playlist.map((item: DevicePlaylistItemDto, idx: number) => {
                  const isActive = item.id === activeItemId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveItemId(item.id);
                        setProgressSeconds(0);
                      }}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-blue-950/60 border-blue-500/60 shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {item.type === 'intro' || item.type === 'outro' ? (
                            <Radio className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                            <span className="text-sm font-semibold text-white">{item.title}</span>
                            <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded font-medium">
                              {item.type}
                            </span>
                          </div>
                          {item.contentSnippet && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.contentSnippet}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400 shrink-0">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.durationSeconds}s</span>
                        </span>
                        {isActive && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[11px] font-medium">
                            当前激活节点
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">暂无频道数据</div>
            )}
          </div>

          {/* Contract JSON Inspection Drawer */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>4. 设备端契约 JSON 报文预览</span>
            </h2>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto max-h-64">
              <pre>
                {JSON.stringify(
                  {
                    request_doll_channels_endpoint: `/api/v1/device/dolls/${selectedDollId}/channels`,
                    device_playback_status_payload: {
                      device_sn: deviceSn,
                      doll_id: selectedDollId,
                      channel_id: currentChannel?.channel_id || 'N/A',
                      current_item_id: activeItemId || 'N/A',
                      progress_seconds: progressSeconds,
                      status: isPlaying ? 'playing' : 'paused'
                    },
                    server_response: channelsData
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
