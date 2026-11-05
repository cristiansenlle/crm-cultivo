"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import {
    BookOpen,
    Plus,
    Clock,
    PencilSimple,
    Trash,
    AppWindow,
    Hash,
    Leaf,
    Flask,
    CloudArrowDown,
    CheckCircle,
    Sparkle,
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import {
    FertilizationPlan,
    RED_HOT_COOKIES_FEEDING_PLAN,
    loadFertilizationPlans,
    saveFertilizationPlan,
} from "../../lib/agronomy/fertilizationPlanEngine";

export default function ProtocolosPage() {
    const [protocols, setProtocols] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Fertilization Plans & Google Sheets Importer states
    const [fertPlans, setFertPlans] = useState<FertilizationPlan[]>([RED_HOT_COOKIES_FEEDING_PLAN]);
    const [selectedFertPlan, setSelectedFertPlan] = useState<FertilizationPlan>(RED_HOT_COOKIES_FEEDING_PLAN);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [sheetUrl, setSheetUrl] = useState(
        "https://docs.google.com/spreadsheets/d/1S_WwJzAy0mzaA7rRXLdDw5_05DDrF2B0UBs0AwqrLMc/edit?usp=sharing"
    );
    const [customPlanName, setCustomPlanName] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [importFeedback, setImportFeedback] = useState<string | null>(null);

    // Form & View states for SOPs
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [stage, setStage] = useState("Vegetativo");
    const [topic, setTopic] = useState("Nutrición");
    const [content, setContent] = useState("");
    const [activeProtocol, setActiveProtocol] = useState<any>(null);

    const loadProtocols = async () => {
        setLoading(true);
        const [{ data, error }, loadedPlans] = await Promise.all([
            supabase.from("core_protocols").select("*").order("created_at", { ascending: false }),
            loadFertilizationPlans(supabase),
        ]);
        if (data && !error) setProtocols(data);
        if (loadedPlans && loadedPlans.length > 0) {
            setFertPlans(loadedPlans);
            setSelectedFertPlan(loadedPlans[0]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProtocols();
    }, []);

    const handleImportGoogleSheet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sheetUrl.trim()) return;
        setIsImporting(true);
        setImportFeedback(null);
        try {
            const res = await fetch("/api/agronomy/import-sheet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sheetUrl: sheetUrl.trim(),
                    customName: customPlanName.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.plan) {
                throw new Error(data.error || "Error al importar el documento.");
            }

            await saveFertilizationPlan(supabase, data.plan);
            const updated = await loadFertilizationPlans(supabase);
            setFertPlans(updated);
            setSelectedFertPlan(data.plan);
            setImportFeedback(`✅ Plan "${data.plan.name}" importado con ${data.plan.weeks_schedule?.length || 0} semanas.`);
            setTimeout(() => {
                setIsImportModalOpen(false);
                setImportFeedback(null);
            }, 1500);
        } catch (err: any) {
            alert("Error importando Google Sheet: " + err.message);
        } finally {
            setIsImporting(false);
        }
    };

    const openNewModal = () => {
        setEditingId(null);
        setTitle("");
        setStage("Vegetativo");
        setTopic("Nutrición");
        setContent("");
        setIsModalOpen(true);
    };

    const openEditModal = (p: any) => {
        setEditingId(p.id);
        setTitle(p.title || "");
        setStage(p.stage || "Vegetativo");
        setTopic(p.topic || "Nutrición");
        setContent(p.content || "");
        setIsViewModalOpen(false);
        setIsModalOpen(true);
    };

    const openViewModal = (p: any) => {
        setActiveProtocol(p);
        setIsViewModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { title, stage, topic, content };
        let err = null;
        if (editingId) {
            const { error } = await supabase.from("core_protocols").update(payload).eq("id", editingId);
            err = error;
        } else {
            const { error } = await supabase.from("core_protocols").insert([payload]);
            err = error;
        }

        if (err) return alert("Error Guardando: " + err.message);
        setIsModalOpen(false);
        loadProtocols();
    };

    const handleDelete = async () => {
        if (!activeProtocol) return;
        if (!window.confirm("¿Seguro de Eliminar este protocolo?")) return;

        const { error } = await supabase.from("core_protocols").delete().eq("id", activeProtocol.id);
        if (!error) {
            setIsViewModalOpen(false);
            loadProtocols();
        } else {
            alert("Error eliminando.");
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
            {/* Header */}
            <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-amber-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="z-10">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <BookOpen size={32} className="text-amber-500" />
                        Protocolos Operativos & Planes de Fertilización
                    </h1>
                    <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2">
                        Programas Semanales por Lote (g/L, ml/L, pH, EC, PPM 500), Correlación Visión IA y SOPs
                    </p>
                </div>
                <div className="z-10 flex flex-wrap gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] font-bold uppercase tracking-wider text-xs cursor-pointer"
                    >
                        <CloudArrowDown size={18} weight="bold" /> Importar Plan Google Sheet
                    </button>
                    <button
                        onClick={openNewModal}
                        className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-foreground rounded-lg transition-transform hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-bold uppercase tracking-wider text-xs cursor-pointer"
                    >
                        <Plus size={18} weight="bold" /> Crear SOP Manual
                    </button>
                </div>
            </GlassCard>

            {/* Sección Principal: Planes de Fertilización Semanal por Lote */}
            <GlassCard className="p-6 border border-emerald-500/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-panel-border mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Flask size={22} className="text-emerald-400" weight="fill" />
                            <h2 className="text-lg font-extrabold text-foreground">
                                Programas de Fertilización Semanal (Asignables a Lotes y Visión IA)
                            </h2>
                        </div>
                        <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400 mt-1">
                            Sincronización automática con días transcurridos, fotoperíodos extendidos (&gt;24 hs) y Visión IA
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedFertPlan.id}
                            onChange={(e) => {
                                const found = fertPlans.find((p) => p.id === e.target.value);
                                if (found) setSelectedFertPlan(found);
                            }}
                            className="bg-black/30 border border-panel-border rounded-lg px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-emerald-500"
                        >
                            {fertPlans.map((p) => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Resumen de Semanas del Plan Seleccionado */}
                <div className="overflow-x-auto rounded-xl border border-panel-border">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-black/40 border-b border-panel-border text-[10px] font-mono uppercase text-slate-400">
                                <th className="py-2.5 px-3">Fase / Semana</th>
                                <th className="py-2.5 px-3">Fenología</th>
                                <th className="py-2.5 px-3">🅰️ Riego Principal (Sales Minerales)</th>
                                <th className="py-2.5 px-3">🅱️ Riego Secundario (Agua / Bio)</th>
                                <th className="py-2.5 px-3 text-center">Agua/Pl.</th>
                                <th className="py-2.5 px-3 text-center">pH Obj.</th>
                                <th className="py-2.5 px-3 text-center">EC Obj.</th>
                                <th className="py-2.5 px-3 text-center">PPM (500)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedFertPlan.weeks_schedule.map((w) => (
                                <tr key={w.week_id} className="border-b border-panel-border/30 hover:bg-white/[0.02]">
                                    <td className="py-2.5 px-3 font-mono font-bold">
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                                                w.stage === "vegetativo"
                                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                                    : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                            }`}
                                        >
                                            {w.stage === "vegetativo" ? "VEG" : "FLORA"} S{w.week_number}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-foreground">{w.phenology}</td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300">
                                        {w.primary_summary}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-300">
                                        {w.secondary_summary}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-blue-300">
                                        {selectedFertPlan.water_per_plant_liters} L
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-300">
                                        {w.target_ph_min.toFixed(1)}-{w.target_ph_max.toFixed(1)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                                        {w.target_ec_min.toFixed(1)}
                                        {w.target_ec_max !== w.target_ec_min ? `-${w.target_ec_max.toFixed(1)}` : ""}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-300">
                                        {w.target_ppm_min}
                                        {w.target_ppm_max !== w.target_ppm_min ? `-${w.target_ppm_max}` : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Reglas de Oro del Plan */}
                {selectedFertPlan.technical_protocols && selectedFertPlan.technical_protocols.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {selectedFertPlan.technical_protocols.map((prot, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 flex flex-col gap-1"
                            >
                                <span className="text-xs font-bold text-amber-400">{prot.title}</span>
                                <p className="text-[11px] text-slate-300 leading-relaxed">{prot.bullets.join(" ")}</p>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* Grid de SOPs Manuales */}
            <div className="flex items-center justify-between mt-2">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkle size={18} className="text-amber-400" />
                    Biblioteca de Procedimientos Operativos (SOPs)
                </h2>
            </div>

            {loading ? (
                <div className="py-20 text-center font-mono opacity-50">Sincronizando biblioteca...</div>
            ) : protocols.length === 0 ? (
                <div className="py-12 text-center font-mono opacity-50 border border-dashed border-panel-border rounded-xl">
                    Sin protocolos manuales adicionales.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {protocols.map((p, idx) => (
                        <div
                            key={idx}
                            onClick={() => openViewModal(p)}
                            className="p-6 rounded-2xl bg-black/[0.03] dark:bg-black/20 border border-panel-border/50 hover:bg-black/[0.05] dark:bg-black/30 hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col h-[250px]"
                        >
                            <div className="flex gap-2 mb-4">
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1">
                                    <Leaf size={12} />
                                    {p.stage}
                                </span>
                                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1">
                                    <Hash size={12} />
                                    {p.topic}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{p.title}</h3>
                            <p className="text-brand-slate-600 dark:text-slate-400 text-sm font-mono overflow-hidden opacity-70 mb-4 flex-grow line-clamp-3">
                                {p.content}
                            </p>
                            <div className="border-t border-panel-border/30 pt-3 flex items-center justify-between mt-auto">
                                <span className="text-xs font-mono opacity-50 flex items-center gap-1">
                                    <Clock size={14} /> {new Date(p.created_at).toLocaleDateString()}
                                </span>
                                <span className="text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform">
                                    VER COMPLETO &rarr;
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Importador Google Sheets */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                    <GlassCard className="max-w-xl w-full p-6 shadow-2xl relative border-t-4 border-t-emerald-500">
                        <button
                            onClick={() => setIsImportModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors p-1 bg-black/20 rounded"
                        >
                            <AppWindow size={22} />
                        </button>
                        <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-400">
                            <CloudArrowDown size={24} /> Importar Plan de Fertilización desde Google Sheets
                        </h2>
                        <p className="text-xs text-slate-400 mb-4">
                            Pega el enlace compartido de tu hoja de cálculo con las columnas de Semana, Fenología, Riego
                            Principal, Riego Intermedio, Agua/Planta, pH, EC y PPM.
                        </p>
                        <form onSubmit={handleImportGoogleSheet} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-mono text-slate-400 uppercase mb-1 block">
                                    Nombre Personalizado del Plan (Opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Programa Red Hot Cookies - Invierno 2026"
                                    value={customPlanName}
                                    onChange={(e) => setCustomPlanName(e.target.value)}
                                    className="w-full bg-black/30 border border-panel-border rounded-lg p-2.5 text-sm text-foreground outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono text-slate-400 uppercase mb-1 block">
                                    URL de Google Sheets (con permiso de lectura por enlace)
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={sheetUrl}
                                    onChange={(e) => setSheetUrl(e.target.value)}
                                    className="w-full bg-black/30 border border-panel-border rounded-lg p-2.5 text-xs font-mono text-foreground outline-none focus:border-emerald-500"
                                />
                            </div>
                            {importFeedback && (
                                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-2">
                                    <CheckCircle size={18} weight="fill" />
                                    {importFeedback}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={isImporting}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg text-xs uppercase tracking-wider cursor-pointer"
                            >
                                {isImporting ? "DESCARGANDO Y PROCESANDO TABLA..." : "IMPORTAR Y GUARDAR PLAN"}
                            </button>
                        </form>
                    </GlassCard>
                </div>
            )}

            {/* Modal Editor SOP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <GlassCard className="max-w-2xl w-full p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors p-1 bg-black/[0.03] dark:bg-black/20 rounded"
                        >
                            <AppWindow size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <BookOpen className="text-amber-500" /> {editingId ? "Editar Protocolo" : "Nuevo Protocolo"}
                        </h2>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">
                                    Título
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-2 text-sm focus:border-amber-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">
                                        Fase Cultivo
                                    </label>
                                    <select
                                        value={stage}
                                        onChange={(e) => setStage(e.target.value)}
                                        className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-2 text-sm focus:border-amber-500 outline-none"
                                    >
                                        <option value="General">Genérico / Todas</option>
                                        <option value="Clonación">Clonación</option>
                                        <option value="Vegetativo">Vegetativo</option>
                                        <option value="Floración">Floración</option>
                                        <option value="Post-Cosecha">Post-Cosecha</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">
                                        Topico
                                    </label>
                                    <select
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-2 text-sm focus:border-amber-500 outline-none"
                                    >
                                        <option value="Nutrición">Nutrición (Receta)</option>
                                        <option value="Sanidad">Sanidad (Plagas)</option>
                                        <option value="Poda">Entrenamiento/Poda</option>
                                        <option value="Operativo">Procedimiento Standard</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">
                                    Cuerpo del Protocolo / Contenido (Markdown simple)
                                </label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={6}
                                    className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded p-2 text-sm font-mono focus:border-amber-500 outline-none resize-none"
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="mt-2 w-full bg-amber-600 hover:bg-amber-500 text-foreground font-bold py-3 rounded-lg shadow-lg"
                            >
                                GUARDAR MANUAL
                            </button>
                        </form>
                    </GlassCard>
                </div>
            )}

            {/* View Detail Modal */}
            {isViewModalOpen && activeProtocol && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <GlassCard className="max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="absolute top-6 right-6 text-brand-slate-600 hover:text-foreground transition-colors p-1 bg-black/[0.03] dark:bg-black/20 rounded"
                        >
                            <AppWindow size={24} />
                        </button>

                        <div className="flex gap-2 mb-6">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs uppercase font-bold tracking-wider rounded border border-emerald-500/20">
                                {activeProtocol.stage}
                            </span>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs uppercase font-bold tracking-wider rounded border border-blue-500/20">
                                {activeProtocol.topic}
                            </span>
                        </div>

                        <h2 className="text-3xl font-extrabold mb-8 decoration-amber-500 underline decoration-4 underline-offset-8">
                            {activeProtocol.title}
                        </h2>

                        <div className="font-mono text-[15px] leading-relaxed text-foreground whitespace-pre-wrap bg-black/[0.03] dark:bg-black/20 border border-panel-border/30 p-6 rounded-xl">
                            {activeProtocol.content}
                        </div>

                        <div className="mt-8 pt-4 border-t border-panel-border/50 flex justify-between items-center">
                            <button
                                onClick={handleDelete}
                                className="text-red-500/80 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded transition-colors text-sm font-bold flex items-center gap-2"
                            >
                                <Trash size={18} /> Eliminar
                            </button>
                            <button
                                onClick={() => openEditModal(activeProtocol)}
                                className="bg-panel-border hover:bg-white/10 text-foreground px-6 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"
                            >
                                <PencilSimple size={18} /> Editar
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
