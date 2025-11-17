-- Fix warn-level security issues: Missing RLS policies

-- 1. Add DELETE policies for agendamentos table
CREATE POLICY "Users can delete own appointments"
ON public.agendamentos
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all appointments"
ON public.agendamentos
FOR DELETE
USING (is_admin(auth.uid()));

-- 2. Add UPDATE and DELETE policies for calls table
CREATE POLICY "Users can update own calls"
ON public.calls
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all calls"
ON public.calls
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Users can delete own calls"
ON public.calls
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all calls"
ON public.calls
FOR DELETE
USING (is_admin(auth.uid()));

-- 3. Add INSERT and UPDATE policies for metas table (users can manage own goals)
CREATE POLICY "Users can insert own goals"
ON public.metas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
ON public.metas
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);