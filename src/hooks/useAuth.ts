import { useState, useEffect } from 'react'
import client from '../lib/insforge'

export function useAuth() {
    const [user, setUser] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for OAuth callback
        const url = new URL(window.location.href)
        const code = url.searchParams.get('insforge_code')
        if (code) {
            (client.auth as any).exchangeOAuthCode(code).then(() => {
                window.history.replaceState({}, '', window.location.pathname)
                refreshUser()
            })
        } else {
            refreshUser()
        }
    }, [])

    const refreshUser = async () => {
        const res = await (client.auth as any).getCurrentUser()
        const currentUser = res?.data?.user ?? null
        setUser(currentUser)
        setLoading(false)

        if (currentUser) {
            // Ensure profile exists (especially for OAuth users)
            const { data: existing } = await client.database.from('profiles').select('id').eq('id', currentUser.id).single()
            if (!existing) {
                await client.database.from('profiles').insert([{
                    id: currentUser.id,
                    full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
                    tier: 'starter',
                    subscription_status: 'inactive'
                }])
            }
        }
    }

    return { user, loading, isAuthenticated: !!user, refreshUser }
}
