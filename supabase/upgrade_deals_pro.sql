-- =====================================================
-- Game Sales CRM Pro - Upgrade Deals Table
-- =====================================================
-- This script adds professional CRM features to the deals table

-- Add new columns for CRM Pro features
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS loss_reason TEXT,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Update the deal_stage enum to include closed_lost if not exists
DO $$ 
BEGIN
  -- Check if closed_lost exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'closed_lost' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'deal_stage')
  ) THEN
    ALTER TYPE deal_stage ADD VALUE 'closed_lost';
  END IF;
END $$;

-- Create deal_activities table for timeline
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'created', 'stage_changed', 'note_added', 'call_logged', 'field_updated', 'won', 'lost'
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create deal_notes table for notes/annotations
CREATE TABLE IF NOT EXISTS deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_at ON deal_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON deal_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

-- Enable RLS on new tables
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON deal_activities TO authenticated;
GRANT ALL ON deal_activities TO service_role;
GRANT ALL ON deal_notes TO authenticated;
GRANT ALL ON deal_notes TO service_role;

-- RLS Policies for deal_activities
CREATE POLICY "Users can view activities of their deals"
  ON deal_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals d WHERE d.id = deal_activities.deal_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activities for their deals"
  ON deal_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities"
  ON deal_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- RLS Policies for deal_notes
CREATE POLICY "Users can view notes of their deals"
  ON deal_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals d WHERE d.id = deal_notes.deal_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes for their deals"
  ON deal_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON deal_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON deal_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notes"
  ON deal_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Function to log deal activity
CREATE OR REPLACE FUNCTION log_deal_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log stage changes
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO deal_activities (deal_id, user_id, activity_type, description, old_value, new_value)
    VALUES (
      NEW.id, 
      auth.uid(),
      CASE 
        WHEN NEW.stage = 'closed_won' THEN 'won'
        WHEN NEW.stage = 'closed_lost' THEN 'lost'
        ELSE 'stage_changed'
      END,
      CASE 
        WHEN NEW.stage = 'closed_won' THEN 'Deal marcado como ganho'
        WHEN NEW.stage = 'closed_lost' THEN 'Deal marcado como perdido: ' || COALESCE(NEW.loss_reason, 'Sem motivo')
        ELSE 'Movido para ' || NEW.stage
      END,
      OLD.stage::text,
      NEW.stage::text
    );
    
    -- Set closed_at when deal is won or lost
    IF NEW.stage IN ('closed_won', 'closed_lost') THEN
      NEW.closed_at = NOW();
    END IF;
  END IF;
  
  -- Log value changes
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO deal_activities (deal_id, user_id, activity_type, description, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'field_updated',
      'Valor atualizado',
      OLD.value::text,
      NEW.value::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for activity logging
DROP TRIGGER IF EXISTS trigger_log_deal_activity ON deals;
CREATE TRIGGER trigger_log_deal_activity
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_activity();

-- Function to log deal creation
CREATE OR REPLACE FUNCTION log_deal_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_activities (deal_id, user_id, activity_type, description)
  VALUES (
    NEW.id,
    NEW.user_id,
    'created',
    'Deal criado: ' || NEW.title
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for creation logging
DROP TRIGGER IF EXISTS trigger_log_deal_creation ON deals;
CREATE TRIGGER trigger_log_deal_creation
  AFTER INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_creation();

-- Update updated_at trigger (ensure it exists)
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_deals_updated_at ON deals;
CREATE TRIGGER trigger_update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();

SELECT 'CRM Pro upgrade completed successfully!' as status;

