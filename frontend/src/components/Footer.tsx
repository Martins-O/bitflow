import { Link } from 'react-router-dom'

export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-dark-secondary/30 mt-auto">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">⚡</span>
                            <span className="text-xl font-bold text-white">BitFlow</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Secure Bitcoin payments on Starknet with built-in escrow and dispute resolution.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-4">Product</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/create" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Create Invoice
                                </Link>
                            </li>
                            <li>
                                <Link to="/track" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Track Invoice
                                </Link>
                            </li>
                            <li>
                                <Link to="/dashboard" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-4">Resources</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="https://docs.starknet.io" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Starknet Docs
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    API Documentation
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Support
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Community */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider mb-4">Community</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Twitter
                                </a>
                            </li>
                            <li>
                                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Discord
                                </a>
                            </li>
                            <li>
                                <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-bitcoin-orange transition-colors">
                                    Telegram
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} BitFlow. Built for the Starknet ecosystem.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
                            Terms of Service
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
