import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

export type LabelElement = {
  id: string;
  type: "text" | "barcode" | "image" | "line" | "rect";
  x: number;
  y: number;
  content: string;
  w?: number;
  h?: number;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  bcFormat?: string;
  fontFamily?: string;
  rotation?: number;
  fieldBinding?: string;
};

export type LabelData = {
  activeTab: string;
  daniel: {
    item: string;
    caixa: string;
    pedido: string;
    pd: string;
    peca: string;
  };
  dupla: {
    nomeEsq: string;
    caixaEsq: string;
    barcodeEsq: string;
    nomeDir: string;
    caixaDir: string;
    barcodeDir: string;
  };
  completa: {
    produto: string;
    caixa: string;
    fornecedor: string;
    barcode: string;
  };
  custom: Record<string, LabelElement[]>;
};

export default function LabelPreview({
  data,
  width,
  height,
  dpi,
  onUpdateElement,
  selectedId,
  onSelectElement,
  onRemoveElement,
  onInteractionEnd,
  drawingMode,
  onAreaCreated,
}: {
  data: LabelData;
  width: number;
  height: number;
  dpi: number;
  onUpdateElement?: (id: string, updates: Partial<LabelElement>) => void;
  selectedId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onRemoveElement?: (id: string) => void;
  onInteractionEnd?: () => void;
  drawingMode?: "text" | null;
  onAreaCreated?: (bounds: { x: number; y: number; w: number; h: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingId = useRef<string | null>(null);
  const resizingId = useRef<string | null>(null);
  const rotatingId = useRef<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ mmX: 0, mmY: 0, w: 0, h: 0, fontSize: 0 });
  const rotateStart = useRef({ cx: 0, cy: 0 });
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoverHandle, setHoverHandle] = useState<"rotate" | "delete" | "resize" | "move" | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    itemId: string | null;
  }>({ x: 0, y: 0, visible: false, itemId: null });
  const [imagesCache, setImagesCache] = useState<
    Record<string, HTMLImageElement>
  >({});

  const px = (mm: number) => (mm * dpi) / 25.4;

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxPx: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (ctx.measureText(test).width > maxPx && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      setContextMenu((p) => (p.visible ? { ...p, visible: false } : p));

      const target = e.target as HTMLElement;
      // Se clicar fora do canvas E não for em elementos de interface (inputs, botões, menus), desmarca
      if (
        canvasRef.current &&
        !canvasRef.current.contains(target) &&
        !target.closest("button") &&
        !target.closest("input") &&
        !target.closest("select") &&
        !target.closest(".glass-card") &&
        !target.closest("aside")
      ) {
        onSelectElement?.(null);
      }
    };
    window.addEventListener("mousedown", handleGlobalClick);
    return () => window.removeEventListener("mousedown", handleGlobalClick);
  }, [onSelectElement]);

  // Pre-load images to avoid async drawing glitches
  useEffect(() => {
    const elements = data.custom[data.activeTab] || [];
    elements.forEach((el) => {
      if (el.type === "image" && el.content && !imagesCache[el.content]) {
        const img = new Image();
        img.src = el.content;
        img.onload = () => {
          setImagesCache((prev) => ({ ...prev, [el.content]: img }));
        };
      }
    });
  }, [data, imagesCache]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      px(0.5),
      px(0.5),
      canvas.width - px(1),
      canvas.height - px(1),
    );

    // Draw elements
    const activeTab = data.activeTab;
    const elements = (data.custom && data.custom[activeTab]) || [];

    elements.forEach((el) => {
      if (el.id === editingId) return;
      ctx.save();
      const textFont = `${el.bold ? "bold " : ""}${el.italic ? "italic " : ""}${px(el.fontSize || 4)}px ${el.fontFamily || "Inter"}, sans-serif`;
      const w =
        el.type === "text"
          ? (el.w ?? el.content.length * (el.fontSize || 4) * 0.55)
          : el.w || 20;
      const lineH = el.type === "text" ? (el.fontSize || 4) * 1.3 : 0;
      const h = el.type === "text" ? (el.h ?? el.fontSize ?? 4) : el.h || 10;

      // Calculate rotation center
      let cx = el.x;
      let cy = el.y;

      if (el.type === "text") {
        // Anchor is at (x, y)
        // We translate to the anchor point for easy rotation
      } else {
        // Anchor is top-left for other elements
        cx = el.x + w / 2;
        cy = el.y + h / 2;
      }

      ctx.translate(px(cx), px(cy));
      ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
      ctx.fillStyle = "black";
      ctx.strokeStyle = "black";
      ctx.lineWidth = el.strokeWidth || 1;

      if (el.type === "text") {
        ctx.font = textFont;
        ctx.textAlign = (el.align || "center") as CanvasTextAlign;
        ctx.textBaseline = "middle";
        const wrapW = el.w ?? width;
        const lines = wrapText(ctx, el.content, px(wrapW));
        const totalH = lines.length * px(lineH);
        lines.forEach((line, i) => {
          ctx.fillText(line, 0, -totalH / 2 + px(lineH) * i + px(lineH) / 2);
        });
      } else if (el.type === "barcode") {
        const tc = document.createElement("canvas");
        try {
          JsBarcode(tc, el.content, {
            format: el.bcFormat || "CODE128",
            width: 2,
            height: 100,
            displayValue: false,
          });
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tc, px(-w / 2), px(-h / 2), px(w), px(h - 5));
          ctx.imageSmoothingEnabled = true;
          ctx.font = `${px(2.8)}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(el.content, 0, px(h / 2 - 3));
        } catch (e) {}
      } else if (el.type === "image") {
        const cachedImg = imagesCache[el.content];
        if (cachedImg) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cachedImg, px(-w / 2), px(-h / 2), px(w), px(h));
          ctx.imageSmoothingEnabled = true;
        }
      } else if (el.type === "line") {
        ctx.beginPath();
        ctx.moveTo(px(-w / 2), 0);
        ctx.lineTo(px(w / 2), 0);
        ctx.stroke();
      } else if (el.type === "rect") {
        if (el.fill) {
          ctx.fillRect(px(-w / 2), px(-h / 2), px(w), px(h));
        } else {
          ctx.strokeRect(px(-w / 2), px(-h / 2), px(w), px(h));
        }
      }

      if (el.id === selectedId) {
        ctx.strokeStyle = "#0096DA";
        ctx.lineWidth = 1;
        const rectW = el.type === "text" ? w : w;
        const rectH = el.type === "text" ? h : h;
        let rx = -rectW / 2;
        let ry = -rectH / 2;

        if (el.type === "text") {
          if (el.align === "left") rx = 0;
          else if (el.align === "right") rx = -rectW;
        }

        ctx.strokeRect(px(rx) - 2, px(ry) - 2, px(rectW) + 4, px(rectH) + 4);

        // Resize Handle
        ctx.fillStyle = "white";
        ctx.fillRect(px(rx + rectW) - 6, px(ry + rectH) - 6, 12, 12);
        ctx.strokeRect(px(rx + rectW) - 6, px(ry + rectH) - 6, 12, 12);

        // Remove Handle
        ctx.fillStyle = "#EF4444";
        ctx.beginPath();
        ctx.arc(px(rx + rectW) + 4, px(ry) - 4, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px(rx + rectW) - 1, px(ry) - 9);
        ctx.lineTo(px(rx + rectW) + 9, px(ry) + 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px(rx + rectW) + 9, px(ry) - 9);
        ctx.lineTo(px(rx + rectW) - 1, px(ry) + 1);
        ctx.stroke();

        // Rotate Handle
        ctx.strokeStyle = "#0096DA";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px(rx + rectW / 2), px(ry) - 2);
        ctx.lineTo(px(rx + rectW / 2), px(ry) - 20);
        ctx.stroke();
        ctx.fillStyle = "#0096DA";
        ctx.beginPath();
        ctx.arc(px(rx + rectW / 2), px(ry) - 20, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#0096DA";
    if (guides.x !== undefined) {
      ctx.beginPath();
      ctx.moveTo(px(guides.x), 0);
      ctx.lineTo(px(guides.x), canvas.height);
      ctx.stroke();
    }
    if (guides.y !== undefined) {
      ctx.beginPath();
      ctx.moveTo(0, px(guides.y));
      ctx.lineTo(canvas.width, px(guides.y));
      ctx.stroke();
    }
    // Draw text area preview while dragging
    if (drawingRect) {
      const rx = Math.min(drawingRect.x1, drawingRect.x2);
      const ry = Math.min(drawingRect.y1, drawingRect.y2);
      const rw = Math.abs(drawingRect.x2 - drawingRect.x1);
      const rh = Math.abs(drawingRect.y2 - drawingRect.y1);
      ctx.fillStyle = "rgba(0,150,218,0.06)";
      ctx.fillRect(px(rx), px(ry), px(rw), px(rh));
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#0096DA";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px(rx), px(ry), px(rw), px(rh));
      ctx.setLineDash([]);
    }
  }, [data, width, height, dpi, guides, editingId, selectedId, imagesCache, drawingRect]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mmX =
      ((e.clientX - rect.left) * (canvas.width / rect.width) * 25.4) / dpi;
    const mmY =
      ((e.clientY - rect.top) * (canvas.height / rect.height) * 25.4) / dpi;
    if (drawingMode) {
      drawStart.current = { x: mmX, y: mmY };
      setDrawingRect({ x1: mmX, y1: mmY, x2: mmX, y2: mmY });
      return;
    }
    if (selectedId) {
      const elements = data.custom[data.activeTab] || [];
      const el = elements.find((item) => item.id === selectedId);
      if (el) {
        const w = el.type === "text" ? (el.w ?? el.content.length * (el.fontSize || 4) * 0.55) : el.w || 20;
        const h = el.type === "text" ? (el.h ?? el.fontSize ?? 4) : el.h || 10;
        const cx = el.type === "text" ? el.x : el.x + w / 2;
        const cy = el.type === "text" ? el.y : el.y + h / 2;
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const dx = mmX - cx;
        const dy = mmY - cy;
        const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad);
        const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad);
        const h_mm = (20 * 25.4) / dpi;
        if (
          Math.abs(localX - 0) < 5 &&
          Math.abs(localY - (-h / 2 - h_mm)) < 5
        ) {
          rotatingId.current = el.id;
          rotateStart.current = { cx, cy };
          return;
        }
        const delLX = w / 2 + (4 * 25.4) / dpi;
        const delLY = -h / 2 - (4 * 25.4) / dpi;
        if (Math.abs(localX - delLX) < 5 && Math.abs(localY - delLY) < 5) {
          onRemoveElement?.(el.id);
          return;
        }
        if (Math.abs(localX - w / 2) < 5 && Math.abs(localY - h / 2) < 5) {
          resizingId.current = el.id;
          resizeStart.current = {
            mmX,
            mmY,
            w,
            h,
            fontSize: el.fontSize || 4,
          };
          return;
        }
      }
    }
    const elements = (data.custom && data.custom[data.activeTab]) || [];
    let hit = false;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const w = el.type === "text" ? (el.w ?? el.content.length * (el.fontSize || 4) * 0.55) : el.w || 20;
      const h = el.type === "text" ? (el.h ?? el.fontSize ?? 4) : el.h || 10;
      const isInsideX = el.type === "text"
        ? mmX >= el.x - w / 2 && mmX <= el.x + w / 2
        : mmX >= el.x && mmX <= el.x + w;
      const isInsideY = el.type === "text"
        ? mmY >= el.y - h / 2 && mmY <= el.y + h / 2
        : mmY >= el.y && mmY <= el.y + h;
      if (isInsideX && isInsideY) {
        draggingId.current = el.id;
        dragStart.current = { x: mmX, y: mmY, elX: el.x, elY: el.y };
        onSelectElement?.(el.id);
        hit = true;
        break;
      }
    }
    if (!hit) onSelectElement?.(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mmX =
      ((e.clientX - rect.left) * (canvas.width / rect.width) * 25.4) / dpi;
    const mmY =
      ((e.clientY - rect.top) * (canvas.height / rect.height) * 25.4) / dpi;
    if (drawStart.current) {
      setDrawingRect({ x1: drawStart.current.x, y1: drawStart.current.y, x2: mmX, y2: mmY });
      return;
    }
    if (rotatingId.current && onUpdateElement) {
      const dx = mmX - rotateStart.current.cx;
      const dy = mmY - rotateStart.current.cy;
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      onUpdateElement(rotatingId.current, { rotation: Math.round(deg) });
      return;
    }
    if (resizingId.current && onUpdateElement) {
      const dx = mmX - resizeStart.current.mmX;
      const dy = mmY - resizeStart.current.mmY;
      const elements = data.custom[data.activeTab] || [];
      const el = elements.find((item) => item.id === resizingId.current);
      if (el) {
        let newW = resizeStart.current.w + dx;
        let newH = resizeStart.current.h + dy;
        if (e.shiftKey) {
          const ratio = resizeStart.current.w / resizeStart.current.h;
          newW = newH * ratio;
        }
        onUpdateElement(el.id, {
          w: Math.max(5, newW),
          h: Math.max(2, newH),
        });
      }
      return;
    }
    // Hover handle detection (only when idle)
    if (!draggingId.current && !resizingId.current && !rotatingId.current && selectedId) {
      const elements = data.custom[data.activeTab] || [];
      const el = elements.find((item) => item.id === selectedId);
      let next: typeof hoverHandle = null;
      if (el) {
        const w = el.type === "text" ? (el.w ?? el.content.length * (el.fontSize || 4) * 0.55) : el.w || 20;
        const h = el.type === "text" ? (el.h ?? el.fontSize ?? 4) : el.h || 10;
        const ecx = el.type === "text" ? el.x : el.x + w / 2;
        const ecy = el.type === "text" ? el.y : el.y + h / 2;
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const ldx = mmX - ecx;
        const ldy = mmY - ecy;
        const lx = ldx * Math.cos(-rad) - ldy * Math.sin(-rad);
        const ly = ldx * Math.sin(-rad) + ldy * Math.cos(-rad);
        let rx = -w / 2;
        if (el.type === "text" && el.align === "left") rx = 0;
        else if (el.type === "text" && el.align === "right") rx = -w;
        const ry = -h / 2;
        const pxMm = 25.4 / dpi;
        const rotLX = rx + w / 2;
        const rotLY = ry - 20 * pxMm;
        const delLX = rx + w + 4 * pxMm;
        const delLY = ry - 4 * pxMm;
        const resLX = rx + w;
        const resLY = ry + h;
        const r = 12 * pxMm;
        if (Math.hypot(lx - rotLX, ly - rotLY) < r) next = "rotate";
        else if (Math.hypot(lx - delLX, ly - delLY) < r) next = "delete";
        else if (Math.hypot(lx - resLX, ly - resLY) < r) next = "resize";
        else if (lx >= rx && lx <= rx + w && ly >= ry && ly <= ry + h) next = "move";
      }
      if (next !== hoverHandle) setHoverHandle(next);
    } else if (!selectedId && hoverHandle !== null) {
      setHoverHandle(null);
    }

    if (!draggingId.current || !onUpdateElement) return;
    const dx = mmX - dragStart.current.x;
    const dy = mmY - dragStart.current.y;
    let fx = dragStart.current.elX + dx;
    let fy = dragStart.current.elY + dy;
    const snap = 2;
    const cx = width / 2;
    const cy = height / 2;
    const el = data.custom[data.activeTab]?.find(
      (item) => item.id === draggingId.current,
    );
    const g: { x?: number; y?: number } = {};
    if (el) {
      const w = el.type === "text" ? (el.w ?? el.content.length * (el.fontSize || 4) * 0.55) : el.w || 20;
      const h = el.type === "text" ? (el.h ?? el.fontSize ?? 4) : el.h || 10;
      const ecx = el.type === "text" ? fx : fx + w / 2;
      const ecy = el.type === "text" ? fy : fy + h / 2;
      if (Math.abs(ecx - cx) < snap) {
        fx = el.type === "text" ? cx : cx - w / 2;
        g.x = cx;
      }
      if (Math.abs(ecy - cy) < snap) {
        fy = el.type === "text" ? cy : cy - h / 2;
        g.y = cy;
      }
    }
    setGuides(g);
    onUpdateElement(draggingId.current, {
      x: Math.round(fx),
      y: Math.round(fy),
    });
  };

  const handleMouseUp = () => {
    if (drawStart.current && drawingRect) {
      const x1 = Math.min(drawingRect.x1, drawingRect.x2);
      const y1 = Math.min(drawingRect.y1, drawingRect.y2);
      const w = Math.abs(drawingRect.x2 - drawingRect.x1);
      const h = Math.abs(drawingRect.y2 - drawingRect.y1);
      if (w > 3 && h > 3) {
        onAreaCreated?.({ x: x1 + w / 2, y: y1 + h / 2, w, h });
      }
      drawStart.current = null;
      setDrawingRect(null);
      return;
    }
    if (draggingId.current || resizingId.current || rotatingId.current)
      onInteractionEnd?.();
    draggingId.current = null;
    resizingId.current = null;
    rotatingId.current = null;
    setGuides({});
    setHoverHandle(null);
  };

  return (
    <div className="relative group/canvas">
      <canvas
        ref={canvasRef}
        width={px(width)}
        height={px(height)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const mmX =
            ((e.clientX - rect.left) * (canvas.width / rect.width) * 25.4) /
            dpi;
          const mmY =
            ((e.clientY - rect.top) * (canvas.height / rect.height) * 25.4) /
            dpi;
          const el = data.custom[data.activeTab]?.find((it) => {
            if (it.type !== "text") return false;
            const w = it.w ?? it.content.length * (it.fontSize || 4) * 0.55;
            const h = it.h ?? (it.fontSize || 4);
            return (
              mmX >= it.x - w / 2 &&
              mmX <= it.x + w / 2 &&
              mmY >= it.y - h / 2 &&
              mmY <= it.y + h / 2
            );
          });
          if (el) {
            setEditingId(el.id);
            setEditValue(el.content);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const mmX =
            ((e.clientX - rect.left) * (canvas.width / rect.width) * 25.4) /
            dpi;
          const mmY =
            ((e.clientY - rect.top) * (canvas.height / rect.height) * 25.4) /
            dpi;
          const el = [...(data.custom[data.activeTab] || [])]
            .reverse()
            .find((it) => {
              const w = it.type === "text" ? (it.w ?? it.content.length * (it.fontSize || 4) * 0.55) : it.w || 20;
              const h = it.type === "text" ? (it.h ?? it.fontSize ?? 4) : it.h || 10;
              return it.type === "text"
                ? mmX >= it.x - w / 2 &&
                    mmX <= it.x + w / 2 &&
                    mmY >= it.y - h / 2 &&
                    mmY <= it.y + h / 2
                : mmX >= it.x &&
                    mmX <= it.x + w &&
                    mmY >= it.y &&
                    mmY <= it.y + h;
            });
          if (el)
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              visible: true,
              itemId: el.id,
            });
        }}
        style={{
          cursor: drawingMode
            ? "crosshair"
            : rotatingId.current
              ? "grabbing"
              : resizingId.current
                ? "nwse-resize"
                : draggingId.current
                  ? "grabbing"
                  : hoverHandle === "rotate"
                    ? "grab"
                    : hoverHandle === "delete"
                      ? "pointer"
                      : hoverHandle === "resize"
                        ? "nwse-resize"
                        : hoverHandle === "move"
                          ? "move"
                          : "default",
        }}
        className="max-w-full h-auto rounded border border-slate-300 bg-white shadow-2xl"
      />
      {editingId && (() => {
        const el = data.custom[data.activeTab]?.find((e) => e.id === editingId);
        if (!el) return null;
        const elW = el.w ?? el.content.length * (el.fontSize || 4) * 0.55;
        const elH = el.h ?? (el.fontSize || 4);
        const scale = (canvasRef.current?.getBoundingClientRect().width || 1) / (canvasRef.current?.width || 1);
        return (
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              if (editingId) onUpdateElement?.(editingId, { content: editValue });
              setEditingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onUpdateElement?.(editingId, { content: editValue });
                setEditingId(null);
              }
            }}
            className="absolute bg-white border-2 border-accent rounded p-0 m-0 outline-none text-black resize-none overflow-hidden"
            style={{
              left: `${((el.x - elW / 2) / width) * 100}%`,
              top: `${((el.y - elH / 2) / height) * 100}%`,
              width: `${(elW / width) * 100}%`,
              height: `${(elH / height) * 100}%`,
              fontSize: `${px(el.fontSize || 4) * scale}px`,
              lineHeight: 1.2,
              fontFamily: `${el.fontFamily || "Inter"}, sans-serif`,
              fontWeight: el.bold ? "bold" : "normal",
              fontStyle: el.italic ? "italic" : "normal",
              textAlign: el.align || "center",
              paddingTop: `${Math.max(0, (elH * scale * (dpi / 25.4) - (el.fontSize || 4) * scale * (dpi / 25.4) * 1.2) / 2)}px`,
              boxSizing: "border-box"
            }}
          />
        );
      })()}
      {contextMenu.visible && (
        <div
          className="fixed z-[100] bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-xl py-2 shadow-2xl min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              contextMenu.itemId && onRemoveElement?.(contextMenu.itemId);
              setContextMenu((p) => ({ ...p, visible: false }));
            }}
            className="w-full text-left px-4 py-2 text-white hover:bg-red-500/80 text-xs font-medium"
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
