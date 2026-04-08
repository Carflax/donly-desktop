import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Printer,
  Settings,
  LayoutDashboard,
  FileText,
  ChevronDown,
  CheckCircle2,
  Minus,
  Square,
  X,
  PenTool,
  Type,
  Barcode,
  Image as ImageIcon,
  Upload,
  Wine,
  MoveUp,
  Umbrella,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LabelPreview, { LabelData, LabelElement } from "./components/LabelPreview";
import { canvasToMonoBitmap, generateTSPL } from "./tspl";

import daniloImg from "./danilo.png";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "editor", label: "Editor", icon: PenTool },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];



type Template = {
  id: string;
  label: string;
  size: string;
  w: number;
  h: number;
  elements: LabelElement[];
};

export default function App() {
  const [templatesList, setTemplatesList] = useState<Template[]>([
    { id: "daniel", label: "Daniel", size: "90×48mm", w: 90, h: 48, elements: [] },
    { id: "dupla", label: "Dupla", size: "100×30mm", w: 100, h: 30, elements: [] },
    { id: "fragil", label: "Frágil", size: "90×48mm", w: 90, h: 48, elements: [] },
    { id: "completa", label: "Completa", size: "90×48mm", w: 90, h: 48, elements: [] },
  ]);

  const [editorData, setEditorData] = useState<{name: string, w: number, h: number, elements: LabelElement[]}>({ 
    name: "", w: 90, h: 48, elements: [] 
  });
  
  const [activeNav, setActiveNav] = useState("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState("daniel");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printStatus, setPrintStatus] = useState("");
  const [copies, setCopies] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [data, setData] = useState<LabelData>({
    activeTab: "daniel",
    daniel: { item: "ITEM 10", caixa: "00246", pedido: "80025956", pd: "4501064590", peca: "20" },
    dupla: {
       nomeEsq: "TESTE 1", caixaEsq: "00001", barcodeEsq: "123456789",
       nomeDir: "TESTE 2", caixaDir: "00002", barcodeDir: "123456789"
    },
    completa: { produto: "TUBO EG BR PVC 100MM (10472) AMANCO", caixa: "00329", fornecedor: "AMANCO", barcode: "7891960280044" },
    custom: {}
  });

  useEffect(() => {
    invoke<string[]>("get_printers").then(setPrinters).catch(() => {});
  }, []);

  useEffect(() => {
    setData(prev => ({ ...prev, activeTab: selectedTemplate }));
  }, [selectedTemplate]);

  const [history, setHistory] = useState<LabelElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const pushToHistory = (elements: LabelElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      return [...newHistory, JSON.parse(JSON.stringify(elements))];
    });
    setHistoryStep(prev => prev + 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      setEditorData(p => ({ ...p, elements: JSON.parse(JSON.stringify(history[newStep])) }));
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      setEditorData(p => ({ ...p, elements: JSON.parse(JSON.stringify(history[newStep])) }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "");
        if (!isInput && selectedId) {
          removeEditorElement(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, history, historyStep]);

  // Initial history push
  useEffect(() => {
    if (historyStep === -1) {
      pushToHistory([]);
    }
  }, []);

  const addEditorElement = (type: LabelElement["type"]) => {
    const newId = Date.now().toString();
    const defaults: Partial<LabelElement> = {
      id: newId, type, x: 20, y: 20,
      content: type === "text" ? "Novo Texto" : (type === "barcode" ? "123456" : (type === "image" ? daniloImg : "")),
      fontSize: type === "text" ? 5 : undefined,
      bold: type === "text" ? false : undefined,
      bcFormat: type === "barcode" ? "CODE128" : undefined,
      w: (type === "barcode" || type === "image" || type === "line" || type === "rect") ? 20 : undefined,
      h: (type === "barcode" || type === "image" || type === "line" || type === "rect") ? 20 : undefined,
      strokeWidth: (type === "line" || type === "rect") ? 1 : undefined,
    };
    const newElements = [...editorData.elements, defaults as LabelElement];
    setEditorData(p => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedId(newId);
  };

  const updateEditorElement = (id: string, updates: Partial<LabelElement>) => {
    setEditorData(p => ({
      ...p,
      elements: p.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    }));
  };

  const removeEditorElement = (id: string) => {
    const newElements = editorData.elements.filter(el => el.id !== id);
    setEditorData(p => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedId(null);
  };

  const currentTemplate = templatesList.find(t => t.id === selectedTemplate) || templatesList[0];

  const handleAddTemplate = () => {
    if (!editorData.name) return;
    const newId = editorData.name.toLowerCase().replace(/\s+/g, '-');
    const newTemplate = {
      id: newId,
      label: editorData.name,
      size: `${editorData.w}×${editorData.h}mm`,
      w: editorData.w,
      h: editorData.h,
      elements: editorData.elements
    };
    setTemplatesList(p => [...p, newTemplate]);
    setData(prev => ({ ...prev, custom: { ...prev.custom, [newId]: editorData.elements } }));
    // Reset editor data but keep defaults for name/size
    setEditorData({ name: "Nova Etiqueta", w: 90, h: 48, elements: [] });
    setActiveNav("dashboard");
    setSelectedTemplate(newId);
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
       const base64 = e.target?.result as string;
       updateEditorElement(id, { content: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus("Processando...");

    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const bitmap = canvasToMonoBitmap(ctx, canvas.width, canvas.height);
    const tspl = generateTSPL(bitmap, canvas.width, canvas.height, currentTemplate.w, currentTemplate.h, copies);

    try {
      await invoke<string>("print_raw", { printerName: selectedPrinter || "ELGIN L42 PRO", data: Array.from(tspl) });
      setPrintStatus("Pronto!");
      setTimeout(() => setPrintStatus(""), 3000);
    } catch (e) {
      setPrintStatus(`Falha: ${e}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 glass-main select-none">
      
      {/* Premium Titlebar */}
      <header className="draggable h-12 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3 no-drag">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
            <Printer size={16} className="text-accent" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white/90">Donly <span className="text-accent">Desktop</span></span>
        </div>

        <div className="flex items-center h-full no-drag">
          <button onClick={() => getCurrentWindow().minimize()} className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-white/50 hover:text-white transition-all">
            <Minus size={16} />
          </button>
          <button onClick={() => getCurrentWindow().toggleMaximize()} className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-white/50 hover:text-white transition-all">
            <Square size={12} />
          </button>
          <button onClick={() => getCurrentWindow().close()} className="w-12 h-full flex items-center justify-center hover:bg-red-500 text-white/50 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Nav */}
        <aside className="w-64 glass-sidebar flex flex-col p-4 shrink-0">
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeNav === item.id
                    ? "bg-white/15 text-white border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.05)]"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {activeNav === item.id && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-accent/5 blur-xl rounded-full"
                  />
                )}
                <item.icon size={18} className="text-accent" />
                <span className="relative z-10">{item.label}</span>
                {activeNav === item.id && (
                  <motion.div 
                    layoutId="nav-line"
                    className="absolute left-1 w-1 h-4 bg-accent rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="pt-4 mt-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 overflow-hidden shrink-0">
                <img src={daniloImg} alt="Danilo Oliveira" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Danilo Oliveira</p>
                <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Desenvolvedor</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex overflow-hidden">
          {activeNav === "editor" ? (
            <div className="flex-1 flex gap-8 p-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
               {/* Designer Sidebar */}
               <div className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight text-accent">Visual Designer</h1>
                    <p className="text-white/40 text-[10px] mt-1 font-bold uppercase tracking-widest">Configure o layout da sua etiqueta</p>
                  </div>

                  <div className="space-y-6">
                     <div className="glass-card rounded-2xl p-6 space-y-4 border-white/5">
                        <Field label="NOME DO TEMPLATE" value={editorData.name} onChange={(v) => setEditorData(p => ({...p, name: v}))} />
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">LARGURA (MM)</label>
                             <input type="number" value={editorData.w} onChange={(e) => setEditorData(p => ({...p, w: Number(e.target.value)}))} className="input-field w-full rounded-xl px-4 py-2.5 text-sm font-bold bg-white/5 border-white/10 outline-none" />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">ALTURA (MM)</label>
                             <input type="number" value={editorData.h} onChange={(e) => setEditorData(p => ({...p, h: Number(e.target.value)}))} className="input-field w-full rounded-xl px-4 py-2.5 text-sm font-bold bg-white/5 border-white/10 outline-none" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-xs font-bold text-white/40 ml-1 tracking-widest uppercase">Ferramentas</label>
                        </div>
                         <div className="grid grid-cols-5 gap-2">
                           {[
                             { id: "text", icon: Type },
                             { id: "barcode", icon: Barcode },
                             { id: "image", icon: ImageIcon },
                             { id: "line", icon: Minus },
                             { id: "rect", icon: Square },
                           ].map(tool => (
                             <button 
                               key={tool.id} 
                               onClick={() => addEditorElement(tool.id as any)}
                               className="aspect-square rounded-xl bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-accent/20 hover:border-accent/40 transition-all group shadow-sm"
                             >
                                <tool.icon size={18} className="text-white group-hover:text-accent transition-colors" />
                                <span className="text-[8px] font-bold text-white/60 uppercase group-hover:text-white transition-colors">{tool.id === "text" ? "Texto" : (tool.id === "barcode" ? "BC" : (tool.id === "image" ? "Img" : tool.id))}</span>
                             </button>
                           ))}
                        </div>
                     </div>

                     <AnimatePresence>
                        {selectedId && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="glass-card rounded-2xl p-5 space-y-4 border-accent/20 bg-accent/5 backdrop-blur-xl"
                          >
                             <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
                                <div className="flex items-center gap-2">
                                   <div className="p-2 rounded-xl bg-accent/20 border border-accent/20">
                                      {editorData.elements.find(e => e.id === selectedId)?.type === "text" ? <Type size={18} className="text-accent" /> : <Barcode size={18} className="text-accent" />}
                                   </div>
                                   <span className="text-xs font-bold text-white uppercase tracking-widest truncate max-w-[120px]">
                                      {editorData.elements.find(e => e.id === selectedId)?.type === "text" ? "Propriedades Texto" : "Propriedades Item"}
                                   </span>
                                </div>
                                <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                   <X size={14} className="text-white/40" />
                                </button>
                             </div>

                             {(() => {
                               const el = editorData.elements.find(e => e.id === selectedId)!;
                               return (
                                 <div className="space-y-4">
                                    {el.type === "image" && (
                                       <div className="space-y-3">
                                          <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Símbolos de Estoque</label>
                                          <div className="grid grid-cols-4 gap-2">
                                             {[
                                               { name: "Fragile", icon: <Wine size={16} />, data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTggMmgyYThhIDQgNCAwIDAgNCA0di43NWE0IDQgMCAwIDEtNCA0SDhhNCA0IDAgMCAxLTQtNHYuNzVBNCA0IDAgMCAwIDggMnoiLz48cGF0aCBkPSJNMTIgMTJ2MTBNOCAyMmgyIi8+PC9zdmc+" },
                                               { name: "Up", icon: <MoveUp size={16} />, data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTcgOSA1LTUgNSA1TTExIDEyaDJNMTEgMTVoMk0xMSA4aDJNMTEgMThoMiIvPjwvc3ZnPg==" },
                                               { name: "Keep Dry", icon: <Umbrella size={16} />, data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIydjE1bTUuNS03YTIgMiAwIDEgMS00IDB2LTEuNSIvPjxwYXRoIGQ9Ik0yMCAxM2MtLjUgMC0xLS41LTEuNS0xYTMgMyAwIDAgMC02IDAgMyAzIDAgMCAwLTYgMGMtLjUgMC0xIC41LTEuNSAxYTEwIDEwIDAgMCAxIDIwIDB6Ii8+PC9zdmc+" },
                                               { name: "Package", icon: <Package size={16} />, data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDEyaC00bC0zIDloLTlsLTMtOUgybTcgNGg2Ii8+PHBhdGggZD0iTTIxIDdsLTkgMTAtOS0xMFY1YTIgMiAwIDAgMSAyLTJoMTRhMiAyIDAgMCAxIDIgMnoiLz48L3N2Zz4=" }
                                             ].map(icon => (
                                               <button
                                                 key={icon.name}
                                                 onClick={() => {
                                                   updateEditorElement(el.id, { content: icon.data, w: 20, h: 20 });
                                                   pushToHistory(editorData.elements);
                                                 }}
                                                 className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-white/5 hover:border-accent/40 hover:bg-black/60 transition-all text-white/40 hover:text-accent group"
                                                 title={icon.name}
                                               >
                                                  {icon.icon}
                                               </button>
                                             ))}
                                          </div>
                                       </div>
                                    )}

                                    {(el.type === "text" || el.type === "barcode" || el.type === "image") && (
                                       <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Conteúdo / Dados</label>
                                          <div className="flex gap-2">
                                             <input 
                                               value={el.content.startsWith("data:") ? "Símbolo/Imagem..." : el.content} 
                                               onChange={(e) => updateEditorElement(el.id, { content: e.target.value })} 
                                               className="flex-1 bg-black/40 border border-white/10 text-xs font-bold text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 focus:bg-black/60 transition-all shadow-inner"
                                               placeholder="..."
                                             />
                                             {el.type === "image" && (
                                                <button 
                                                  onClick={() => document.getElementById("img-upload")?.click()}
                                                  className="p-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all group"
                                                  title="Carregar Imagem Local"
                                                >
                                                   <Upload size={16} className="group-hover:scale-110 transition-transform" />
                                                   <input 
                                                      id="img-upload" type="file" accept="image/*" className="hidden" 
                                                      onChange={(e) => e.target.files?.[0] && handleImageUpload(el.id, e.target.files[0])} 
                                                   />
                                                </button>
                                             )}
                                          </div>
                                       </div>
                                    )}

                                    {el.type === "barcode" && (
                                       <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Formato</label>
                                          <select 
                                            value={el.bcFormat} 
                                            onChange={(e) => updateEditorElement(el.id, { bcFormat: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 text-xs font-bold text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 transition-all cursor-pointer"
                                          >
                                             <option value="CODE128">CODE128 (Normal)</option>
                                             <option value="EAN13">EAN-13 (EAN)</option>
                                             <option value="EAN8">EAN-8</option>
                                             <option value="UPC">UPC</option>
                                          </select>
                                       </div>
                                    )}


                                    {el.type === "text" && (
                                       <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Fonte</label>
                                          <select 
                                             value={el.fontFamily || "Inter"} 
                                             onChange={(e) => updateEditorElement(el.id, { fontFamily: e.target.value })}
                                             className="w-full bg-black/40 border border-white/10 text-xs font-bold text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 transition-all cursor-pointer font-sans"
                                          >
                                             <option value="Inter">Inter (Padrão)</option>
                                             <option value="Arial">Arial</option>
                                             <option value="Times New Roman">Times New Roman</option>
                                             <option value="Courier New">Courier New</option>
                                             <option value="Georgia">Georgia</option>
                                             <option value="Verdana">Verdana</option>
                                             <option value="Trebuchet MS">Trebuchet MS</option>
                                             <option value="Impact">Impact</option>
                                          </select>
                                       </div>
                                    )}

                                    {el.type === "text" ? (
                                       <div className="grid grid-cols-2 gap-3 items-end">
                                          <div className="space-y-1.5">
                                             <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Tamanho Fonte</label>
                                             <input type="number" value={el.fontSize} onChange={e => updateEditorElement(el.id, { fontSize: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent/30 transition-all font-bold" />
                                          </div>
                                          <button 
                                            onClick={() => updateEditorElement(el.id, { bold: !el.bold })}
                                            className={`h-9 rounded-xl border transition-all text-[11px] font-bold ${el.bold ? "bg-accent text-black border-accent" : "bg-black/40 text-white/40 border-white/10 hover:border-white/20"}`}
                                          >
                                             {el.bold ? "NEGRITO ATIVO" : "NEGRITO OFF"}
                                          </button>
                                       </div>
                                    ) : (
                                       <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-3">
                                             <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Largura</label>
                                                <input type="number" value={el.w} onChange={e => updateEditorElement(el.id, { w: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent/30 transition-all font-bold" />
                                             </div>
                                             <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Altura</label>
                                                <input type="number" value={el.h} onChange={e => updateEditorElement(el.id, { h: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent/30 transition-all font-bold" />
                                             </div>
                                          </div>
                                          {(el.type === "line" || el.type === "rect") && (
                                             <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">Espessura (px)</label>
                                                <input type="number" value={el.strokeWidth || 1} onChange={e => updateEditorElement(el.id, { strokeWidth: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent/30 transition-all font-bold" />
                                             </div>
                                          )}
                                       </div>
                                    )}

                                 </div>
                               );
                             })()}
                          </motion.div>
                        )}
                     </AnimatePresence>
                  </div>

                  <div className="mt-auto pt-6 flex gap-3 border-t border-white/5">
                    <button onClick={() => setActiveNav("dashboard")} className="px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-xs font-bold text-white/40 hover:text-white">Cancelar</button>
                    <button onClick={handleAddTemplate} className="flex-1 bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 font-bold rounded-xl py-2.5 transition-all active:scale-95 text-xs">Salvar Modelo</button>
                  </div>
               </div>

               {/* Live Canvas Preview */}
               <div className="flex-1 flex flex-col items-center justify-center glass-card rounded-3xl border-white/5 relative bg-white/[0.02] border border-white/5">
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                     <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Visualização ao Vivo</span>
                  </div>
                  
                  <div className="p-12 drop-shadow-2xl">
                    <LabelPreview
                      data={{ ...data, activeTab: "editor_preview", custom: { editor_preview: editorData.elements } }}
                      width={editorData.w}
                      height={editorData.h}
                      dpi={203}
                      onUpdateElement={updateEditorElement}
                      selectedId={selectedId}
                      onSelectElement={setSelectedId}
                      onRemoveElement={removeEditorElement}
                      onInteractionEnd={() => pushToHistory(editorData.elements)}
                    />
                  </div>

                  <div className="absolute bottom-6 text-[10px] text-white/20 font-medium italic">
                    Dica: Ajuste as coordenadas X/Y para posicionar os campos exatamente onde deseja.
                  </div>
               </div>
            </div>
          ) : (
            <>
              {/* Label Configuration */}
              <section className="flex-1 flex flex-col p-8 overflow-hidden">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Etiqueta de Envio</h1>
                  <p className="text-white/40 text-sm mt-1 font-medium">Configure as informações de impressão</p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  <div className="glass-card rounded-2xl p-6 space-y-5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedTemplate}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {selectedTemplate === "daniel" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><Field label="Item / Título" value={data.daniel.item} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, item: v } }))} /></div>
                            <Field label="Nº Caixa" value={data.daniel.caixa} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, caixa: v } }))} />
                            <Field label="Nº Pedido" value={data.daniel.pedido} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, pedido: v } }))} />
                            <Field label="PD Original" value={data.daniel.pd} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, pd: v } }))} />
                            <Field label="PC" value={data.daniel.peca} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, peca: v } }))} />
                          </div>
                        )}

                        {selectedTemplate === "dupla" && (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <label className="text-[10px] uppercase tracking-widest font-bold text-accent">Lado Esquerdo</label>
                              <Field label="Nome Item" value={data.dupla.nomeEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, nomeEsq: v}}))} />
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Nº Caixa" value={data.dupla.caixaEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, caixaEsq: v}}))} />
                                <Field label="Código" value={data.dupla.barcodeEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, barcodeEsq: v}}))} />
                              </div>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="space-y-4">
                              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Lado Direito</label>
                              <Field label="Nome Item" value={data.dupla.nomeDir} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, nomeDir: v}}))} />
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Nº Caixa" value={data.dupla.caixaDir} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, caixaDir: v}}))} />
                                <Field label="Código" value={data.dupla.barcodeDir} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, barcodeDir: v}}))} />
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedTemplate === "completa" && (
                          <div className="space-y-4">
                            <Field label="Nome Completo do Produto" value={data.completa.produto} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, produto: v } }))} />
                            <div className="grid grid-cols-2 gap-4">
                              <Field label="Nº Caixa" value={data.completa.caixa} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, caixa: v } }))} />
                              <Field label="Fornecedor" value={data.completa.fornecedor} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, fornecedor: v } }))} />
                            </div>
                            <Field label="Cód. de Barras" value={data.completa.barcode} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, barcode: v } }))} />
                          </div>
                        )}
                        
                        {!["daniel", "dupla", "completa"].includes(selectedTemplate) && (
                          <div className="p-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center mb-4">
                               <FileText className="text-accent/30" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Novo Template Layout</h3>
                            <p className="text-white/30 text-sm max-w-[240px]">As configurações deste novo modelo aparecerão aqui conforme o layout for definido.</p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/40 ml-1 tracking-widest">MODELO DE ETIQUETA</label>
                    <div className="relative">
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full appearance-none input-field rounded-xl px-5 py-3 text-sm font-bold cursor-pointer"
                      >
                        {templatesList.map(t => (
                          <option key={t.id} value={t.id} className="bg-black">{t.label} ({t.size})</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-all">Salvar Rascunho</button>
                  <button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-accent/10 transition-all active:scale-[0.98] border border-white/10"
                  >
                    <Printer size={18} />
                    {isPrinting ? "Imprimindo..." : "Imprimir Etiqueta"}
                    {printStatus === "Pronto!" && <CheckCircle2 size={18} className="text-white/80" />}
                  </button>
                </div>
              </section>

              {/* Preview Sidebar */}
              <section className="w-[420px] p-8 flex flex-col">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Preview Final</h2>
                    <p className="text-xs text-white/40 mt-0.5 uppercase tracking-widest font-bold">{currentTemplate.size} @ 203 DPI</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent">LIVE</div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 rounded-2xl border border-white/5">
                  <LabelPreview
                    data={data}
                    width={currentTemplate.w}
                    height={currentTemplate.h}
                    dpi={203}
                  />
                </div>

                <div className="mt-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Impressora</span>
                      </div>
                      <select
                        value={selectedPrinter}
                        onChange={e => setSelectedPrinter(e.target.value)}
                        className="text-xs font-bold text-slate-300 bg-transparent outline-none cursor-pointer hover:text-accent transition-colors"
                      >
                        {printers.length > 0 ? printers.map(p => <option key={p} className="bg-slate-900">{p}</option>) : <option>Elgin L42 Pro (RAW)</option>}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Quantidade</span>
                      <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg border border-white/5">
                        <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 rounded-md hover:bg-white/10 text-accent hover:text-accent-hover flex items-center justify-center transition-colors font-bold">−</button>
                        <span className="text-sm font-bold text-white w-4 text-center">{copies}</span>
                        <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 rounded-md hover:bg-white/10 text-accent hover:text-accent-hover flex items-center justify-center transition-colors font-bold">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full rounded-xl px-4 py-2.5 text-sm font-bold placeholder:text-white/20 bg-white/5 border border-white/10"
        placeholder={`Digite ${label.toLowerCase()}...`}
      />
    </div>
  );
}
