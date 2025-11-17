-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('vendedor', 'admin');

-- Create enum for user levels
CREATE TYPE user_level AS ENUM ('Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante');

-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM ('Pix', 'Cartão de Crédito', 'Boleto', 'Dinheiro');

-- Create enum for call results
CREATE TYPE call_result AS ENUM ('venda', 'sem_interesse', 'reagendar');

-- Create enum for appointment status
CREATE TYPE appointment_status AS ENUM ('agendado', 'realizado', 'cancelado');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'vendedor',
  nivel user_level NOT NULL DEFAULT 'Bronze',
  pontos INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_base DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create sales table
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  produto_id UUID REFERENCES public.produtos(id),
  produto_nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  forma_pagamento payment_method NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  data_agendamento TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status NOT NULL DEFAULT 'agendado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create calls table
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  data_call TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  duracao_minutos INTEGER,
  resultado call_result,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create goals table
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor_meta DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mes_referencia)
);

-- Create achievements table
CREATE TABLE public.conquistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL,
  criterio JSONB NOT NULL,
  pontos_bonus INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user achievements table
CREATE TABLE public.user_conquistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conquista_id UUID NOT NULL REFERENCES public.conquistas(id) ON DELETE CASCADE,
  desbloqueada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, conquista_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conquistas ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for produtos
CREATE POLICY "Everyone can view active products"
  ON public.produtos FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins can manage products"
  ON public.produtos FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for vendas
CREATE POLICY "Users can view own sales or admins view all"
  ON public.vendas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own sales"
  ON public.vendas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete sales"
  ON public.vendas FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for agendamentos
CREATE POLICY "Users can view own appointments or admins view all"
  ON public.agendamentos FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own appointments"
  ON public.agendamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON public.agendamentos FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RLS Policies for calls
CREATE POLICY "Users can view own calls or admins view all"
  ON public.calls FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for metas
CREATE POLICY "Users can view own goals or admins view all"
  ON public.metas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage goals"
  ON public.metas FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for conquistas
CREATE POLICY "Everyone can view achievements"
  ON public.conquistas FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage achievements"
  ON public.conquistas FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for user_conquistas
CREATE POLICY "Users can view own achievements or admins view all"
  ON public.user_conquistas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "System can insert user achievements"
  ON public.user_conquistas FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'vendedor')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default achievements
INSERT INTO public.conquistas (nome, descricao, icone, criterio, pontos_bonus) VALUES
('Batedor de Metas', 'Atingir meta 3 meses seguidos', '🏆', '{"type": "meta_streak", "months": 3}', 1000),
('Atirador de Elite', 'Taxa de conversão acima de 30%', '🎯', '{"type": "conversion_rate", "min": 30}', 500),
('Relâmpago', '10 vendas em um dia', '⚡', '{"type": "sales_per_day", "count": 10}', 300),
('Rei das Vendas', '1º lugar no mês', '👑', '{"type": "rank", "position": 1}', 1500),
('Estrela Cadente', 'Maior crescimento % do mês', '🌟', '{"type": "growth_leader"}', 800),
('Diamante Bruto', 'Alcançar nível Diamante', '💎', '{"type": "level", "level": "Diamante"}', 2000),
('Sequência Quente', 'Vendas 5 dias consecutivos', '🔥', '{"type": "sales_streak", "days": 5}', 400),
('Master da Call', 'Taxa de comparecimento acima de 90%', '📞', '{"type": "attendance_rate", "min": 90}', 600);

-- Insert sample products
INSERT INTO public.produtos (nome, descricao, preco_base, ativo) VALUES
('Produto Premium', 'Nosso produto premium com todas as funcionalidades', 4999.00, true),
('Produto Standard', 'Produto intermediário com recursos essenciais', 2499.00, true),
('Produto Basic', 'Plano básico para começar', 999.00, true),
('Consultoria', 'Pacote de consultoria personalizada', 7999.00, true),
('Treinamento', 'Programa de treinamento avançado', 3499.00, true);