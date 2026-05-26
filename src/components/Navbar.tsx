import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import client from '../lib/insforge'
import { Search, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
    const { user, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = async () => {
        await (client.auth as any).signOut()
        window.location.reload()
    }

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-accent-500 rounded-lg flex items-center justify-center">
                            <Search className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-brand-700 to-accent-600 bg-clip-text text-transparent">
                            RankAI
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        {!isAuthenticated && (
                            <>
                                <Link to="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Home</Link>
                                <Link to="/pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Pricing</Link>
                            </>
                        )}
                        {isAuthenticated && (
                            <>
                                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Dashboard</Link>
                                <Link to="/keywords" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Keywords</Link>
                                <Link to="/content" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Content</Link>
                                <Link to="/settings" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Settings</Link>
                            </>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">{user?.email}</span>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                    Sign out
                                </button>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                                    Sign in
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-600 rounded-full hover:shadow-lg transition-shadow"
                                >
                                    Start Ranking
                                </Link>
                            </>
                        )}
                    </div>

                    <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {mobileOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100 space-y-3">
                        {!isAuthenticated && (
                            <>
                                <Link to="/" className="block px-3 py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Home</Link>
                                <Link to="/pricing" className="block px-3 py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Pricing</Link>
                            </>
                        )}
                        {isAuthenticated && (
                            <>
                                <Link to="/dashboard" className="block px-3 py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                                <Link to="/keywords" className="block px-3 py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Keywords</Link>
                                <Link to="/content" className="block px-3 py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Content</Link>
                                <Link to="/settings" className="block px-3 py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Settings</Link>
                            </>
                        )}
                        {isAuthenticated ? (
                            <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="block px-3 py-2 text-gray-600 w-full text-left">Sign out</button>
                        ) : (
                            <div className="flex flex-col gap-2 px-3">
                                <Link to="/login" className="block py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Sign in</Link>
                                <Link to="/register" className="block py-2 text-center text-white bg-brand-600 rounded-lg" onClick={() => setMobileOpen(false)}>Start Ranking</Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    )
}
