import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Vendedor {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  contribuicao: number;
  percentual_contribuicao: number;
  posicao_ranking: number;
}

interface RankingPodiumProps {
  vendedores: Vendedor[];
}

export const RankingPodium = ({ vendedores }: RankingPodiumProps) => {
  const sorted = [...vendedores].sort((a, b) => b.contribuicao - a.contribuicao);
  
  const [primeiro, segundo, terceiro] = sorted;
  const resto = sorted.slice(3);

  if (!primeiro) return null;

  return (
    <div className="space-y-8">
      {/* PODIUM - Top 3 */}
      <div className="relative">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Top Performers
          <span className="text-sm text-muted-foreground font-normal">
            Maiores contribuidores da meta
          </span>
        </h3>

        {/* Podium Visual */}
        <div className="flex items-end justify-center gap-4 min-h-[400px]">
          {/* 2º LUGAR */}
          {segundo && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-4">
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 
                                rounded-full flex items-center justify-center text-white font-bold text-lg 
                                shadow-lg z-10 border-2 border-border">
                  2
                </div>
                
                <Avatar className="w-20 h-20 border-4 border-gray-600 shadow-xl">
                  <AvatarImage src={segundo.avatar_url || ""} alt={segundo.nome} />
                  <AvatarFallback>{segundo.nome[0]}</AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center mb-2">
                <div className="font-bold text-foreground">{segundo.nome}</div>
                <div className="text-sm text-muted-foreground">
                  R$ {segundo.contribuicao.toLocaleString("pt-BR")}
                </div>
                <div className="text-xs text-primary font-medium">
                  {segundo.percentual_contribuicao}% da meta
                </div>
              </div>

              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 180 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-32 bg-gradient-to-b from-gray-600 to-gray-800 rounded-t-xl 
                           shadow-2xl relative overflow-hidden border-t-4 border-gray-500"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/20">2º</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* 1º LUGAR */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center relative"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-12 text-5xl"
            >
              <Crown className="h-12 w-12 text-yellow-500 fill-yellow-500" />
            </motion.div>

            <div className="relative mb-4">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 
                              rounded-full flex items-center justify-center text-white font-bold text-xl 
                              shadow-lg z-10 border-2 border-yellow-300 animate-pulse">
                1
              </div>
              
              <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl scale-150 animate-pulse" />
              
              <Avatar className="relative w-28 h-28 border-4 border-yellow-500 shadow-2xl">
                <AvatarImage src={primeiro.avatar_url || ""} alt={primeiro.nome} />
                <AvatarFallback className="text-2xl">{primeiro.nome[0]}</AvatarFallback>
              </Avatar>
            </div>

            <div className="text-center mb-2">
              <div className="font-bold text-xl text-foreground">{primeiro.nome}</div>
              <div className="text-sm text-yellow-500 font-semibold flex items-center gap-1 justify-center">
                <Trophy className="h-4 w-4" />
                Campeão do Mês
              </div>
              <div className="text-lg text-foreground font-bold">
                R$ {primeiro.contribuicao.toLocaleString("pt-BR")}
              </div>
              <div className="text-sm text-primary font-medium">
                {primeiro.percentual_contribuicao}% da meta
              </div>
            </div>

            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 240 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-40 bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-800 rounded-t-xl 
                         shadow-2xl relative overflow-hidden border-t-4 border-yellow-400"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-7xl font-bold text-white/30">1º</span>
              </div>
            </motion.div>
          </motion.div>

          {/* 3º LUGAR */}
          {terceiro && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-4">
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-800 
                                rounded-full flex items-center justify-center text-white font-bold text-lg 
                                shadow-lg z-10 border-2 border-border">
                  3
                </div>
                
                <Avatar className="w-20 h-20 border-4 border-orange-700 shadow-xl">
                  <AvatarImage src={terceiro.avatar_url || ""} alt={terceiro.nome} />
                  <AvatarFallback>{terceiro.nome[0]}</AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center mb-2">
                <div className="font-bold text-foreground">{terceiro.nome}</div>
                <div className="text-sm text-muted-foreground">
                  R$ {terceiro.contribuicao.toLocaleString("pt-BR")}
                </div>
                <div className="text-xs text-primary font-medium">
                  {terceiro.percentual_contribuicao}% da meta
                </div>
              </div>

              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 140 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="w-32 bg-gradient-to-b from-orange-700 to-orange-900 rounded-t-xl 
                           shadow-2xl relative overflow-hidden border-t-4 border-orange-600"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/20">3º</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      {/* RESTO DO RANKING (4º em diante) */}
      {resto.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-4">
            Outros Vendedores
          </h4>
          
          <div className="space-y-3">
            <AnimatePresence>
              {resto.map((vendedor, index) => (
                <motion.div
                  key={vendedor.user_id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border
                             hover:border-primary/50 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center 
                                  text-foreground font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {index + 4}º
                  </div>

                  <Avatar className="w-12 h-12 border-2 border-border">
                    <AvatarImage src={vendedor.avatar_url || ""} alt={vendedor.nome} />
                    <AvatarFallback>{vendedor.nome[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{vendedor.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      R$ {vendedor.contribuicao.toLocaleString("pt-BR")} 
                      <span className="text-primary ml-2">
                        ({vendedor.percentual_contribuicao}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-32">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                        style={{ width: `${vendedor.percentual_contribuicao}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-primary">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
