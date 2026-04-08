import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Printer,
  Settings,
  LayoutDashboard,
  Package,
  FileText,
  ChevronDown,
  User,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Square,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LabelPreview, { LabelData } from "./components/LabelPreview";
import { canvasToMonoBitmap, generateTSPL } from "./tspl";

import daniloImg from "./danilo.png";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "printers", label: "Printers", icon: Printer },
  { id: "packages", label: "Packages", icon: Package },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const templates = [
  { id: "daniel", label: "Daniel", size: "90×48mm", w: 90, h: 48 },
  { id: "dupla", label: "Dupla", size: "100×30mm", w: 100, h: 30 },
  { id: "fragil", label: "Frágil", size: "90×48mm", w: 90, h: 48 },
  { id: "completa", label: "Completa", size: "90×48mm", w: 90, h: 48 },
];

export default function App() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [selectedTemplate, setSelectedTemplate] = useState("daniel");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printStatus, setPrintStatus] = useState("");
  const [copies, setCopies] = useState(1);

  const [data, setData] = useState<LabelData>({
    activeTab: "daniel",
    daniel: { item: "ITEM 10", caixa: "00246", pedido: "80025956", pd: "4501064590", peca: "20" },
    dupla: {
       nomeEsq: "TESTE 1", caixaEsq: "00001", barcodeEsq: "123456789",
       nomeDir: "TESTE 2", caixaDir: "00002", barcodeDir: "123456789"
    },
    completa: { produto: "TUBO EG BR PVC 100MM (10472) AMANCO", caixa: "00329", fornecedor: "AMANCO", barcode: "7891960280044" }
  });

  useEffect(() => {
    invoke<string[]>("get_printers").then(setPrinters).catch(() => {});
  }, []);

  useEffect(() => {
    setData(prev => ({ ...prev, activeTab: selectedTemplate }));
  }, [selectedTemplate]);

  const currentTemplate = templates.find(t => t.id === selectedTemplate)!;

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
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Printer size={16} className="text-blue-400" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white/90">Donly <span className="text-blue-400">Desktop</span></span>
        </div>

        <div className="flex items-center h-full no-drag">
          <button onClick={() => getCurrentWindow().minimize()} className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <Minus size={16} />
          </button>
          <button onClick={() => getCurrentWindow().toggleMaximize()} className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <Square size={12} />
          </button>
          <button onClick={() => getCurrentWindow().close()} className="w-12 h-full flex items-center justify-center hover:bg-red-500 text-slate-400 hover:text-white transition-colors">
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeNav === item.id
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
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
                <p className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Desenvolvedor</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Label Configuration */}
          <section className="flex-1 flex flex-col p-8 overflow-hidden">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">Etiqueta de Envio</h1>
              <p className="text-slate-400 text-sm mt-1">Configure as informações de impressão</p>
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
                          <label className="text-[10px] uppercase tracking-widest font-bold text-blue-400">Lado Esquerdo</label>
                          <Field label="Nome Item" value={data.dupla.nomeEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, nomeEsq: v}}))} />
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Nº Caixa" value={data.dupla.caixaEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, caixaEsq: v}}))} />
                            <Field label="Código" value={data.dupla.barcodeEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, barcodeEsq: v}}))} />
                          </div>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="space-y-4">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Lado Direito</label>
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
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 ml-1 tracking-wide">MODELO DE ETIQUETA</label>
                <div className="relative">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full appearance-none input-field rounded-xl px-5 py-3 text-sm font-medium cursor-pointer"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id} className="bg-black">{t.label} ({t.size})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-all">Salvar Rascunho</button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                <Printer size={18} />
                {isPrinting ? "Imprimindo..." : "Imprimir Etiqueta"}
                {printStatus === "Pronto!" && <CheckCircle2 size={18} className="text-blue-200" />}
              </button>
            </div>
          </section>

          {/* Preview Sidebar */}
          <section className="w-[420px] p-8 border-l border-white/5 flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Preview Final</h2>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-widest">{currentTemplate.size} @ 203 DPI</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">LIVE</div>
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
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impressora</span>
                  </div>
                  <select
                    value={selectedPrinter}
                    onChange={e => setSelectedPrinter(e.target.value)}
                    className="text-xs font-bold text-slate-300 bg-transparent outline-none cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    {printers.length > 0 ? printers.map(p => <option key={p} className="bg-black">{p}</option>) : <option>Elgin L42 Pro (RAW)</option>}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantidade</span>
                  <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-bold">−</button>
                    <span className="text-sm font-bold text-white w-4 text-center">{copies}</span>
                    <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-bold">+</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full rounded-xl px-4 py-2.5 text-sm font-medium placeholder:text-slate-700"
        placeholder={`Digite ${label.toLowerCase()}...`}
      />
    </div>
  );
}
