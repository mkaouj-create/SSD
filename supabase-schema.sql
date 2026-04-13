-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bureaus Table (Tenants)
CREATE TABLE IF NOT EXISTS public.bureaus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    bureau_id UUID REFERENCES public.bureaus(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    requested_bureau_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bureau_id UUID REFERENCES public.bureaus(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dossiers Table
CREATE TABLE IF NOT EXISTS public.dossiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bureau_id UUID NOT NULL REFERENCES public.bureaus(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tracking_code TEXT UNIQUE NOT NULL,
    date_arrivee DATE NOT NULL DEFAULT CURRENT_DATE,
    numero_enregistrement TEXT,
    numero_expediteur TEXT,
    expediteur TEXT,
    objet TEXT NOT NULL,
    date_sortie DATE,
    orientation TEXT,
    numero_transmission TEXT,
    annotation TEXT,
    observation TEXT,
    statut TEXT NOT NULL DEFAULT 'Reçu',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Transmissions Table
CREATE TABLE IF NOT EXISTS public.transmissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
    source_bureau_id UUID REFERENCES public.bureaus(id) ON DELETE SET NULL,
    destination_bureau_id UUID REFERENCES public.bureaus(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date_transmission TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    niveau TEXT DEFAULT 'Normal',
    commentaire TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bureau_id UUID NOT NULL REFERENCES public.bureaus(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Audit Logs Trigger Function
CREATE OR REPLACE FUNCTION public.log_dossier_action()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (dossier_id, user_id, user_name, action, details)
        VALUES (NEW.id, auth.uid(), COALESCE(user_name, 'Système'), 'Création', jsonb_build_object('tracking_code', NEW.tracking_code));
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (dossier_id, user_id, user_name, action, details)
        VALUES (NEW.id, auth.uid(), COALESCE(user_name, 'Système'), 'Modification', jsonb_build_object('old_status', OLD.statut, 'new_status', NEW.statut));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_dossier_action ON public.dossiers;
CREATE TRIGGER trg_log_dossier_action
AFTER INSERT OR UPDATE ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.log_dossier_action();

-- Indexes for performance (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_profiles_bureau_id ON public.profiles(bureau_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_bureau_id ON public.dossiers(bureau_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_tracking_code ON public.dossiers(tracking_code);
CREATE INDEX IF NOT EXISTS idx_transmissions_dossier_id ON public.transmissions(dossier_id);
CREATE INDEX IF NOT EXISTS idx_comments_dossier_id ON public.comments(dossier_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_dossier_id ON public.audit_logs(dossier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_bureau_id ON public.notifications(bureau_id);

-- Enable Row Level Security
ALTER TABLE public.bureaus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Helper functions with improved recursion handling
-- These MUST be SECURITY DEFINER to bypass RLS checks on the profiles table itself
-- We use a separate schema or ensure search_path is set to avoid issues
CREATE OR REPLACE FUNCTION get_current_bureau_id()
RETURNS UUID AS $$
DECLARE
    bid UUID;
BEGIN
    SELECT bureau_id INTO bid FROM public.profiles WHERE id = auth.uid();
    RETURN bid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    r TEXT;
BEGIN
    SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
    RETURN r;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Super Admin Full Access Bureaus" ON public.bureaus;
DROP POLICY IF EXISTS "Super Admin Full Access Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin Full Access Roles" ON public.roles;
DROP POLICY IF EXISTS "Super Admin Full Access Dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Super Admin Full Access Transmissions" ON public.transmissions;
DROP POLICY IF EXISTS "Super Admin Full Access Comments" ON public.comments;
DROP POLICY IF EXISTS "Super Admin Full Access Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super Admin Full Access Notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users view own bureau" ON public.bureaus;
DROP POLICY IF EXISTS "Users view profiles in same bureau" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles in same bureau" ON public.profiles;
DROP POLICY IF EXISTS "Users view roles" ON public.roles;
DROP POLICY IF EXISTS "Users view dossiers in same bureau" ON public.dossiers;
DROP POLICY IF EXISTS "Authorized users insert dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Authorized users update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Authorized users delete dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Users view transmissions in same bureau" ON public.transmissions;
DROP POLICY IF EXISTS "Authorized users insert transmissions" ON public.transmissions;
DROP POLICY IF EXISTS "Users view comments in same bureau" ON public.comments;
DROP POLICY IF EXISTS "Users insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users view audit logs in same bureau" ON public.audit_logs;
DROP POLICY IF EXISTS "Users view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authorized users manage dossiers" ON public.dossiers;

-- Super Admin Policies (Full Access)
-- Using helper functions which are SECURITY DEFINER to avoid recursion
CREATE POLICY "Super Admin Full Access Bureaus" ON public.bureaus FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

CREATE POLICY "Super Admin Full Access Profiles" ON public.profiles FOR ALL 
TO authenticated
USING (
    id = auth.uid() -- Allow self access always
    OR 
    get_current_user_role() = 'Super_admin'
);

CREATE POLICY "Super Admin Full Access Roles" ON public.roles FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

CREATE POLICY "Super Admin Full Access Dossiers" ON public.dossiers FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

CREATE POLICY "Super Admin Full Access Transmissions" ON public.transmissions FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

CREATE POLICY "Super Admin Full Access Comments" ON public.comments FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

CREATE POLICY "Super Admin Full Access Audit Logs" ON public.audit_logs FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

CREATE POLICY "Super Admin Full Access Notifications" ON public.notifications FOR ALL 
TO authenticated
USING (get_current_user_role() = 'Super_admin');

-- Bureau Specific Policies
CREATE POLICY "Users view own bureau" ON public.bureaus FOR SELECT 
TO authenticated
USING (id = get_current_bureau_id());

CREATE POLICY "Users view profiles in same bureau" ON public.profiles FOR SELECT 
TO authenticated
USING (
    id = auth.uid() 
    OR 
    bureau_id = get_current_bureau_id()
);

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND (
        get_current_user_role() = 'Super_admin' 
        OR (
            role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
            bureau_id = (SELECT bureau_id FROM public.profiles WHERE id = auth.uid()) AND
            status = (SELECT status FROM public.profiles WHERE id = auth.uid())
        )
    )
);

CREATE POLICY "Admins manage profiles in same bureau" ON public.profiles FOR ALL
TO authenticated
USING (
    get_current_user_role() = 'admin' 
    AND bureau_id = get_current_bureau_id()
    AND id != auth.uid() -- Prevent admin from deleting themselves here, they use the other policy for their own profile
)
WITH CHECK (
    get_current_user_role() = 'admin' 
    AND bureau_id = get_current_bureau_id()
);

CREATE POLICY "Users view roles" ON public.roles FOR SELECT 
TO authenticated
USING (
    bureau_id IS NULL 
    OR 
    bureau_id = get_current_bureau_id()
);

CREATE POLICY "Users view dossiers in same bureau" ON public.dossiers FOR SELECT 
TO authenticated
USING (
    bureau_id = get_current_bureau_id()
    OR
    EXISTS (
        SELECT 1 FROM public.transmissions 
        WHERE dossier_id = public.dossiers.id 
        AND (source_bureau_id = get_current_bureau_id() OR destination_bureau_id = get_current_bureau_id())
    )
);

CREATE POLICY "Authorized users insert dossiers" ON public.dossiers FOR INSERT 
TO authenticated
WITH CHECK (
    bureau_id = get_current_bureau_id() 
    AND 
    get_current_user_role() IN ('admin', 'agent', 'Secrétaire')
);

CREATE POLICY "Authorized users update dossiers" ON public.dossiers FOR UPDATE 
TO authenticated
USING (
    bureau_id = get_current_bureau_id() 
    AND 
    get_current_user_role() IN ('admin', 'agent', 'Secrétaire')
)
WITH CHECK (
    get_current_user_role() IN ('admin', 'agent', 'Secrétaire')
);

CREATE POLICY "Authorized users delete dossiers" ON public.dossiers FOR DELETE 
TO authenticated
USING (
    bureau_id = get_current_bureau_id() 
    AND 
    get_current_user_role() IN ('admin', 'agent', 'Secrétaire')
);

CREATE POLICY "Users view transmissions in same bureau" ON public.transmissions FOR SELECT 
TO authenticated
USING (
    source_bureau_id = get_current_bureau_id() 
    OR 
    destination_bureau_id = get_current_bureau_id()
);

CREATE POLICY "Authorized users insert transmissions" ON public.transmissions FOR INSERT 
TO authenticated
WITH CHECK (
    source_bureau_id = get_current_bureau_id() 
    AND 
    get_current_user_role() IN ('admin', 'agent', 'Secrétaire')
);

CREATE POLICY "Users view comments in same bureau" ON public.comments FOR SELECT 
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.dossiers 
    WHERE id = dossier_id 
    AND bureau_id = get_current_bureau_id()
));

CREATE POLICY "Users insert comments" ON public.comments FOR INSERT 
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.dossiers 
    WHERE id = dossier_id 
    AND bureau_id = get_current_bureau_id()
));

CREATE POLICY "Users view audit logs in same bureau" ON public.audit_logs FOR SELECT 
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.dossiers 
    WHERE id = dossier_id 
    AND bureau_id = get_current_bureau_id()
));

CREATE POLICY "Users view notifications" ON public.notifications FOR SELECT 
TO authenticated
USING (bureau_id = get_current_bureau_id());

CREATE POLICY "Users update notifications" ON public.notifications FOR UPDATE 
TO authenticated
USING (bureau_id = get_current_bureau_id());

CREATE POLICY "Users insert notifications" ON public.notifications FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Trigger to automatically create a profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, requested_bureau_name, status, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.raw_user_meta_data->>'bureau_name',
        'pending',
        'client'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bureaus_modtime ON public.bureaus;
CREATE TRIGGER update_bureaus_modtime BEFORE UPDATE ON public.bureaus FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_roles_modtime ON public.roles;
CREATE TRIGGER update_roles_modtime BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_dossiers_modtime ON public.dossiers;
CREATE TRIGGER update_dossiers_modtime BEFORE UPDATE ON public.dossiers FOR EACH ROW EXECUTE FUNCTION update_modified_column();
