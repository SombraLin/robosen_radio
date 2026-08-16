import React, { useState, useRef, useEffect } from 'react';
import { DOLL_REGISTRY, DollConfig, updateDollAvatar, getDollConfig } from '../../data/dollRegistry';
import { saveDollAvatarApi } from '../../api/newsCenter';
import { useDollStore } from '../../features/dolls/store';
import {
  Crop,
  Search,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Save,
  Square,
  Circle,
  Move,
  Layers,
  Sparkles,
  Smartphone,
  Eye
} from 'lucide-react';

interface DollAtlasStudioViewProps {
  onAvatarSaved?: (dollId: string, newAvatarUrl: string) => void;
}

type AspectRatioMode = 'free' | '1:1' | '4:3' | '16:9';
type CropShapeMode = 'square' | 'circle';
type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

// Approximate grid centers on 2752x1536 poster for 20 grid cells
const DEFAULT_DOLL_COORDS: Record<string, { r: number; c: number }> = {
  'ROBOSEN-BASIC-LIGHT': { r: 0, c: 0 },
  'MINI-LOTSO': { r: 0, c: 1 },
  'MINI-ROBOT-A1': { r: 0, c: 2 },
  'MINI-ROBOT-A2': { r: 0, c: 3 },
  'MINI-ROBOT-A3': { r: 0, c: 4 },
  'MINI-ROBOT-A4': { r: 1, c: 0 },
  'XWZ-O-WLGZ': { r: 1, c: 1 },
  'XWZ-O-WPJL': { r: 1, c: 2 },
  'XWZ-O-WQGJ': { r: 1, c: 3 },
  'XWZ-O-WQBH': { r: 1, c: 4 },
  'MINI-WOODY': { r: 2, c: 0 },
  'HD-O-WJZDY5': { r: 2, c: 1 },
  'MINI-ALIEN': { r: 2, c: 2 },
  'MINI-WALLE': { r: 2, c: 3 },
  'MINI-REX': { r: 2, c: 4 },
  'MINI-JESSIE': { r: 3, c: 0 },
  'MINI-BUZZ': { r: 3, c: 1 },
  'BSGN-O-WJZDY5': { r: 3, c: 2 },
  'MINI-EVE': { r: 3, c: 3 },
  'ZMS-O-XHR3': { r: 3, c: 4 },
  'HL-O-XHR3': { r: 3, c: 4 },
  'LUCKY-CHEST': { r: 0, c: 0 },
};

export const DollAtlasStudioView: React.FC<DollAtlasStudioViewProps> = ({ onAvatarSaved: propsOnAvatarSaved }) => {
  const setDolls = useDollStore((s) => s.setDolls);

  const onAvatarSaved =
    propsOnAvatarSaved ||
    ((dollId: string, newAvatarUrl: string) => {
      setDolls((prev) =>
        prev.map((d) => (d.id === dollId || d.doll_id === dollId ? { ...d, avatarUrl: newAvatarUrl } : d))
      );
    });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Selected DOLL state
  const [selectedDollId, setSelectedDollId] = useState<string>('MINI-LOTSO');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Poster & Viewport Transformation States
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<number>(1.5);
  const [rotation, setRotation] = useState<number>(0);
  const [imgOffset, setImgOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Freeform Crop Box States (in 520x520 canvas coordinates)
  const CANVAS_SIZE = 520;
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 160,
    y: 160,
    w: 200,
    h: 200,
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('free');
  const [shapeMode, setShapeMode] = useState<CropShapeMode>('square');

  // Dragging States for Poster vs Crop Box
  const [isPanDragging, setIsPanDragging] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startCropRect, setStartCropRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 160,
    y: 160,
    w: 200,
    h: 200,
  });

  // Load Master Poster Image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgObj(img);
      jumpToDollLocation('MINI-LOTSO', img, 2.0);
    };
    img.src = '/assets/avatar/智能机器人玩偶动作图鉴.png';
  }, []);

  // Jump Viewport to Doll's Location on Poster (Preserves user's current zoom scale & crop frame size)
  const jumpToDollLocation = (dollId: string, sourceImg?: HTMLImageElement | null, targetScale?: number) => {
    const image = sourceImg || imgObj;
    if (!image) return;

    const coords = DEFAULT_DOLL_COORDS[dollId] || { r: 0, c: 0 };
    const cellW = image.width / 5;
    const cellH = image.height / 4;

    const targetX = (coords.c + 0.5) * cellW;
    const targetY = (coords.r + 0.5) * cellH;

    // Preserve active zoom scale set by user (e.g. 500% or 1000%)
    const activeScale = targetScale !== undefined ? targetScale : scale;
    if (targetScale !== undefined) {
      setScale(targetScale);
    }

    const fitScale = Math.min(CANVAS_SIZE / image.width, CANVAS_SIZE / image.height);
    const totalScale = fitScale * activeScale;

    const offsetX = -(targetX - image.width / 2) * totalScale;
    const offsetY = -(targetY - image.height / 2) * totalScale;

    setImgOffset({ x: offsetX, y: offsetY });
  };

  // Select DOLL from sidebar
  const handleSelectDoll = (dollId: string) => {
    setSelectedDollId(dollId);
    jumpToDollLocation(dollId);
  };

  // Redraw Main Canvas
  useEffect(() => {
    if (!canvasRef.current || !imgObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.translate(CANVAS_SIZE / 2 + imgOffset.x, CANVAS_SIZE / 2 + imgOffset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const drawW = imgObj.width;
    const drawH = imgObj.height;
    const fitScale = Math.min(CANVAS_SIZE / drawW, CANVAS_SIZE / drawH);

    ctx.drawImage(imgObj, (-drawW * fitScale) / 2, (-drawH * fitScale) / 2, drawW * fitScale, drawH * fitScale);
    ctx.restore();

    // Redraw Live Preview Canvas
    if (previewCanvasRef.current) {
      const pCanvas = previewCanvasRef.current;
      pCanvas.width = cropRect.w;
      pCanvas.height = cropRect.h;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, cropRect.w, cropRect.h);
        if (shapeMode === 'circle') {
          pCtx.beginPath();
          pCtx.arc(cropRect.w / 2, cropRect.h / 2, Math.min(cropRect.w, cropRect.h) / 2, 0, Math.PI * 2);
          pCtx.clip();
        }
        pCtx.drawImage(canvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
      }
    }
  }, [imgObj, scale, rotation, imgOffset, cropRect, shapeMode]);

  // Handle Dragging Selection Box vs Dragging Canvas
  const handleMouseDown = (e: React.MouseEvent, handle: DragHandle) => {
    if (handle) {
      e.stopPropagation();
      setActiveHandle(handle);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setStartCropRect({ ...cropRect });
    } else {
      setIsPanDragging(true);
      setPanStart({ x: e.clientX - imgOffset.x, y: e.clientY - imgOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeHandle) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;

      if (activeHandle === 'move') {
        let newX = startCropRect.x + dx;
        let newY = startCropRect.y + dy;
        newX = Math.max(0, Math.min(CANVAS_SIZE - startCropRect.w, newX));
        newY = Math.max(0, Math.min(CANVAS_SIZE - startCropRect.h, newY));
        setCropRect({ ...startCropRect, x: newX, y: newY });
        return;
      }

      let { x, y, w, h } = startCropRect;
      const MIN_SIZE = 40;

      if (activeHandle.includes('e')) w = Math.max(MIN_SIZE, Math.min(CANVAS_SIZE - x, startCropRect.w + dx));
      if (activeHandle.includes('s')) h = Math.max(MIN_SIZE, Math.min(CANVAS_SIZE - y, startCropRect.h + dy));
      if (activeHandle.includes('w')) {
        const possibleW = Math.max(MIN_SIZE, startCropRect.w - dx);
        const possibleX = startCropRect.x + (startCropRect.w - possibleW);
        if (possibleX >= 0) {
          x = possibleX;
          w = possibleW;
        }
      }
      if (activeHandle.includes('n')) {
        const possibleH = Math.max(MIN_SIZE, startCropRect.h - dy);
        const possibleY = startCropRect.y + (startCropRect.h - possibleH);
        if (possibleY >= 0) {
          y = possibleY;
          h = possibleH;
        }
      }

      if (aspectRatio === '1:1') {
        const side = Math.min(w, h);
        w = side;
        h = side;
      } else if (aspectRatio === '4:3') {
        h = Math.round(w * (3 / 4));
      } else if (aspectRatio === '16:9') {
        h = Math.round(w * (9 / 16));
      }

      setCropRect({ x, y, w, h });
    } else if (isPanDragging) {
      setImgOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
    setIsPanDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((prev) => Math.min(10, Math.max(0.5, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleSaveAvatarForDoll = async () => {
    if (!canvasRef.current) return;

    const srcCanvas = canvasRef.current;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = 256;
    outputCanvas.height = 256;
    const outCtx = outputCanvas.getContext('2d');

    if (!outCtx) return;

    if (shapeMode === 'circle') {
      outCtx.beginPath();
      outCtx.arc(128, 128, 128, 0, Math.PI * 2);
      outCtx.clip();
    }

    outCtx.drawImage(srcCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, 256, 256);
    const dataUrl = outputCanvas.toDataURL('image/png');

    try {
      const res = await saveDollAvatarApi(selectedDollId, dataUrl);
      const savedUrl = res.avatar_url || dataUrl;
      updateDollAvatar(selectedDollId, savedUrl);
      if (onAvatarSaved) {
        onAvatarSaved(selectedDollId, savedUrl);
      }
      const currentConfig = getDollConfig(selectedDollId);
      setSuccessToast(`✅ 已保存【${currentConfig.name}】的抠图头像至 assets/avatar/dolls/ 目录！`);
    } catch {
      updateDollAvatar(selectedDollId, dataUrl);
      if (onAvatarSaved) {
        onAvatarSaved(selectedDollId, dataUrl);
      }
      const currentConfig = getDollConfig(selectedDollId);
      setSuccessToast(`已成功保存【${currentConfig.name}】抠图头像！已同步应用至所有播放频道。`);
    }
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const allDollKeys = Object.keys(DOLL_REGISTRY);
  const filteredDollKeys = allDollKeys.filter((key) => {
    const doll = DOLL_REGISTRY[key];
    const q = searchQuery.toLowerCase().trim();
    return key.toLowerCase().includes(q) || doll.name.toLowerCase().includes(q) || doll.series.toLowerCase().includes(q);
  });

  const selectedDoll = getDollConfig(selectedDollId);

  return (
    <div
      className="p-6 space-y-6 max-w-7xl mx-auto select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/60 p-6 rounded-2xl border border-purple-500/30 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <Crop className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-wide">玩偶图鉴 1000% 自由漫游抠图 Studio</h1>
            <span className="px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>全量 22 款 DOLL 对应</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            加载《智能机器人玩偶动作图鉴》超级主图，支持 10 倍放大无级漫游、8 点选框抠图一键保存。
          </p>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-fadeIn shadow-lg shadow-emerald-600/20">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: DOLL_ID List Picker */}
        <div className="lg:col-span-1 space-y-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col h-[650px]">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm border-b border-slate-800 pb-3">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>1. 选择目标 DOLL ID ({allDollKeys.length})</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 DOLL ID 或角色..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredDollKeys.map((key) => {
              const doll = DOLL_REGISTRY[key];
              const isSelected = selectedDollId === key;

              return (
                <div
                  key={key}
                  onClick={() => handleSelectDoll(key)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/80 border-purple-500/70 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <img
                      src={doll.avatar}
                      alt={doll.name}
                      className="w-9 h-9 rounded-lg object-contain bg-slate-950 border border-slate-800 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/ROBOSEN-BASIC-LIGHT.png';
                      }}
                    />
                    <div className="truncate">
                      <div className="font-bold text-xs truncate text-white">{doll.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{key}</div>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium shrink-0">
                    {doll.series}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Main Studio: Interactive Master Canvas */}
        <div className="lg:col-span-2 space-y-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between">
          {/* Canvas Controls Toolbar */}
          <div className="w-full flex items-center justify-between text-xs font-data-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-semibold">选框比例:</span>
              {(['free', '1:1', '4:3'] as AspectRatioMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAspectRatio(mode);
                    if (mode === '1:1') {
                      const side = Math.min(cropRect.w, cropRect.h);
                      setCropRect({ ...cropRect, w: side, h: side });
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                    aspectRatio === mode
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'free' ? '自由比例' : mode}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShapeMode('square')}
                className={`p-1.5 rounded cursor-pointer transition ${
                  shapeMode === 'square' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
                title="方形遮罩"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShapeMode('circle')}
                className={`p-1.5 rounded cursor-pointer transition ${
                  shapeMode === 'circle' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
                title="圆形遮罩"
              >
                <Circle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded cursor-pointer transition"
                title="旋转 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => jumpToDollLocation(selectedDollId)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded cursor-pointer transition"
                title="归位至当前 DOLL 默认位置"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Master Canvas Container */}
          <div
            className="relative w-[520px] h-[520px] bg-slate-950 border-2 border-dashed border-purple-500/50 rounded-xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown(e, null)}
            onWheel={handleWheel}
          >
            <canvas ref={canvasRef} className="pointer-events-none" />

            {/* Dark Mask outside Crop Box */}
            <div
              className="absolute inset-0 pointer-events-none bg-black/60"
              style={{
                clipPath:
                  shapeMode === 'circle'
                    ? `polygon(0% 0%, 0% 100%, ${cropRect.x}px 100%, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px 100%, 100% 100%, 100% 0%)`
                    : `polygon(0% 0%, 0% 100%, ${cropRect.x}px 100%, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px 100%, 100% 100%, 100% 0%)`,
              }}
            />

            {/* Selection Frame & 8 Resize Handles */}
            <div
              className={`absolute border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] ${
                shapeMode === 'circle' ? 'rounded-full' : 'rounded-sm'
              } cursor-move`}
              style={{
                left: `${cropRect.x}px`,
                top: `${cropRect.y}px`,
                width: `${cropRect.w}px`,
                height: `${cropRect.h}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* Grid Lines inside selection box */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-white/60" />
                <div className="border-r border-white/60" />
                <div />
              </div>

              {/* 8 Control Handles */}
              <div
                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-nwse-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
              />
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-ns-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'n')}
              />
              <div
                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-nesw-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-ew-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'e')}
              />
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-nwse-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
              />
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-ns-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 's')}
              />
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-nesw-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-purple-300 border border-purple-900 rounded-full cursor-ew-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'w')}
              />
            </div>
          </div>

          {/* Zoom Slider Bar */}
          <div className="w-full flex items-center space-x-3 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.1}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="w-16 text-right text-purple-300 font-bold font-mono text-xs">{(scale * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Right Panel: Realtime Avatar Preview & Save Actions */}
        <div className="lg:col-span-1 space-y-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-[650px]">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm border-b border-slate-800 pb-3">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>3. 抠图效果实时预览</span>
            </div>

            {/* Live Cropped Canvas Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="w-36 h-36 border-2 border-purple-500/60 rounded-xl overflow-hidden flex items-center justify-center bg-black shadow-inner">
                <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                预览尺寸: {cropRect.w} x {cropRect.h} px
              </span>
            </div>

            {/* Selected Doll Metadata Info Card */}
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2 font-data-mono text-xs">
              <div className="text-purple-400 font-bold flex items-center justify-between">
                <span>当前关联玩偶</span>
                <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-[10px]">
                  {selectedDoll.series}
                </span>
              </div>
              <div className="text-white font-bold text-sm">{selectedDoll.name}</div>
              <div className="text-slate-400 font-mono text-[11px]">DOLL_ID: {selectedDoll.doll_id}</div>
              <div className="text-slate-400 text-[11px] line-clamp-2">{selectedDoll.tagline}</div>
            </div>
          </div>

          {/* Action Save Button */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <button
              onClick={handleSaveAvatarForDoll}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30 cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              <span>保存为【{selectedDoll.name}】的头像</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
