import { useState, useEffect } from 'react'
import client, { edgeFunctions } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import {
    Globe, Trash2, Plus, ExternalLink, Plug,
    CheckCircle, X, Loader2, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react'

// ───────────────────────── Wizard Modal ───────────────────────

function WordPressWizard({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
    const [siteUrl, setSiteUrl] = useState('')
    const [authorizing, setAuthorizing] = useState(false)
    const [error, setError] = useState('')

    const handleAuthorize = async () => {
        setError('')
        setAuthorizing(true)
        try {
            const url = siteUrl.trim()
            const { data, error: fnErr } = await (edgeFunctions as any).invoke('wp-auth-start', {
                body: { site_url: url },
            })
            if (fnErr) throw new Error(fnErr.message)
            if (data?.error) throw new Error(data.error)
            if (!data?.redirect_url) throw new Error('No redirect URL returned')

            // Open WordPress authorization in a new tab
            window.open(data.redirect_url, '_blank')
            setAuthorizing(false)
        } catch (err: any) {
            setError(err.message || 'Could not start WordPress authorization.')
            setAuthorizing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                            <Plug className="w-4 h-4 text-brand-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Connect WordPress</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="px-6 py-6 space-y-5">
                    <div>
                        <h4 className="font-medium text-gray-900 mb-1">One-click WordPress authorization</h4>
                        <p className="text-sm text-gray-500">Enter your WordPress site URL and we'll redirect you to approve the connection. No plugin installation needed.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">WordPress Site URL</label>
                        <input
                            type="url"
                            value={siteUrl}
                            onChange={e => setSiteUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">Must be HTTPS (SSL required)</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
                        <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> We'll open your WordPress admin</p>
                        <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Click "Approve" — no plugin needed</p>
                        <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Come back here automatically</p>
                    </div>

                    <button
                        onClick={handleAuthorize}
                        disabled={authorizing || !siteUrl.trim()}
                        className="w-full py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {authorizing ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening WordPress…</> : <><Plug className="w-4 h-4" /> Authorize WordPress</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ───────────────────────── Manual Form (Advanced) ───────────────────────

function ManualAddForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
    const [newDomain, setNewDomain] = useState('')
    const [newNiche, setNewNiche] = useState('')
    const [newWpUrl, setNewWpUrl] = useState('')
    const [newWpUser, setNewWpUser] = useState('')
    const [newWpPass, setNewWpPass] = useState('')

    const addWebsite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDomain.trim()) return
        await client.database.from('websites').insert([{
            domain: newDomain.trim(),
            niche: newNiche.trim() || null,
            wp_url: newWpUrl.trim() || null,
            wp_username: newWpUser.trim() || null,
            wp_app_password: newWpPass.trim() || null,
            cms_type: newWpUrl ? 'wordpress' : 'manual',
            status: 'active'
        }])
        onSaved()
    }

    return (
        <form onSubmit={addWebsite} className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Domain *</label>
                <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" required />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Niche</label>
                <input type="text" value={newNiche} onChange={e => setNewNiche(e.target.value)} placeholder="e.g., Plumbing, Electrician, SaaS"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">WordPress REST URL (optional)</label>
                <input type="url" value={newWpUrl} onChange={e => setNewWpUrl(e.target.value)} placeholder="https://example.com/wp-json"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            {newWpUrl && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">WP Username</label>
                        <input type="text" value={newWpUser} onChange={e => setNewWpUser(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">App Password</label>
                        <input type="password" value={newWpPass} onChange={e => setNewWpPass(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                </div>
            )}
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onCancel}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit"
                    className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">Save Website</button>
            </div>
        </form>
    )
}

// ───────────────────────── Main Settings Page ───────────────────────

export default function Settings() {
    const { user, loading: authLoading } = useAuth()
    const [profile, setProfile] = useState<any>(null)
    const [websites, setWebsites] = useState<any[]>([])
    const [showWizard, setShowWizard] = useState(false)
    const [showManual, setShowManual] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({})

    // Callback state UI
    const [showCallbackSuccess, setShowCallbackSuccess] = useState(false)
    const [showCallbackError, setShowCallbackError] = useState(false)
    const [callbackErrorMsg, setCallbackErrorMsg] = useState('')

    // Store WordPress callback params to process after auth is ready
    const [pendingWpCallback, setPendingWpCallback] = useState<{
        siteUrl: string
        userLogin: string
        password: string
    } | null>(null)

    // Effect 1: Detect WordPress callback/rejection on mount, store params, clean URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const isCallback = params.get('wp_callback') === '1'
        const isRejected = params.get('wp_rejected') === '1'

        if (isRejected) {
            setCallbackErrorMsg('WordPress authorization was cancelled.')
            setShowCallbackError(true)
            setTimeout(() => setShowCallbackError(false), 5000)
            window.history.replaceState({}, '', window.location.pathname)
            return
        }

        if (isCallback) {
            const siteUrl = params.get('site_url')
            const userLogin = params.get('user_login')
            const password = params.get('password')

            if (!siteUrl || !userLogin || !password) {
                setCallbackErrorMsg('Missing credentials from WordPress. Please try again.')
                setShowCallbackError(true)
                setTimeout(() => setShowCallbackError(false), 5000)
                window.history.replaceState({}, '', window.location.pathname)
                return
            }

            // Store for processing when auth is ready (avoids race conditions with auth restore)
            setPendingWpCallback({
                siteUrl: decodeURIComponent(siteUrl),
                userLogin: decodeURIComponent(userLogin),
                password: decodeURIComponent(password),
            })
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    // Effect 2: Process callback only when auth is fully ready
    useEffect(() => {
        if (!pendingWpCallback || authLoading) return

        if (!user) {
            setCallbackErrorMsg('Authentication required. Please log in and try again.')
            setShowCallbackError(true)
            setTimeout(() => setShowCallbackError(false), 5000)
            setPendingWpCallback(null)
            loadData()
            return
        }

        const processCallback = async () => {
            try {
                const { data, error } = await (edgeFunctions as any).invoke('wp-auth-callback', {
                    body: {
                        site_url: pendingWpCallback.siteUrl,
                        user_login: pendingWpCallback.userLogin,
                        password: pendingWpCallback.password,
                    },
                })
                if (error || data?.error) {
                    setCallbackErrorMsg(data?.error || error?.message || 'Failed to save WordPress credentials.')
                    setShowCallbackError(true)
                    setTimeout(() => setShowCallbackError(false), 5000)
                } else {
                    setShowCallbackSuccess(true)
                    setTimeout(() => setShowCallbackSuccess(false), 5000)
                }
            } catch (err: any) {
                setCallbackErrorMsg(err.message || 'An unexpected error occurred.')
                setShowCallbackError(true)
                setTimeout(() => setShowCallbackError(false), 5000)
            }
            setPendingWpCallback(null)
            loadData()
        }

        processCallback()
    }, [pendingWpCallback, authLoading, user])

    // Effect 3: Normal page load — fetch data once auth is ready
    useEffect(() => {
        if (!authLoading && !pendingWpCallback) {
            loadData()
        }
    }, [authLoading, pendingWpCallback])

    const loadData = async () => {
        const { data: p } = await client.database.from('profiles').select('*').single()
        const { data: w } = await client.database.from('websites').select('*').order('created_at', { ascending: false })
        setProfile(p)
        setWebsites(w || [])
    }

    const deleteWebsite = async (id: string) => {
        await client.database.from('websites').update({ status: 'deleted' }).eq('id', id)
        loadData()
    }

    const verifyConnection = async (id: string) => {
        const { data, error } = await (edgeFunctions as any).invoke('wp-verify', {
            body: { website_id: id }
        })
        if (error) {
            alert('Verification failed: ' + error.message)
            return
        }
        if (data?.connected) {
            alert(`${data.domain} is connected!`)
        } else {
            alert(`${data.domain} connection lost. Status: ${data.status}`)
            loadData()
        }
    }

    const openStripePortal = async () => {
        if (!profile?.stripe_customer_id) {
            alert('No active subscription yet.')
            return
        }
        alert('Stripe Customer Portal would open here.')
    }

    const toggleAdvanced = (id: string) => {
        setShowAdvanced(prev => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* WP Callback notifications */}
            {showCallbackSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800">WordPress connected successfully! Your site is ready for content publishing.</p>
                </div>
            )}
            {showCallbackError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{callbackErrorMsg}</p>
                </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 mb-10">Settings</h1>

            {/* Profile */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-500">Name</span>
                        <span className="font-medium text-gray-900">{profile?.full_name || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-500">Email</span>
                        <span className="font-medium text-gray-900">{user?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-500">Plan</span>
                        <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-semibold capitalize">{profile?.tier || 'Starter'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500">Status</span>
                        <span className={`text-xs font-medium ${profile?.subscription_status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                            {profile?.subscription_status || 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Billing */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing</h2>
                <button
                    onClick={openStripePortal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                >
                    <ExternalLink className="w-4 h-4" /> Open Customer Portal
                </button>
            </div>

            {/* Websites */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Websites</h2>
                </div>

                {/* Empty state — big CTA */}
                {websites.filter(w => w.status !== 'deleted').length === 0 && !showWizard && (
                    <div className="text-center py-8 mb-6">
                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe className="w-8 h-8 text-brand-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">No websites connected</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                            Connect your WordPress site to publish content directly from SEO Tool.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => setShowWizard(true)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
                            >
                                <Plug className="w-4 h-4" /> Connect WordPress
                            </button>
                            <button
                                onClick={() => setShowManual(true)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Manually
                            </button>
                        </div>
                    </div>
                )}

                {/* Manual form */}
                {showManual && (
                    <ManualAddForm
                        onSaved={() => { setShowManual(false); loadData() }}
                        onCancel={() => setShowManual(false)}
                    />
                )}

                {/* Wizard */}
                {showWizard && (
                    <WordPressWizard
                        onClose={() => setShowWizard(false)}
                        onConnected={loadData}
                    />
                )}

                {/* List with toolbar */}
                {websites.filter(w => w.status !== 'deleted').length > 0 && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-500">{websites.filter((w: any) => w.status !== 'deleted').length} site(s)</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowWizard(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-lg hover:bg-brand-100 transition-colors"
                                >
                                    <Plug className="w-4 h-4" /> Connect WordPress
                                </button>
                                <button
                                    onClick={() => setShowManual(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Manual
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {websites.filter((w: any) => w.status !== 'deleted').map((w: any) => (
                                <div key={w.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${w.cms_type === 'wordpress' ? 'bg-blue-50' : 'bg-brand-50'}`}>
                                                {w.cms_type === 'wordpress'
                                                    ? <Plug className="w-4 h-4 text-blue-600" />
                                                    : <Globe className="w-4 h-4 text-brand-600" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{w.domain}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-500">{w.niche || 'No niche set'}</span>
                                                    {w.cms_type === 'wordpress' && (
                                                        <>
                                                            <span className="text-gray-300">·</span>
                                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${w.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                {w.status === 'active' ? 'Connected' : w.status}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleAdvanced(w.id)}
                                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                title="Advanced options"
                                            >
                                                {showAdvanced[w.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => deleteWebsite(w.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Advanced options */}
                                    {showAdvanced[w.id] && (
                                        <div className="px-4 pb-4 pt-0">
                                            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                                                {w.wp_url && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">WP REST URL</span>
                                                            <code className="text-xs bg-white px-1.5 py-0.5 rounded border text-gray-700">{w.wp_url}</code>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Username</span>
                                                            <span className="text-gray-700">{w.wp_username || '—'}</span>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="flex gap-2 pt-2">
                                                    {w.cms_type === 'wordpress' && w.status === 'active' && (
                                                        <button
                                                            onClick={() => verifyConnection(w.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" /> Verify Connection
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
