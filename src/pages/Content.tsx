import { useState, useEffect, useCallback } from 'react'
import client from '../lib/insforge'
import { Sparkles, Loader2, FileText, Download, Globe, AlertTriangle, RefreshCw, XCircle } from 'lucide-react'

const TIER_LIMITS: Record<string, number> = { starter: 10, growth: 25, pro: Infinity }

// Direct fetch to edge function — more reliable than SDK invoke for some InsForge setups
async function invokeEdgeFunction(name: string, body: object) {
    const baseUrl = 'https://zchqu92m.eu-central.insforge.app'
    const anonKey = 'ik_06ed0677bd5537902ae618a8442c0db8'
    const res = await fetch(`${baseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify(body),
    })
    const text = await res.text()
    let data: any = null
    let error: any = null
    try {
        data = JSON.parse(text)
    } catch {
        error = { message: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    if (!res.ok && !error) {
        error = { message: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    return { data, error, status: res.status }
}

// Client-side fallback: call OpenRouter directly from the browser
async function generateContentClientSide(keyword: string): Promise<{ title: string; meta_description: string; content_html: string; word_count: number } | null> {
    const apiKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY
    if (!apiKey) return null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SEO Tool Content Generator',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert SEO blog writer. Write a complete, original 1200-1500 word SEO blog post targeting the given keyword.

Return a JSON object with exactly these fields:
- title: SEO-optimized title under 60 characters
- meta_description: compelling meta description under 160 characters
- content_html: full blog post as clean HTML string with <h1>, <h2>, <p>, <ul>, <li> tags. Do NOT use markdown.
- word_count: integer word count

Make the content genuinely useful, well-structured, and designed to rank. Include a table of contents, key takeaways, and a conclusion. Keep it concise but comprehensive — aim for 1200-1500 words to ensure fast generation.`,
                    },
                    {
                        role: 'user',
                        content: `Write an SEO blog post targeting the keyword: "${keyword}"`,
                    },
                ],
                max_tokens: 4000,
                temperature: 0.6,
            }),
            signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) {
            console.error('[client] OpenRouter error:', res.status, await res.text().catch(() => ''))
            return null
        }

        const chatData = await res.json()
        const text = chatData.choices?.[0]?.message?.content || '{}'

        let result: any = {}
        try {
            const cleaned = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim()
            result = JSON.parse(cleaned)
        } catch {
            const match = text.match(/\{[\s\S]*\}/)
            if (match) {
                try { result = JSON.parse(match[0]) } catch { /* ignore */ }
            }
        }

        return {
            title: result.title || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} — Complete Guide`,
            meta_description: result.meta_description || '',
            content_html: result.content_html || `<p>${text}</p>`,
            word_count: result.word_count || result.content_html?.split(/\s+/)?.length || 1200,
        }
    } catch (err: any) {
        console.error('[client] Direct generation error:', err?.message || String(err))
        return null
    }
}

export default function Content() {
    const [profile, setProfile] = useState<any>(null)
    const [keywords, setKeywords] = useState<any[]>([])
    const [websites, setWebsites] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [selectedKeyword, setSelectedKeyword] = useState('')
    const [selectedWebsite, setSelectedWebsite] = useState('')
    const [publishMethod, setPublishMethod] = useState<'download' | 'wordpress'>('download')
    const [loading, setLoading] = useState(false)
    const [usage, setUsage] = useState(0)
    const [generatingId, setGeneratingId] = useState<string | null>(null)
    const [error, setError] = useState('')

    // Poll for status updates when there are generating requests
    useEffect(() => {
        const hasGenerating = requests.some(r => r.status === 'generating')
        if (!hasGenerating) return
        const interval = setInterval(() => {
            loadRequests()
        }, 3000)
        return () => clearInterval(interval)
    }, [requests])

    const loadRequests = useCallback(async () => {
        const { data: r } = await client.database.from('content_requests').select('*').order('created_at', { ascending: false })
        setRequests(r || [])
    }, [])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const { data: p } = await client.database.from('profiles').select('*').single()
        const { data: k } = await client.database.from('keywords').select('*').eq('status', 'target').order('created_at', { ascending: false })
        const { data: w } = await client.database.from('websites').select('*').eq('status', 'active')
        const { data: r } = await client.database.from('content_requests').select('*').order('created_at', { ascending: false })
        setProfile(p)
        setKeywords(k || [])
        setWebsites(w || [])
        setRequests(r || [])

        const period = new Date().toISOString().slice(0, 7)
        const { data: u } = await client.database.from('usage_logs').select('count').eq('action', 'content_generate').eq('period', period)
        setUsage(u?.reduce((acc: number, x: any) => acc + (x.count || 1), 0) || 0)
    }

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!selectedKeyword) return

        const limit = TIER_LIMITS[profile?.tier || 'starter']
        if (usage >= limit) {
            setError(`Monthly limit reached (${limit} posts). Upgrade to get more.`)
            return
        }

        setLoading(true)
        try {
            const kw = keywords.find(k => k.id === selectedKeyword)
            if (!kw) return

            const userId = profile?.id
            if (!userId) {
                setError('You must be logged in to generate content.')
                setLoading(false)
                return
            }

            const { data: req } = await client.database.from('content_requests').insert([{
                user_id: userId,
                keyword_id: selectedKeyword,
                website_id: selectedWebsite || null,
                status: 'generating',
                publish_method: publishMethod
            }]).select().single()

            if (!req) return
            setGeneratingId(req.id)
            await loadData()

            let functionError = ''
            let edgeSuccess = false
            try {
                const { error: invokeErr, status } = await invokeEdgeFunction('content-generator', {
                    request_id: req.id,
                    keyword: kw.keyword,
                })
                if (!invokeErr) {
                    edgeSuccess = true
                } else {
                    functionError = invokeErr.message || `Edge function error (HTTP ${status})`
                    throw new Error(functionError)
                }
            } catch (err: any) {
                const msg = err?.message || String(err)
                // Classify error
                if (msg.includes('404') || msg.includes('Not Found') || msg.includes('not found')) {
                    functionError = 'Edge function not deployed. Trying browser-side generation...'
                } else if (msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('Failed to fetch') || msg.includes('fetch')) {
                    functionError = 'Edge function unreachable. Trying browser-side generation...'
                } else if (msg.includes('OPENROUTER_API_KEY') || msg.includes('not configured')) {
                    functionError = 'Server missing API key. Trying browser-side generation...'
                } else {
                    functionError = msg
                }
                console.warn('[Content] Edge function failed, trying client-side fallback:', msg)
            }

            // If edge function failed, try client-side fallback
            if (!edgeSuccess) {
                const fallback = await generateContentClientSide(kw.keyword)
                if (fallback) {
                    await client.database.from('content_requests').update({
                        title: fallback.title,
                        meta_description: fallback.meta_description,
                        content_html: fallback.content_html,
                        word_count: fallback.word_count,
                        status: 'ready',
                        updated_at: new Date().toISOString(),
                    }).eq('id', req.id)
                    setError('Generated via browser fallback. Deploy the edge function for server-side generation.')
                } else {
                    // Client-side also failed — show real error
                    await client.database.from('content_requests').update({
                        status: 'error',
                        title: 'Generation failed',
                        content_html: `<p class="text-red-600">${functionError}</p>`,
                        updated_at: new Date().toISOString(),
                    }).eq('id', req.id)
                    setError(functionError)
                    setLoading(false)
                    setGeneratingId(null)
                    loadData()
                    return
                }
            }

            const period = new Date().toISOString().slice(0, 7)
            await client.database.from('usage_logs').insert([{
                user_id: userId,
                action: 'content_generate',
                count: 1,
                period
            }])
            setUsage(prev => prev + 1)
        } catch (err: any) {
            setError(err.message || 'Generation failed')
        } finally {
            setLoading(false)
            setGeneratingId(null)
            loadData()
        }
    }

    const retryRequest = async (req: any) => {
        setError('')
        const kw = keywords.find(k => k.id === req.keyword_id)
        if (!kw) {
            setError('Original keyword not found. Please generate a new post.')
            return
        }
        setGeneratingId(req.id)
        try {
            await client.database.from('content_requests').update({
                status: 'generating',
                title: null,
                content_html: null,
                updated_at: new Date().toISOString(),
            }).eq('id', req.id)
            loadData()

            let edgeSuccess = false
            let functionError = ''
            try {
                const { error: invokeErr, status } = await invokeEdgeFunction('content-generator', {
                    request_id: req.id,
                    keyword: kw.keyword,
                })
                if (!invokeErr) {
                    edgeSuccess = true
                } else {
                    functionError = invokeErr.message || `Edge function error (HTTP ${status})`
                    throw new Error(functionError)
                }
            } catch (err: any) {
                const msg = err?.message || String(err)
                if (msg.includes('404') || msg.includes('Not Found') || msg.includes('not found')) {
                    functionError = 'Edge function not deployed. Trying browser-side generation...'
                } else if (msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('Failed to fetch') || msg.includes('fetch')) {
                    functionError = 'Edge function unreachable. Trying browser-side generation...'
                } else if (msg.includes('OPENROUTER_API_KEY') || msg.includes('not configured')) {
                    functionError = 'Server missing API key. Trying browser-side generation...'
                } else {
                    functionError = msg
                }
                console.warn('[Content] Retry edge function failed, trying client-side fallback:', msg)
            }

            // If edge function failed, try client-side fallback
            if (!edgeSuccess) {
                const fallback = await generateContentClientSide(kw.keyword)
                if (fallback) {
                    await client.database.from('content_requests').update({
                        title: fallback.title,
                        meta_description: fallback.meta_description,
                        content_html: fallback.content_html,
                        word_count: fallback.word_count,
                        status: 'ready',
                        updated_at: new Date().toISOString(),
                    }).eq('id', req.id)
                    setError('Generated via browser fallback. Deploy the edge function for server-side generation.')
                } else {
                    await client.database.from('content_requests').update({
                        status: 'error',
                        title: 'Generation failed',
                        content_html: `<p class="text-red-600">${functionError}</p>`,
                        updated_at: new Date().toISOString(),
                    }).eq('id', req.id)
                    setError(functionError)
                }
            }
        } catch (err: any) {
            setError(err.message || 'Retry failed')
        } finally {
            setGeneratingId(null)
            loadData()
        }
    }

    const deleteRequest = async (id: string) => {
        await client.database.from('content_requests').delete().eq('id', id)
        loadData()
    }

    const downloadHTML = (item: any) => {
        const html = `<!DOCTYPE html>
<html><head><title>${item.title || 'Untitled'}</title><meta name="description" content="${item.meta_description || ''}"></head>
<body><article>${item.content_html || ''}</article></body></html>`
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(item.title || 'blog-post').toLowerCase().replace(/\s+/g, '-')}.html`
        a.click()
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Content Writer</h1>
                    <p className="text-gray-500 mt-1">Generate SEO blog posts in seconds</p>
                </div>
                <span className="text-sm text-gray-500">
                    {usage} / {TIER_LIMITS[profile?.tier || 'starter'] === Infinity ? 'Unlimited' : TIER_LIMITS[profile?.tier || 'starter']} posts this month
                </span>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Generator Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Keyword</label>
                                <select
                                    value={selectedKeyword}
                                    onChange={e => setSelectedKeyword(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                    required
                                >
                                    <option value="">Choose a keyword...</option>
                                    {keywords.map(k => (
                                        <option key={k.id} value={k.id}>{k.keyword}</option>
                                    ))}
                                </select>
                            </div>

                            {websites.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Website (optional)</label>
                                    <select
                                        value={selectedWebsite}
                                        onChange={e => setSelectedWebsite(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                    >
                                        <option value="">None</option>
                                        {websites.map(w => (
                                            <option key={w.id} value={w.id}>{w.domain}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Publish Method</label>
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => setPublishMethod('download')}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm transition-colors ${publishMethod === 'download' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}
                                    >
                                        <Download className="w-4 h-4" /> Download HTML
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPublishMethod('wordpress')}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm transition-colors ${publishMethod === 'wordpress' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}
                                    >
                                        <Globe className="w-4 h-4" /> Publish to WordPress
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !selectedKeyword}
                                className="w-full py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-semibold rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {loading ? 'Writing...' : 'Generate Post'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Content List */}
                <div className="lg:col-span-2 space-y-4">
                    {requests.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">No content yet</h3>
                            <p className="text-gray-500 text-sm">Select a keyword and generate your first blog post.</p>
                        </div>
                    ) : (
                        requests.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-900">{r.title || 'Generating...'}</h3>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.status === 'published' ? 'bg-green-50 text-green-700' :
                                            r.status === 'ready' ? 'bg-blue-50 text-blue-700' :
                                                r.status === 'generating' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-gray-50 text-gray-600'
                                            }`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    {r.meta_description && (
                                        <p className="text-sm text-gray-500 mb-3">{r.meta_description}</p>
                                    )}
                                    {r.word_count && (
                                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                                            <span>{r.word_count} words</span>
                                            {r.publish_method === 'wordpress' && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> WordPress</span>}
                                        </div>
                                    )}

                                    {r.content_html && r.status === 'ready' && (
                                        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 mb-4 max-h-48 overflow-y-auto">
                                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: r.content_html.slice(0, 800) + '...' }} />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {r.status === 'ready' && (
                                            <button
                                                onClick={() => downloadHTML(r)}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                <Download className="w-4 h-4" /> Download
                                            </button>
                                        )}
                                        {r.status === 'error' && (
                                            <button
                                                onClick={() => retryRequest(r)}
                                                disabled={generatingId === r.id}
                                                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {generatingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                {generatingId === r.id ? 'Retrying...' : 'Retry'}
                                            </button>
                                        )}
                                        {(r.status === 'error' || r.status === 'draft') && (
                                            <button
                                                onClick={() => deleteRequest(r.id)}
                                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                <XCircle className="w-4 h-4" /> Delete
                                            </button>
                                        )}
                                        {r.status === 'generating' && generatingId !== r.id && (
                                            <span className="text-sm text-amber-600 flex items-center gap-1.5">
                                                <Loader2 className="w-4 h-4 animate-spin" /> AI is writing...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
