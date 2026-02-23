import { GameSalesLogoV1, GameSalesLogoV2, GameSalesLogoV3 } from '@/components/branding/GameSalesLogo';

export default function LogoPreview() {
    return (
        <div className="min-h-screen bg-slate-950 p-12">
            <div className="max-w-6xl mx-auto space-y-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-white mb-4">Game Sales - Logo Variations</h1>
                    <p className="text-gray-400">Escolha a logo que mais gostar!</p>
                </div>

                {/* Variation 1 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-emerald-400 mb-6">Variation 1: Trophy + Growth Arrow</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm">Ícone apenas</p>
                            <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                                <GameSalesLogoV1 variant="icon" className="w-24 h-24" />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <p className="text-gray-400 text-sm">Logo completa</p>
                            <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                                <GameSalesLogoV1 variant="full" className="w-full h-20" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4">
                        <p className="text-gray-400 text-sm">Em fundo escuro</p>
                        <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-center">
                            <GameSalesLogoV1 variant="full" className="w-96 h-20" />
                        </div>
                    </div>
                </div>

                {/* Variation 2 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-emerald-400 mb-6">Variation 2: Modern GS Monogram 🌟</h2>
                    <p className="text-gray-400 text-sm mb-4">Recomendada - Clean e profissional</p>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm">Ícone apenas</p>
                            <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                                <GameSalesLogoV2 variant="icon" className="w-24 h-24" />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <p className="text-gray-400 text-sm">Logo completa</p>
                            <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                                <GameSalesLogoV2 variant="full" className="w-full h-20" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4">
                        <p className="text-gray-400 text-sm">Em fundo escuro</p>
                        <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-center">
                            <GameSalesLogoV2 variant="full" className="w-96 h-20" />
                        </div>
                    </div>
                </div>

                {/* Variation 3 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-emerald-400 mb-6">Variation 3: Abstract Growth Chart</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <p className="text-gray-400 text-sm">Ícone apenas</p>
                            <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                                <GameSalesLogoV3 variant="icon" className="w-24 h-24" />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <p className="text-gray-400 text-sm">Logo completa</p>
                            <div className="bg-white rounded-xl p-6 flex items-center justify-center">
                                <GameSalesLogoV3 variant="full" className="w-full h-20" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4">
                        <p className="text-gray-400 text-sm">Em fundo escuro</p>
                        <div className="bg-slate-900 rounded-xl p-6 flex items-center justify-center">
                            <GameSalesLogoV3 variant="full" className="w-96 h-20" />
                        </div>
                    </div>
                </div>

                {/* Usage Examples */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Como usar as logos</h2>
                    <div className="space-y-4 text-gray-300">
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                            {`import { GameSalesLogoV2 } from '@/components/branding/GameSalesLogo';

// Logo completa
<GameSalesLogoV2 variant="full" className="w-64 h-16" />

// Apenas ícone (para favicons, avatars)
<GameSalesLogoV2 variant="icon" className="w-10 h-10" />`}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
