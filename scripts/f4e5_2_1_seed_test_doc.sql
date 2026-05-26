-- F4E.5.2.1 — Seed doc de teste pra validação fim-a-fim da Base de Conhecimento

INSERT INTO public.eva_training_documents (
    company_id,
    uploaded_by,
    file_name,
    file_type,
    file_size,
    raw_text,
    status,
    metadata
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'F4E.5.2.1 - Teste fim-a-fim',
    'text/plain',
    -- size será aproximadamente o length do texto
    length($txt$Política comercial — Agência Metria Growth

# Serviços oferecidos
Oferecemos Gestão de Tráfego Pago para clínicas de estética e clínicas odontológicas.
Investimento mínimo: R$ 2.500/mês de fee fixo + R$ 1.500 de verba de mídia (Meta + Google).
Modelo de cobrança: mensal, contrato mínimo de 3 meses.

# ICP — Cliente ideal
Clínicas de estética ou odontológicas com pelo menos 6 meses de operação,
faturamento mensal acima de R$ 50.000, e equipe comercial dedicada para atender leads.

# Objeção mais comum
"Já tentei tráfego pago antes e não funcionou."
Resposta padrão aprovada pelo CEO: pedir histórico (qual plataforma? por quanto tempo?
qual fee pagaram?), mostrar diferencial técnico do nosso processo (estrutura de campanha
em camadas, criativos rotativos semanais), e propor um diagnóstico gratuito de 30 minutos
antes de qualquer proposta.

# Promessa PROIBIDA
A equipe NUNCA pode prometer ROI específico antes do diagnóstico. Está EXPRESSAMENTE
PROIBIDO afirmações como "vamos triplicar suas vendas", "garantimos X leads no primeiro
mês" ou "ROI mínimo garantido". Quem violar isso compromete a reputação da agência e
pode causar problemas legais (publicidade enganosa).

# Tom de voz
Comunicação WhatsApp deve ser: profissional, sem emojis, sem gírias.
Tratar o lead por "você" (nunca "tu" ou "vc").
Frases curtas, no máximo 3 linhas por mensagem.
Não usar "rs", "kkk", "blz" ou "boa noite chefe".

# FAQ frequente
P: "Vocês atendem clínica física com captação local?"
R: Sim. Trabalhamos com geo-targeting no Meta (raio de 5-15km da clínica) e Google
Maps com Performance Max otimizado pra leads locais. Esse é justamente um dos nossos
diferenciais.
$txt$),
    $txt$Política comercial — Agência Metria Growth

# Serviços oferecidos
Oferecemos Gestão de Tráfego Pago para clínicas de estética e clínicas odontológicas.
Investimento mínimo: R$ 2.500/mês de fee fixo + R$ 1.500 de verba de mídia (Meta + Google).
Modelo de cobrança: mensal, contrato mínimo de 3 meses.

# ICP — Cliente ideal
Clínicas de estética ou odontológicas com pelo menos 6 meses de operação,
faturamento mensal acima de R$ 50.000, e equipe comercial dedicada para atender leads.

# Objeção mais comum
"Já tentei tráfego pago antes e não funcionou."
Resposta padrão aprovada pelo CEO: pedir histórico (qual plataforma? por quanto tempo?
qual fee pagaram?), mostrar diferencial técnico do nosso processo (estrutura de campanha
em camadas, criativos rotativos semanais), e propor um diagnóstico gratuito de 30 minutos
antes de qualquer proposta.

# Promessa PROIBIDA
A equipe NUNCA pode prometer ROI específico antes do diagnóstico. Está EXPRESSAMENTE
PROIBIDO afirmações como "vamos triplicar suas vendas", "garantimos X leads no primeiro
mês" ou "ROI mínimo garantido". Quem violar isso compromete a reputação da agência e
pode causar problemas legais (publicidade enganosa).

# Tom de voz
Comunicação WhatsApp deve ser: profissional, sem emojis, sem gírias.
Tratar o lead por "você" (nunca "tu" ou "vc").
Frases curtas, no máximo 3 linhas por mensagem.
Não usar "rs", "kkk", "blz" ou "boa noite chefe".

# FAQ frequente
P: "Vocês atendem clínica física com captação local?"
R: Sim. Trabalhamos com geo-targeting no Meta (raio de 5-15km da clínica) e Google
Maps com Performance Max otimizado pra leads locais. Esse é justamente um dos nossos
diferenciais.
$txt$,
    'uploaded',
    jsonb_build_object('source','f4e5_2_1_validation','seeded_at', now())
)
RETURNING id, file_name, length(raw_text) AS chars;
