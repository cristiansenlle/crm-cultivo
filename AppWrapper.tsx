"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";
import { RoomProvider } from "@/context/RoomContext";
import { Spinner } from "@phosphor-icons/react";

export function AppWrapper({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;
        
        // Excepción de bloqueo rápido: Si estamos ya en login, queremos mostrar 
        // la página de forma inmediata sin mostrar spinner falso en hydrate.
        if (pathname === '/login' && isAuthenticated === null) {
            setIsAuthenticated(true);
        }

        const checkAuth = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                
                if (!isMounted) return;

                const isAuthPage = pathname === '/login';

                if (error) throw error;

                if (!data.session && !isAuthPage) {
                    router.replace('/login');
                    // No seteamos authenticated a true para dejar el spinner hasta que se cambie la ruta
                } else if (data.session && isAuthPage) {
                    router.replace('/');
                } else {
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error("Auth check failed", err);
                if (!isMounted) return;
                
                if (pathname !== '/login') {
                    router.replace('/login');
                } else {
                    setIsAuthenticated(true);
                }
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const isAuthPage = pathname === '/login';
            if (event === 'SIGNED_OUT' && !isAuthPage) {
                router.replace('/login');
            } else if (event === 'SIGNED_IN' && isAuthPage) {
                router.replace('/');
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [pathname, router]);

    // Ocultar layout central en página de auth
    if (pathname === '/login') {
        return <>{children}</>;
    }

    // Spinner para rutas no autenticadas en carga
    if (!isAuthenticated) {
        return (
            <div className="h-screen w-screen flex items-center justify-center hud-grid-bg bg-background text-emerald-500">
                <Spinner size={32} className="animate-spin" />
            </div>
        );
    }

    return (
        <RoomProvider>
            <div className="md:h-screen md:sticky top-0 flex-shrink-0 z-50">
                <Sidebar />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <Topbar />
                <main className="flex-1 w-full p-4 md:p-6 pb-20">
                    {children}
                </main>
            </div>
        </RoomProvider>
    );
}
