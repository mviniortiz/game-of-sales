-- Add Google Calendar integration fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- Add sync fields to agendamentos
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS synced_with_google BOOLEAN DEFAULT false;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agendamentos_google_event ON agendamentos(google_event_id);
CREATE INDEX IF NOT EXISTS idx_profiles_google_tokens ON profiles(id) WHERE google_access_token IS NOT NULL;

-- Create sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    google_event_id TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_logs
CREATE POLICY "Users can view own sync logs"
ON sync_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
ON sync_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to check if token is expired
CREATE OR REPLACE FUNCTION is_google_token_expired(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT google_token_expires_at INTO expires_at
    FROM profiles
    WHERE id = check_user_id;
    
    RETURN expires_at IS NULL OR expires_at < NOW() + INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;