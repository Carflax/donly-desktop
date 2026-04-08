import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
  Truck,
  Plane,
  Ship,
  Globe,
  ClipboardList,
  CalendarCheck,
  Headphones,
  Timer,
  Scale,
  PackageSearch,
  Phone,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LabelPreview, {
  LabelData,
  LabelElement,
} from "./components/LabelPreview";
import { canvasToMonoBitmap, generateTSPL } from "./tspl";
import daniloImg from "./danilo.png";
import appIcon from "./assets/icon.png";



const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "editor", label: "Editor", icon: PenTool },
  { id: "settings", label: "Settings", icon: Settings },
];

const svgToDataUrl = (svg: string) =>
  `data:image/svg+xml;base64,${btoa(svg)}`;

const S = `viewBox="0 0 64 64" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
const svg = (body: string) => svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" ${S}>${body}</svg>`);

const LOGISTICS_ICONS = [
  {
    name: "Fragil",
    icon: <Wine size={16} />,
    data: svg(`<path d="M20 8h24l-4 20c-1 5 2 10 2 10H22s3-5 2-10Z"/><line x1="32" y1="38" x2="32" y2="54"/><line x1="22" y1="54" x2="42" y2="54"/>`),
  },
  {
    name: "Cima",
    icon: <MoveUp size={16} />,
    data: svg(`<rect x="8" y="34" width="48" height="22" rx="2"/><line x1="20" y1="34" x2="20" y2="14"/><polyline points="12,22 20,14 28,22"/><line x1="44" y1="34" x2="44" y2="14"/><polyline points="36,22 44,14 52,22"/>`),
  },
  {
    name: "Seco",
    icon: <Umbrella size={16} />,
    data: svg(`<path d="M8 30C8 17.8 19 8 32 8s24 9.8 24 22H8z"/><line x1="32" y1="30" x2="32" y2="48"/><path d="M32 48c0 3.3-2.7 6-6 6s-6-2.7-6-6"/><line x1="14" y1="44" x2="14" y2="52"/><line x1="22" y1="40" x2="22" y2="48"/><line x1="42" y1="40" x2="42" y2="48"/><line x1="50" y1="44" x2="50" y2="52"/>`),
  },
  {
    name: "Caixa",
    icon: <Package size={16} />,
    data: svg(`<polygon points="32,6 58,20 58,48 32,62 6,48 6,20"/><line x1="32" y1="6" x2="32" y2="34"/><line x1="6" y1="20" x2="32" y2="34"/><line x1="58" y1="20" x2="32" y2="34"/>`),
  },
  {
    name: "Rastrear",
    icon: <PackageSearch size={16} />,
    data: svg(`<path d="M30 8H8v42h22"/><line x1="8" y1="8" x2="24" y2="18"/><line x1="24" y1="8" x2="24" y2="50"/><circle cx="44" cy="42" r="12"/><line x1="52" y1="50" x2="60" y2="58"/>`),
  },
  {
    name: "Balanca",
    icon: <Scale size={16} />,
    data: svg(`<line x1="32" y1="8" x2="32" y2="56"/><line x1="18" y1="56" x2="46" y2="56"/><line x1="6" y1="22" x2="58" y2="22"/><path d="M6 22l-4 14h16Z"/><path d="M58 22l-4 14h16Z"/><circle cx="32" cy="10" r="4"/>`),
  },
  {
    name: "Caminhao",
    icon: <Truck size={16} />,
    data: svg(`<rect x="4" y="18" width="36" height="30" rx="2"/><path d="M40 28h12l8 14v8H40z"/><circle cx="14" cy="52" r="6"/><circle cx="50" cy="52" r="6"/><line x1="4" y1="46" x2="60" y2="46"/>`),
  },
  {
    name: "Aviao",
    icon: <Plane size={16} />,
    data: svg(`<path d="M58 30L34 8l-6 6 10 14H8l-2 6 28 6v14l-8 2 2 4 10-4 10 4 2-4-8-2V40l28-6z"/>`),
  },
  {
    name: "Navio",
    icon: <Ship size={16} />,
    data: svg(`<path d="M8 38l4 12h40l4-12z"/><rect x="16" y="22" width="32" height="16"/><rect x="24" y="10" width="16" height="12"/><line x1="32" y1="10" x2="32" y2="4"/><line x1="4" y1="50" x2="60" y2="50"/>`),
  },
  {
    name: "Global",
    icon: <Globe size={16} />,
    data: svg(`<circle cx="32" cy="32" r="26"/><path d="M32 6c-8 6-14 15-14 26s6 20 14 26"/><path d="M32 6c8 6 14 15 14 26s-6 20-14 26"/><line x1="6" y1="32" x2="58" y2="32"/><line x1="10" y1="20" x2="54" y2="20"/><line x1="10" y1="44" x2="54" y2="44"/>`),
  },
  {
    name: "Checklist",
    icon: <ClipboardList size={16} />,
    data: svg(`<rect x="10" y="8" width="44" height="50" rx="2"/><rect x="22" y="4" width="20" height="8" rx="2"/><polyline points="14,28 19,34 26,24"/><line x1="30" y1="28" x2="48" y2="28"/><polyline points="14,42 19,48 26,38"/><line x1="30" y1="42" x2="48" y2="42"/>`),
  },
  {
    name: "Agenda",
    icon: <CalendarCheck size={16} />,
    data: svg(`<rect x="6" y="10" width="52" height="48" rx="2"/><line x1="6" y1="26" x2="58" y2="26"/><line x1="20" y1="4" x2="20" y2="16"/><line x1="44" y1="4" x2="44" y2="16"/><polyline points="22,42 28,48 42,36"/>`),
  },
  {
    name: "Suporte",
    icon: <Headphones size={16} />,
    data: svg(`<path d="M10 32C10 19.9 19.9 10 32 10s22 9.9 22 22"/><rect x="6" y="32" width="10" height="16" rx="4"/><rect x="48" y="32" width="10" height="16" rx="4"/><path d="M54 48v4a8 8 0 0 1-8 8H32"/><circle cx="32" cy="60" r="3"/>`),
  },
  {
    name: "Prazo",
    icon: <Timer size={16} />,
    data: svg(`<circle cx="32" cy="38" r="22"/><line x1="32" y1="38" x2="32" y2="24"/><line x1="32" y1="38" x2="44" y2="32"/><line x1="26" y1="8" x2="38" y2="8"/><line x1="56" y1="16" x2="52" y2="20"/>`),
  },
  {
    name: "24h",
    icon: <Clock size={16} />,
    data: svg(`<circle cx="32" cy="32" r="26"/><line x1="32" y1="18" x2="32" y2="32"/><line x1="32" y1="32" x2="46" y2="40"/>`),
  },
  {
    name: "Telefone",
    icon: <Phone size={16} />,
    data: svg(`<path d="M14 8h12l4 12-8 4c2 8 8 14 16 16l4-8 12 4v12c0 2-2 4-4 4C22 52 12 30 14 8z"/>`),
  },
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
  const [showFontMenu, setShowFontMenu] = useState(false);

  const fonts = [
    { name: "Inter", family: "'Inter', sans-serif" },
    { name: "Arial", family: "Arial, sans-serif" },
    { name: "Verdana", family: "Verdana, sans-serif" },
    { name: "Tahoma", family: "Tahoma, sans-serif" },
    { name: "Segoe UI", family: "'Segoe UI', sans-serif" },
    { name: "Courier New", family: "'Courier New', monospace" },
    { name: "Times New Roman", family: "'Times New Roman', serif" },
    { name: "Georgia", family: "Georgia, serif" },
    { name: "Impact", family: "Impact, sans-serif" },
    { name: "Comic Sans MS", family: "'Comic Sans MS', cursive" },
  ];
  const [textDrawMode, setTextDrawMode] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [buscaCodigo, setBuscaCodigo] = useState("");
  const [produtoEncontrado, setProdutoEncontrado] = useState<any>(null);
  const [printQueue, setPrintQueue] = useState<any[]>([]);
  const [remoteQueue, setRemoteQueue] = useState<any[]>([]);
  const [localIp, setLocalIp] = useState("");

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
    
    // Sincroniza com o servidor Rust para o Coletor
    invoke<void>("update_templates", { json: JSON.stringify(templatesList) })
      .catch(() => {});
  }, [templatesList]);

  useEffect(() => {
    invoke<string[]>("get_printers")
      .then(setPrinters)
      .catch(() => {});
    
    // Busca o IP local para o QR Code de pareamento
    invoke<string>("get_local_ip")
      .then((ip) => {
        console.log("IP Encontrado para QR Code:", ip);
        setLocalIp(ip);
      })
      .catch((err) => {
        console.error("Erro ao buscar IP:", err);
        setLocalIp("127.0.0.1");
      });
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

  const [isCollectorOnline, setIsCollectorOnline] = useState(false);
  const collectorTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const unlisten = listen<boolean>("collector-status", () => {
      setIsCollectorOnline(true);
      if (collectorTimeoutRef.current) clearTimeout(collectorTimeoutRef.current);
      collectorTimeoutRef.current = setTimeout(() => {
        setIsCollectorOnline(false);
      }, 30000); // Fica "Online" por 30s após a última atividade
    });
    return () => {
      unlisten.then((f) => f());
      if (collectorTimeoutRef.current) clearTimeout(collectorTimeoutRef.current);
    };
  }, []);

  const [history, setHistory] = useState<LabelElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    localStorage.setItem("donly_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("donly_templates", JSON.stringify(templatesList));
    // Sincroniza com o servidor interno para o Coletor ver
    invoke<void>("update_templates", { json: JSON.stringify(templatesList) })
      .catch(() => {});
  }, [templatesList]);

  useEffect(() => {
    localStorage.setItem("donly_printer", selectedPrinter);
  }, [selectedPrinter]);

  useEffect(() => {
    localStorage.setItem("donly_copies", copies.toString());
  }, [copies]);

  useEffect(() => {
    const unlisten = listen<string>("remote-print", (event) => {
      const productCode = event.payload;
      console.log("Recebido do Coletor:", productCode);
      
      // Busca o produto (tenta com e sem zeros à esquerda)
      const cleanCode = productCode.replace(/^0+/, '');
      const product = produtos.find((p) => {
        const prodCodeClean = (p.ITE_CODITE || "").toString().replace(/^0+/, '');
        const prodEanClean = (p.ITE_CODBAR || "").toString().replace(/^0+/, '');
        return (
          p.ITE_CODITE === productCode || 
          p.ITE_CODBAR === productCode ||
          prodCodeClean === cleanCode ||
          prodEanClean === cleanCode
        );
      });

      if (product) {
        console.log("Produto recebido do Coletor (Fila Oculta):", product.ITE_DESITE);
        // Adiciona na fila remota (invisível no dashboard) para não poluir a tela
        setRemoteQueue((prev) => [
          ...prev, 
          { ...product, queueId: Math.random().toString(36).substr(2, 9), templateId: selectedTemplate }
        ]);
      } else {
        console.error("Produto não encontrado na lista atual:", productCode);
        // Descomente se quiser ver o erro na tela:
        // alert("Produto não encontrado: " + productCode);
      }
    });

    return () => {
      unlisten.then((unsub) => unsub());
    };
  }, [produtos, selectedTemplate]);

  useEffect(() => {
    const unlisten = listen<string>("remote-template", (event) => {
      const templateId = event.payload;
      console.log("Troca de template remota via Coletor:", templateId);
      setSelectedTemplate(templateId);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<boolean>("remote-trigger-print", () => {
      console.log("Disparo físico de impressão solicitado via Coletor (Fila Remota).");
      handleRemotePrint();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [selectedPrinter, remoteQueue, copies, editorData, config]);

  const handleRemotePrint = async () => {
    if (!selectedPrinter || remoteQueue.length === 0) return;
    
    // Busca o template atual para pegar as dimensões corretas
    const currentTpl = templatesList.find(t => t.id === selectedTemplate);
    if (!currentTpl) return;

    setIsPrinting(true);
    setPrintStatus(`Imprimindo ${remoteQueue.length} etiquetas do Coletor...`);

    try {
      for (let i = 0; i < remoteQueue.length; i++) {
        const item = remoteQueue[i];
        aplicarProdutoNaEtiqueta(item);
        
        // Pequena pausa para garantir atualização do canvas
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = document.querySelector("canvas");
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const w_mm = currentTpl.w;
        const h_mm = currentTpl.h;
        const dpi = 203;
        const pxW = Math.round((w_mm * dpi) / 25.4);
        const pxH = Math.round((h_mm * dpi) / 25.4);

        const bitmap = canvasToMonoBitmap(ctx, pxW, pxH);
        const offX = Math.round((config.offsetX || 0) * (dpi / 25.4));
        const offY = Math.round((config.offsetY || 0) * (dpi / 25.4));
        
        const tspl = generateTSPL(bitmap, pxW, pxH, w_mm, h_mm, copies, offX, offY);

        await invoke<string>("print_label", {
          printerName: selectedPrinter,
          tsplContent: Array.from(tspl),
        });
      }
      
      setRemoteQueue([]); // Limpa a fila oculta após imprimir
      setPrintStatus("Fila do Coletor impressa!");
    } catch (e: any) {
      setPrintStatus("Erro remoto: " + e.toString());
    } finally {
      setIsPrinting(false);
    }
  };

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

  const updateDashboardElement = (id: string, updates: Partial<LabelElement>) => {
    setData((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        [selectedTemplate]: (prev.custom[selectedTemplate] || []).map((el) =>
          el.id === id ? { ...el, ...updates } : el
        ),
      },
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
      setSelectedId(null);
      setTextDrawMode(false);
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

        const isTwoCols = (item ? (templatesList.find(t => t.id === item.templateId)?.columns === 2) : (editorData.columns === 2));
        const gap = config.gap || 0;
        const singleW = editorData.w;
        const totalW = isTwoCols ? (singleW * 2 + gap) : singleW;
        const h_mm = editorData.h;
        const dpi = 203;

        let finalCanvas = canvas;
        let pxW = Math.round((totalW * dpi) / 25.4);
        let pxH = Math.round((h_mm * dpi) / 25.4);

        if (isTwoCols) {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = pxW;
          tempCanvas.height = pxH;
          const tctx = tempCanvas.getContext("2d");
          if (tctx) {
            tctx.fillStyle = "white";
            tctx.fillRect(0, 0, pxW, pxH);
            // Desenha a primeira etiqueta
            tctx.drawImage(canvas, 0, 0);
            // Desenha a segunda etiqueta
            const offsetPx = Math.round(((singleW + gap) * dpi) / 25.4);
            tctx.drawImage(canvas, offsetPx, 0);
            finalCanvas = tempCanvas;
          }
        }

        const finalCtx = finalCanvas.getContext("2d");
        if (!finalCtx) throw new Error("Falha ao processar imagem final");

        const bitmap = canvasToMonoBitmap(finalCtx, pxW, pxH);
        const offX = Math.round((config.offsetX || 0) * (dpi / 25.4));
        const offY = Math.round((config.offsetY || 0) * (dpi / 25.4));
        
        const tspl = generateTSPL(
          bitmap,
          pxW,
          pxH,
          totalW,
          h_mm,
          copies,
          offX,
          offY,
        );

        await invoke<string>("print_label", {
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
            <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
              <img src={appIcon} className="w-10 h-10 object-contain" alt="DonlyX" />
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
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 group transition-all cursor-pointer ${isCollectorOnline ? "bg-accent/10 border-accent/40" : "bg-white/5 border-white/10"}`}>
              <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${isCollectorOnline ? "bg-accent animate-pulse shadow-accent/40" : "bg-green-500 shadow-green-500/40"}`} />
              <span className={`text-[10px] font-black tracking-widest uppercase ${isCollectorOnline ? "text-accent" : "text-white/60"}`}>
                {isCollectorOnline ? "Coletor Conectado" : "Sistema Online"}
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
                key="dashboard"
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
                                onClick={() => { setSelectedTemplate(t.id); setSelectedId(null); }}
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
                            columns={templatesList.find(it => it.id === selectedTemplate)?.columns || 1}
                            gap={config.gap}
                            onUpdateElement={(id, updates) => {
                              if ("content" in updates)
                                updateDashboardElement(id, { content: updates.content });
                            }}
                          />
                        </div>
                      </div>

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
                key="editor"
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
                                  c === 1 ? config.width1 : config.width2;
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
                      <label className="text-xs font-bold text-white/40 ml-1 tracking-widest uppercase">
                        Ferramentas
                      </label>
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
                            className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all group ${tool.id === "text" && textDrawMode ? "bg-accent text-black border-accent" : "bg-white/10 border-white/10 hover:bg-accent/20 hover:border-accent/40"}`}
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
                              {tool.id === "text" ? "Texto" : tool.id === "barcode" ? "BC" : tool.id === "image" ? "Img" : tool.id}
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
                          className="glass-card rounded-2xl p-5 space-y-4 border-accent/20 bg-accent/5"
                        >
                          {(() => {
                            const el = editorData.elements.find((e) => e.id === selectedId);
                            if (!el) { setSelectedId(null); return null; }
                            return (
                              <div className="space-y-6">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                      Propriedades: <span className="text-accent">{el.type}</span>
                                    </span>
                                    <button onClick={() => setSelectedId(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                                      <X size={14} className="text-white/40" />
                                    </button>
                                  </div>

                                  <div className="space-y-6">
                                    {el.type === "image" && (
                                      <div className="space-y-3">
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Símbolos Disponíveis</label>
                                        <div className="grid grid-cols-4 gap-2">
                                          {LOGISTICS_ICONS.map((icon) => (
                                            <button
                                              key={icon.name}
                                              title={icon.name}
                                              onClick={() => {
                                                updateEditorElement(el.id, { content: icon.data, w: 20, h: 20 });
                                                pushToHistory(editorData.elements);
                                              }}
                                              className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-black/40 border border-white/5 hover:border-accent/40 transition-all text-white/40 hover:text-accent shadow-inner"
                                            >
                                              {icon.icon}
                                              <span className="text-[8px] leading-none">{icon.name}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-4">
                                      <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Conteúdo</label>
                                        <div className="flex gap-2">
                                          <input
                                            value={el.content.startsWith("data:") ? "Imagem/Símbolo" : el.content}
                                            onChange={(e) => updateEditorElement(el.id, { content: e.target.value })}
                                            className="flex-1 bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 transition-all"
                                          />
                                          {el.type === "image" && (
                                            <button
                                              onClick={() => document.getElementById("img-up")?.click()}
                                              className="p-2.5 rounded-xl bg-accent/20 border border-accent/20 text-accent hover:bg-accent/30 transition-all"
                                            >
                                              <Upload size={14} />
                                              <input id="img-up" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(el.id, e.target.files[0])} />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {(el.type === "text" || el.type === "barcode") && (
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-accent/80 uppercase tracking-widest ml-1">Vincular Campo API</label>
                                          <select
                                            value={el.fieldBinding || ""}
                                            onChange={(e) => updateEditorElement(el.id, { fieldBinding: e.target.value || undefined })}
                                            className="w-full bg-black/40 border border-accent/20 text-[11px] text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/60 transition-all"
                                          >
                                            <option value="">— Manual (sem vínculo) —</option>
                                            <option value="ITE_DESITE">Descrição do Produto</option>
                                            <option value="ITE_CODITE">Código do Item</option>
                                            <option value="ITE_CODBAR">Código de Barras (EAN)</option>
                                            <option value="MARCA">Marca</option>
                                            <option value="QTD_TEXT">Quantidade / Embalagem</option>
                                          </select>
                                        </div>
                                      )}

                                      {el.type === "text" && (
                                        <>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Tamanho (mm)</label>
                                              <input type="number" value={el.fontSize} onChange={(e) => updateEditorElement(el.id, { fontSize: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Largura (mm)</label>
                                              <input type="number" value={el.w ?? ""} placeholder="Auto" onChange={(e) => updateEditorElement(el.id, { w: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <button
                                              onClick={() => updateEditorElement(el.id, { bold: !el.bold })}
                                              className={`py-2 rounded-xl border text-[10px] font-black transition-all ${el.bold ? "bg-accent text-black border-accent" : "bg-black/40 text-white/40 border-white/10"}`}
                                            >
                                              BOLD
                                            </button>
                                            <button
                                              onClick={() => updateEditorElement(el.id, { italic: !el.italic })}
                                              className={`py-2 rounded-xl border text-[10px] font-black italic transition-all ${el.italic ? "bg-accent text-black border-accent" : "bg-black/40 text-white/40 border-white/10"}`}
                                            >
                                              ITALIC
                                            </button>
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Alinhamento</label>
                                            <div className="grid grid-cols-3 gap-2">
                                              {(["left", "center", "right"] as const).map((a) => (
                                                <button
                                                  key={a}
                                                  onClick={() => updateEditorElement(el.id, { align: a })}
                                                  className={`p-2 rounded-xl border transition-all flex items-center justify-center ${el.align === a || (!el.align && a === "center") ? "bg-accent/20 border-accent/40 text-accent" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                >
                                                  {a === "left" ? <AlignLeft size={14} /> : a === "center" ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="space-y-1.5 relative">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Fonte</label>
                                            <button
                                              onClick={() => setShowFontMenu(!showFontMenu)}
                                              className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2.5 outline-none flex items-center justify-between group hover:border-accent/40 transition-all"
                                            >
                                              <span style={{ fontFamily: el.fontFamily || "Inter" }}>
                                                {el.fontFamily || "Inter"}
                                              </span>
                                              <ChevronDown size={14} className={`text-white/20 group-hover:text-accent transition-transform ${showFontMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                              {showFontMenu && (
                                                <>
                                                  <div
                                                    className="fixed inset-0 z-[100]"
                                                    onClick={() => setShowFontMenu(false)}
                                                  />
                                                  <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-full left-0 w-full mb-2 bg-[#0A0F1E] border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden max-h-[280px] overflow-y-auto custom-scrollbar"
                                                  >
                                                    <div className="p-2 space-y-1">
                                                      {fonts.map((f) => (
                                                        <button
                                                          key={f.name}
                                                          onClick={() => {
                                                            updateEditorElement(el.id, { fontFamily: f.name });
                                                            setShowFontMenu(false);
                                                          }}
                                                          className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                                                            (el.fontFamily || "Inter") === f.name
                                                              ? "bg-accent text-black"
                                                              : "text-white/60 hover:bg-white/5 hover:text-white"
                                                          }`}
                                                        >
                                                          <span style={{ fontFamily: f.family, fontSize: '14px' }}>
                                                            {f.name}
                                                          </span>
                                                          {(el.fontFamily || "Inter") === f.name && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                                          )}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </motion.div>
                                                </>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        </>
                                      )}

                                      {el.type === "barcode" && (
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Formato</label>
                                          <select value={el.bcFormat || "CODE128"} onChange={(e) => updateEditorElement(el.id, { bcFormat: e.target.value })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none">
                                            <option value="CODE128">CODE 128</option>
                                            <option value="CODE39">CODE 39</option>
                                            <option value="EAN13">EAN-13</option>
                                            <option value="EAN8">EAN-8</option>
                                            <option value="ITF14">ITF-14</option>
                                            <option value="UPC">UPC-A</option>
                                          </select>
                                        </div>
                                      )}

                                      {(el.type === "line" || el.type === "rect") && (
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">W (mm)</label>
                                            <input type="number" value={el.w} onChange={(e) => updateEditorElement(el.id, { w: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">H (mm)</label>
                                            <input type="number" value={el.h} onChange={(e) => updateEditorElement(el.id, { h: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">Espessura</label>
                                            <input type="number" min={0.5} step={0.5} value={el.strokeWidth ?? 1} onChange={(e) => updateEditorElement(el.id, { strokeWidth: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                          </div>
                                          {el.type === "rect" && (
                                            <button
                                              onClick={() => updateEditorElement(el.id, { fill: !el.fill })}
                                              className={`mt-5 rounded-xl border text-[10px] font-black transition-all ${el.fill ? "bg-accent text-black border-accent" : "bg-black/40 text-white/40 border-white/10"}`}
                                            >
                                              PREENCHIDO
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {el.type === "image" && (
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">W (mm)</label>
                                            <input type="number" value={el.w} onChange={(e) => updateEditorElement(el.id, { w: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">H (mm)</label>
                                            <input type="number" value={el.h} onChange={(e) => updateEditorElement(el.id, { h: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
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
                      columns={1}
                      gap={config.gap}
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full p-10 space-y-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                      Configurações <span className="text-accent underline decoration-accent/20 decoration-4 underline-offset-8">Gerais</span>
                    </h2>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">
                      Sincronização e Padrões do Sistema
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* QR Code de Pareamento */}
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                        Conector Mobile
                      </label>
                      <div className="glass-card rounded-[2.5rem] p-10 flex flex-col items-center text-center border-white/5 bg-white/[0.01] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {localIp ? (
                          <>
                            <div className="relative group/qr">
                              <div className="absolute -inset-4 bg-accent/20 rounded-[3rem] blur-2xl opacity-0 group-hover/qr:opacity-100 transition-opacity duration-700" />
                              <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl relative transition-all duration-700 scale-100 group-hover/qr:scale-105 border-4 border-accent/10">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`http://${localIp}:3003`)}`} 
                                  alt="QR Code"
                                  className="w-40 h-40"
                                  crossOrigin="anonymous"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-8 space-y-6 z-10">
                              <div className="space-y-2">
                                <p className="text-xl font-black text-accent uppercase tracking-tighter">Conector Ativo</p>
                                <p className="text-[10px] text-white/40 font-bold uppercase leading-relaxed tracking-widest max-w-[240px]">
                                  Escaneie o código acima com o coletor para iniciar a operação remota
                                </p>
                              </div>

                            </div>
                          </>
                        ) : (
                          <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Buscando IP...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ajustes de Calibração */}
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                        Calibração do Hardware
                      </label>
                      <div className="glass-card rounded-3xl p-8 border-white/5 bg-white/[0.01] space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Field
                            label="X-Offset (mm)"
                            value={(config.offsetX || 0).toString()}
                            onChange={(v) => setConfig((p: any) => ({ ...p, offsetX: Number(v) }))}
                          />
                          <Field
                            label="Y-Offset (mm)"
                            value={(config.offsetY || 0).toString()}
                            onChange={(v) => setConfig((p: any) => ({ ...p, offsetY: Number(v) }))}
                          />
                        </div>
                        
                        <div className="pt-6 border-t border-white/5 space-y-4">
                           <div className="flex items-center gap-3">
                              <SquareIcon size={16} className="text-white/20" />
                              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Padrão 1 Coluna</span>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <Field label="L (mm)" value={config.width1.toString()} onChange={(v) => setConfig((p:any) => ({...p, width1: Number(v)}))} />
                              <Field label="A (mm)" value={config.height1.toString()} onChange={(v) => setConfig((p:any) => ({...p, height1: Number(v)}))} />
                           </div>
                        </div>

                        <div className="pt-4 space-y-4">
                           <div className="flex items-center gap-3">
                              <Columns size={16} className="text-white/20" />
                              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Padrão 2 Colunas</span>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <Field label="L (mm)" value={config.width2.toString()} onChange={(v) => setConfig((p:any) => ({...p, width2: Number(v)}))} />
                              <Field label="A (mm)" value={config.height2.toString()} onChange={(v) => setConfig((p:any) => ({...p, height2: Number(v)}))} />
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tema e Estética */}
                  <div className="glass-card rounded-3xl p-8 border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white/5 text-white/40">
                        <LayoutDashboard size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Interface Visual</h3>
                        <p className="text-xs text-white/40 font-medium">Escolha o estilo de fundo do DonlyX</p>
                      </div>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <button
                        onClick={() => setConfig((p: any) => ({ ...p, theme: "dark" }))}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${config.theme === "dark" ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"}`}
                      >
                        Sólido
                      </button>
                      <button
                        onClick={() => setConfig((p: any) => ({ ...p, theme: "glass" }))}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${config.theme === "glass" ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"}`}
                      >
                        Vidro
                      </button>
                    </div>
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
