import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Trophy,
    Kanban,
    MessageCircle,
    Check,
    ArrowRight,
    Menu,
    X,
    Zap,
    Link2,
    Sparkles,
    Target,
    Rocket,
    Award
} from "lucide-react";
import brandLogo from "@/assets/logo-full.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
};

const staggerContainer = {
    initial: {},
    whileInView: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

const LandingPage = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        telefone: "",
        plano: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nome || !formData.email || !formData.telefone || !formData.plano) {
            toast.error("Preencha todos os campos");
            return;
        }
        setSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success("Cadastro realizado! Entraremos em contato em breve.");
        setFormData({ nome: "", email: "", telefone: "", plano: "" });
        setShowRegister(false);
        setSubmitting(false);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
        setMobileMenuOpen(false);
    };

    const features = [
        {
            icon: Trophy,
            title: "Ranking em Tempo Real",
            description: "Motive vendedores com competições automáticas.",
            gradient: "from-amber-500 to-orange-600",
            size: "md:col-span-1"
        },
        {
            icon: Link2,
            title: "Venda Caiu, Meta Subiu",
            description: "Sincronização via Webhook em segundos. Integrado com Kiwify, Greenn e Hotmart.",
            gradient: "from-emerald-500 to-teal-600",
            size: "md:col-span-1"
        },
        {
            icon: Kanban,
            title: "Gestão Visual",
            description: "Arrastar e soltar nunca foi tão lucrativo.",
            gradient: "from-indigo-500 to-purple-600",
            size: "md:col-span-1"
        },
        {
            icon: MessageCircle,
            title: "Venda sem sair do Zap",
            description: "CRM integrado direto no navegador.",
            gradient: "from-green-500 to-emerald-600",
            size: "md:col-span-1"
        },
    ];

    const plans = [
        {
            name: "Starter",
            price: "197",
            tagline: "Para validar sua operação.",
            features: [
                "CRM Básico",
                "3 Usuários",
                "Dashboard",
                "Suporte por email",
            ],
            popular: false,
        },
        {
            name: "Plus",
            price: "397",
            tagline: "Para quem quer escala.",
            features: [
                "Integrações Automáticas",
                "7 Usuários",
                "Ranking Gamificado",
                "Relatórios Avançados",
                "Suporte Prioritário",
            ],
            popular: true,
        },
        {
            name: "Pro",
            price: "997",
            tagline: "A máquina completa.",
            features: [
                "Usuários Ilimitados",
                "Extensão WhatsApp",
                "IA para Vendas",
                "API Personalizada",
                "Gerente de Sucesso",
            ],
            popular: false,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <img src={brandLogo} alt="Game Sales" className="h-10 w-auto" />
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-8">
                            <button
                                onClick={() => scrollToSection("features")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Funcionalidades
                            </button>
                            <button
                                onClick={() => scrollToSection("pricing")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Preços
                            </button>
                            <button
                                onClick={() => scrollToSection("contact")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Contato
                            </button>
                        </div>

                        {/* CTA Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate("/auth")}
                                className="border-slate-400 text-slate-900 hover:bg-slate-100 font-medium"
                            >
                                Entrar
                            </Button>
                            <Button
                                onClick={() => scrollToSection("pricing")}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Começar Agora
                            </Button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-200">
                        <div className="px-4 py-4 space-y-3">
                            <button onClick={() => scrollToSection("features")} className="block w-full text-left py-2 text-slate-700">
                                Funcionalidades
                            </button>
                            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-2 text-slate-700">
                                Preços
                            </button>
                            <button onClick={() => scrollToSection("contact")} className="block w-full text-left py-2 text-slate-700">
                                Contato
                            </button>
                            <hr className="border-slate-200" />
                            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                                Entrar
                            </Button>
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => { scrollToSection("pricing"); setMobileMenuOpen(false); }}
                            >
                                Começar Agora
                            </Button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <motion.div {...fadeInUp}>
                            <Badge className="mb-6 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Novo: Integração com Hotmart
                            </Badge>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                                Transforme seu Time de Vendas em uma{" "}
                                <span className="text-indigo-600">Máquina de Performance.</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed">
                                O CRM que une gestão, gamificação e automação financeira.
                                Integrado nativamente com Kiwify, Greenn e Hotmart.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    size="lg"
                                    onClick={() => scrollToSection("pricing")}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-base h-12 px-8"
                                >
                                    Ver Planos
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => scrollToSection("contact")}
                                    className="text-base h-12 px-8 border-slate-400 text-slate-900 hover:bg-slate-100 font-medium"
                                >
                                    Falar com Consultor
                                </Button>
                            </div>
                        </motion.div>

                        {/* Right - Dashboard Mockup */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="relative"
                        >
                            <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-500">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-2xl opacity-20 -z-10 scale-105" />

                                {/* Dashboard image */}
                                <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                                    <img
                                        src={dashboardPreview}
                                        alt="Game Sales Dashboard"
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 4 Pilares Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Os 4 Pilares do Game Sales
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            O que nos diferencia: Gamificação + Automação em um só lugar.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
                    >
                        {/* Pilar 1 - Verdade em Tempo Real */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-amber-100 flex items-center justify-center mb-5">
                                    <Zap className="h-7 w-7 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Verdade em Tempo Real</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Integração nativa com Kiwify e Greenn. O Game Sales audita cada centavo: só sobe no ranking o dinheiro que realmente caiu.
                                </p>
                            </div>
                        </motion.div>

                        {/* Pilar 2 - Gamificação Neural */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center mb-5">
                                    <Trophy className="h-7 w-7 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Gamificação Neural</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    O único CRM que parece um jogo. Rankings, sons de level-up e feedback visual instantâneo para viciar seu time em vender.
                                </p>
                            </div>
                        </motion.div>

                        {/* Pilar 3 - Produtividade Invisível */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-cyan-100 flex items-center justify-center mb-5">
                                    <Rocket className="h-7 w-7 text-cyan-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Produtividade Invisível</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Seu time joga, o sistema anota. Com a Extensão Game Sales, eliminamos o preenchimento manual chato.
                                </p>
                            </div>
                        </motion.div>

                        {/* Pilar 4 - Cultura de Elite */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-yellow-100 flex items-center justify-center mb-5">
                                    <Award className="h-7 w-7 text-yellow-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Cultura de Elite</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Meritocracia automática. Quem vende mais desbloqueia novas patentes e domina o lobby da empresa.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section - Bento Grid */}
            <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Tudo para sua operação de vendas
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Ferramentas integradas para gestão, gamificação e automação.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                className={`group ${feature.size}`}
                            >
                                <div className="h-full bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
                                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Planos que crescem com você
                        </h2>
                        <p className="text-lg text-slate-600">
                            Sem surpresas, sem taxas escondidas. Cancele quando quiser.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start"
                    >
                        {plans.map((plan, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                className={plan.popular ? "md:-mt-4 md:mb-4" : ""}
                            >
                                <Card
                                    className={`relative h-full ${plan.popular
                                        ? 'border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 bg-slate-900'
                                        : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-indigo-600 text-white px-4 py-1 shadow-lg">
                                                Mais Popular
                                            </Badge>
                                        </div>
                                    )}
                                    <CardHeader className={`text-center ${plan.popular ? 'pt-10' : 'pt-6'}`}>
                                        <CardTitle className={`text-2xl ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</CardTitle>
                                        <CardDescription className={plan.popular ? 'text-slate-300' : 'text-slate-600'}>{plan.tagline}</CardDescription>
                                        <div className="mt-4">
                                            <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>R$ {plan.price}</span>
                                            <span className={plan.popular ? 'text-slate-400' : 'text-slate-500'}>/mês</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-3">
                                                    <Check className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                                    <span className={`text-sm ${plan.popular ? 'text-slate-300' : 'text-slate-700'}`}>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className={`w-full mt-6 ${plan.popular
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                                                }`}
                                            onClick={() => {
                                                setFormData({ ...formData, plano: plan.name });
                                                setShowRegister(true);
                                            }}
                                        >
                                            Escolher {plan.name}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Contact/CTA Section */}
            <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 bg-indigo-600">
                <motion.div
                    {...fadeInUp}
                    className="max-w-4xl mx-auto text-center text-white"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Pronto para escalar suas vendas?
                    </h2>
                    <p className="text-lg text-indigo-100 mb-8">
                        Fale com um consultor e descubra como o Game Sales pode transformar sua operação.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            onClick={() => setShowRegister(true)}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 text-base h-12 px-8"
                        >
                            Começar Agora
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white/30 text-white hover:bg-white/10 text-base h-12 px-8"
                            onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
                        >
                            Falar no WhatsApp
                        </Button>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <img src={brandLogo} alt="Game Sales" className="h-8" />
                        <div className="flex gap-8 text-sm text-slate-600">
                            <button onClick={() => scrollToSection("features")} className="hover:text-slate-900 transition-colors">
                                Funcionalidades
                            </button>
                            <button onClick={() => scrollToSection("pricing")} className="hover:text-slate-900 transition-colors">
                                Preços
                            </button>
                            <button onClick={() => navigate("/politica-privacidade")} className="hover:text-slate-900 transition-colors">
                                Privacidade
                            </button>
                            <button onClick={() => navigate("/auth")} className="hover:text-slate-900 transition-colors">
                                Login
                            </button>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-sm text-slate-500">
                        © 2025 Game Sales. Todos os direitos reservados.
                    </div>
                </div>
            </footer>

            {/* Registration Modal */}
            {showRegister && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <Card className="w-full max-w-md bg-white">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-slate-900">Criar sua conta</CardTitle>
                                    <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-slate-600">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <CardDescription>
                                    Preencha seus dados para começar sua experiência com o Game Sales.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nome" className="text-slate-700">Nome completo</Label>
                                        <Input
                                            id="nome"
                                            placeholder="Seu nome"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className="border-slate-300"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-slate-700">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="border-slate-300"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="telefone" className="text-slate-700">Telefone</Label>
                                        <Input
                                            id="telefone"
                                            placeholder="(00) 00000-0000"
                                            value={formData.telefone}
                                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                            className="border-slate-300"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="plano" className="text-slate-700">Qual plano deseja?</Label>
                                        <Select
                                            value={formData.plano}
                                            onValueChange={(value) => setFormData({ ...formData, plano: value })}
                                        >
                                            <SelectTrigger className="border-slate-300">
                                                <SelectValue placeholder="Selecione um plano" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Starter">Starter - R$ 197/mês</SelectItem>
                                                <SelectItem value="Plus">Plus - R$ 397/mês</SelectItem>
                                                <SelectItem value="Pro">Pro - R$ 997/mês</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                        disabled={submitting}
                                    >
                                        {submitting ? "Enviando..." : "Criar minha conta"}
                                    </Button>

                                    <p className="text-center text-sm text-slate-500">
                                        Já tem uma conta?{" "}
                                        <button
                                            type="button"
                                            onClick={() => { setShowRegister(false); navigate("/auth"); }}
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            Faça login
                                        </button>
                                    </p>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
