import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Printer,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Minus,
  X,
  PenTool,
  Type,
  Barcode,
  Image as ImageIcon,
  Upload,
  Wine,
  MoveUp,
  Umbrella,
  Package,
  Columns,
  Square as SquareIcon,
  Pencil,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LabelPreview, {
  LabelData,
  LabelElement,
} from "./components/LabelPreview";
import { canvasToMonoBitmap, generateTSPL } from "./tspl";
import daniloImg from "./danilo.png";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "editor", label: "Editor", icon: PenTool },
  { id: "settings", label: "Settings", icon: Settings },
];

type Template = {
  id: string;
  label: string;
  size: string;
  w: number;
  h: number;
  columns: 1 | 2;
  elements: LabelElement[];
};

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "daniel",
    label: "Daniel",
    size: "100x50mm",
    w: 100,
    h: 50,
    columns: 1,
    elements: [
      {
        id: "d1",
        type: "text",
        x: 50,
        y: 12,
        content: "ITEM 10",
        fontSize: 8,
        bold: true,
        align: "center",
        fieldBinding: "ITE_DESITE",
      },
      { id: "d2", type: "line", x: 50, y: 14, content: "", w: 90, h: 1 },
      {
        id: "d3",
        type: "text",
        x: 10,
        y: 20,
        content: "Nº Caixa: 00246",
        fontSize: 4,
        align: "left",
      },
      {
        id: "d4",
        type: "text",
        x: 10,
        y: 26,
        content: "Nº Pedido: 80025956",
        fontSize: 4,
        align: "left",
      },
      {
        id: "d5",
        type: "text",
        x: 50,
        y: 34,
        content: "PD: 4501064590   PC: 20",
        fontSize: 4.5,
        bold: true,
        align: "center",
      },
    ],
  },
  {
    id: "dupla",
    label: "Dupla",
    size: "103x30mm",
    w: 103,
    h: 30,
    columns: 2,
    elements: [
      {
        id: "l1",
        type: "text",
        x: 25,
        y: 8,
        content: "TESTE 1",
        fontSize: 4.5,
        bold: true,
        align: "center",
      },
      {
        id: "l2",
        type: "barcode",
        x: 25,
        y: 18,
        content: "123456789",
        w: 30,
        h: 8,
      },
      {
        id: "r1",
        type: "text",
        x: 78,
        y: 8,
        content: "TESTE 2",
        fontSize: 4.5,
        bold: true,
        align: "center",
      },
      {
        id: "r2",
        type: "barcode",
        x: 78,
        y: 18,
        content: "123456789",
        w: 30,
        h: 8,
      },
    ],
  },
  {
    id: "fragil",
    label: "Frágil",
    size: "100x50mm",
    w: 100,
    h: 50,
    columns: 1,
    elements: [
      {
        id: "f1",
        type: "text",
        x: 50,
        y: 25,
        content: "FRÁGIL",
        fontSize: 12,
        bold: true,
        align: "center",
      },
    ],
  },
  {
    id: "completa",
    label: "Completa",
    size: "100x50mm",
    w: 100,
    h: 50,
    columns: 1,
    elements: [],
  },
];

export default function App() {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("donly_config");
    return saved
      ? JSON.parse(saved)
      : {
          width1: 100,
          height1: 50,
          width2: 50,
          height2: 30,
          gap: 3,
          offsetX: 8,
          offsetY: 0,
          theme: "dark" as "dark" | "glass",
        };
  });

  const [templatesList, setTemplatesList] = useState<Template[]>(() => {
    const saved = localStorage.getItem("donly_templates");
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [editorData, setEditorData] = useState<{
    name: string;
    w: number;
    h: number;
    columns: 1 | 2;
    elements: LabelElement[];
  }>({
    name: "",
    w: config.width1,
    h: config.height1,
    columns: 1,
    elements: [],
  });

  const [activeNav, setActiveNav] = useState("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState("daniel");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState(
    () => localStorage.getItem("donly_printer") || "",
  );
  const [isPrinterOpen, setIsPrinterOpen] = useState(false);
  const [printStatus, setPrintStatus] = useState("");
  const [copies, setCopies] = useState(
    () => Number(localStorage.getItem("donly_copies")) || 1,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textDrawMode, setTextDrawMode] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [buscaCodigo, setBuscaCodigo] = useState("");
  const [produtoEncontrado, setProdutoEncontrado] = useState<any>(null);
  const [printQueue, setPrintQueue] = useState<any[]>([]);

  const [data, setData] = useState<LabelData>({
    activeTab: "daniel",
    daniel: {
      item: "ITEM 10",
      caixa: "00246",
      pedido: "80025956",
      pd: "4501064590",
      peca: "20",
    },
    dupla: {
      nomeEsq: "TESTE 1",
      caixaEsq: "00001",
      barcodeEsq: "123456789",
      nomeDir: "TESTE 2",
      caixaDir: "00002",
      barcodeDir: "123456789",
    },
    completa: {
      produto: "TUBO EG BR PVC 100MM (10472) AMANCO",
      caixa: "00329",
      fornecedor: "AMANCO",
      barcode: "7891960280044",
    },
    custom: {},
  });

  useEffect(() => {
    const customData: Record<string, LabelElement[]> = {};
    templatesList.forEach((t) => {
      customData[t.id] = t.elements;
    });
    setData((prev) => ({ ...prev, custom: customData }));
  }, [templatesList]);

  useEffect(() => {
    invoke<string[]>("get_printers")
      .then(setPrinters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("https://marketing-banco-de-dados.velbav.easypanel.host/api/produtos")
      .then((r) => r.json())
      .then((result) => {
        const lista = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : [];
        setProdutos(lista);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const termo = buscaCodigo.trim();
    if (!termo || produtos.length === 0) {
      setProdutoEncontrado(null);
      return;
    }
    const codigoFormatado = termo.padStart(5, "0");
    const found = produtos.find(
      (p: any) => p.ITE_CODITE === codigoFormatado || p.ITE_CODITE === termo,
    );
    setProdutoEncontrado(found || null);
    if (found) aplicarProdutoNaEtiqueta(found);
  }, [buscaCodigo, produtos, selectedTemplate]);

  useEffect(() => {
    setData((prev) => ({ ...prev, activeTab: selectedTemplate }));
    const t = templatesList.find((it) => it.id === selectedTemplate);
    if (t)
      setEditorData({
        name: t.label,
        w: t.w,
        h: t.h,
        columns: t.columns,
        elements: t.elements,
      });
  }, [selectedTemplate]);

  const [history, setHistory] = useState<LabelElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    localStorage.setItem("donly_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("donly_templates", JSON.stringify(templatesList));
  }, [templatesList]);

  useEffect(() => {
    localStorage.setItem("donly_printer", selectedPrinter);
  }, [selectedPrinter]);

  useEffect(() => {
    localStorage.setItem("donly_copies", copies.toString());
  }, [copies]);

  const pushToHistory = (elements: LabelElement[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyStep + 1);
      return [...newHistory, JSON.parse(JSON.stringify(elements))];
    });
    setHistoryStep((prev) => prev + 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const prev = history[historyStep - 1];
      setEditorData((p) => ({ ...p, elements: prev }));
      setHistoryStep(historyStep - 1);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const next = history[historyStep + 1];
      setEditorData((p) => ({ ...p, elements: next }));
      setHistoryStep(historyStep + 1);
    }
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTextDrawMode(false);
        return;
      }
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) removeEditorElement(selectedId);
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [historyStep, history, selectedId]);

  const addEditorElement = (type: LabelElement["type"]) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEl: LabelElement = {
      id,
      type,
      x: 10,
      y: 10,
      content:
        type === "text" ? "Novo Texto" : type === "barcode" ? "12345678" : "",
      w: type === "text" ? 50 : type === "barcode" ? 40 : 20,
      h: type === "barcode" ? 15 : 10,
      fontSize: type === "text" ? 4 : 12,
      rotation: 0,
    };
    const newElements = [...editorData.elements, newEl];
    setEditorData((p) => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedId(id);
  };

  const updateEditorElement = (id: string, updates: Partial<LabelElement>) => {
    setEditorData((p) => ({
      ...p,
      elements: p.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el,
      ),
    }));
  };

  const removeEditorElement = (id: string) => {
    const newElements = editorData.elements.filter((el) => el.id !== id);
    setEditorData((p) => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedId(null);
  };

  const handleAddTemplate = () => {
    setTemplatesList((p) => {
      const exists = p.some((t) => t.id === selectedTemplate);
      const templateData: Template = {
        id: selectedTemplate,
        label: editorData.name || "Sem Nome",
        size: `${editorData.w}x${editorData.h}mm`,
        w: editorData.w,
        h: editorData.h,
        columns: editorData.columns,
        elements: editorData.elements,
      };

      if (exists) {
        return p.map((t) => (t.id === selectedTemplate ? templateData : t));
      }
      return [
        ...p,
        { ...templateData, id: Math.random().toString(36).substr(2, 9) },
      ];
    });
    setActiveNav("dashboard");
  };

  const startNewTemplate = () => {
    const newId = "new_" + Math.random().toString(36).substr(2, 5);
    setEditorData({
      name: "Novo Modelo",
      w: config.width1,
      h: config.height1,
      columns: 1,
      elements: [],
    });
    setSelectedTemplate(newId);
    setActiveNav("editor");
    setHistory([]);
    setHistoryStep(-1);
  };

  const loadTemplateToEditor = (tId: string) => {
    const t = templatesList.find((x) => x.id === tId);
    if (t) {
      setEditorData({
        name: t.label,
        w: t.w || config.width1,
        h: t.h || config.height1,
        columns: t.columns as 1 | 2,
        elements: JSON.parse(JSON.stringify(t.elements)),
      });
      setSelectedTemplate(tId);
      setActiveNav("editor");
    }
  };

  const aplicarProdutoNaEtiqueta = (produto: any) => {
    const embalagem =
      produto.EMBALAGENS?.find((e: any) => e.PRINCIPAL_VENDAS === 1) ||
      produto.EMBALAGENS?.[0];
    const resolveField = (field: string): string => {
      switch (field) {
        case "ITE_DESITE":
          return produto.ITE_DESITE || "";
        case "ITE_CODITE":
          return produto.ITE_CODITE || "";
        case "ITE_CODBAR":
          return embalagem?.ITE_CODBARRAS || produto.ITE_CODBAR || "";
        case "MARCA":
          return produto.MARCA || "";
        case "QTD_TEXT":
          return embalagem
            ? `${embalagem.ITE_QTD} UNID`
            : produto.QTD_TEXT || "";
        default:
          return "";
      }
    };

    setTemplatesList((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTemplate) return t;
        return {
          ...t,
          elements: t.elements.map((el) => {
            if (!el.fieldBinding) return el;
            return { ...el, content: resolveField(el.fieldBinding) };
          }),
        };
      }),
    );
  };

  const addToQueue = (produto: any) => {
    if (!produto) return;
    setPrintQueue((prev) => [
      ...prev,
      {
        ...produto,
        queueId: Math.random().toString(36).substr(2, 9),
        templateId: selectedTemplate,
      },
    ]);
  };

  const removeFromQueue = (qId: string) => {
    setPrintQueue((prev) => prev.filter((it) => it.queueId !== qId));
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      setPrintStatus("Selecione uma impressora!");
      return;
    }
    
    const itemsToPrint = printQueue.length > 0 ? printQueue : [null]; // Se fila vazia, imprime o atual
    setIsPrinting(true);
    setPrintStatus(printQueue.length > 0 ? `Imprimindo fila (${printQueue.length} itens)...` : "Preparando impressão...");

    try {
      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];
        
        // Se estiver imprimindo da fila, aplica os dados do item
        if (item) {
          aplicarProdutoNaEtiqueta(item);
          // Pequena pausa para o React atualizar o canvas
          await new Promise(resolve => setTimeout(resolve, 60));
        }

        const canvas = document.querySelector("canvas");
        if (!canvas) throw new Error("Preview não encontrado");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Contexto 2D não encontrado");

        const w_mm = editorData.w;
        const h_mm = editorData.h;
        const dpi = 203;
        const pxW = Math.round((w_mm * dpi) / 25.4);
        const pxH = Math.round((h_mm * dpi) / 25.4);

        const bitmap = canvasToMonoBitmap(ctx, pxW, pxH);
        const offX = Math.round((config.offsetX || 0) * (dpi / 25.4));
        const offY = Math.round((config.offsetY || 0) * (dpi / 25.4));
        
        const tspl = generateTSPL(
          bitmap,
          pxW,
          pxH,
          w_mm,
          h_mm,
          copies,
          offX,
          offY,
        );

        await invoke("print_label", {
          printerName: selectedPrinter,
          tsplContent: Array.from(tspl),
        });
        
        if (printQueue.length > 0) {
          setPrintStatus(`Imprimindo: ${i + 1} de ${itemsToPrint.length}`);
        }
      }
      
      setPrintStatus("Impressão concluída!");
    } catch (e: any) {
      setPrintStatus("Erro: " + e.toString());
    } finally {
      setIsPrinting(false);
    }
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      updateEditorElement(id, { content: base64 });
      pushToHistory(editorData.elements);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans selection:bg-accent/30 transition-colors duration-700 ${config.theme === "glass" ? "bg-transparent" : "bg-[#050505] text-slate-200"}`}
    >
      {/* Invisible Top Drag Handle */}
      <div
        data-tauri-drag-region
        className="absolute top-0 left-0 right-0 h-1.5 z-[100] cursor-n-resize"
      />

      {/* Dynamic Sidebar */}
      <aside
        data-tauri-drag-region
        className={`w-20 lg:w-64 backdrop-blur-3xl border-r border-white/5 flex flex-col items-center py-8 z-50 transition-colors select-none ${config.theme === "glass" ? "bg-white/[0.02]" : "bg-black/40"}`}
      >
        <div className="px-6 w-full mb-12">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
              <Printer size={22} className="text-black" />
            </div>
            <div className="hidden lg:block overflow-hidden">
              <h2 className="text-lg font-black text-white tracking-tighter leading-none">
                Donly<span className="text-accent">X</span>
              </h2>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">
                Label Studio
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 w-full px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${
                activeNav === item.id
                  ? "bg-accent/10 border border-accent/20 text-accent shadow-inner shadow-accent/5"
                  : "text-white/40 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <item.icon
                size={20}
                className={
                  activeNav === item.id
                    ? "text-accent"
                    : "group-hover:scale-110 transition-transform"
                }
              />
              <span className="hidden lg:block text-xs font-bold tracking-wide">
                {item.label}
              </span>
              {activeNav === item.id && (
                <motion.div
                  layoutId="nav-glow"
                  className="ml-auto w-1 h-1 rounded-full bg-accent shadow-[0_0_10px_#10b981]"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 w-full mt-auto">
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={daniloImg}
                className="w-9 h-9 rounded-full object-cover border border-white/10 shadow-lg"
                alt="Profile"
              />
              <div className="hidden lg:block">
                <p className="text-[11px] font-bold text-white">
                  Danilo Oliveira
                </p>
                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">
                  Desenvolvedor
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from),_transparent_40%)] from-accent/5">
        <header
          data-tauri-drag-region
          className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-md relative z-50 select-none cursor-grab active:cursor-grabbing"
        >
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white uppercase tracking-[0.3em]">
              {navItems.find((n) => n.id === activeNav)?.label}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1 h-1 rounded-full bg-accent" />
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                Workspace Ativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 group hover:border-white/20 transition-all cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">
                Sistema Online
              </span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 border-l border-white/5 pl-6">
              <button
                onClick={() => getCurrentWindow().minimize()}
                className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={() => getCurrentWindow().toggleMaximize()}
                className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <SquareIcon size={14} />
              </button>
              <button
                onClick={() => getCurrentWindow().close()}
                className="p-2 hover:bg-red-500/80 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeNav === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col p-10 gap-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                         <div className="lg:col-span-4 flex flex-col gap-6">
                            {printQueue.length === 0 ? (
                              <>
                                <div className="flex items-center justify-between ml-1">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[.25em]">
                                    Modelos Disponíveis
                                  </label>
                                  <button
                                    onClick={startNewTemplate}
                                    className="p-1 px-3 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all"
                                  >
                                    + Novo
                                  </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                  {templatesList.map((t) => (
                                    <div key={t.id} className="relative group">
                                      <button
                                        onClick={() => setSelectedTemplate(t.id)}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all relative ${
                                          selectedTemplate === t.id
                                            ? "bg-accent/10 border-accent/40 shadow-xl shadow-accent/5 ring-1 ring-accent/20"
                                            : "bg-white/[0.03] border-white/5 hover:border-white/20"
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <div
                                            className={`p-2 rounded-xl ${selectedTemplate === t.id ? "bg-accent/20 text-accent" : "bg-white/5 text-white/20"} transition-colors`}
                                          >
                                            {t.columns === 2 ? (
                                              <Columns size={20} />
                                            ) : (
                                              <SquareIcon size={20} />
                                            )}
                                          </div>
                                          <span
                                            className={`text-[10px] font-black px-2 py-1 rounded-lg ${selectedTemplate === t.id ? "bg-accent/20 text-accent" : "bg-white/5 text-white/40"}`}
                                          >
                                            {t.size}
                                          </span>
                                        </div>
                                        <h3
                                          className={`font-bold transition-colors ${selectedTemplate === t.id ? "text-white" : "text-white/60"}`}
                                        >
                                          {t.label}
                                        </h3>
                                        <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-1">
                                          {t.columns} Coluna
                                          {t.columns > 1 ? "s" : ""}
                                        </p>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          loadTemplateToEditor(t.id);
                                        }}
                                        className="absolute bottom-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-accent hover:text-black text-white/20 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
                                        title="Editar Modelo"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between ml-1">
                                  <label className="text-[10px] font-black text-accent uppercase tracking-[.25em]">
                                    Fila de Impressão ({printQueue.length})
                                  </label>
                                  <button
                                    onClick={() => setPrintQueue([])}
                                    className="p-1 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                  >
                                    Limpar
                                  </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                  {printQueue.map((item) => (
                                    <div
                                      key={item.queueId}
                                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-accent/20 group hover:bg-accent/10 transition-all"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-bold text-xs truncate">
                                          {item.ITE_DESITE}
                                        </h4>
                                        <p className="text-[9px] text-accent/60 font-black uppercase tracking-widest mt-0.5">
                                          CÓD: {item.ITE_CODITE}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => removeFromQueue(item.queueId)}
                                        className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                  {/* Right: Live Preview & Print */}
                  <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="flex-1 glass-card rounded-[2.5rem] border-white/5 relative bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center p-12 group/preview">
                      <div className="flex-1 flex items-center justify-center">
                        <div className="drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover/preview:scale-[1.02]">
                          <LabelPreview
                            data={data}
                            width={
                              templatesList.find(
                                (it) => it.id === selectedTemplate,
                              )?.w || config.width1
                            }
                            height={
                              templatesList.find(
                                (it) => it.id === selectedTemplate,
                              )?.h || config.height1
                            }
                            dpi={203}
                          />
                        </div>
                      </div>

                      {/* Campo de Busca por Código */}
                      <div className="mt-8 w-full max-w-sm space-y-2">
                        <input
                          type="text"
                          value={buscaCodigo}
                          onChange={(e) => setBuscaCodigo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && produtoEncontrado) {
                              addToQueue(produtoEncontrado);
                              setBuscaCodigo("");
                            }
                          }}
                          placeholder="Código do item..."
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all text-center text-lg placeholder:text-white/10 shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="glass-card rounded-[2rem] border-white/5 p-8 flex items-center gap-8 bg-black/40 border border-white/5 backdrop-blur-xl">
                      <div className="flex-1 space-y-4">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[.25em] ml-1">
                          Configuração de Saída
                        </label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="relative flex-1 w-full">
                            <button
                              onClick={() => setIsPrinterOpen(!isPrinterOpen)}
                              className="w-full bg-white/5 border border-white/10 text-xs font-bold text-white rounded-xl px-4 py-3 outline-none flex items-center justify-between hover:bg-white/10 transition-all"
                            >
                              <span
                                className={
                                  selectedPrinter
                                    ? "text-white"
                                    : "text-white/40"
                                }
                              >
                                {selectedPrinter || "Selecione sua Impressora"}
                              </span>
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-300 ${isPrinterOpen ? "rotate-180" : ""}`}
                              />
                            </button>

                            <AnimatePresence>
                              {isPrinterOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute bottom-full mb-2 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 p-2 space-y-1"
                                >
                                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                      Impressoras Disponíveis
                                    </span>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {printers.map((p) => (
                                      <button
                                        key={p}
                                        onClick={() => {
                                          setSelectedPrinter(p);
                                          setIsPrinterOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-accent hover:text-black text-xs font-bold transition-all text-white/70 flex items-center gap-3 group"
                                      >
                                        <Printer
                                          size={14}
                                          className="opacity-40 group-hover:opacity-100"
                                        />
                                        {p}
                                      </button>
                                    ))}
                                    {printers.length === 0 && (
                                      <div className="px-4 py-3 text-xs text-white/30 italic text-center">
                                        Nenhuma impressora encontrada
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <div className="flex items-center w-full sm:w-auto bg-white/5 border border-white/10 rounded-xl px-4 py-3 gap-4 justify-between sm:justify-start">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                              Cópias
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={copies}
                              onChange={(e) =>
                                setCopies(Number(e.target.value))
                              }
                              className="w-12 bg-transparent text-xs font-bold text-white outline-none text-center"
                            />
                          </div>
                        </div>
                        {printStatus && (
                          <p
                            className={`text-[10px] font-bold uppercase tracking-widest ${printStatus.includes("Erro") ? "text-red-400" : "text-accent animate-pulse"}`}
                          >
                            {printStatus}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="h-16 px-8 bg-accent text-black font-black text-sm rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 uppercase tracking-widest shrink-0 whitespace-nowrap"
                      >
                        {isPrinting ? (
                          "Processando..."
                        ) : (
                          <>
                            <Printer size={18} strokeWidth={3} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === "editor" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex p-10 gap-10"
              >
                <div className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight text-accent">
                      Visual Designer
                    </h1>
                    <p className="text-white/40 text-[10px] mt-1 font-bold uppercase tracking-widest">
                      Configure o layout da sua etiqueta
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6 space-y-4 border-white/5">
                      <Field
                        label="NOME DO TEMPLATE"
                        value={editorData.name}
                        onChange={(v) =>
                          setEditorData((p: any) => ({ ...p, name: v }))
                        }
                      />

                      {/* Column Selection Toggle */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                          LAYOUT DE COLUNAS
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[1, 2].map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                const w =
                                  c === 1
                                    ? config.width1
                                    : config.width2 * 2 + (config.gap || 0);
                                const h =
                                  c === 1 ? config.height1 : config.height2;
                                setEditorData((p: any) => ({
                                  ...p,
                                  columns: c as 1 | 2,
                                  w,
                                  h,
                                }));
                              }}
                              className={`py-2 px-3 rounded-xl border font-bold text-[10px] tracking-widest transition-all ${
                                editorData.columns === c
                                  ? "bg-accent/10 border-accent/40 text-accent"
                                  : "bg-white/5 border-white/5 text-white/20 hover:border-white/20"
                              }`}
                            >
                              {c} COLUNA{c > 1 ? "S" : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white/40 ml-1 tracking-widest uppercase">
                          Ferramentas
                        </label>
                      </div>
                      {textDrawMode && (
                        <div className="px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-widest text-center animate-pulse">
                          Arraste no canvas para criar a área · Esc cancela
                        </div>
                      )}
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: "text", icon: Type },
                          { id: "barcode", icon: Barcode },
                          { id: "image", icon: ImageIcon },
                          { id: "line", icon: Minus },
                          { id: "rect", icon: SquareIcon },
                        ].map((tool) => (
                          <button
                            key={tool.id}
                            onClick={() => {
                              if (tool.id === "text") {
                                setTextDrawMode(true);
                              } else {
                                addEditorElement(tool.id as any);
                              }
                            }}
                            className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all group shadow-sm ${tool.id === "text" && textDrawMode ? "bg-accent text-black border-accent" : "bg-white/10 border-white/10 hover:bg-accent/20 hover:border-accent/40"}`}
                          >
                            <tool.icon
                              size={18}
                              className={
                                tool.id === "text" && textDrawMode
                                  ? "text-black"
                                  : "text-white group-hover:text-accent transition-colors"
                              }
                            />
                            <span className="text-[8px] font-bold text-white/60 uppercase tracking-tight">
                              {tool.id === "text"
                                ? "Texto"
                                : tool.id === "barcode"
                                  ? "BC"
                                  : tool.id === "image"
                                    ? "Img"
                                    : tool.id}
                            </span>
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
                          {/* Propriedades do Elemento (omitido para brevidade, mas igual ao anterior) */}
                          {(() => {
                            const el = editorData.elements.find(
                              (e) => e.id === selectedId,
                            )!;
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                    {el.type} Propriedades
                                  </span>
                                  <button
                                    onClick={() => setSelectedId(null)}
                                    className="p-1 hover:bg-white/10 rounded-full"
                                  >
                                    <X size={14} className="text-white/40" />
                                  </button>
                                </div>

                                {el.type === "image" && (
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                      Símbolos de Estoque
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                      {[
                                        {
                                          name: "Fragile",
                                          icon: <Wine size={16} />,
                                          data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTggMmgyYThhIDQgNCAwIDAgNCA0di43NWE0IDQgMCAwIDEtNCA0SDhhNCA0IDAgMCAxLTQtNHYuNzVBNCA0IDAgMCAwIDggMnoiLz48cGF0aCBkPSJNMTIgMTJ2MTBNOCAyMmgyIi8+PC9zdmc+",
                                        },
                                        {
                                          name: "Up",
                                          icon: <MoveUp size={16} />,
                                          data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTcgOSA1LTUgNSA1TTExIDEyaDJNMTEgMTVoMk0xMSA4aDJNMTEgMThoMiIvPjwvc3ZnPg==",
                                        },
                                        {
                                          name: "Keep Dry",
                                          icon: <Umbrella size={16} />,
                                          data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIydjE1bTUuNS03YTIgMiAwIDEgMS00IDB2LTEuNSIvPjxwYXRoIGQ9Ik0yMCAxM2MtLjUgMC0xLS41LTEuNS0xYTMgMyAwIDAgMC02IDAgMyAzIDAgMCAwLTYgMGMtLjUgMC0xIC41LTEuNSAxYTEwIDEwIDAgMCAxIDIwIDB6Ii8+PC9zdmc+",
                                        },
                                        {
                                          name: "Package",
                                          icon: <Package size={16} />,
                                          data: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDEyaC00bC0zIDloLTlsLTMtOUgybTcgNGg2Ii8+PHBhdGggZD0iTTIxIDdsLTkgMTAtOS0xMFY1YTIgMiAwIDAgMSAyLTJoMTRhMiAyIDAgMCAxIDIgMnoiLz48L3N2Zz4=",
                                        },
                                      ].map((icon) => (
                                        <button
                                          key={icon.name}
                                          onClick={() => {
                                            updateEditorElement(el.id, {
                                              content: icon.data,
                                              w: 20,
                                              h: 20,
                                            });
                                            pushToHistory(editorData.elements);
                                          }}
                                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/40 border border-white/5 hover:border-accent/40 transition-all text-white/40 hover:text-accent"
                                        >
                                          {icon.icon}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                      Conteúdo
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        value={
                                          el.content.startsWith("data:")
                                            ? "Imagem/Símbolo"
                                            : el.content
                                        }
                                        onChange={(e) =>
                                          updateEditorElement(el.id, {
                                            content: e.target.value,
                                          })
                                        }
                                        className="flex-1 bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none"
                                      />
                                      {el.type === "image" && (
                                        <button
                                          onClick={() =>
                                            document
                                              .getElementById("img-up")
                                              ?.click()
                                          }
                                          className="p-2 rounded-xl bg-accent/20 border border-accent/20 text-accent"
                                        >
                                          <Upload size={14} />
                                          <input
                                            id="img-up"
                                            type="file"
                                            className="hidden"
                                            onChange={(e) =>
                                              e.target.files?.[0] &&
                                              handleImageUpload(
                                                el.id,
                                                e.target.files[0],
                                              )
                                            }
                                          />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {(el.type === "text" ||
                                    el.type === "barcode") && (
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-bold text-accent/80 uppercase tracking-widest ml-1">
                                        Vincular Campo API
                                      </label>
                                      <select
                                        value={el.fieldBinding || ""}
                                        onChange={(e) =>
                                          updateEditorElement(el.id, {
                                            fieldBinding:
                                              e.target.value || undefined,
                                          })
                                        }
                                        className="w-full bg-black/40 border border-accent/20 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent/60 transition-all"
                                      >
                                        <option value="">
                                          — Manual (sem vínculo) —
                                        </option>
                                        <option value="ITE_DESITE">
                                          Descrição do Produto
                                        </option>
                                        <option value="ITE_CODITE">
                                          Código do Item
                                        </option>
                                        <option value="ITE_CODBAR">
                                          Código de Barras (EAN)
                                        </option>
                                        <option value="MARCA">Marca</option>
                                        <option value="QTD_TEXT">
                                          Quantidade / Embalagem
                                        </option>
                                      </select>
                                    </div>
                                  )}
                                  {el.type === "text" && (
                                    <>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                            Fonte
                                          </label>
                                          <input
                                            type="number"
                                            value={el.fontSize}
                                            onChange={(e) =>
                                              updateEditorElement(el.id, {
                                                fontSize: Number(
                                                  e.target.value,
                                                ),
                                              })
                                            }
                                            className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none"
                                          />
                                        </div>
                                        <button
                                          onClick={() =>
                                            updateEditorElement(el.id, {
                                              bold: !el.bold,
                                            })
                                          }
                                          className={`mt-5 rounded-xl border text-[10px] font-black ${el.bold ? "bg-accent text-black border-accent" : "bg-black/40 text-white/40 border-white/10"}`}
                                        >
                                          BOLD
                                        </button>
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                          Alinhamento
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                          {(
                                            ["left", "center", "right"] as const
                                          ).map((a) => (
                                            <button
                                              key={a}
                                              onClick={() =>
                                                updateEditorElement(el.id, {
                                                  align: a,
                                                })
                                              }
                                              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${el.align === a || (!el.align && a === "center") ? "bg-accent/20 border-accent/40 text-accent" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                            >
                                              {a === "left" ? (
                                                <AlignLeft size={14} />
                                              ) : a === "center" ? (
                                                <AlignCenter size={14} />
                                              ) : (
                                                <AlignRight size={14} />
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {el.type === "text" ? (
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                        Família da Fonte
                                      </label>
                                      <select
                                        value={el.fontFamily || "Inter"}
                                        onChange={(e) =>
                                          updateEditorElement(el.id, {
                                            fontFamily: e.target.value,
                                          })
                                        }
                                        className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40"
                                      >
                                        <option value="Inter">
                                          Inter (Padrão)
                                        </option>
                                        <option value="Segoe UI">
                                          Segoe UI
                                        </option>
                                        <option value="Arial">Arial</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Tahoma">Tahoma</option>
                                        <option value="Times New Roman">
                                          Times New Roman
                                        </option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Courier New">
                                          Courier New
                                        </option>
                                        <option value="Consolas">
                                          Consolas
                                        </option>
                                        <option value="Impact">Impact</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                          W
                                        </label>
                                        <input
                                          type="number"
                                          value={el.w}
                                          onChange={(e) =>
                                            updateEditorElement(el.id, {
                                              w: Number(e.target.value),
                                            })
                                          }
                                          className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-white/60 uppercase tracking-widest ml-1">
                                          H
                                        </label>
                                        <input
                                          type="number"
                                          value={el.h}
                                          onChange={(e) =>
                                            updateEditorElement(el.id, {
                                              h: Number(e.target.value),
                                            })
                                          }
                                          className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="mt-auto pt-6 flex gap-3 border-t border-white/5">
                    <button
                      onClick={() => setActiveNav("dashboard")}
                      className="px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all text-xs font-bold text-white/40 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddTemplate}
                      className="flex-1 bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 font-bold rounded-xl py-2.5 transition-all text-xs"
                    >
                      Salvar Modelo
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative">
                  <div className="drop-shadow-2xl z-10">
                    <LabelPreview
                      data={{
                        ...data,
                        activeTab: "editor_preview",
                        custom: { editor_preview: editorData.elements },
                      }}
                      width={editorData.w}
                      height={editorData.h}
                      dpi={203}
                      onUpdateElement={updateEditorElement}
                      selectedId={selectedId}
                      onSelectElement={setSelectedId}
                      onRemoveElement={removeEditorElement}
                      onInteractionEnd={() =>
                        pushToHistory(editorData.elements)
                      }
                      drawingMode={textDrawMode ? "text" : null}
                      onAreaCreated={(bounds) => {
                        setTextDrawMode(false);
                        const id = Math.random().toString(36).substring(2, 9);
                        const newEl: LabelElement = {
                          id,
                          type: "text",
                          x: bounds.x,
                          y: bounds.y,
                          content: "Novo Texto",
                          w: Math.round(bounds.w),
                          h: Math.round(bounds.h),
                          fontSize: 4,
                          align: "center",
                          rotation: 0,
                        };
                        const newElements = [...editorData.elements, newEl];
                        setEditorData((p) => ({ ...p, elements: newElements }));
                        pushToHistory(newElements);
                        setSelectedId(id);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === "settings" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full p-10 space-y-8 overflow-y-auto custom-scrollbar"
              >
                <div className="w-full space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Configurações Globais
                    </h2>
                    <p className="text-white/40 text-sm mt-1 font-medium">
                      Defina os padrões das suas etiquetas
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="glass-card rounded-3xl p-8 space-y-6 border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-accent/20 text-accent">
                          <SquareIcon size={20} />
                        </div>
                        <h3 className="font-bold text-white">
                          Padrão 1 Coluna
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          label="Largura (mm)"
                          value={config.width1.toString()}
                          onChange={(v) =>
                            setConfig((p: any) => ({ ...p, width1: Number(v) }))
                          }
                        />
                        <Field
                          label="Altura (mm)"
                          value={config.height1.toString()}
                          onChange={(v) =>
                            setConfig((p: any) => ({
                              ...p,
                              height1: Number(v),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="glass-card rounded-3xl p-8 space-y-6 border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-accent/20 text-accent">
                          <Columns size={20} />
                        </div>
                        <h3 className="font-bold text-white">
                          Padrão 2 Colunas
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          label="Largura (mm)"
                          value={config.width2.toString()}
                          onChange={(v) =>
                            setConfig((p: any) => ({ ...p, width2: Number(v) }))
                          }
                        />
                        <Field
                          label="Altura (mm)"
                          value={config.height2.toString()}
                          onChange={(v) =>
                            setConfig((p: any) => ({
                              ...p,
                              height2: Number(v),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="glass-card rounded-3xl p-8 space-y-6 border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-accent/20 text-accent">
                          <Settings size={20} />
                        </div>
                        <h3 className="font-bold text-white">
                          Calibração de Impressão
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          label="X-Offset (mm)"
                          value={(config.offsetX || 0).toString()}
                          onChange={(v) =>
                            setConfig((p: any) => ({
                              ...p,
                              offsetX: Number(v),
                            }))
                          }
                        />
                        <Field
                          label="Y-Offset (mm)"
                          value={(config.offsetY || 0).toString()}
                          onChange={(v) =>
                            setConfig((p: any) => ({
                              ...p,
                              offsetY: Number(v),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-3xl p-8 border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white/5 text-white/40">
                        <LayoutDashboard size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          Estética da Interface
                        </h3>
                        <p className="text-xs text-white/40 font-medium">
                          Escolha entre fundo sólido (Escuro) ou efeito vidro
                          (Vidro)
                        </p>
                      </div>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <button
                        onClick={() =>
                          setConfig((p: any) => ({ ...p, theme: "dark" }))
                        }
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${config.theme === "dark" ? "bg-accent text-black" : "text-white/40 hover:text-white"}`}
                      >
                        Sólido
                      </button>
                      <button
                        onClick={() =>
                          setConfig((p: any) => ({ ...p, theme: "glass" }))
                        }
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${config.theme === "glass" ? "bg-accent text-black" : "text-white/40 hover:text-white"}`}
                      >
                        Vidro
                      </button>
                    </div>
                  </div>

                  <div className="glass-card rounded-3xl p-8 border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white/5 text-white/40">
                        <Settings size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          Resetar para Padrões
                        </h3>
                        <p className="text-xs text-white/40 font-medium">
                          Restaurar dimensões 100mm e 50mm / 50mm e 30mm
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setConfig((p: any) => ({
                          ...p,
                          width1: 100,
                          height1: 50,
                          width2: 50,
                          height2: 30,
                          gap: 3,
                          offsetX: 8,
                          offsetY: 0,
                        }))
                      }
                      className="px-6 py-3 rounded-2xl border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 text-xs font-bold transition-all uppercase tracking-widest"
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-white/40 uppercase tracking-[.2em] ml-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all shadow-inner"
      />
    </div>
  );
}
