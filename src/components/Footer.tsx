import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-brand-600 to-accent-500 rounded-lg flex items-center justify-center">
                                <Search className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="font-bold text-gray-900">SEO Tool</span>
                        </div>
                        <p className="text-sm text-gray-500">AI SEO that replaces your expensive agency — for the price of coffee.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Product</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="/" className="hover:text-gray-900">Home</Link></li>
                            <li><Link to="/pricing" className="hover:text-gray-900">Pricing</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><span className="hover:text-gray-900 cursor-pointer">Blog</span></li>
                            <li><span className="hover:text-gray-900 cursor-pointer">About</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><span className="hover:text-gray-900 cursor-pointer">Privacy</span></li>
                            <li><span className="hover:text-gray-900 cursor-pointer">Terms</span></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
                    &copy; 2026 SEO Tool. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
