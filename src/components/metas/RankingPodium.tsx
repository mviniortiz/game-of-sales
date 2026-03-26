import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Star, Gem, Shield, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Vendedor {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  contribuicao: number;
  percentual_contribuicao: number;
  posicao_ranking: number;
  nivel?: string;
}

interface RankingPodiumProps {
  vendedores: Vendedor[];
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (v: number) => currencyFormatter.format(v);

const NIVEL_CONFIG: Record<string, { color: string; icon: typeof Shield }> = {
  Bronze: { color: "text-amber-700", icon: Shield },
  Prata: { color: "text-gray-400", icon: Medal },
  Ouro: { color: "text-yellow-500", icon: Star },
  Platina: { color: "text-blue-400", icon: Crown },
  Diamante: { color: "text-emerald-400", icon: Gem },
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface PodiumSlotProps {
  vendedor: Vendedor;
  place: 1 | 2 | 3;
}

const placeConfig = {
  1: {
    avatarSize: "h-20 w-20 sm:h-24 sm:w-24",
    borderColor: "border-yellow-500",
    glowColor: "shadow-yellow-500/30",
    badgeBg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    badgeText: "text-yellow-900",
    pillarHeight: "h-32 sm:h-40",
    pillarGradient: "from-yellow-500/30 via-yellow-600/20 to-yellow-700/10",
    pillarBorder: "border-yellow-500/30",
    label: "Campeão do Mês",
    labelColor: "text-yellow-500",
    delay: 0,
    order: "order-2",
  },
  2: {
    avatarSize: "h-16 w-16 sm:h-20 sm:w-20",
    borderColor: "border-gray-400",
    glowColor: "shadow-gray-400/20",
    badgeBg: "bg-gradient-to-br from-gray-300 to-gray-500",
    badgeText: "text-gray-800",
    pillarHeight: "h-24 sm:h-28",
    pillarGradient: "from-gray-400/20 via-gray-500/15 to-gray-600/10",
    pillarBorder: "border-gray-400/30",
    label: "Vice",
    labelColor: "text-gray-400",
    delay: 0.15,
    order: "order-1",
  },
  3: {
    avatarSize: "h-16 w-16 sm:h-20 sm:w-20",
    borderColor: "border-amber-600",
    glowColor: "shadow-amber-600/20",
    badgeBg: "bg-gradient-to-br from-amber-500 to-amber-700",
    badgeText: "text-amber-100",
    pillarHeight: "h-20 sm:h-24",
    pillarGradient: "from-amber-600/20 via-amber-700/15 to-amber-800/10",
    pillarBorder: "border-amber-600/30",
    label: "3º Lugar",
    labelColor: "text-amber-600",
    delay: 0.3,
    order: "order-3",
  },
};

const PodiumSlot = ({ vendedor, place }: PodiumSlotProps) => {
  const config = placeConfig[place];
  const nivelCfg = NIVEL_CONFIG[vendedor.nivel || "Bronze"] || NIVEL_CONFIG.Bronze;
  const NivelIcon = nivelCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: config.delay, ease: "easeOut" }}
      className={`flex flex-col items-center ${config.order} flex-1 max-w-[160px] sm:max-w-[200px]`}
    >
      {/* Crown for 1st */}
      {place === 1 && (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="mb-1"
        >
          <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
        </motion.div>
      )}

      {/* Avatar */}
      <div className="relative mb-2 sm:mb-3">
        {/* Glow ring */}
        {place === 1 && (
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl scale-150 animate-pulse" />
        )}

        <Avatar
          className={`${config.avatarSize} border-[3px] ${config.borderColor} shadow-xl ${config.glowColor} relative`}
        >
          <AvatarImage src={vendedor.avatar_url || ""} alt={vendedor.nome} />
          <AvatarFallback className="text-lg sm:text-xl font-bold">
            {getInitials(vendedor.nome)}
          </AvatarFallback>
        </Avatar>

        {/* Place badge */}
        <div
          className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 sm:w-8 sm:h-8 ${config.badgeBg} rounded-full flex items-center justify-center ${config.badgeText} font-bold text-sm shadow-lg border-2 border-background`}
        >
          {place}
        </div>
      </div>

      {/* Info */}
      <div className="text-center space-y-0.5 mb-2">
        <p className="font-bold text-foreground text-sm sm:text-base truncate max-w-full px-1">
          {vendedor.nome.split(" ")[0]}
        </p>
        <p className={`text-[11px] sm:text-xs font-semibold ${config.labelColor} flex items-center justify-center gap-1`}>
          {place === 1 && <Flame className="h-3 w-3" />}
          {config.label}
        </p>
        <p className="text-sm sm:text-base font-bold text-emerald-500 tabular-nums">
          {formatCurrency(vendedor.contribuicao)}
        </p>
        {vendedor.percentual_contribuicao > 0 && (
          <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
            {vendedor.percentual_contribuicao.toFixed(1)}% da meta
          </p>
        )}
        <Badge
          variant="outline"
          className={`text-[9px] sm:text-[10px] h-4 gap-0.5 ${nivelCfg.color} border-current/20`}
        >
          <NivelIcon className="h-2 w-2" />
          {vendedor.nivel || "Bronze"}
        </Badge>
      </div>

      {/* Pillar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "auto" }}
        transition={{ duration: 0.6, delay: config.delay + 0.2, ease: "easeOut" }}
        className={`w-full ${config.pillarHeight} bg-gradient-to-b ${config.pillarGradient} rounded-t-2xl border ${config.pillarBorder} border-b-0 relative overflow-hidden backdrop-blur-sm`}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl sm:text-5xl font-black text-foreground/[0.04]">{place}º</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const RankingPodium = ({ vendedores }: RankingPodiumProps) => {
  const sorted = [...vendedores].sort((a, b) => b.contribuicao - a.contribuicao);
  const [primeiro, segundo, terceiro] = sorted;

  if (!primeiro) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card via-card/95 to-muted/30 p-4 sm:p-6 pb-0">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4 sm:mb-6">
        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
        <h3 className="text-base sm:text-lg font-bold text-foreground">Top Performers</h3>
      </div>

      {/* Podium */}
      <div className="relative flex items-end justify-center gap-2 sm:gap-4 min-h-[280px] sm:min-h-[360px]">
        {segundo && <PodiumSlot vendedor={segundo} place={2} />}
        <PodiumSlot vendedor={primeiro} place={1} />
        {terceiro && <PodiumSlot vendedor={terceiro} place={3} />}
      </div>

      {/* Base line */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
};
