import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ArrowRight, Search, FileText, TrendingUp, Globe, Sparkles, Star, Zap, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'

function CountdownTimer() {
    const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 0, minutes: 0, seconds: 0 })

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { days, hours, minutes, seconds } = prev
                if (seconds > 0) seconds--
                else if (minutes > 0) { minutes--; seconds = 59 }
                else if (hours > 0) { hours--; minutes = 59; seconds = 59 }
                else if (days > 0) { days--; hours = 23; minutes = 59; seconds = 59 }
                return { days, hours, minutes, seconds }
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.days}d</span>
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.hours}h</span>
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.minutes}m</span>
            <span className="px-2 py-1 bg-white/20 rounded">{timeLeft.seconds}s</span>
        </div>
    )
}

const features = [
    {
        icon: Search,
        title: 'Keyword Research',
        desc: 'AI finds high-intent keywords your competitors are missing — automatically clustered and prioritized.'
    },
    {
        icon: FileText,
        title: 'AI Blog Writer',
        desc: 'Generate 2,000+ word SEO blog posts with proper headers, meta descriptions, and internal links.'
    },
    {
        icon: Globe,
        title: 'One-Click Publish',
        desc: 'Connect WordPress and publish directly. No copy-paste, no formatting headaches.'
    },
    {
        icon: TrendingUp,
        title: 'Rank Tracker',
        desc: 'Track your keyword positions over time. Monthly digest shows your wins.'
    }
]

const steps = [
    { num: '1', title: 'Enter your niche', desc: 'Tell us your website and what you sell.' },
    { num: '2', title: 'AI finds keywords', desc: 'We discover untapped search opportunities.' },
    { num: '3', title: 'Write & publish', desc: 'AI creates SEO blog posts. Publish to WordPress in one click.' },
    { num: '4', title: 'Rank & grow', desc: 'Watch your traffic climb as Google picks up your content.' }
]

const testimonials = [
    { name: 'Sarah M.', role: 'PlumbingPro Denver', quote: 'We went from 200 to 8,000 monthly visitors in 3 months. Best investment we ever made.', avatar: 'SM' },
    { name: 'James T.', role: 'Austin Electric', quote: "We're #1 for 'electrician Austin'. Replaced our $1,500/mo agency completely.", avatar: 'JT' },
    { name: 'Maria L.', role: 'CleanCo Chicago', quote: 'I publish 3 SEO blog posts a week without writing a single word. The traffic just keeps growing.', avatar: 'ML' },
    { name: 'David R.', role: 'RoofRight Miami', quote: 'SEO Tool doubled our organic traffic in 60 days. No technical skills needed.', avatar: 'DR' },
    { name: 'Lisa K.', role: 'FitLife Gym', quote: 'We now rank for 50+ local keywords. New members find us on Google every single day.', avatar: 'LK' }
]

const faqs = [
    { q: 'Will Google penalize AI content?', a: 'Not if it\'s high quality. SEO Tool generates original, well-researched content that follows Google\'s E-E-A-T guidelines. Many of our customers rank #1 with AI-generated posts.' },
    { q: 'Do I need technical skills?', a: 'Absolutely not. If you can copy-paste a WordPress password, you can use SEO Tool. Everything else is automated.' },
    { q: 'What if I don\'t use WordPress?', a: 'You can download your content as HTML or Markdown and upload it to any CMS. WordPress publishing is just one click — everything else is a simple download.' },
    { q: 'How is this different from other AI writers?', a: 'SEO Tool is built specifically for SEO. We research keywords first, then write content designed to rank — not generic blog fluff.' },
    { q: 'Is there a money-back guarantee?', a: 'Yes. 7-day money-back guarantee. No questions asked.' }
]

function GSCChart() {
    const bars = [12, 18, 15, 22, 28, 35, 42, 38, 48, 55, 62, 78, 85, 92, 98, 105, 112, 118, 125, 130, 142, 158, 175, 192]
    const max = Math.max(...bars)

    return (
        <div className="flex items-end gap-1.5 h-48 px-2">
            {bars.map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-brand-500 to-brand-300 rounded-t transition-all hover:from-brand-600 hover:to-brand-400"
                    style={{ height: `${(h / max) * 100}%` }} />
            ))}
        </div>
    )
}

export default function Home() {
    const { isAuthenticated } = useAuth()
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    return (
        <div className="flex flex-col">
            {/* FOMO Banner */}
            <div className="hero-gradient text-white py-2.5 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap text-sm">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">Prices increase in</span>
                    <CountdownTimer />
                    <span>— lock in $49/mo forever</span>
                </div>
            </div>

            {/* Hero */}
            <section className="relative overflow-hidden bg-white py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-8">
                            <Sparkles className="w-4 h-4" />
                            <span>350+ businesses already ranking higher</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
                            Rank #1 on<br />
                            <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">Google & ChatGPT</span>
                        </h1>
                        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            AI researches your keywords, writes SEO blog posts, and publishes them directly to WordPress.
                            <span className="text-gray-900 font-semibold"> Replace your $2,000/mo agency.</span>
                        </p>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            {isAuthenticated ? (
                                <Link to="/dashboard" className="px-8 py-4 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold rounded-full text-lg hover:shadow-xl transition-shadow flex items-center gap-2">
                                    Go to Dashboard <ArrowRight className="w-5 h-5" />
                                </Link>
                            ) : (
                                <Link to="/register" className="px-8 py-4 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold rounded-full text-lg hover:shadow-xl transition-shadow flex items-center gap-2">
                                    Start Ranking — $49/mo <ArrowRight className="w-5 h-5" />
                                </Link>
                            )}
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-green-500" /> 7-day money back
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-green-500" /> Cancel anytime
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-green-500" /> No credit card for trial
                            </div>
                        </div>

                        {/* Social proof avatars */}
                        <div className="mt-10 flex items-center justify-center gap-3">
                            <div className="flex -space-x-2">
                                {testimonials.slice(0, 5).map((t, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                                        {t.avatar}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                <span className="text-sm text-gray-600 font-medium ml-1">4.9/5 from 350+ customers</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
                        <p className="text-lg text-gray-500">From zero to ranking in 4 simple steps.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((step, i) => (
                            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6">
                                    {step.num}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-gray-500">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Everything you need to rank</h2>
                        <p className="text-lg text-gray-500">One platform. No tools to stitch together. No agency fees.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-start gap-5 p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                                    <f.icon className="w-6 h-6 text-brand-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{f.title}</h3>
                                    <p className="text-gray-500">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Fake results / testimonials */}
            <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Real businesses, real results</h2>
                        <p className="text-lg text-gray-500">These customers replaced expensive agencies with SEO Tool.</p>
                    </div>

                    {/* Fake GSC screenshot area */}
                    <div className="max-w-4xl mx-auto mb-16 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-xs font-mono ml-2 opacity-60">search.google.com/search-console</span>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Clicks (Last 3 Months)</p>
                                    <p className="text-2xl font-bold text-gray-900">12,847 <span className="text-green-500 text-sm font-medium">+847%</span></p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Position</p>
                                    <p className="text-2xl font-bold text-gray-900">4.2 <span className="text-green-500 text-sm font-medium">improved</span></p>
                                </div>
                            </div>
                            <GSCChart />
                        </div>
                    </div>

                    {/* Testimonials */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {testimonials.slice(0, 3).map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                </div>
                                <p className="text-gray-600 mb-4 text-sm leading-relaxed">"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                                        <p className="text-xs text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing teaser */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Simple pricing, serious ROI</h2>
                    <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
                        Stop paying agencies $2,000+/mo. SEO Tool does the same work for less than your coffee budget.
                    </p>
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-brand-50 rounded-full border border-brand-100 mb-8">
                        <CountdownTimer />
                        <span className="text-brand-800 font-medium text-sm">until prices go up</span>
                    </div>
                    <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-brand-500 shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-600 to-accent-600 text-white px-6 py-3 text-sm font-semibold">
                            Most Popular — Starter
                        </div>
                        <div className="p-8">
                            <div className="flex items-baseline justify-center gap-1 mb-2">
                                <span className="text-5xl font-extrabold text-gray-900">$49</span>
                                <span className="text-gray-500">/mo</span>
                            </div>
                            <p className="text-gray-500 text-sm mb-6">Perfect for 1 website</p>
                            <ul className="space-y-3 text-left text-sm text-gray-600 mb-8">
                                {['50 keyword lookups/mo', '10 AI blog posts/mo', '1-click WordPress publish', 'Manual rank tracking', 'Monthly email digest'].map((f, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" className="block w-full py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold rounded-xl hover:shadow-lg transition-shadow text-center">
                                Get Started
                            </Link>
                        </div>
                    </div>
                    <p className="mt-6 text-sm text-gray-400">
                        <Link to="/pricing" className="text-brand-600 hover:text-brand-700 font-medium">See all plans →</Link>
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
                    </div>
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    <span className="font-semibold text-gray-900">{faq.q}</span>
                                    {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 hero-gradient text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl lg:text-5xl font-extrabold mb-6">
                        Stop paying agencies $2,000/mo.
                    </h2>
                    <p className="text-xl text-white/80 mb-10">
                        Start ranking for $49. Lock in your price before it goes up.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {isAuthenticated ? (
                            <Link to="/dashboard" className="px-8 py-4 bg-white text-brand-700 font-bold rounded-full text-lg hover:shadow-xl transition-shadow flex items-center gap-2">
                                Go to Dashboard <ArrowRight className="w-5 h-5" />
                            </Link>
                        ) : (
                            <Link to="/register" className="px-8 py-4 bg-white text-brand-700 font-bold rounded-full text-lg hover:shadow-xl transition-shadow flex items-center gap-2">
                                Start Ranking Now <ArrowRight className="w-5 h-5" />
                            </Link>
                        )}
                    </div>
                    <p className="mt-6 text-sm text-white/60">7-day money-back guarantee. Cancel anytime.</p>
                </div>
            </section>
        </div>
    )
}
