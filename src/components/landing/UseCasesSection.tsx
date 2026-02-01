import { motion } from "framer-motion";

// Abstract illustration for "Gestores" - Charts and KPIs
const GestoresIllustration = () => (
    <svg viewBox="0 0 280 180" fill="none" className="w-full h-auto">
        {/* Background card */}
        <rect x="10" y="20" width="100" height="120" rx="8" fill="#f8f5ff" stroke="#e9d5ff" strokeWidth="1" />

        {/* Chart bars */}
        <rect x="22" y="85" width="12" height="40" rx="2" fill="#c4b5fd" />
        <rect x="38" y="65" width="12" height="60" rx="2" fill="#a78bfa" />
        <rect x="54" y="75" width="12" height="50" rx="2" fill="#c4b5fd" />
        <rect x="70" y="50" width="12" height="75" rx="2" fill="#8b5cf6" />
        <rect x="86" y="60" width="12" height="65" rx="2" fill="#a78bfa" />

        {/* Chart title placeholder */}
        <rect x="22" y="32" width="60" height="6" rx="2" fill="#e9d5ff" />
        <rect x="22" y="42" width="40" height="4" rx="2" fill="#f3e8ff" />

        {/* Right side cards */}
        <rect x="120" y="20" width="90" height="35" rx="6" fill="#f8f5ff" stroke="#e9d5ff" strokeWidth="1" />
        <rect x="128" y="28" width="45" height="5" rx="2" fill="#e9d5ff" />
        <rect x="128" y="38" width="70" height="8" rx="2" fill="#8b5cf6" />

        <rect x="120" y="62" width="90" height="35" rx="6" fill="#f8f5ff" stroke="#e9d5ff" strokeWidth="1" />
        <rect x="128" y="70" width="45" height="5" rx="2" fill="#e9d5ff" />
        <rect x="128" y="80" width="55" height="8" rx="2" fill="#a78bfa" />

        {/* Bottom row */}
        <rect x="10" y="148" width="200" height="25" rx="6" fill="#f8f5ff" stroke="#e9d5ff" strokeWidth="1" />
        <circle cx="28" cy="160" r="8" fill="#8b5cf6" />
        <rect x="45" y="156" width="80" height="5" rx="2" fill="#e9d5ff" />
        <rect x="45" y="164" width="50" height="4" rx="2" fill="#f3e8ff" />

        {/* Floating badge */}
        <motion.g
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
            <rect x="180" y="100" width="70" height="50" rx="8" fill="white" filter="drop-shadow(0 4px 12px rgba(139, 92, 246, 0.15))" />
            <rect x="190" y="112" width="50" height="5" rx="2" fill="#e9d5ff" />
            <rect x="190" y="122" width="35" height="8" rx="2" fill="#8b5cf6" />
            <circle cx="235" cy="132" r="8" fill="#22c55e" />
            <path d="M231 132 L234 135 L239 129" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
    </svg>
);

// Abstract illustration for "Sucesso do Cliente" - Workflow
const SucessoIllustration = () => (
    <svg viewBox="0 0 280 180" fill="none" className="w-full h-auto">
        {/* Connection lines with arrows */}
        <motion.path
            d="M50 90 Q100 90 100 50"
            stroke="#c4b5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
        />
        <motion.path
            d="M100 50 L140 50"
            stroke="#c4b5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
        />
        <polygon points="140,46 148,50 140,54" fill="#c4b5fd" />

        <motion.path
            d="M50 90 L140 90"
            stroke="#8b5cf6"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
        />
        <polygon points="140,86 148,90 140,94" fill="#8b5cf6" />

        <motion.path
            d="M50 90 Q100 90 100 130"
            stroke="#c4b5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
        />
        <motion.path
            d="M100 130 L140 130"
            stroke="#c4b5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
        />
        <polygon points="140,126 148,130 140,134" fill="#c4b5fd" />

        {/* Left starting node */}
        <rect x="20" y="70" width="40" height="40" rx="8" fill="#8b5cf6" />
        <circle cx="40" cy="90" r="10" fill="white" fillOpacity="0.3" />

        {/* Right destination nodes */}
        <motion.g
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
            <rect x="150" y="30" width="40" height="40" rx="8" fill="#e9d5ff" />
            <circle cx="170" cy="50" r="8" fill="#8b5cf6" />
        </motion.g>

        <motion.g
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        >
            <rect x="150" y="70" width="40" height="40" rx="8" fill="#8b5cf6" />
            {/* Smiley face */}
            <circle cx="170" cy="90" r="12" fill="white" />
            <circle cx="166" cy="87" r="2" fill="#8b5cf6" />
            <circle cx="174" cy="87" r="2" fill="#8b5cf6" />
            <path d="M165 93 Q170 98 175 93" stroke="#8b5cf6" strokeWidth="2" fill="none" strokeLinecap="round" />
        </motion.g>

        <motion.g
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
            <rect x="150" y="110" width="40" height="40" rx="8" fill="#e9d5ff" />
            <circle cx="170" cy="130" r="8" fill="#a78bfa" />
        </motion.g>

        {/* Final connection to end node */}
        <motion.path
            d="M190 50 L200 50 Q210 50 210 90 Q210 130 200 130 L190 130"
            stroke="#c4b5fd"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.path
            d="M210 90 L240 90"
            stroke="#8b5cf6"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
        />
        <polygon points="240,86 248,90 240,94" fill="#8b5cf6" />

        {/* Final node with checkmark */}
        <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
            <circle cx="260" cy="90" r="18" fill="#8b5cf6" />
            <path d="M252 90 L258 96 L270 84" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
    </svg>
);

// Abstract illustration for "Atendimento" - Chat interface
const AtendimentoIllustration = () => (
    <svg viewBox="0 0 280 180" fill="none" className="w-full h-auto">
        {/* Chat bubbles */}
        <motion.g
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <rect x="20" y="30" width="120" height="35" rx="8" fill="#f8f5ff" stroke="#e9d5ff" strokeWidth="1" />
            <rect x="32" y="42" width="60" height="5" rx="2" fill="#e9d5ff" />
            <rect x="32" y="52" width="90" height="5" rx="2" fill="#d4c4f0" />
            <circle cx="128" cy="48" r="8" fill="#8b5cf6" />
            <path d="M125 48 C125 45 131 45 131 48 C131 51 128 54 128 54 C128 54 125 51 125 48" fill="white" />
        </motion.g>

        <motion.g
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <rect x="80" y="75" width="180" height="35" rx="8" fill="#8b5cf6" />
            <rect x="92" y="87" width="80" height="5" rx="2" fill="white" fillOpacity="0.6" />
            <rect x="92" y="97" width="150" height="5" rx="2" fill="white" fillOpacity="0.4" />
        </motion.g>

        <motion.g
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <rect x="20" y="120" width="140" height="35" rx="8" fill="#f8f5ff" stroke="#e9d5ff" strokeWidth="1" />
            <rect x="32" y="132" width="70" height="5" rx="2" fill="#e9d5ff" />
            <rect x="32" y="142" width="110" height="5" rx="2" fill="#d4c4f0" />
        </motion.g>

        {/* Notification badge */}
        <motion.g
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
            <rect x="200" y="20" width="60" height="40" rx="8" fill="white" filter="drop-shadow(0 4px 12px rgba(139, 92, 246, 0.2))" />
            <rect x="210" y="30" width="40" height="5" rx="2" fill="#e9d5ff" />
            <rect x="210" y="40" width="30" height="5" rx="2" fill="#8b5cf6" />
            <circle cx="250" cy="25" r="8" fill="#22c55e" />
            <text x="250" y="29" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">3</text>
        </motion.g>

        {/* Bottom action bar */}
        <motion.g
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
        >
            <rect x="180" y="130" width="80" height="30" rx="15" fill="#8b5cf6" />
            <rect x="195" y="142" width="50" height="6" rx="3" fill="white" fillOpacity="0.7" />
        </motion.g>
    </svg>
);

const cards = [
    {
        title: "Para Gestores",
        description: "Acompanhe o desempenho do time em tempo real com dashboards que mostram vendas, conversões e metas batidas. Tome decisões baseadas em dados, não em achismos.",
        Illustration: GestoresIllustration,
    },
    {
        title: "Para Times de Vendas",
        description: "Rankings, XP e conquistas que transformam metas em jogos. Cada venda fechada vira pontos, cada meta batida vira troféu. Seu time nunca mais vai precisar de motivação externa.",
        Illustration: SucessoIllustration,
    },
    {
        title: "Para Integração Automática",
        description: "Conecte Kiwify, Greenn e Hotmart em minutos. Vendas auditadas automaticamente, sem digitação manual. O dinheiro cai, o ranking atualiza.",
        Illustration: AtendimentoIllustration,
    },
];

export const UseCasesSection = () => {
    return (
        <section className="py-20 sm:py-28 px-4 bg-slate-950">
            <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                    {cards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            className="flex flex-col"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.5 }}
                        >
                            {/* Illustration */}
                            <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                                <card.Illustration />
                            </div>

                            {/* Text content */}
                            <h3 className="text-xl font-bold text-white mb-3">
                                {card.title}
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {card.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default UseCasesSection;
