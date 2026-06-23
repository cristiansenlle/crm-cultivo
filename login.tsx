"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { LockKey, UserCircle, Spinner, CaretRight } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setErrorMsg(error.message);
            } else {
                router.push("/");
            }
        } catch (err) {
            setErrorMsg("Ocurrió un error inesperado. Intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background hud-grid-bg p-4 flex-col gap-4 relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="text-center mb-4 z-10">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 mb-4 border border-emerald-500/20">
                    <LockKey size={32} className="text-emerald-500" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">CANNABIS<span className="text-emerald-500">-CORE</span></h1>
                <p className="text-brand-slate-600 dark:text-slate-400 font-mono text-sm tracking-widest uppercase mt-1">
                    Control de Acceso
                </p>
            </div>

            <GlassCard className="max-w-md w-full p-8 shadow-2xl relative z-10 border-panel-border z-10">
                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium text-center">
                            {errorMsg}
                        </div>
                    )}
                    
                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Usuario / Email</label>
                        <div className="relative">
                            <UserCircle size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate-600" />
                            <input 
                                type="email" 
                                required
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 block">Contraseña</label>
                        <div className="relative">
                            <LockKey size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate-600" />
                            <input 
                                type="password" 
                                required
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="mt-4 flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <><Spinner size={20} className="animate-spin" /> VERIFICANDO...</>
                        ) : (
                            <>INGRESAR AL SISTEMA <CaretRight size={20} /></>
                        )}
                    </button>
                </form>
            </GlassCard>
        </div>
    );
}
