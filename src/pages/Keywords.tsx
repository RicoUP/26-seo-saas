import { useState, useEffect } from 'react'
import client from '../lib/insforge'
import { Search, Trash2, TrendingUp, Loader2, Download, X, AlertTriangle } from 'lucide-react'

const TIER_LIMITS: Record<string, number> = { starter: 50, growth: 200, pro: 1000 }

function AddRankingModal({ keywordId, keywordText, onClose, onSaved }: { keywordId: string; keywordText: string; onClose: () => void; onSaved: () => void }) {
    const [position, setPosition] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const pos = parseInt(position, 10)
        if (!pos || pos <= 0) return
        setSaving(true)
        await client.database.from('keyword_rankings').insert([{
            keyword_id: keywordId,
            position: pos,
            notes: notes.trim() || null,
            source: 'manual'
        }])
        setSaving(false)
        onSaved()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Log Ranking</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4 truncate">{keywordText}</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Google Position</label>
                        <input
                            type="number"
                            min={1}
                            value={position}
                            onChange={e => setPosition(e.target.value)}
                            placeholder="e.g., 4"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g., after blog post published"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Ranking'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function generateMockKeywords(seed: string) {
    const base = seed.toLowerCase().replace(/\s+/g, ' ').trim()
    const suffixes = ['near me', 'services', 'cost', 'reviews', 'best', 'affordable', 'local', 'emergency', 'company', 'tips', 'how to choose', '2024']
    const intents = ['informational', 'transactional', 'commercial']
    const keywords = suffixes.map((s, i) => ({
        keyword: `${base} ${s}`,
        difficulty: Math.floor(Math.random() * 55) + 15,
        search_volume: Math.floor(Math.random() * 8000) + 300,
        intent: intents[i % 3]
    }))
    return keywords
}

export default function Keywords() {
    const [seedKeyword, setSeedKeyword] = useState('')
    const [keywords, setKeywords] = useState<any[]>([])
    const [rankings, setRankings] = useState<Record<string, any>>({})
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [usage, setUsage] = useState(0)
    const [error, setError] = useState('')
    const [modalKeyword, setModalKeyword] = useState<{ id: string; text: string } | null>(null)

    useEffect(() => {
        loadProfile()
        loadKeywords()
    }, [])

    const loadProfile = async () => {
        const { data } = await client.database.from('profiles').select('*').single()
        setProfile(data)
    }

    const loadKeywords = async () => {
        const { data } = await client.database.from('keywords').select('*').order('created_at', { ascending: false })
        setKeywords(data || [])

        if (data && data.length > 0) {
            const ids = data.map((k: any) => k.id)
            const { data: r } = await client.database.from('keyword_rankings')
                .select('*')
                .in('keyword_id', ids)
                .order('date', { ascending: false })
            const map: Record<string, any> = {}
            if (r) {
                for (const entry of r) {
                    if (!map[entry.keyword_id]) {
                        map[entry.keyword_id] = entry
                    }
                }
            }
            setRankings(map)
        }

        const period = new Date().toISOString().slice(0, 7)
        const { data: u } = await client.database.from('usage_logs')
            .select('count')
            .eq('action', 'keyword_research')
            .eq('period', period)
        setUsage(u?.reduce((acc: number, x: any) => acc + (x.count || 1), 0) || 0)
    }

    const handleResearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!seedKeyword.trim()) return

        const limit = TIER_LIMITS[profile?.tier || 'starter']
        if (usage >= limit) {
            setError(`You've reached your ${limit} keyword lookups for this month. Upgrade to get more.`)
            return
        }

        setLoading(true)
        let results: any[] = []
        let usedFallback = false

        try {
            const res = await (client as any).functions.invoke('keyword-research', {
                body: { seed_keyword: seedKeyword.trim() }
            })
            if (res.error) throw new Error(res.error.message)
            results = res.data?.keywords || []
        } catch (err: any) {
            // Fallback: generate mock keywords locally so the app works without deployed functions
            results = generateMockKeywords(seedKeyword.trim())
            usedFallback = true
        }

        const inserts = results.map((k: any) => ({
            seed_keyword: seedKeyword.trim(),
            keyword: k.keyword,
            difficulty: k.difficulty,
            search_volume: k.search_volume,
            intent: k.intent,
            status: 'idea'
        }))

        if (inserts.length > 0) {
            await client.database.from('keywords').insert(inserts)
            const period = new Date().toISOString().slice(0, 7)
            await client.database.from('usage_logs').insert([{
                action: 'keyword_research',
                count: inserts.length,
                period
            }])
        }

        setSeedKeyword('')
        await loadKeywords()
        if (usedFallback) {
            setError('Showing demo keywords (edge function not deployed). Deploy the function for live AI research.')
        }
        setLoading(false)
    }

    const updateStatus = async (id: string, status: string) => {
        await client.database.from('keywords').update({ status }).eq('id', id)
        loadKeywords()
    }

    const deleteKeyword = async (id: string) => {
        await client.database.from('keywords').delete().eq('id', id)
        loadKeywords()
    }

    const exportCSV = () => {
        const headers = ['Keyword', 'Seed', 'Difficulty', 'Volume', 'Intent', 'Status', 'Latest Position']
        const rows = keywords.map(k => [k.keyword, k.seed_keyword, k.difficulty, k.search_volume, k.intent, k.status, rankings[k.id]?.position || ''])
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'keywords.csv'
        a.click()
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Keyword Research</h1>
                    <p className="text-gray-500 mt-1">Discover what your customers are searching for</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {usage} / {TIER_LIMITS[profile?.tier || 'starter']} lookups this month
                    </span>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
                <form onSubmit={handleResearch} className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={seedKeyword}
                            onChange={e => setSeedKeyword(e.target.value)}
                            placeholder="Enter a seed keyword (e.g., 'plumber denver')..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-semibold rounded-xl hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Research
                    </button>
                </form>
            </div>

            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{keywords.length} keywords found</p>
                {keywords.length > 0 && (
                    <button onClick={exportCSV} className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Keyword</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Difficulty</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Volume</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Intent</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {keywords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                                        No keywords yet. Enter a seed keyword above to start researching.
                                    </td>
                                </tr>
                            ) : (
                                keywords.map(k => (
                                    <tr key={k.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{k.keyword}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-green-500 to-red-500" style={{ width: `${k.difficulty || 0}%` }} />
                                                </div>
                                                <span className="text-sm text-gray-600">{k.difficulty || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{k.search_volume || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 capitalize">{k.intent}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={k.status}
                                                onChange={e => updateStatus(k.id, e.target.value)}
                                                className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                <option value="idea">Idea</option>
                                                <option value="target">Target</option>
                                                <option value="published">Published</option>
                                                <option value="dropped">Dropped</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            {rankings[k.id] ? (
                                                <span className="text-sm font-semibold text-gray-900">#{rankings[k.id].position}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setModalKeyword({ id: k.id, text: k.keyword })}
                                                    className="text-gray-400 hover:text-brand-600 transition-colors"
                                                    title="Log ranking"
                                                >
                                                    <TrendingUp className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteKeyword(k.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalKeyword && (
                <AddRankingModal
                    keywordId={modalKeyword.id}
                    keywordText={modalKeyword.text}
                    onClose={() => setModalKeyword(null)}
                    onSaved={loadKeywords}
                />
            )}
        </div>
    )
}
