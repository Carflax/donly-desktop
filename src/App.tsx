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
    <div className="h-screen w-screen select-none overflow-hidden">
    <div className="flex h-full w-full overflow-hidden text-slate-100 glass-panel shadow-[0_0_40px_rgba(0,0,0,0.6)]">
      {/* Custom Titlebar - drag region across full top */}
      <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-10 z-50 flex items-center">
        <div className="flex items-center gap-2 px-4 pointer-events-none">
          <Printer size={14} className="text-blue-400" />
          <span className="text-xs font-semibold text-slate-300">Donly</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => getCurrentWindow().minimize()} className="w-12 h-10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
          <Minus size={14} />
        </button>
        <button onClick={() => getCurrentWindow().toggleMaximize()} className="w-12 h-10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
          <Square size={12} />
        </button>
        <button onClick={() => getCurrentWindow().close()} className="w-12 h-10 flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors rounded-tr-2xl">
          <X size={14} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className="w-[240px] flex flex-col pt-12 pb-8 px-5">
        {/* Drag region */}
        <div data-tauri-drag-region className="mb-10 h-4 cursor-default"></div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeNav === item.id
                  ? "bg-blue-500/20 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 pt-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
            <User size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Alex Carter</p>
            <p className="text-xs text-slate-400">Premium Account</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">

        {/* Create New Label Panel */}
        <section className="flex-1 pt-12 px-10 pb-10 flex flex-col overflow-hidden">
          <div className="mb-8 shrink-0">
            <h2 className="text-2xl font-bold text-white">Create New Label</h2>
            <p className="text-slate-400 text-sm mt-1">Design your shipping label</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTemplate}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {selectedTemplate === "daniel" && (
                  <>
                    <Field label="Item / Título" value={data.daniel.item} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, item: v } }))} />
                    <Field label="Nº Caixa" value={data.daniel.caixa} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, caixa: v } }))} />
                    <Field label="Nº Pedido" value={data.daniel.pedido} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, pedido: v } }))} />
                    <Field label="PD Original" value={data.daniel.pd} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, pd: v } }))} />
                    <Field label="PC" value={data.daniel.peca} onChange={(v) => setData(p => ({ ...p, daniel: { ...p.daniel, peca: v } }))} />
                  </>
                )}

                {selectedTemplate === "dupla" && (
                  <>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Lado Esquerdo</span>
                    </div>
                    <Field label="Nome Item" value={data.dupla.nomeEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, nomeEsq: v}}))} />
                    <Field label="Nº Caixa" value={data.dupla.caixaEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, caixaEsq: v}}))} />
                    <Field label="Código" value={data.dupla.barcodeEsq} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, barcodeEsq: v}}))} />

                    <div className="flex items-center gap-2 pt-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Lado Direito</span>
                    </div>
                    <Field label="Nome Item" value={data.dupla.nomeDir} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, nomeDir: v}}))} />
                    <Field label="Nº Caixa" value={data.dupla.caixaDir} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, caixaDir: v}}))} />
                    <Field label="Código" value={data.dupla.barcodeDir} onChange={(v) => setData(p => ({...p, dupla: {...p.dupla, barcodeDir: v}}))} />
                  </>
                )}

                {selectedTemplate === "fragil" && (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Atenção Especial</h3>
                      <p className="text-slate-400 text-sm max-w-[240px] mt-1">Esta etiqueta é estática e não exige preenchimento.</p>
                    </div>
                  </div>
                )}

                {selectedTemplate === "completa" && (
                  <>
                    <Field label="Produto Nome Completo" value={data.completa.produto} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, produto: v } }))} />
                    <Field label="Caixa" value={data.completa.caixa} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, caixa: v } }))} />
                    <Field label="Fornecedor" value={data.completa.fornecedor} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, fornecedor: v } }))} />
                    <Field label="Cód. de Barras (EAN13)" value={data.completa.barcode} onChange={(v) => setData(p => ({ ...p, completa: { ...p.completa, barcode: v } }))} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Template Selector */}
          <div className="shrink-0 mt-6 mb-6">
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full appearance-none input-glass rounded-xl px-5 py-3.5 text-sm text-slate-200 font-medium outline-none cursor-pointer"
              >
                <option value="" disabled>Select Template</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-800">{t.label} — {t.size}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex items-center gap-4">
            <button className="flex-1 py-3.5 rounded-xl bg-white/[0.03] text-sm font-semibold text-slate-300 hover:bg-white/[0.06] transition-all active:scale-[0.98]">
              Save Draft
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Printer size={16} />
              {isPrinting ? "Printing..." : "Print Label"}
              {printStatus === "Pronto!" && <CheckCircle2 size={16} />}
            </button>
          </div>
        </section>

        {/* Label Preview Panel */}
        <section className="w-[400px] shrink-0 pt-12 px-10 pb-10 flex flex-col overflow-hidden">
          <div className="mb-6 shrink-0">
            <h2 className="text-xl font-bold text-white">Label Preview</h2>
            <p className="text-slate-400 text-sm mt-1">{currentTemplate.size}</p>
          </div>

          <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <LabelPreview
                data={data}
                width={currentTemplate.w}
                height={currentTemplate.h}
                dpi={203}
              />
            </div>
          </div>

          {/* Printer & Copies */}
          <div className="shrink-0 mt-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Impressora</p>
              <select
                value={selectedPrinter}
                onChange={e => setSelectedPrinter(e.target.value)}
                className="text-sm font-medium bg-transparent text-slate-200 outline-none cursor-pointer hover:text-blue-400 transition-colors"
              >
                {printers.length > 0 ? printers.map(p => <option key={p} className="bg-slate-800">{p}</option>) : <option>Elgin L42 Pro (RAW)</option>}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cópias</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-7 h-7 rounded-lg bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-base font-bold">−</button>
                <span className="text-sm font-bold text-white w-6 text-center">{copies}</span>
                <button onClick={() => setCopies(copies + 1)} className="w-7 h-7 rounded-lg bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-base font-bold">+</button>
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
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-glass w-full rounded-xl px-4 py-3 outline-none text-sm text-slate-100 font-medium placeholder:text-slate-600"
        placeholder={label}
      />
    </div>
  );
}
