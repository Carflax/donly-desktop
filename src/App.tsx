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
  Box,
  Building2,
  Tag,
  Columns,
  Square as SquareIcon,
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

const svgToDataUrl = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`;

const S = `viewBox="0 0 64 64" fill="none" stroke="black" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
const svg = (body: string) =>
  svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" ${S}>${body}</svg>`);

const LOGISTICS_ICONS = [
  {
    name: "Fragil",
    icon: <Wine size={16} />,
    data: svg(
      `<path d="M20 8h24l-4 20c-1 5 2 10 2 10H22s3-5 2-10Z"/><line x1="32" y1="38" x2="32" y2="54"/><line x1="22" y1="54" x2="42" y2="54"/>`,
    ),
  },
  {
    name: "Cima",
    icon: <MoveUp size={16} />,
    data: svg(
      `<line x1="12" y1="54" x2="52" y2="54" stroke-width="6"/><path d="M32 44 V10 M18 24 L32 10 L46 24" stroke-width="6"/>`,
    ),
  },
  {
    name: "Seco",
    icon: <Umbrella size={16} />,
    data: svg(
      `<path d="M8 30C8 17.8 19 8 32 8s24 9.8 24 22H8z"/><line x1="32" y1="30" x2="32" y2="48"/><path d="M32 48c0 3.3-2.7 6-6 6s-6-2.7-6-6"/><line x1="14" y1="44" x2="14" y2="52"/><line x1="22" y1="40" x2="22" y2="48"/><line x1="42" y1="40" x2="42" y2="48"/><line x1="50" y1="44" x2="50" y2="52"/>`,
    ),
  },
  {
    name: "Caixa",
    icon: <Box size={16} />,
    data: svg(
      `<path d="M32 10 L12 20 L32 30 L52 20 Z"/><path d="M12 20 V44 L32 54 V30"/><path d="M52 20 V44 L32 54"/>`,
    ),
  },
  {
    name: "Rastrear",
    icon: <PackageSearch size={16} />,
    data: svg(
      `<path d="M8 22 L28 12 L48 22 V42 L28 52 L8 42 Z M8 22 L28 32 L48 22 M28 32 V52"/><circle cx="48" cy="48" r="12" fill="none" stroke="black" stroke-width="4"/><line x1="56" y1="56" x2="62" y2="62" stroke-width="6"/>`,
    ),
  },
  {
    name: "Balanca",
    icon: <Scale size={16} />,
    data: svg(
      `<path d="M32 10 V54 M10 54 H54 M10 24 H54"/><path d="M10 24 L2 40 H18 Z"/><path d="M54 24 L46 40 H62 Z"/>`,
    ),
  },
  {
    name: "Caminhao",
    icon: <Truck size={16} />,
    data: svg(
      `<rect x="4" y="18" width="36" height="30" rx="2"/><path d="M40 28h12l8 14v8H40z"/><circle cx="14" cy="52" r="6"/><circle cx="50" cy="52" r="6"/><line x1="4" y1="46" x2="60" y2="46"/>`,
    ),
  },
  {
    name: "Aviao",
    icon: <Plane size={16} />,
    data: svg(
      `<path d="M32 4 L26 14 L4 34 V42 L26 34 V52 L18 60 H46 L38 52 V34 L60 42 V34 L38 14 Z" fill="none" stroke="black" stroke-width="3"/>`,
    ),
  },
  {
    name: "Navio",
    icon: <Ship size={16} />,
    data: svg(
      `<path d="M4 44 L12 56 H52 L60 44 Z"/><rect x="16" y="32" width="8" height="12"/><rect x="28" y="32" width="8" height="12"/><path d="M42 24 V44 H54 V30 Z"/>`,
    ),
  },
  {
    name: "Global",
    icon: <Globe size={16} />,
    data: svg(
      `<circle cx="32" cy="32" r="26"/><path d="M32 6c-8 6-14 15-14 26s6 20 14 26"/><path d="M32 6c8 6 14 15 14 26s-6 20-14 26"/><line x1="6" y1="32" x2="58" y2="32"/><line x1="10" y1="20" x2="54" y2="20"/><line x1="10" y1="44" x2="54" y2="44"/>`,
    ),
  },
  {
    name: "Checklist",
    icon: <ClipboardList size={16} />,
    data: svg(
      `<rect x="10" y="8" width="44" height="50" rx="2"/><rect x="22" y="4" width="20" height="8" rx="2"/><polyline points="14,28 19,34 26,24"/><line x1="30" y1="28" x2="48" y2="28"/><polyline points="14,42 19,48 26,38"/><line x1="30" y1="42" x2="48" y2="42"/>`,
    ),
  },
  {
    name: "Agenda",
    icon: <CalendarCheck size={16} />,
    data: svg(
      `<rect x="6" y="10" width="52" height="48" rx="2"/><line x1="6" y1="26" x2="58" y2="26"/><line x1="20" y1="4" x2="20" y2="16"/><line x1="44" y1="4" x2="44" y2="16"/><polyline points="22,42 28,48 42,36"/>`,
    ),
  },
  {
    name: "Suporte",
    icon: <Headphones size={16} />,
    data: svg(
      `<path d="M10 32C10 19.9 19.9 10 32 10s22 9.9 22 22"/><rect x="6" y="32" width="10" height="16" rx="4"/><rect x="48" y="32" width="10" height="16" rx="4"/><path d="M54 48v4a8 8 0 0 1-8 8H32"/><circle cx="32" cy="60" r="3"/>`,
    ),
  },
  {
    name: "Prazo",
    icon: <Timer size={16} />,
    data: svg(
      `<circle cx="32" cy="38" r="22"/><line x1="32" y1="38" x2="32" y2="24"/><line x1="32" y1="38" x2="44" y2="32"/><line x1="26" y1="8" x2="38" y2="8"/><line x1="56" y1="16" x2="52" y2="20"/>`,
    ),
  },
  {
    name: "24h",
    icon: <Clock size={16} />,
    data: svg(
      `<circle cx="32" cy="32" r="26"/><line x1="32" y1="18" x2="32" y2="32"/><line x1="32" y1="32" x2="46" y2="40"/>`,
    ),
  },
  {
    name: "Telefone",
    icon: <Phone size={16} />,
    data: svg(
      `<path d="M14 8h12l4 12-8 4c2 8 8 14 16 16l4-8 12 4v12c0 2-2 4-4 4C22 52 12 30 14 8z"/>`,
    ),
  },
  {
    name: "Empresa",
    icon: <Building2 size={16} />,
    data: svg(
      `<path d="M10 56 V12 H54 V56 M10 24 H54 M10 36 H54 M10 48 H54 M32 12 V56"/>`,
    ),
  },
  {
    name: "Marca",
    icon: <Tag size={16} />,
    data: svg(
      `<path d="M12 10 H36 L54 28 L36 46 H12 Z"/><circle cx="22" cy="18" r="4" fill="none" stroke="black" stroke-width="4"/>`,
    ),
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
    id: "padrao",
    label: "Padrão",
    size: "100x50mm",
    w: 100,
    h: 50,
    columns: 1,
    elements: [
      {
        id: "p1",
        type: "text",
        x: 50.040841049361504,
        y: 10.011163704777182,
        content: "DESCRIÇÃO DO PRODUTO",
        w: 90.43260577436344,
        h: 15.79202627085673,
        fontSize: 6.5,
        bold: false,
        align: "center",
        fontFamily: "Impact",
        fieldBinding: "ITE_DESITE",
        lineHeight: 1.1
      },
      {
        id: "p4",
        type: "barcode",
        x: 12,
        y: 28,
        content: "7891960280044",
        w: 80.08168209872301,
        h: 19.73845379463832,
        fieldBinding: "ITE_CODBAR",
        bcFormat: "EAN13",
        bcLabelDist: -0.6
      },
      {
        id: "txwuj09pn",
        type: "text",
        x: 27.03476750008822,
        y: 21.73155885933641,
        content: "CODIGO",
        w: 25.83045556840414,
        h: 6.709097384862028,
        fontSize: 4.5,
        bold: true,
        align: "left",
        fieldBinding: "ITE_CODITE"
      },
      {
        id: "ivjevdid4",
        type: "image",
        x: 19.3860034618265,
        y: 17.907176840205548,
        content: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zMiAxMCBMMTIgMjAgTDMyIDMwIEw1MiAyMCBaIi8+PHBhdGggZD0iTTEyIDIwIFY0NCBMMzIgNTQgVjMwIi8+PHBhdGggZD0iTTUyIDIwIFY0NCBMMzIgNTQiLz48L3N2Zz4=",
        w: 7.648764038261717,
        h: 7.648764038261717,
        fontSize: 12,
        rotation: 0
      },
      {
        id: "mag0jicjx",
        type: "line",
        x: 44.77689937478102,
        y: 19.345901357525022,
        content: "",
        w: 9.54263000724552,
        h: 4.77131500362276,
        fontSize: 12,
        rotation: 90,
        strokeWidth: 8
      },
      {
        id: "1xtzvqfy6",
        type: "image",
        x: 54.31952938202654,
        y: 18.348550380491687,
        content: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAxMCBIMzYgTDU0IDI4IEwzNiA0NiBIMTIgWiIvPjxjaXJjbGUgY3g9IjIyIiBjeT0iMTgiIHI9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iNCIvPjwvc3ZnPg==",
        w: 6.766016957689438,
        h: 6.766016957689438,
        fontSize: 12,
        rotation: 0
      },
      {
        id: "fl541267a",
        type: "text",
        x: 61.568459684467555,
        y: 21.73155885933641,
        content: "MARCA",
        w: 26.04049061212755,
        h: 6.763651032158043,
        fontSize: 4.5,
        bold: true,
        align: "left",
        fieldBinding: "MARCA"
      }
    ],
  },
            {
    id: "padraozinha",
    label: "Padrãozinha",
    size: "50x30mm",
    w: 50,
    h: 30,
    columns: 2,
    elements: [
      {
        id: "pz4",
        type: "barcode",
        x: 0.7147992088743749,
        y: 17.364932649265175,
        content: "7891960819954",
        w: 48.57040158225125,
        h: 11.591137092982848,
        fieldBinding: "ITE_CODBAR",
        bcFormat: "EAN13",
        bcFontSize: 2.4,
        bcLabelDist: 0
      },
      {
        id: "qdohddb",
        type: "text",
        x: 25,
        y: 5.255491282218998,
        content: "DESCRIÇÃO DO PRODUTO",
        w: 46.365482844612615,
        h: 7.376326816188371,
        fontSize: 3.5,
        align: "center",
        fontFamily: "Impact",
        fieldBinding: "ITE_DESITE",
        rotation: 0
      },
      {
        id: "5fe1cy5",
        type: "text",
        x: 21.23987832577051,
        y: 13.718690595425464,
        content: "CÓDIGO",
        w: 15,
        h: 4,
        fontSize: 3,
        bold: false,
        align: "left",
        fontFamily: "Impact",
        fieldBinding: "ITE_CODITE",
        rotation: 0
      },
      {
        id: "gowu0ozc4",
        type: "image",
        x: 16.05319932493032,
        y: 11.125351095005367,
        content: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zMiAxMCBMMTIgMjAgTDMyIDMwIEw1MiAyMCBaIi8+PHBhdGggZD0iTTEyIDIwIFY0NCBMMzIgNTQgVjMwIi8+PHBhdGggZD0iTTUyIDIwIFY0NCBMMzIgNTQiLz48L3N2Zz4=",
        w: 5.186679000840192,
        h: 5.186679000840192,
        fontSize: 12,
        rotation: 0
      }
    ],
  },
          {
    id: "despacho",
    label: "Despacho",
    size: "100x50mm",
    w: 100,
    h: 50,
    columns: 1,
    elements: [
      {
        id: "1h9a6ul",
        type: "text",
        x: 50,
        y: 6.646874837766035,
        content: "CLIENTE",
        w: 21,
        h: 5,
        fontSize: 4,
        bold: true,
        align: "center",
        rotation: 0
      },
      {
        id: "st7whh7",
        type: "text",
        x: 50,
        y: 14.146874837766036,
        content: "NOME DO CLIENTE COMPLETO",
        w: 91,
        h: 10,
        fontSize: 5.5,
        bold: false,
        align: "center",
        fontFamily: "Impact",
        fieldBinding: "CLI_NOMCLI",
        rotation: 0
      },
      {
        id: "g0h63z7x6",
        type: "text",
        x: 19,
        y: 23.646874837766035,
        content: "PEDIDO:",
        w: 21,
        h: 5,
        fontSize: 4,
        bold: false,
        align: "center",
        fontFamily: "Impact",
        rotation: 0
      },
      {
        id: "zu57wv7w0",
        type: "text",
        x: 25.93172968127854,
        y: 23.646874837766035,
        content: "000000000000",
        w: 22.680280349787175,
        h: 5.400066749949327,
        fontSize: 4,
        bold: false,
        align: "left",
        fieldBinding: "FGO_NUMDOC",
        rotation: 0
      },
      {
        id: "w032ycvuo",
        type: "text",
        x: 65.74912390691512,
        y: 23.646874837766035,
        content: "VOLUME",
        w: 21,
        h: 5,
        fontSize: 4,
        bold: false,
        align: "center",
        fontFamily: "Impact",
        rotation: 0
      },
      {
        id: "hadshsn37",
        type: "text",
        x: 76.24912390691512,
        y: 23.646874837766035,
        content: " 0",
        w: 17.63943930042565,
        h: 4.199866500101345,
        fontSize: 4,
        bold: false,
        align: "left",
        fieldBinding: "VOLUMES",
        rotation: 0
      },
      {
        id: "5od00bb8k",
        type: "text",
        x: 50,
        y: 32.9799096229852,
        content: "CONFERENTE",
        w: 21,
        h: 5,
        fontSize: 4,
        bold: true,
        align: "center",
        rotation: 0
      },
      {
        id: "dy8zwbvvp",
        type: "text",
        x: 50,
        y: 40.4799096229852,
        content: "NOME DO CONFERENTE COMPLETO",
        w: 91,
        h: 10,
        fontSize: 5.5,
        bold: false,
        align: "center",
        fontFamily: "Impact",
        fieldBinding: "NOME_CONFERENTE",
        rotation: 0
      }
    ],
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
    // Sempre usa os templates default para garantir que funcionem corretamente
    return DEFAULT_TEMPLATES;
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
  const [selectedTemplate, setSelectedTemplate] = useState("padrao");
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const [buscaPedido, setBuscaPedido] = useState("");
  const [dadosDespacho, setDadosDespacho] = useState<any>(null);
  const [loadingDespacho, setLoadingDespacho] = useState(false);
  const [volumes, setVolumes] = useState("1");
  const [printQueue, setPrintQueue] = useState<any[]>([]);
  const [remoteQueue, setRemoteQueue] = useState<any[]>([]);
  const [localIp, setLocalIp] = useState("");

  const getDefaultCustomData = (): Record<string, LabelElement[]> => {
    const customData: Record<string, LabelElement[]> = {};
    DEFAULT_TEMPLATES.forEach((t) => {
      customData[t.id] = JSON.parse(JSON.stringify(t.elements));
    });
    return customData;
  };

  const [data, setData] = useState<LabelData>({
    activeTab: "padrao",
    padrao: {
      item: "PRODUTO TESTE",
      caixa: "00000",
      pedido: "00000000",
      pd: "0000000000",
      peca: "0",
    },
    padraozinha: {
      nome: "PRODUTO TESTE",
      codigo: "00000",
      barcode: "7890000000000",
    },
    completa: {
      produto: "TUBO EG BR PVC 100MM (10472) AMANCO",
      caixa: "00329",
      fornecedor: "AMANCO",
      barcode: "7891960280044",
    },
    custom: getDefaultCustomData(),
  });

  useEffect(() => {
    const customData: Record<string, LabelElement[]> = {};
    templatesList.forEach((t) => {
      customData[t.id] = JSON.parse(JSON.stringify(t.elements));
    });
    setData((prev) => ({
      ...prev,
      custom: customData,
      activeTab: selectedTemplate,
    }));

    // Sincroniza com o servidor Rust para o Coletor
    invoke<void>("update_templates", {
      json: JSON.stringify(templatesList),
    }).catch(() => {});
  }, []);

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
      // Resetar o preview ao limpar o código
      if (!termo) {
        const defaultElements = DEFAULT_TEMPLATES.find(
          (t) => t.id === selectedTemplate,
        )?.elements;
        if (defaultElements && selectedTemplate !== "despacho") {
          setTemplatesList((prev) =>
            prev.map((t) =>
              t.id === selectedTemplate
                ? {
                    ...t,
                    elements: JSON.parse(JSON.stringify(defaultElements)),
                  }
                : t,
            ),
          );
          setData((prev) => ({
            ...prev,
            custom: {
              ...prev.custom,
              [selectedTemplate]: JSON.parse(JSON.stringify(defaultElements)),
            },
          }));
        }
      }
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

  // Garante que selectedTemplate sempre seja um template válido do DEFAULT_TEMPLATES
  useEffect(() => {
    const isValidTemplate = DEFAULT_TEMPLATES.some(
      (t) => t.id === selectedTemplate,
    );
    if (!isValidTemplate) {
      setSelectedTemplate("padrao");
    }
  }, [selectedTemplate]);

  const [isCollectorOnline, setIsCollectorOnline] = useState(false);
  const collectorTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const unlisten = listen<boolean>("collector-status", () => {
      setIsCollectorOnline(true);
      if (collectorTimeoutRef.current)
        clearTimeout(collectorTimeoutRef.current);
      collectorTimeoutRef.current = setTimeout(() => {
        setIsCollectorOnline(false);
      }, 30000); // Fica "Online" por 30s após a última atividade
    });
    return () => {
      unlisten.then((f) => f());
      if (collectorTimeoutRef.current)
        clearTimeout(collectorTimeoutRef.current);
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
    invoke<void>("update_templates", {
      json: JSON.stringify(templatesList),
    }).catch(() => {});
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
      const cleanCode = productCode.replace(/^0+/, "");
      const product = produtos.find((p) => {
        const prodCodeClean = (p.ITE_CODITE || "")
          .toString()
          .replace(/^0+/, "");
        const prodEanClean = (p.ITE_CODBAR || "").toString().replace(/^0+/, "");
        return (
          p.ITE_CODITE === productCode ||
          p.ITE_CODBAR === productCode ||
          prodCodeClean === cleanCode ||
          prodEanClean === cleanCode
        );
      });

      if (product) {
        console.log(
          "Produto recebido do Coletor (Fila Oculta):",
          product.ITE_DESITE,
        );
        // Adiciona na fila remota (invisível no dashboard) para não poluir a tela
        setRemoteQueue((prev) => [
          ...prev,
          {
            ...product,
            queueId: Math.random().toString(36).substr(2, 9),
            templateId: selectedTemplate,
          },
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
      console.log(
        "Disparo físico de impressão solicitado via Coletor (Fila Remota).",
      );
      handleRemotePrint();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [selectedPrinter, remoteQueue, copies, editorData, config]);

  const handleRemotePrint = async () => {
    if (!selectedPrinter || remoteQueue.length === 0) return;

    // Busca o template atual para pegar as dimensões corretas
    const currentTpl = templatesList.find((t) => t.id === selectedTemplate);
    if (!currentTpl) return;

    setIsPrinting(true);
    setPrintStatus(`Imprimindo ${remoteQueue.length} etiquetas do Coletor...`);

    try {
      for (let i = 0; i < remoteQueue.length; i++) {
        const item = remoteQueue[i];
        aplicarProdutoNaEtiqueta(item);

        // Pequena pausa para garantir atualização do canvas
        await new Promise((resolve) => setTimeout(resolve, 100));

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
      const activeTag = document.activeElement?.tagName; if (activeTag === "INPUT" || activeTag === "SELECT" || activeTag === "TEXTAREA") return;
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0) {
          const newElements = editorData.elements.filter(
            (el) => !selectedIds.has(el.id),
          );
          setEditorData((p) => ({ ...p, elements: newElements }));
          pushToHistory(newElements);
          setSelectedIds(new Set());
        }
      }

      // Movimentação com setas do teclado
      if (
        selectedIds.size > 0 &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.ctrlKey ? 0.1 : e.shiftKey ? 5 : 1;
        const newElements = editorData.elements.map((el) => {
          if (!selectedIds.has(el.id)) return el;
          const updates: Partial<LabelElement> = {};
          if (e.key === "ArrowUp") updates.y = el.y - step;
          if (e.key === "ArrowDown") updates.y = el.y + step;
          if (e.key === "ArrowLeft") updates.x = el.x - step;
          if (e.key === "ArrowRight") updates.x = el.x + step;
          return { ...el, ...updates };
        });
        setEditorData((p) => ({ ...p, elements: newElements }));
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [historyStep, history, selectedIds, editorData.elements]);

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
      h: type === "barcode" ? 15 : type === "image" ? 20 : 10,
      fontSize: type === "text" ? 4 : 12,
      rotation: 0,
    };
    const newElements = [...editorData.elements, newEl];
    setEditorData((p) => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedIds(new Set([id]));
  };

  const duplicateElements = (ids: string[]) => {
    const newElements = [...editorData.elements];
    const newSelectedIds = new Set<string>();

    ids.forEach((id) => {
      const el = editorData.elements.find((e) => e.id === id);
      if (el) {
        const nextId = Math.random().toString(36).substr(2, 9);
        newElements.push({ ...el, id: nextId });
        newSelectedIds.add(nextId);
      }
    });

    setEditorData((p) => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedIds(newSelectedIds);
    return Array.from(newSelectedIds);
  };

  const updateEditorElement = (id: string, updates: Partial<LabelElement>) => {
    setEditorData((p) => ({
      ...p,
      elements: p.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el,
      ),
    }));
  };

  const updateDashboardElement = (
    id: string,
    updates: Partial<LabelElement>,
  ) => {
    setData((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        [selectedTemplate]: (prev.custom[selectedTemplate] || []).map((el) =>
          el.id === id ? { ...el, ...updates } : el,
        ),
      },
    }));
  };

  const removeEditorElement = (id: string) => {
    const newElements = editorData.elements.filter((el) => el.id !== id);
    setEditorData((p) => ({ ...p, elements: newElements }));
    pushToHistory(newElements);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Salva o template editado diretamente no código fonte (DEFAULT_TEMPLATES)
  const handleSaveToSource = async () => {
    const templateData: Template = {
      id: selectedTemplate,
      label: editorData.name || "Sem Nome",
      size: `${editorData.w}x${editorData.h}mm`,
      w: editorData.w,
      h: editorData.h,
      columns: editorData.columns,
      elements: editorData.elements,
    };

    try {
      // Usa o comando Tauri para salvar no arquivo
      await invoke("save_template_to_source", {
        templateId: templateData.id,
        templateJson: JSON.stringify(templateData),
      });
    } catch (error) {
      console.error("Erro ao salvar no código fonte:", error);
    }

    // Atualiza o estado local (templatesList)
    setTemplatesList((p) =>
      p.map((t) => (t.id === selectedTemplate ? templateData : t)),
    );

    // Atualiza o data.custom para o preview atualizar imediatamente
    setData((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        [selectedTemplate]: templateData.elements,
      },
    }));

    // Navega de volta para o dashboard
    setActiveNav("dashboard");
  };

  const aplicarProdutoNaEtiqueta = (produto: any) => {
    const embalagem =
      produto.EMBALAGENS?.find((e: any) => e.PRINCIPAL_VENDAS === 1) ||
      produto.EMBALAGENS?.[0];
    const resolveField = (field: string): string => {
      // Campos de Despacho (Pedido)
      if (selectedTemplate === "despacho") {
        switch (field) {
          case "FGO_NUMDOC":
            return produto.FGO_NUMDOC || "";
          case "FGO_ESPDOC":
            return produto.FGO_ESPDOC || "";
          case "CLI_NOMCLI":
            return produto.CLI_NOMCLI || "";
          case "NOME_CONFERENTE":
            return produto.NOME_CONFERENTE || "";
          case "VOLUMES":
            return volumes || "1";
          default:
            return "";
        }
      }

      // Campos de Produtos
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

    // Atualiza data.custom para o preview atualizar imediatamente
    const updatedElements =
      templatesList
        .find((t) => t.id === selectedTemplate)
        ?.elements.map((el) => {
          if (!el.fieldBinding) return el;
          return { ...el, content: resolveField(el.fieldBinding) };
        }) || [];

    setData((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        [selectedTemplate]: updatedElements,
      },
    }));
  };

  const buscarDespacho = async (numPedido: string) => {
    if (!numPedido.trim()) {
      setDadosDespacho(null);
      return;
    }

    setLoadingDespacho(true);
    try {
      const response = await fetch(
        `https://marketing-banco-de-dados.velbav.easypanel.host/api/impressao-romaneio?numdoc=${numPedido}`,
      );
      const result = await response.json();

      if (Array.isArray(result) && result.length > 0) {
        const dados = result[0];
        setDadosDespacho(dados);

        // Calcula os elementos atualizados
        const updatedElements =
          templatesList
            .find((t) => t.id === "despacho")
            ?.elements.map((el) => {
              if (!el.fieldBinding) return el;
              let content = "";
              switch (el.fieldBinding) {
                case "FGO_NUMDOC":
                  content = dados.FGO_NUMDOC || "";
                  break;
                case "CLI_NOMCLI":
                  content = dados.CLI_NOMCLI || "";
                  break;
                case "NOME_CONFERENTE":
                  content = dados.NOME_CONFERENTE || "";
                  break;
                case "FGO_ESPDOC":
                  content = dados.FGO_ESPDOC || "";
                  break;
                case "VOLUMES":
                  content = volumes || "1";
                  break;
                default:
                  content = el.content;
              }
              return { ...el, content };
            }) || [];

        // Aplica os dados na etiqueta de despacho
        setTemplatesList((prev) =>
          prev.map((t) => {
            if (t.id !== "despacho") return t;
            return {
              ...t,
              elements: updatedElements,
            };
          }),
        );

        // Atualiza data.custom para o preview atualizar imediatamente
        setData((prev) => ({
          ...prev,
          custom: {
            ...prev.custom,
            despacho: updatedElements,
          },
        }));

        // Se o template ativo for despacho, atualiza o preview
        if (selectedTemplate === "despacho") {
          setData((prev) => ({ ...prev, activeTab: "despacho" }));
        }
      } else {
        setDadosDespacho(null);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do pedido:", error);
      setDadosDespacho(null);
    } finally {
      setLoadingDespacho(false);
    }
  };

  // Auto-buscar despacho ao digitar (com debounce de 500ms)
  useEffect(() => {
    if (selectedTemplate !== "despacho") return;

    const termo = buscaPedido.trim();
    if (!termo) {
      // Resetar ao limpar
      const defaultElements = DEFAULT_TEMPLATES.find(
        (t) => t.id === "despacho",
      )?.elements;
      if (defaultElements) {
        setDadosDespacho(null);
        setTemplatesList((prev) =>
          prev.map((t) =>
            t.id === "despacho"
              ? { ...t, elements: JSON.parse(JSON.stringify(defaultElements)) }
              : t,
          ),
        );
        setData((prev) => ({
          ...prev,
          custom: {
            ...prev.custom,
            despacho: JSON.parse(JSON.stringify(defaultElements)),
          },
        }));
      }
      return;
    }

    // Buscar automaticamente com debounce
    const timer = setTimeout(() => {
      buscarDespacho(termo);
    }, 500);

    return () => clearTimeout(timer);
  }, [buscaPedido, selectedTemplate, volumes]);

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
    setPrintStatus(
      printQueue.length > 0
        ? `Imprimindo fila (${printQueue.length} itens)...`
        : "Preparando impressão...",
    );

    try {
      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];

        // Se estiver imprimindo da fila, aplica os dados do item
        if (item) {
          aplicarProdutoNaEtiqueta(item);
          // Pequena pausa para o React atualizar o canvas
          await new Promise((resolve) => setTimeout(resolve, 60));
        }

        const canvas = document.querySelector("canvas");
        if (!canvas) throw new Error("Preview não encontrado");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Contexto 2D não encontrado");

        const isTwoCols = item
          ? templatesList.find((t) => t.id === item.templateId)?.columns === 2
          : editorData.columns === 2;
        const gap = config.gap || 0;
        const singleW = editorData.w;
        const totalW = isTwoCols ? singleW * 2 + gap : singleW;
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
              <img
                src={appIcon}
                className="w-10 h-10 object-contain"
                alt="DonlyX"
              />
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
      <main className="flex-1 flex flex-col relative overflow-hidden">
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
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-3 group transition-all cursor-pointer ${isCollectorOnline ? "bg-accent/10 border-accent/40" : "bg-white/5 border-white/10"}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shadow-lg ${isCollectorOnline ? "bg-accent animate-pulse shadow-accent/40" : "bg-green-500 shadow-green-500/40"}`}
              />
              <span
                className={`text-[10px] font-black tracking-widest uppercase ${isCollectorOnline ? "text-accent" : "text-white/60"}`}
              >
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
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                          {DEFAULT_TEMPLATES.map((t) => (
                            <div key={t.id} className="relative group">
                              <button
                                onClick={() => {
                                    setSelectedTemplate(t.id);
                                    setSelectedIds(new Set());
                                }}
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
                            queueItems={printQueue}
                            onUpdateElement={(id, updates) => {
                              if ("content" in updates)
                                updateDashboardElement(id, {
                                  content: updates.content,
                                });
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-8 w-full max-w-sm space-y-3">
                        {selectedTemplate === "despacho" ? (
                          <>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={buscaPedido}
                                onChange={(e) => setBuscaPedido(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    buscarDespacho(buscaPedido);
                                  }
                                }}
                                placeholder="Número do pedido..."
                                className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all text-center text-lg placeholder:text-white/10 shadow-inner"
                              />
                              <input
                                type="number"
                                value={volumes}
                                onChange={(e) => setVolumes(e.target.value)}
                                min="1"
                                placeholder="Volumes"
                                className="w-24 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-white font-bold outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all text-center text-lg placeholder:text-white/10 shadow-inner"
                              />
                              {dadosDespacho && (
                                <button
                                  onClick={() => {
                                    setBuscaPedido("");
                                    setDadosDespacho(null);
                                  }}
                                  className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-2xl px-4 py-2 transition-all"
                                  title="Limpar"
                                >
                                  <X size={20} />
                                </button>
                              )}
                            </div>
                            {loadingDespacho && (
                              <p className="text-center text-xs text-accent/60 font-medium">
                                Buscando dados do pedido...
                              </p>
                            )}
                            {dadosDespacho && (
                              <div className="bg-accent/5 border border-accent/20 rounded-2xl px-4 py-3 text-center">
                                <p className="text-xs text-white font-bold">
                                  {dadosDespacho.CLI_NOMCLI}
                                </p>
                                <p className="text-[10px] text-white/40 font-medium mt-1">
                                  Pedido: {dadosDespacho.FGO_NUMDOC} •{" "}
                                  {dadosDespacho.FGO_ESPDOC}
                                </p>
                                <p className="text-[10px] text-white/30 font-medium mt-0.5">
                                  Conferente: {dadosDespacho.NOME_CONFERENTE}
                                </p>
                              </div>
                            )}
                            {!dadosDespacho && !loadingDespacho && (
                              <p className="text-center text-[10px] text-white/30 font-medium">
                                Digite o número do pedido para gerar a etiqueta
                                de despacho
                              </p>
                            )}
                          </>
                        ) : (
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
                        )}
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
                      {(() => {
                        const activeId = Array.from(selectedIds).pop() || null;
                        return activeId && (
                          <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="glass-card rounded-2xl p-5 space-y-4 border-accent/20 bg-accent/5"
                        >
                          {(() => {
                            const activeId = Array.from(selectedIds).pop();
                            const el = editorData.elements.find(
                              (e) => e.id === activeId,
                            );
                            if (!el) return null;
                            return (
                              <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                    Propriedades:{" "}
                                    <span className="text-accent">
                                      {el.type}
                                    </span>
                                  </span>
                                  <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                                  >
                                    <X size={14} className="text-white/40" />
                                  </button>
                                </div>

                                <div className="space-y-6">
                                  {el.type === "image" && (
                                    <div className="space-y-3">
                                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                        Símbolos Disponíveis
                                      </label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {LOGISTICS_ICONS.map((icon) => (
                                          <button
                                            key={icon.name}
                                            title={icon.name}
                                            onClick={() => {
                                              updateEditorElement(el.id, {
                                                content: icon.data,
                                                w: 20,
                                                h: 20,
                                              });
                                              pushToHistory(
                                                editorData.elements,
                                              );
                                            }}
                                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-black/40 border border-white/5 hover:border-accent/40 transition-all text-white/40 hover:text-accent shadow-inner"
                                          >
                                            {icon.icon}
                                            <span className="text-[8px] leading-none">
                                              {icon.name}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
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
                                          className="flex-1 bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 transition-all"
                                        />
                                        {el.type === "image" && (
                                          <button
                                            onClick={() =>
                                              document
                                                .getElementById("img-up")
                                                ?.click()
                                            }
                                            className="p-2.5 rounded-xl bg-accent/20 border border-accent/20 text-accent hover:bg-accent/30 transition-all"
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
                                          className="w-full bg-black/40 border border-accent/20 text-[11px] text-white rounded-xl px-3 py-2.5 outline-none focus:border-accent/60 transition-all"
                                        >
                                          <option value="">
                                            — Manual (sem vínculo) —
                                          </option>
                                          <optgroup label="Produtos">
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
                                          </optgroup>
                                          <optgroup label="Despacho (Pedido)">
                                            <option value="FGO_NUMDOC">
                                              Número do Pedido
                                            </option>
                                            <option value="FGO_ESPDOC">
                                              Espécie do Documento
                                            </option>
                                            <option value="CLI_NOMCLI">
                                              Nome do Cliente
                                            </option>
                                            <option value="NOME_CONFERENTE">
                                              Nome do Conferente
                                            </option>
                                            <option value="VOLUMES">
                                              Volumes
                                            </option>
                                          </optgroup>
                                        </select>
                                      </div>
                                    )}

                                    {el.type === "text" && (
                                      <>
                                        {/* Dimensões e Medidas */}
                                        <div className="glass-card rounded-xl p-5 border-white/10 bg-white/[0.03] space-y-4">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Type
                                              size={14}
                                              className="text-accent"
                                            />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                              Dimensões
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Tamanho Fonte
                                              </label>
                                              <input
                                                type="number"
                                                step="0.5"
                                                min="1"
                                                max="72"
                                                value={el.fontSize ?? 4}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    fontSize: parseFloat(
                                                      e.target.value,
                                                    ),
                                                  })
                                                }
                                                className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40 transition-all"
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Altura Linha
                                              </label>
                                              <input
                                                type="number"
                                                step="0.1"
                                                min="0.5"
                                                max="3"
                                                value={el.lineHeight ?? 1.3}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    lineHeight: parseFloat(
                                                      e.target.value,
                                                    ),
                                                  })
                                                }
                                                className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40 transition-all"
                                              />
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Largura (mm)
                                              </label>
                                              <input
                                                type="number"
                                                step="1"
                                                min="10"
                                                value={el.w ?? 50}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    w: Math.max(
                                                      10,
                                                      parseFloat(
                                                        e.target.value,
                                                      ) || 50,
                                                    ),
                                                  })
                                                }
                                                className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40 transition-all"
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Altura (mm)
                                              </label>
                                              <input
                                                type="number"
                                                step="0.5"
                                                min="5"
                                                value={el.h ?? 10}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    h: Math.max(
                                                      5,
                                                      parseFloat(
                                                        e.target.value,
                                                      ) || 10,
                                                    ),
                                                  })
                                                }
                                                className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40 transition-all"
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        {/* Estilo do Texto */}
                                        <div className="glass-card rounded-xl p-5 border-white/10 bg-white/[0.03] space-y-4">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Type
                                              size={14}
                                              className="text-accent"
                                            />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                              Estilo
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-3">
                                            <button
                                              onClick={() =>
                                                updateEditorElement(el.id, {
                                                  bold: !el.bold,
                                                })
                                              }
                                              className={`py-3 px-4 rounded-xl border text-[10px] font-black transition-all ${el.bold ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 text-white/40 border-white/10 hover:bg-white/5 hover:text-white"}`}
                                            >
                                              <div className="flex flex-col items-center gap-1">
                                                <span className="text-lg leading-none">
                                                  B
                                                </span>
                                                <span>Bold</span>
                                              </div>
                                            </button>
                                            <button
                                              onClick={() =>
                                                updateEditorElement(el.id, {
                                                  italic: !el.italic,
                                                })
                                              }
                                              className={`py-3 px-4 rounded-xl border text-[10px] font-black transition-all ${el.italic ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 text-white/40 border-white/10 hover:bg-white/5 hover:text-white"}`}
                                            >
                                              <div className="flex flex-col items-center gap-1">
                                                <span className="text-lg leading-none italic">
                                                  I
                                                </span>
                                                <span>Italic</span>
                                              </div>
                                            </button>
                                          </div>

                                          <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                              Alinhamento
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                              {(
                                                [
                                                  "left",
                                                  "center",
                                                  "right",
                                                ] as const
                                              ).map((a) => (
                                                <button
                                                  key={a}
                                                  onClick={() =>
                                                    updateEditorElement(el.id, {
                                                      align: a,
                                                    })
                                                  }
                                                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${el.align === a || (!el.align && a === "center") ? "bg-accent/20 border-accent/40 text-accent" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                >
                                                  {a === "left" ? (
                                                    <AlignLeft size={16} />
                                                  ) : a === "center" ? (
                                                    <AlignCenter size={16} />
                                                  ) : (
                                                    <AlignRight size={16} />
                                                  )}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Fonte */}
                                        <div className="glass-card rounded-xl p-5 border-white/10 bg-white/[0.03] space-y-4">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Type
                                              size={14}
                                              className="text-accent"
                                            />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                              Fonte
                                            </span>
                                          </div>
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                            Fonte
                                          </label>
                                          <button
                                            onClick={() =>
                                              setShowFontMenu(!showFontMenu)
                                            }
                                            className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2.5 outline-none flex items-center justify-between group hover:border-accent/40 transition-all"
                                          >
                                            <span
                                              style={{
                                                fontFamily:
                                                  el.fontFamily || "Inter",
                                              }}
                                            >
                                              {el.fontFamily || "Inter"}
                                            </span>
                                            <ChevronDown
                                              size={14}
                                              className={`text-white/20 group-hover:text-accent transition-transform ${showFontMenu ? "rotate-180" : ""}`}
                                            />
                                          </button>

                                          <AnimatePresence>
                                            {showFontMenu && (
                                              <>
                                                <div
                                                  className="fixed inset-0 z-[100]"
                                                  onClick={() =>
                                                    setShowFontMenu(false)
                                                  }
                                                />
                                                <motion.div
                                                  initial={{
                                                    opacity: 0,
                                                    y: 10,
                                                    scale: 0.95,
                                                  }}
                                                  animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                    scale: 1,
                                                  }}
                                                  exit={{
                                                    opacity: 0,
                                                    y: 10,
                                                    scale: 0.95,
                                                  }}
                                                  className="absolute bottom-full left-0 w-full mb-2 bg-[#0A0F1E] border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden max-h-[280px] overflow-y-auto custom-scrollbar"
                                                >
                                                  <div className="p-2 space-y-1">
                                                    {fonts.map((f) => (
                                                      <button
                                                        key={f.name}
                                                        onClick={() => {
                                                          updateEditorElement(
                                                            el.id,
                                                            {
                                                              fontFamily:
                                                                f.name,
                                                            },
                                                          );
                                                          setShowFontMenu(
                                                            false,
                                                          );
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                                                          (el.fontFamily ||
                                                            "Inter") === f.name
                                                            ? "bg-accent text-black"
                                                            : "text-white/60 hover:bg-white/5 hover:text-white"
                                                        }`}
                                                      >
                                                        <span
                                                          style={{
                                                            fontFamily:
                                                              f.family,
                                                            fontSize: "14px",
                                                          }}
                                                        >
                                                          {f.name}
                                                        </span>
                                                        {(el.fontFamily ||
                                                          "Inter") ===
                                                          f.name && (
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
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                            Formato
                                          </label>
                                          <select
                                            value={el.bcFormat || "CODE128"}
                                            onChange={(e) =>
                                              updateEditorElement(el.id, {
                                                bcFormat: e.target.value,
                                              })
                                            }
                                            className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent"
                                          >
                                            <option value="CODE128">
                                              CODE 128
                                            </option>
                                            <option value="CODE39">
                                              CODE 39
                                            </option>
                                            <option value="EAN13">
                                              EAN-13
                                            </option>
                                            <option value="EAN8">EAN-8</option>
                                            <option value="ITF14">
                                              ITF-14
                                            </option>
                                            <option value="UPC">UPC-A</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                            Tam. Fonte
                                          </label>
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            value={el.bcFontSize ?? 2.8}
                                            onChange={(e) => {
                                              const val = parseFloat(
                                                e.target.value,
                                              );
                                              updateEditorElement(el.id, {
                                                bcFontSize: isNaN(val)
                                                  ? 2.8
                                                  : val,
                                              });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent"
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                            Dist. Números
                                          </label>
                                          <input
                                            type="number"
                                            step="0.1"
                                            value={el.bcLabelDist ?? 1}
                                            onChange={(e) => {
                                              const val = parseFloat(
                                                e.target.value,
                                              );
                                              updateEditorElement(el.id, {
                                                bcLabelDist: isNaN(val)
                                                  ? 1
                                                  : val,
                                              });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 text-[11px] text-white rounded-xl px-3 py-2 outline-none focus:border-accent"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {(el.type === "line" ||
                                      el.type === "rect") && (
                                      <>
                                        {/* Dimensões e Orientação da Shape */}
                                        <div className="glass-card rounded-xl p-5 border-white/10 bg-white/[0.03] space-y-4">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Minus
                                              size={14}
                                              className="text-accent"
                                            />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                              Dimensões & Orientação
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Largura (mm)
                                              </label>
                                              <input
                                                type="number"
                                                step="1"
                                                min="5"
                                                value={el.w ?? 20}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    w: Math.max(
                                                      5,
                                                      parseFloat(
                                                        e.target.value,
                                                      ) || 20,
                                                    ),
                                                  })
                                                }
                                                className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40 transition-all"
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Altura (mm)
                                              </label>
                                              <input
                                                type="number"
                                                step="1"
                                                min="5"
                                                value={el.h ?? 10}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    h: Math.max(
                                                      5,
                                                      parseFloat(
                                                        e.target.value,
                                                      ) || 10,
                                                    ),
                                                  })
                                                }
                                                className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent/40 transition-all"
                                              />
                                            </div>
                                          </div>

                                          {el.type === "line" && (
                                            <>
                                              <div className="space-y-1.5 pt-2">
                                                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                  Orientação
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        {
                                                          rotation: 0,
                                                          h: Math.max(
                                                            el.w ?? 20,
                                                            el.h ?? 10,
                                                          ),
                                                        },
                                                      )
                                                    }
                                                    className={`py-2 rounded-xl border text-[9px] font-black transition-all ${el.rotation === 180 || el.rotation === -180 ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                  >
                                                    Horizontal
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        {
                                                          rotation: 90,
                                                          w: Math.max(
                                                            el.w ?? 20,
                                                            el.h ?? 10,
                                                          ),
                                                        },
                                                      )
                                                    }
                                                    className={`py-2 rounded-xl border text-[9px] font-black transition-all ${el.rotation === 90 || el.rotation === -90 ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                  >
                                                    Vertical
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        { rotation: 45 },
                                                      )
                                                    }
                                                    className={`py-2 rounded-xl border text-[9px] font-black transition-all ${el.rotation === 45 || el.rotation === -135 ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                  >
                                                    Diagonal
                                                  </button>
                                                </div>
                                              </div>

                                              <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                  Estilo da Linha
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                  <button
                                                    onClick={() => {
                                                      updateEditorElement(
                                                        el.id,
                                                        {
                                                          strokeDasharray:
                                                            undefined,
                                                          lineDash: undefined,
                                                        },
                                                      );
                                                    }}
                                                    className={`py-2 px-2 rounded-xl border text-[9px] font-black transition-all flex flex-col items-center gap-1 ${!el.strokeDasharray ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                  >
                                                    <div className="h-4 border-b-2 border-current" />
                                                    <span>Sólida</span>
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        {
                                                          strokeDasharray: [
                                                            4, 4,
                                                          ],
                                                        },
                                                      )
                                                    }
                                                    className={`py-2 px-2 rounded-xl border text-[9px] font-black transition-all flex flex-col items-center gap-1 ${JSON.stringify(el.strokeDasharray) === JSON.stringify([4, 4]) ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                  >
                                                    <div
                                                      className="h-4 flex items-center justify-between"
                                                      style={{ gap: "6px" }}
                                                    >
                                                      <div className="h-2 w-3 border-b-2 border-current" />
                                                      <div className="h-2 w-3 border-[1px] border-dashed border-current" />
                                                    </div>
                                                    <span>Pontuada</span>
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        {
                                                          strokeDasharray: [
                                                            10, 5,
                                                          ],
                                                        },
                                                      )
                                                    }
                                                    className={`py-2 px-2 rounded-xl border text-[9px] font-black transition-all flex flex-col items-center gap-1 ${JSON.stringify(el.strokeDasharray) === JSON.stringify([10, 5]) ? "bg-accent text-black border-accent shadow-lg shadow-accent/20" : "bg-black/40 border-white/10 text-white/40 hover:text-white"}`}
                                                  >
                                                    <div
                                                      className="h-4 flex items-center justify-between"
                                                      style={{ gap: "4px" }}
                                                    >
                                                      <div className="h-2 w-6 border-b-2 border-current" />
                                                      <div className="h-2 w-3 border-b-[3px] border-current" />
                                                    </div>
                                                    <span>Pontilhada</span>
                                                  </button>
                                                </div>
                                              </div>

                                              <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                  Espessura da Linha
                                                </label>
                                                <div className="flex items-center gap-3">
                                                  <input
                                                    type="range"
                                                    min="0.5"
                                                    max="20"
                                                    step="0.5"
                                                    value={el.strokeWidth ?? 1}
                                                    onChange={(e) =>
                                                      updateEditorElement(
                                                        el.id,
                                                        {
                                                          strokeWidth:
                                                            parseFloat(
                                                              e.target.value,
                                                            ),
                                                        },
                                                      )
                                                    }
                                                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                                                  />
                                                  <span className="text-sm font-bold text-white w-12 text-right">
                                                    {el.strokeWidth?.toFixed(1)}
                                                    mm
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Presets de Comprimento */}
                                              <div className="space-y-1.5 pt-2">
                                                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                  Presets Rápidos
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        { w: 50 },
                                                      )
                                                    }
                                                    className="py-2 px-2 rounded-xl border text-[8px] font-bold bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                  >
                                                    Curta
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        { w: 80 },
                                                      )
                                                    }
                                                    className="py-2 px-2 rounded-xl border text-[8px] font-bold bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                  >
                                                    Média
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        { w: 100, h: 5 },
                                                      )
                                                    }
                                                    className="py-2 px-2 rounded-xl border text-[8px] font-bold bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                  >
                                                    Longa
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      updateEditorElement(
                                                        el.id,
                                                        { rotation: 0, w: 90 },
                                                      )
                                                    }
                                                    className="py-2 px-2 rounded-xl border text-[8px] font-bold bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                  >
                                                    Cheia
                                                  </button>
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>

                                        {/* Estilo da Shape */}
                                        {el.type === "rect" && (
                                          <div className="glass-card rounded-xl p-5 border-white/10 bg-white/[0.03] space-y-4">
                                            <div className="flex items-center gap-2 mb-3">
                                              <SquareIcon
                                                size={14}
                                                className="text-accent"
                                              />
                                              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                Estilo
                                              </span>
                                            </div>

                                            <button
                                              onClick={() =>
                                                updateEditorElement(el.id, {
                                                  fill: !el.fill,
                                                })
                                              }
                                              className={`w-full py-4 px-4 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 ${
                                                el.fill
                                                  ? "bg-accent text-black border-accent shadow-lg shadow-accent/20"
                                                  : "bg-black/40 text-white/40 border-white/10 hover:bg-white/5 hover:text-white"
                                              }`}
                                            >
                                              <div
                                                className={`w-6 h-6 rounded border-2 ${el.fill ? "bg-current" : "bg-transparent"}`}
                                              />
                                              <span>
                                                {el.fill
                                                  ? "Preenchido"
                                                  : "Contorno"}
                                              </span>
                                            </button>

                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Cor da Borda
                                              </label>
                                              <input
                                                type="color"
                                                value={el.color ?? "#000000"}
                                                onChange={(e) =>
                                                  updateEditorElement(el.id, {
                                                    color: e.target.value,
                                                  })
                                                }
                                                className="w-full h-10 rounded-xl bg-transparent border border-white/10 cursor-pointer"
                                              />
                                            </div>

                                            {/* Efeito 3D - Sombra */}
                                            <div className="space-y-1.5">
                                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                                Efeito 3D
                                              </label>
                                              <button
                                                onClick={() =>
                                                  updateEditorElement(el.id, {
                                                    fill: true,
                                                    color: "#0096DA",
                                                  })
                                                }
                                                className="w-full py-2 px-4 rounded-xl border text-[10px] font-bold bg-[#0096DA]/20 border-[#0096DA]/40 text-[#0096DA] hover:bg-[#0096DA]/30 transition-all"
                                              >
                                                Aplicar Azul 3D
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {el.type === "image" && (
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                            W (mm)
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
                                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest ml-1">
                                            H (mm)
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
                              </div>
                            );
                          })()}
                        </motion.div>
                      );
                    })()}
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
                      onClick={handleSaveToSource}
                      className="flex-1 bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 font-bold rounded-xl py-2.5 transition-all text-xs"
                    >
                      Salvar no Código
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
                      selectedIds={selectedIds}
                      selectedId={Array.from(selectedIds).pop() || null}
                      onSelectElement={(id) => {
                        if (id === null) {
                          setSelectedIds(new Set());
                        } else {
                          // Se Shift está pressionado, lida lá no componente, 
                          // ou passamos info de Shift?
                          // O componente LabelPreview já gerencia shift se deixarmos.
                          // Mas queremos que o estado venha daqui.
                          setSelectedIds(new Set([id]));
                        }
                      }}
                      onSelectMultiple={(ids) => setSelectedIds(ids)}
                      onCloneElements={duplicateElements}
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
                        setSelectedIds(new Set([id]));
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
                      Configurações{" "}
                      <span className="text-accent underline decoration-accent/20 decoration-4 underline-offset-8">
                        Gerais
                      </span>
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
                                <p className="text-xl font-black text-accent uppercase tracking-tighter">
                                  Conector Ativo
                                </p>
                                <p className="text-[10px] text-white/40 font-bold uppercase leading-relaxed tracking-widest max-w-[240px]">
                                  Escaneie o código acima com o coletor para
                                  iniciar a operação remota
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                              Buscando IP...
                            </p>
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

                        <div className="pt-6 border-t border-white/5 space-y-4">
                          <div className="flex items-center gap-3">
                            <SquareIcon size={16} className="text-white/20" />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                              Padrão 1 Coluna
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Field
                              label="L (mm)"
                              value={config.width1.toString()}
                              onChange={(v) =>
                                setConfig((p: any) => ({
                                  ...p,
                                  width1: Number(v),
                                }))
                              }
                            />
                            <Field
                              label="A (mm)"
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

                        <div className="pt-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <Columns size={16} className="text-white/20" />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                              Padrão 2 Colunas
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <Field
                              label="L (mm)"
                              value={config.width2.toString()}
                              onChange={(v) =>
                                setConfig((p: any) => ({
                                  ...p,
                                  width2: Number(v),
                                }))
                              }
                            />
                            <Field
                              label="A (mm)"
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
                        <h3 className="font-bold text-white">
                          Interface Visual
                        </h3>
                        <p className="text-xs text-white/40 font-medium">
                          Escolha o estilo de fundo do DonlyX
                        </p>
                      </div>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                      <button
                        onClick={() =>
                          setConfig((p: any) => ({ ...p, theme: "dark" }))
                        }
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${config.theme === "dark" ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"}`}
                      >
                        Sólido
                      </button>
                      <button
                        onClick={() =>
                          setConfig((p: any) => ({ ...p, theme: "glass" }))
                        }
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

