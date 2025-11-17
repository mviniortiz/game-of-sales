-- CRITICAL SECURITY FIX: Email exposure and missing update policy

-- Step 1: Create user_roles table (roles MUST NOT be stored on profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Update is_admin function to use user_roles (prevents privilege escalation)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id 
    AND role = 'admin'
  );
$$;

-- Step 3: Create has_role function for flexible role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Step 4: FIX EMAIL EXPOSURE - Restrict profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only see their own full profile (including email)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can see all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Step 5: Create function to get public profiles (without emails) for ranking
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  nome text,
  avatar_url text,
  nivel user_level,
  pontos integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, nome, avatar_url, nivel, pontos, created_at, updated_at
  FROM public.profiles;
$$;

-- Step 6: FIX SALES UPDATE ISSUE - Add UPDATE policy to vendas
CREATE POLICY "Users can update own sales"
ON public.vendas
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all sales"
ON public.vendas
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Step 7: RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Step 8: Update handle_new_user trigger to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles (without role column)
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'vendedor')
  );
  
  RETURN NEW;
END;
$$;