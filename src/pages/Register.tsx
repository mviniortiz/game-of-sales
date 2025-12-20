import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";
import brandLogo from "@/assets/logo-full.png";
import {
    Mail,
    Lock,
    User,
    Building2,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Crown,
    Zap,
    Users,
    Check,
    Trophy,
    MessageCircle,
    TrendingUp,
    Shield,
    Quote,
} from "lucide-react";
import { PLANS, formatPrice } from "@/config/plans";

// Validation schema
const registerSchema = z.object({
    nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
    email: z.string().email("Email inválido").max(255, "Email muito longo"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128, "Senha muito longa"),
    companyName: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
    plan: z.enum(["starter", "plus", "pro"]),
});

// Plan icons
const PLAN_ICONS = {
    starter: Zap,
    plus: Sparkles,
    pro: Crown,
};

// Value proposition items
const VALUE_PROPS = [
    { icon: Trophy, text: "Ranking em Tempo Real" },
    { icon: MessageCircle, text: "Extensão WhatsApp" },
    { icon: TrendingUp, text: "Gestão Financeira Integrada" },
];

const Register = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get plan from URL param (from Landing Page)
    const urlPlan = searchParams.get('plan');
    const initialPlan = urlPlan && ['starter', 'plus', 'pro'].includes(urlPlan) ? urlPlan : 'plus';

    // Form states
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [plan, setPlan] = useState(initialPlan); // Pre-select from URL or default Plus
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate inputs
        const validationResult = registerSchema.safeParse({
            nome,
            email,
            password,
            companyName,
            plan,
        });

        if (!validationResult.success) {
            const errors = validationResult.error.errors.map(e => e.message).join(", ");
            toast.error(errors);
            return;
        }

        setLoading(true);

        try {
            // 1. Create the company first
            const { data: companyData, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: companyName,
                    plan: plan,
                })
                .select("id")
                .single();

            if (companyError) {
                throw new Error(`Erro ao criar empresa: ${companyError.message}`);
            }

            const companyId = companyData.id;

            // 2. Create the user with company association
            const redirectUrl = `${window.location.origin}/`;

            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        nome,
                        company_id: companyId,
                    },
                },
            });

            if (signUpError) {
                // Rollback: delete the company if user creation fails
                await supabase.from("companies").delete().eq("id", companyId);
                throw new Error(`Erro ao criar conta: ${signUpError.message}`);
            }

            // For paid plans, redirect to checkout (placeholder)
            if (plan !== "starter") {
                toast.success("Conta criada! Redirecionando para pagamento...");
                // TODO: Redirect to Stripe/Hotmart checkout
                setTimeout(() => navigate("/auth"), 2000);
            } else {
                toast.success("Conta criada com sucesso! Verifique seu email para confirmar.");
                navigate("/auth");
            }

        } catch (error: any) {
            toast.error(error.message || "Erro ao criar conta");
        } finally {
            setLoading(false);
        }
    };

    const selectedPlan = PLANS[plan];

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Value Proposition (Dark) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 overflow-hidden">
                {/* Subtle pattern overlay */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />

                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    {/* Logo */}
                    <div>
                        <img src={brandLogo} alt="Game Sales" className="h-12 w-auto brightness-0 invert" />
                    </div>

                    {/* Testimonial */}
                    <div className="max-w-md">
                        <div className="relative">
                            <Quote className="h-12 w-12 text-indigo-400 opacity-50 mb-4" />
                            <blockquote className="text-2xl font-light leading-relaxed mb-6">
                                "O Game Sales aumentou nossas vendas em <span className="font-semibold text-emerald-400">30%</span> no primeiro mês. O ranking gamificado deixou o time completamente viciado em bater metas."
                            </blockquote>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg">
                                    RS
                                </div>
                                <div>
                                    <p className="font-semibold">Ricardo Silva</p>
                                    <p className="text-sm text-indigo-300">Gerente Comercial, TechSales Brasil</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Value Props */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-indigo-300 uppercase tracking-wider">
                            O que você ganha:
                        </p>
                        <div className="space-y-3">
                            {VALUE_PROPS.map((prop, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-700/50">
                                        <prop.icon className="h-5 w-5 text-indigo-300" />
                                    </div>
                                    <span className="text-white/90">{prop.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form (Light) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-6">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-4">
                        <img src={brandLogo} alt="Game Sales" className="h-10 w-auto" />
                    </div>

                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/landing")}
                        className="text-gray-500 hover:text-gray-700 -ml-2 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para o site
                    </Button>

                    {/* Header */}
                    <div className="text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Comece sua jornada de alta performance
                        </h1>
                        <p className="text-gray-500 mt-2">
                            Configure sua empresa em menos de 2 minutos
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label htmlFor="nome" className="text-gray-700 font-medium">
                                Seu nome completo
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="nome"
                                    type="text"
                                    placeholder="João Silva"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="pl-10 h-11 bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700 font-medium">
                                E-mail corporativo
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="voce@suaempresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-11 bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Company Name */}
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-gray-700 font-medium">
                                Nome da sua empresa
                            </Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="companyName"
                                    type="text"
                                    placeholder="Sua Empresa Ltda"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="pl-10 h-11 bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 font-medium">
                                Senha
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-11 bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                    required
                                />
                            </div>
                        </div>

                        {/* Plan Selection - Radio Cards */}
                        <div className="space-y-3">
                            <Label className="text-gray-700 font-medium">
                                Escolha seu plano
                            </Label>
                            <div className="space-y-3">
                                {Object.values(PLANS).map((p) => {
                                    const Icon = PLAN_ICONS[p.id as keyof typeof PLAN_ICONS];
                                    const isSelected = plan === p.id;
                                    const isRecommended = p.id === "plus";

                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPlan(p.id)}
                                            className={`
                                                relative w-full p-4 rounded-xl border-2 transition-all text-left
                                                ${isSelected
                                                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                                }
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {/* Radio indicator */}
                                                    <div className={`
                                                        h-5 w-5 rounded-full border-2 flex items-center justify-center
                                                        ${isSelected
                                                            ? "border-indigo-600 bg-indigo-600"
                                                            : "border-gray-300"
                                                        }
                                                    `}>
                                                        {isSelected && (
                                                            <div className="h-2 w-2 rounded-full bg-white" />
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Icon className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-900">{p.name}</span>
                                                                {isRecommended && (
                                                                    <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-2">
                                                                        Recomendado
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">{p.description}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">
                                                        {formatPrice(p.monthlyPrice)}
                                                    </p>
                                                    {p.monthlyPrice > 0 && (
                                                        <p className="text-[10px] text-gray-400">/mês</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Features preview */}
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                                {p.features.slice(0, 3).map((feature, idx) => (
                                                    <span key={idx} className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? (
                                "Criando conta..."
                            ) : plan === "starter" ? (
                                <span className="flex items-center justify-center gap-2">
                                    Criar Conta Grátis
                                    <ArrowRight className="h-5 w-5" />
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Ir para Pagamento Seguro
                                    <ArrowRight className="h-5 w-5" />
                                </span>
                            )}
                        </Button>

                        {/* Disclaimer */}
                        {plan !== "starter" && (
                            <p className="text-xs text-center text-gray-400">
                                Você será redirecionado para o checkout seguro.
                            </p>
                        )}

                        {/* Login Link */}
                        <p className="text-center text-sm text-gray-500">
                            Já tem uma conta?{" "}
                            <Link to="/auth" className="text-indigo-600 hover:text-indigo-500 font-medium">
                                Entrar
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
