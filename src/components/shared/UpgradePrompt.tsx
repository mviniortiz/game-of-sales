import { usePlan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, ArrowRight, Check } from 'lucide-react';
import { PLAN_FEATURES, PLANS_INFO, PlanType, PlanFeatures } from '@/config/planConfig';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
    feature: keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>;
    title?: string;
    description?: string;
    className?: string;
}

export const UpgradePrompt = ({
    feature,
    title,
    description,
    className = ''
}: UpgradePromptProps) => {
    const navigate = useNavigate();
    const { currentPlan, getRequiredPlan, getRequiredPlanInfo, getFeatureName } = usePlan();

    const requiredPlan = getRequiredPlan(feature);
    const requiredPlanInfo = getRequiredPlanInfo(feature);
    const featureName = getFeatureName(feature);

    const defaultTitle = title || `Upgrade para ${requiredPlanInfo.label}`;
    const defaultDescription = description ||
        `A funcionalidade "${featureName}" requer o plano ${requiredPlanInfo.label} ou superior.`;

    // Get features comparison
    const planOrder: PlanType[] = ['starter', 'plus', 'pro'];
    const requiredIndex = planOrder.indexOf(requiredPlan);
    const availablePlans = planOrder.slice(requiredIndex);

    return (
        <div className={`flex items-center justify-center min-h-[400px] p-6 ${className}`}>
            <Card className="w-full max-w-lg border-border bg-card shadow-xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 ring-1 ring-indigo-500/30">
                        <Lock className="h-8 w-8 text-indigo-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                        {defaultTitle}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-2">
                        {defaultDescription}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Current Plan Badge */}
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-sm text-muted-foreground">Plano atual:</span>
                        <Badge variant="outline" className="px-3 py-1">
                            {PLANS_INFO[currentPlan].label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge className={`${requiredPlanInfo.color} text-white px-3 py-1`}>
                            {requiredPlanInfo.label}
                        </Badge>
                    </div>

                    {/* Features included */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            O que você ganha com {requiredPlanInfo.label}:
                        </p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {PLAN_FEATURES[requiredPlan].metas && (
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    Metas individuais e consolidadas
                                </li>
                            )}
                            {PLAN_FEATURES[requiredPlan].calls && (
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    Performance de Calls
                                </li>
                            )}
                            {PLAN_FEATURES[requiredPlan].gamification && (
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    Gamificação completa
                                </li>
                            )}
                            {PLAN_FEATURES[requiredPlan].reports && (
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    Relatórios avançados
                                </li>
                            )}
                            {PLAN_FEATURES[requiredPlan].integrations && (
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    Integrações (Hotmart, etc)
                                </li>
                            )}
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                Até {PLAN_FEATURES[requiredPlan].maxUsers === Infinity ? 'ilimitados' : PLAN_FEATURES[requiredPlan].maxUsers} usuários
                            </li>
                        </ul>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col gap-3">
                        <Button
                            size="lg"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg"
                            onClick={() => navigate('/planos')}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Ver Planos e Fazer Upgrade
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => navigate(-1)}
                        >
                            Voltar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
