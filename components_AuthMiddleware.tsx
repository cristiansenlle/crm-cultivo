"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthMiddleware({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const checkAuth = async () => {
            const isLoginPage = pathname === '/login'

            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error

                if (!session && !isLoginPage) {
                    router.push('/login')
                } else if (session && isLoginPage) {
                    router.push('/')
                }
            } catch (e) {
                if (!isLoginPage) router.push('/login')
            }
        }

        checkAuth()

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const isLoginPage = pathname === '/login'
                if (event === 'SIGNED_OUT' && !isLoginPage) {
                    router.push('/login')
                } else if (event === 'SIGNED_IN' && isLoginPage) {
                    router.push('/')
                }
            }
        )

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [pathname, router])

    return <>{children}</>
}
