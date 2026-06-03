import { useState, useEffect } from 'react'
import client, { edgeFunctions } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import {
    Globe, Trash2, Plus, ExternalLink, Plug,
    CheckCircle, X, Loader2, ChevronDown, ChevronUp, AlertTriangle,
    Shield, Lock, WifiOff, FileWarning, HelpCircle
} from 'lucide-react'

// ───────────────────────── Beginner-Friendly Error Reporting ───────────────────────

type ErrorGuide = {
    title: string
    explanation: string
    steps: string[]
    plugins?: string[]
    icon: React.ElementType
    severity: 'error' | 'warning' | 'info'
}

function getErrorGuide(errorMessage: string): ErrorGuide {
    const msg = (errorMessage || '').toLowerCase()

    // 1. SSL / HTTPS required
    if (msg.includes('ssl') || msg.includes('https')) {
        return {
            title: 'Your WordPress site needs HTTPS (SSL)',
            explanation: 'WordPress Application Passwords only work on secure sites (HTTPS). Without SSL, WordPress refuses to generate app passwords for security reasons.',
            steps: [
                'Check if your site loads with https:// — try opening it in a new tab.',
                'If you see "Not Secure" in the browser, contact your hosting provider and ask them to enable a free SSL certificate (Let\'s Encrypt).',
                'Most hosts (SiteGround, Bluehost, Cloudways, Kinsta) offer free SSL — it usually takes 1 click in their control panel.',
                'Once SSL is active, come back and try connecting again.',
            ],
            icon: Lock,
            severity: 'warning',
        }
    }

    // 2. Missing credentials from callback
    if (msg.includes('missing') && (msg.includes('credentials') || msg.includes('site_url') || msg.includes('user_login') || msg.includes('password'))) {
        return {
            title: 'WordPress did not send back the connection details',
            explanation: 'After you clicked "Approve" in WordPress, something interrupted the redirect back to SEO Tool. This usually happens if a plugin or security setting blocked the callback.',
            steps: [
                'Go back to your WordPress admin → Users → Your Profile → Application Passwords.',
                'Look for "SEO Tool" in the list. If you see it, copy the password (it looks like xxxx xxxx xxxx xxxx xxxx xxxx).',
                'Return here and use the "Add Manually" button instead — paste your site URL, username, and that password.',
                'If you do NOT see "SEO Tool" in the list, try the "Connect WordPress" button again and make sure you click "Approve" on the WordPress screen.',
            ],
            icon: FileWarning,
            severity: 'warning',
        }
    }

    // 3. Authentication required (not logged in to SEO Tool)
    if (msg.includes('authentication required') || msg.includes('please log in')) {
        return {
            title: 'You need to be logged in to SEO Tool',
            explanation: 'The connection from WordPress arrived, but we could not save the credentials because your session expired while you were in WordPress.',
            steps: [
                'Log in to SEO Tool using the same account you started with.',
                'After logging in, the connection should complete automatically.',
                'If it does not, go to your WordPress admin → Users → Your Profile → Application Passwords, copy the SEO Tool password, and use "Add Manually".',
            ],
            icon: Shield,
            severity: 'info',
        }
    }

    // 4. Credential verification failed / security plugin blocking
    if (msg.includes('verification failed') || msg.includes('security plugin') || msg.includes('blocked') || msg.includes('wordfence') || msg.includes('sucuri') || msg.includes('blocked by')) {
        return {
            title: 'A security plugin is blocking the connection test',
            explanation: 'Your WordPress credentials were saved, but our test request was blocked. This is extremely common — security plugins often block server-to-server requests even though the credentials are perfectly valid. The good news: publishing content from your browser usually still works fine.',
            steps: [
                'Check if you have any of these security plugins active: Wordfence, Sucuri, iThemes Security, All In One WP Security, or a firewall plugin.',
                'Temporarily disable the security plugin (or its firewall feature), then click "Verify Connection" on your site card below.',
                'If verification succeeds, re-enable the plugin and look for a "Whitelist" or "Allowlist" setting — add our server IP or domain to the whitelist.',
                'If you cannot find a whitelist option, leave the plugin active. Your credentials are saved and publishing will likely still work from your browser.',
                'Still stuck? Use the "Verify Connection" button below — if it shows "Connected", everything is fine. If not, try the manual method.',
            ],
            plugins: ['Wordfence Security', 'Sucuri Security', 'iThemes Security', 'All In One WP Security & Firewall', 'Jetpack Protect'],
            icon: Shield,
            severity: 'warning',
        }
    }

    // 5. WordPress REST API not accessible / discovery failed
    if (msg.includes('could not start') || msg.includes('no redirect url') || msg.includes('discovery') || msg.includes('rest api') || msg.includes('wp-json')) {
        return {
            title: 'We could not reach your WordPress REST API',
            explanation: 'SEO Tool needs to talk to your WordPress site via the REST API (the /wp-json endpoint). If this is blocked or hidden, the connection cannot start.',
            steps: [
                'Make sure your WordPress permalinks are NOT set to "Plain". Go to WordPress → Settings → Permalinks and choose "Post name" or any non-plain option, then Save.',
                'Check if a security plugin is blocking the REST API. Some plugins have a "Disable REST API" setting — turn that OFF.',
                'If you use Cloudflare or a CDN, make sure /wp-json/* is not blocked by firewall rules.',
                'Try visiting https://yoursite.com/wp-json in your browser. If you see JSON text, the API is working. If you see a 404 or blank page, it is blocked.',
                'If you are on a managed host (WP Engine, Kinsta, Flywheel), contact their support and ask them to whitelist REST API access for application passwords.',
            ],
            plugins: ['Wordfence Security', 'Sucuri Security', 'Disable REST API', 'WP Hide & Security Enhancer'],
            icon: WifiOff,
            severity: 'error',
        }
    }

    // 6. Failed to save website (database error)
    if (msg.includes('failed to save') || msg.includes('database')) {
        return {
            title: 'We could not save your site to our database',
            explanation: 'Something went wrong on our end while saving your WordPress credentials. This is usually temporary.',
            steps: [
                'Wait 30 seconds and try the "Connect WordPress" button again.',
                'If it keeps failing, use the "Add Manually" button to enter your details by hand.',
                'If manual entry also fails, please contact support — there may be a temporary issue with our servers.',
            ],
            icon: FileWarning,
            severity: 'error',
        }
    }

    // 7. Generic / fallback
    return {
        title: 'Something went wrong connecting to WordPress',
        explanation: 'We received an unexpected error. Here are the most common things to check:',
        steps: [
            'Make sure your WordPress site is online and not in maintenance mode.',
            'Check that you are using the correct site URL (including https://).',
            'Temporarily disable caching and security plugins, then try again.',
            'If the problem persists, use "Add Manually" to enter your WordPress REST URL, username, and application password directly.',
        ],
        plugins: ['Any caching plugin', 'Any security / firewall plugin'],
        icon: AlertTriangle,
        severity: 'error',
    }
}

function ErrorReport({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
    const guide = getErrorGuide(message)
    const [expanded, setExpanded] = useState(true)

    const bgClass = guide.severity === 'error'
        ? 'bg-red-50 border-red-200'
        : guide.severity === 'warning'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-blue-50 border-blue-200'

    const textClass = guide.severity === 'error'
        ? 'text-red-800'
        : guide.severity === 'warning'
            ? 'text-amber-800'
            : 'text-blue-800'

    const iconColor = guide.severity === 'error'
        ? 'text-red-600'
        : guide.severity === 'warning'
            ? 'text-amber-600'
            : 'text-blue-600'

    return (
        <div className={`mb-6 rounded-xl border ${bgClass} overflow-hidden`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <guide.icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className={`font-semibold text-sm ${textClass}`}>{guide.title}</h4>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className={`p-1 rounded-md hover:bg-black/5 ${textClass}`}
                                    title={expanded ? 'Collapse' : 'Expand'}
                                >
                                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                {onDismiss && (
                                    <button
                                        onClick={onDismiss}
                                        className={`p-1 rounded-md hover:bg-black/5 ${textClass}`}
                                        title="Dismiss"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className={`text-sm mt-1 ${textClass} opacity-90`}>{guide.explanation}</p>

                        {expanded && (
                            <>
                                <div className="mt-3 space-y-2">
                                    {guide.steps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${guide.severity === 'error' ? 'bg-red-200 text-red-800' : guide.severity === 'warning' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
                                                {i + 1}
                                            </span>
                                            <p className={`text-sm ${textClass} opacity-90 leading-relaxed`}>{step}</p>
                                        </div>
                                    ))}
                                </div>

                                {guide.plugins && guide.plugins.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-black/5">
                                        <p className={`text-xs font-medium ${textClass} opacity-70 mb-1.5`}>Common plugins that cause this:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {guide.plugins.map(p => (
                                                <span key={p} className={`text-xs px-2 py-0.5 rounded-md font-medium ${guide.severity === 'error' ? 'bg-red-100 text-red-700' : guide.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-1.5">
                                    <HelpCircle className={`w-3.5 h-3.5 ${iconColor}`} />
                                    <p className={`text-xs ${textClass} opacity-70`}>
                                        Still stuck? Try the <strong>"Add Manually"</strong> button below — it bypasses most connection issues.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

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
                        <ErrorReport message={error} onDismiss={() => setError('')} />
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

    // Per-site verification errors
    const [verifyErrors, setVerifyErrors] = useState<Record<string, string>>({})

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
                        user_id: user?.id,
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
            setVerifyErrors(prev => ({ ...prev, [id]: error.message || 'Verification failed' }))
            return
        }
        if (data?.connected) {
            setVerifyErrors(prev => { const next = { ...prev }; delete next[id]; return next })
            setShowCallbackSuccess(true)
            setTimeout(() => setShowCallbackSuccess(false), 3000)
        } else {
            setVerifyErrors(prev => ({ ...prev, [id]: data?.error || `${data.domain} connection lost. Status: ${data.status}` }))
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
                <ErrorReport
                    message={callbackErrorMsg}
                    onDismiss={() => setShowCallbackError(false)}
                />
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
                                        <div className="px-4 pb-4 pt-0 space-y-3">
                                            {verifyErrors[w.id] && (
                                                <ErrorReport
                                                    message={verifyErrors[w.id]}
                                                    onDismiss={() => setVerifyErrors(prev => { const next = { ...prev }; delete next[w.id]; return next })}
                                                />
                                            )}
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
                                                    {w.cms_type === 'wordpress' && (
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
