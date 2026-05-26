import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../lib/insforge'
import { Search, FileText, TrendingUp, Globe, ArrowRight, Sparkles } from 'lucide-react'

export default function Dashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [keywords, setKeywords] = useState<any[]>([])
    const [content, setContent] = useState<any[]>([])
    const [websites, setWebsites] = useState<any[]>([])
    const [avgPosition, setAvgPosition] = useState<string>('—')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const { data: p } = await client.database.from('profiles').select('*').single()
        const { data: k } = await client.database.from('keywords').select('*').order('created_at', { ascending: false }).limit(5)
        const { data: c } = await client.database.from('content_requests').select('*').order('created_at', { ascending: false }).limit(5)
        const { data: w } = await client.database.from('websites').select('*').limit(5)

        // Compute average position from latest ranking entries per keyword
        const { data: rankings } = await client.database.from('keyword_rankings')
            .select('position, keywords!inner(id)')
            .order('date', { ascending: false })
            .limit(100)

        const latestByKeyword: Record<string, number> = {}
        if (rankings) {
            for (const r of rankings) {
                const kwId = (r as any).keywords?.id
                if (kwId && !(kwId in latestByKeyword)) {
                    latestByKeyword[kwId] = r.position
                }
            }
        }
        const positions = Object.values(latestByKeyword).filter((n): n is number => typeof n === 'number' && n > 0)
        if (positions.length > 0) {
            const avg = positions.reduce((a, b) => a + b, 0) / positions.length
            setAvgPosition(avg.toFixed(1))
        }

        setProfile(p)
        setKeywords(k || [])
        setContent(c || [])
        setWebsites(w || [])
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    const stats = [
        { label: 'Keywords', value: keywords.length, icon: Search, color: 'bg-brand-50 text-brand-600' },
        { label: 'Content Pieces', value: content.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
        { label: 'Websites', value: websites.length, icon: Globe, color: 'bg-green-50 text-green-600' },
        { label: 'Avg Position', value: avgPosition, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' }
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-sm text-gray-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <Link to="/keywords" className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white hover:shadow-lg transition-shadow group">
                    <div className="flex items-start justify-between">
                        <div>
                            <Search className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="text-lg font-bold mb-1">Research Keywords</h3>
                            <p className="text-white/70 text-sm">Find untapped search opportunities for your niche</p>
                        </div>
                        <ArrowRight className="w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
                <Link to="/content" className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl p-6 text-white hover:shadow-lg transition-shadow group">
                    <div className="flex items-start justify-between">
                        <div>
                            <Sparkles className="w-8 h-8 mb-4 opacity-80" />
                            <h3 className="text-lg font-bold mb-1">Generate Content</h3>
                            <p className="text-white/70 text-sm">AI writes SEO blog posts ready to publish</p>
                        </div>
                        <ArrowRight className="w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
                    </div>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Recent Keywords</h3>
                        <Link to="/keywords" className="text-sm text-brand-600 hover:text-brand-700">View all</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {keywords.length === 0 ? (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">No keywords yet. Start researching!</div>
                        ) : (
                            keywords.map((k, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">{k.keyword}</p>
                                        <p className="text-xs text-gray-500">Seed: {k.seed_keyword}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${k.status === 'target' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                        {k.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Recent Content</h3>
                        <Link to="/content" className="text-sm text-brand-600 hover:text-brand-700">View all</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {content.length === 0 ? (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">No content yet. Generate your first post!</div>
                        ) : (
                            content.map((c, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="truncate mr-4">
                                        <p className="font-medium text-gray-900 truncate">{c.title || 'Untitled'}</p>
                                        <p className="text-xs text-gray-500">{c.word_count ? `${c.word_count} words` : 'Draft'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${c.status === 'published' ? 'bg-green-50 text-green-700' : c.status === 'ready' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                                        {c.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
