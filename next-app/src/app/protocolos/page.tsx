"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { BookOpen, Plus, Clock, PencilSimple, Trash, AppWindow, Hash, Leaf } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

export default function ProtocolosPage() {
    const [protocols, setProtocols] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Form & View states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [stage, setStage] = useState("Vegetativo");
    const [topic, setTopic] = useState("Nutrición");
    const [content, setContent] = useState("");
    const [activeProtocol, setActiveProtocol] = useState<any>(null); // To view

    const loadProtocols = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('core_protocols').select('*').order('created_at', { ascending: false });
        if (data && !error) setProtocols(data);
        setLoading(false);
    };

    useEffect(() => {
        loadProtocols();
    }, []);

    const openNewModal = () => {
        setEditingId(null);
        setTitle(""); setStage("Vegetativo"); setTopic("Nutrición"); setContent("");
        setIsModalOpen(true);
    };

    const openEditModal = (p: any) => {
        setEditingId(p.id);
        setTitle(p.title || ""); setStage(p.stage || "Vegetativo"); setTopic(p.topic || "Nutrición"); setContent(p.content || "");
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
            const { error } = await supabase.from('core_protocols').update(payload).eq('id', editingId);
            err = error;
        } else {
            const { error } = await supabase.from('core_protocols').insert([payload]);
            err = error;
        }

        if (err) return alert("Error Guardando: " + err.message);
        setIsModalOpen(false);
        loadProtocols();
    };

    const handleDelete = async () => {
        if(!activeProtocol) return;
        if(!window.confirm("¿Seguro de Eliminar este protocolo?")) return;
        
        const { error } = await supabase.from('core_protocols').delete().eq('id', activeProtocol.id);
        if(!error) {
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
                        Protocolos Operativos
                    </h1>
                    <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2">
                        Procedimientos Estándar (SOPs) y Recetas Agronómicas
                    </p>
                </div>
                <div className="z-10">
                   <button 
                     onClick={openNewModal}
                     className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-transform hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.3)] font-bold uppercase tracking-wider text-sm"
                   >
                     <Plus size={18} weight="bold" /> Crear Protocolo
                   </button>
                </div>
            </GlassCard>

            {/* Grid */}
            {loading ? (
                <div className="py-20 text-center font-mono opacity-50">Sincronizando biblioteca...</div>
            ) : protocols.length === 0 ? (
                <div className="py-20 text-center font-mono opacity-50 border border-dashed border-panel-border rounded-xl">Sin protocolos activos.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {protocols.map((p, idx) => (
                        <div key={idx} onClick={() => openViewModal(p)} className="p-6 rounded-2xl bg-black/20 border border-panel-border/50 hover:bg-black/30 hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col h-[250px]">
                            <div className="flex gap-2 mb-4">
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1"><Leaf size={12}/>{p.stage}</span>
                                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1"><Hash size={12}/>{p.topic}</span>
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{p.title}</h3>
                            <p className="text-brand-slate-400 text-sm font-mono overflow-hidden opacity-70 mb-4 flex-grow line-clamp-3">
                                {p.content}
                            </p>
                            <div className="border-t border-panel-border/30 pt-3 flex items-center justify-between mt-auto">
                                <span className="text-xs font-mono opacity-50 flex items-center gap-1"><Clock size={14}/> {new Date(p.created_at).toLocaleDateString()}</span>
                                <span className="text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform">VER COMPLETO &rarr;</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Editor */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <GlassCard className="max-w-2xl w-full p-6 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-brand-slate-600 hover:text-white transition-colors p-1 bg-black/20 rounded"><AppWindow size={24}/></button>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><BookOpen className="text-amber-500"/> {editingId ? 'Editar Protocolo' : 'Nuevo Protocolo'}</h2>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Título</label>
                                <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-black/20 border border-panel-border rounded p-2 text-sm focus:border-amber-500 outline-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Fase Cultivo</label>
                                    <select value={stage} onChange={e=>setStage(e.target.value)} className="w-full bg-black/20 border border-panel-border rounded p-2 text-sm focus:border-amber-500 outline-none">
                                        <option value="General">Genérico / Todas</option>
                                        <option value="Clonación">Clonación</option>
                                        <option value="Vegetativo">Vegetativo</option>
                                        <option value="Floración">Floración</option>
                                        <option value="Post-Cosecha">Post-Cosecha</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Topico</label>
                                    <select value={topic} onChange={e=>setTopic(e.target.value)} className="w-full bg-black/20 border border-panel-border rounded p-2 text-sm focus:border-amber-500 outline-none">
                                        <option value="Nutrición">Nutrición (Receta)</option>
                                        <option value="Sanidad">Sanidad (Plagas)</option>
                                        <option value="Poda">Entrenamiento/Poda</option>
                                        <option value="Operativo">Procedimiento Standard</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Cuerpo del Protocolo / Contenido (Markdown simple)</label>
                                <textarea required value={content} onChange={e=>setContent(e.target.value)} rows={6} className="w-full bg-black/20 border border-panel-border rounded p-2 text-sm font-mono focus:border-amber-500 outline-none resize-none"></textarea>
                            </div>
                            <button type="submit" className="mt-2 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg">GUARDAR MANUAL</button>
                        </form>
                    </GlassCard>
                </div>
            )}

            {/* View Detail Modal */}
            {isViewModalOpen && activeProtocol && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <GlassCard className="max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-brand-slate-600 hover:text-white transition-colors p-1 bg-black/20 rounded"><AppWindow size={24}/></button>
                        
                        <div className="flex gap-2 mb-6">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs uppercase font-bold tracking-wider rounded border border-emerald-500/20">{activeProtocol.stage}</span>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs uppercase font-bold tracking-wider rounded border border-blue-500/20">{activeProtocol.topic}</span>
                        </div>
                        
                        <h2 className="text-3xl font-extrabold mb-8 decoration-amber-500 underline decoration-4 underline-offset-8">{activeProtocol.title}</h2>
                        
                        <div className="font-mono text-[15px] leading-relaxed text-foreground whitespace-pre-wrap bg-black/20 border border-panel-border/30 p-6 rounded-xl">
                            {activeProtocol.content}
                        </div>
                        
                        <div className="mt-8 pt-4 border-t border-panel-border/50 flex justify-between items-center">
                            <button onClick={handleDelete} className="text-red-500/80 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded transition-colors text-sm font-bold flex items-center gap-2"><Trash size={18}/> Eliminar</button>
                            <button onClick={() => openEditModal(activeProtocol)} className="bg-panel-border hover:bg-white/10 text-white px-6 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"><PencilSimple size={18}/> Editar</button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
