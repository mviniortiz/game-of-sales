import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    {
        quote: "Antes eu passava 2 horas por dia consolidando planilhas. Agora o dashboard mostra tudo em tempo real. O time bateu a meta pela primeira vez em 4 meses.",
        author: "Gestor Comercial",
        role: "Time de 12 vendedores"
    },
    {
        quote: "A integração com Kiwify foi em 2 minutos. Literalmente colei o webhook e as vendas começaram a aparecer. O ranking deixou o time obcecado em vender mais.",
        author: "Produtor Digital",
        role: "Infoprodutos e cursos online"
    },
    {
        quote: "O pipeline Kanban + WhatsApp IA mudou nosso jogo. Os vendedores param de esquecer follow-up e o copiloto sugere a resposta certa na hora.",
        author: "Diretor de Vendas",
        role: "SaaS B2B com 8 vendedores"
    }
];

export const Testimonials = () => {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                        Quem usa, <span className="text-emerald-600">não volta pra planilha</span>
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Resultados reais de times que migraram para o Vyzon.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            className="bg-gray-50 border border-gray-200 rounded-2xl p-6"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-gray-600 mb-6 leading-relaxed italic">
                                "{testimonial.quote}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <span className="text-emerald-600 font-semibold text-sm">
                                        {testimonial.author.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-gray-900 font-medium text-sm">{testimonial.author}</p>
                                    <p className="text-gray-500 text-xs">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
