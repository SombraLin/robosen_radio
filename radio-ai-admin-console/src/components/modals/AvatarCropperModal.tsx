import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, RefreshCw, Check, X, Crop, Move, Square, Circle, Maximize2 } from 'lucide-react';

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropComplete: (croppedBase64Url: string) => void;
}

type AspectRatioMode = 'free' | '1:1' | '4:3' | '16:9';
type CropShapeMode = 'square' | 'circle';
type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Image Transformation States
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [imgOffset, setImgOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  // Freeform Crop Box States (in 360x360 canvas coordinates)
  const CANVAS_SIZE = 360;
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 40,
    y: 40,
    w: 280,
    h: 280,
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('free');
  const [shapeMode, setShapeMode] = useState<CropShapeMode>('square');

  // Dragging States
  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startCropRect, setStartCropRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 40,
    y: 40,
    w: 280,
    h: 280,
  });

  // Load image when imageSrc changes
  useEffect(() => {
    if (imageSrc && isOpen) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImgObj(img);
        setScale(1);
        setRotation(0);
        setImgOffset({ x: 0, y: 0 });
        setCropRect({ x: 40, y: 40, w: 280, h: 280 });
      };
      img.src = imageSrc;
    }
  }, [imageSrc, isOpen]);

  // Redraw canvas background & image
  useEffect(() => {
    if (!canvasRef.current || !imgObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Clear background
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    // Move to center
    ctx.translate(CANVAS_SIZE / 2 + imgOffset.x, CANVAS_SIZE / 2 + imgOffset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const drawW = imgObj.width;
    const drawH = imgObj.height;
    const fitScale = Math.min(CANVAS_SIZE / drawW, CANVAS_SIZE / drawH);

    ctx.drawImage(imgObj, (-drawW * fitScale) / 2, (-drawH * fitScale) / 2, drawW * fitScale, drawH * fitScale);
    ctx.restore();
  }, [imgObj, scale, rotation, imgOffset]);

  if (!isOpen || !imageSrc) return null;

  // Handle Dragging Crop Box or Control Handles
  const handleMouseDown = (e: React.MouseEvent, handle: DragHandle) => {
    e.stopPropagation();
    setActiveHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setStartCropRect({ ...cropRect });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activeHandle) return;

    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;

    if (activeHandle === 'move') {
      let newX = startCropRect.x + dx;
      let newY = startCropRect.y + dy;

      // Constrain within canvas bounds
      newX = Math.max(0, Math.min(CANVAS_SIZE - startCropRect.w, newX));
      newY = Math.max(0, Math.min(CANVAS_SIZE - startCropRect.h, newY));

      setCropRect({ ...startCropRect, x: newX, y: newY });
      return;
    }

    // Handle 8-directional resizing
    let { x, y, w, h } = startCropRect;
    const MIN_SIZE = 30;

    if (activeHandle.includes('e')) {
      w = Math.max(MIN_SIZE, Math.min(CANVAS_SIZE - x, startCropRect.w + dx));
    }
    if (activeHandle.includes('s')) {
      h = Math.max(MIN_SIZE, Math.min(CANVAS_SIZE - y, startCropRect.h + dy));
    }
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

    // Apply aspect ratio lock if active
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
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((prev) => Math.min(10, Math.max(0.1, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setImgOffset({ x: 0, y: 0 });
    setCropRect({ x: 40, y: 40, w: 280, h: 280 });
  };

  const handleApplyCrop = () => {
    if (!canvasRef.current) return;

    const srcCanvas = canvasRef.current;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = cropRect.w;
    outputCanvas.height = cropRect.h;
    const outCtx = outputCanvas.getContext('2d');

    if (!outCtx) return;

    if (shapeMode === 'circle') {
      outCtx.beginPath();
      outCtx.arc(cropRect.w / 2, cropRect.h / 2, Math.min(cropRect.w, cropRect.h) / 2, 0, Math.PI * 2);
      outCtx.clip();
    }

    // Draw portion of canvas defined by cropRect
    outCtx.drawImage(srcCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);

    const dataUrl = outputCanvas.toDataURL('image/png');
    onCropComplete(dataUrl);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--accent)]/50 rounded-lg w-full max-w-lg p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 border-b border-[var(--border-color)] pb-3">
          <div className="p-2 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300">
            <Crop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] font-serif-editorial">
              玩偶头像自由抠图裁剪 (Freeform Avatar Cropper)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">拖拽 8 点控制框自由调整抠图范围，最高支持 1000% 极细缩放</p>
          </div>
        </div>

        {/* Toolbar: Aspect Ratio & Mask Shape */}
        <div className="flex items-center justify-between text-xs font-data-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold">比例:</span>
            {(['free', '1:1', '4:3', '16:9'] as AspectRatioMode[]).map((mode) => (
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

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShapeMode('square')}
              className={`p-1.5 rounded cursor-pointer transition ${
                shapeMode === 'square' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
              title="矩形/方形遮罩"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShapeMode('circle')}
              className={`p-1.5 rounded cursor-pointer transition ${
                shapeMode === 'circle' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
              title="圆形抠图遮罩"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Canvas & Freeform Crop Overlay */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            ref={containerRef}
            className="relative w-[360px] h-[360px] bg-slate-950 border-2 border-dashed border-[var(--accent)]/60 rounded-xl overflow-hidden shadow-inner flex items-center justify-center"
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

            {/* Freeform Crop Box Selection Frame */}
            <div
              className={`absolute border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] ${
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
              {/* Grid Lines inside Selection Box */}
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

              {/* 8 Control Handles for Resizing */}
              <div
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-nwse-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
              />
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-ns-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'n')}
              />
              <div
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-nesw-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-ew-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'e')}
              />
              <div
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-nwse-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
              />
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-ns-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 's')}
              />
              <div
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-nesw-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-purple-300 border border-purple-800 rounded-full cursor-ew-resize shadow"
                onMouseDown={(e) => handleMouseDown(e, 'w')}
              />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full space-y-3 font-data-mono text-xs">
            {/* Zoom Slider */}
            <div className="flex items-center space-x-3 px-2">
              <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="w-14 text-right text-purple-300 font-bold font-mono">{(scale * 100).toFixed(0)}%</span>
            </div>

            {/* Rotation & Reset Buttons */}
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center space-x-1.5 cursor-pointer transition text-xs"
              >
                <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                <span>旋转 90°</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center space-x-1.5 cursor-pointer transition text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>重置原位</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-serif-editorial cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleApplyCrop}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold font-serif-editorial flex items-center space-x-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>确认自由裁剪并应用</span>
          </button>
        </div>
      </div>
    </div>
  );
};
