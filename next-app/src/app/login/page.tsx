"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Leaf, LockKeyhole, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Credenciales inválidas. Inténtalo de nuevo.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh(); // Force middleware check and UI update
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative gradient blur */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Leaf size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CORE 360</h1>
          <p className="text-sm text-neutral-400 mt-1">Ingresa para administrar el cultivo</p>
        </div>

        <form onSubmit={handleLogin} className="relative z-10 flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300 ml-1">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <User size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-neutral-600 transition-colors"
                placeholder="usuario@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300 ml-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <LockKeyhole size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-neutral-600 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center mt-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Ingresando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
