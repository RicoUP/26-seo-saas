import { useState, useEffect } from 'react'
import client from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { Globe, Trash2, Plus, ExternalLink } from 'lucide-react'

export default function Settings() {
    const { user } = useAuth()
    const [profile, setProfile] = useState<any>(null)
    const [websites, setWebsites] = useState<any[]>([])
    const [showAddWebsite, setShowAddWebsite] = useState(false)
    const [newDomain, setNewDomain] = useState('')
    const [newNiche, setNewNiche] = useState('')
    const [newWpUrl, setNewWpUrl] = useState('')
    const [newWpUser, setNewWpUser] = useState('')
    const [newWpPass, setNewWpPass] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const { data: p } = await client.database.from('profiles').select('*').single()
        const { data: w } = await client.database.from('websites').select('*').order('created_at', { ascending: false })
        setProfile(p)
        setWebsites(w || [])
    }

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
        setNewDomain('')
        setNewNiche('')
        setNewWpUrl('')
        setNewWpUser('')
        setNewWpPass('')
        setShowAddWebsite(false)
        loadData()
    }

    const deleteWebsite = async (id: string) => {
        await client.database.from('websites').update({ status: 'deleted' }).eq('id', id)
        loadData()
    }

    const openStripePortal = async () => {
        if (!profile?.stripe_customer_id) {
            alert('No active subscription yet.')
            return
        }
        // Would call a backend endpoint to create customer portal session
        alert('Stripe Customer Portal would open here.')
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Websites</h2>
                    <button
                        onClick={() => setShowAddWebsite(!showAddWebsite)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-lg hover:bg-brand-100 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Website
                    </button>
                </div>

                {showAddWebsite && (
                    <form onSubmit={addWebsite} className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Domain *</label>
                            <input
                                type="text"
                                value={newDomain}
                                onChange={e => setNewDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Niche</label>
                            <input
                                type="text"
                                value={newNiche}
                                onChange={e => setNewNiche(e.target.value)}
                                placeholder="e.g., Plumbing, Electrician, SaaS"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">WordPress URL (optional)</label>
                            <input
                                type="url"
                                value={newWpUrl}
                                onChange={e => setNewWpUrl(e.target.value)}
                                placeholder="https://example.com/wp-json"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
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
                        <button type="submit" className="w-full py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors">
                            Save Website
                        </button>
                    </form>
                )}

                <div className="space-y-3">
                    {websites.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">No websites added yet.</p>
                    ) : (
                        websites.map(w => (
                            <div key={w.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-brand-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{w.domain}</p>
                                        <p className="text-xs text-gray-500">{w.niche || 'No niche set'} {w.cms_type === 'wordpress' && '· WordPress'}</p>
                                    </div>
                                </div>
                                <button onClick={() => deleteWebsite(w.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
