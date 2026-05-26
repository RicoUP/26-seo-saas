-- SEO SaaS schema migration

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  tier text DEFAULT 'starter' CHECK (tier IN ('starter', 'growth', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'canceled', 'past_due')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Connected websites
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL,
  niche text,
  cms_type text DEFAULT 'wordpress' CHECK (cms_type IN ('wordpress', 'manual')),
  wp_url text,
  wp_username text,
  wp_app_password text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at timestamptz DEFAULT now()
);

-- Keywords
CREATE TABLE IF NOT EXISTS keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  website_id uuid REFERENCES websites(id) ON DELETE CASCADE,
  seed_keyword text NOT NULL,
  keyword text NOT NULL,
  difficulty integer CHECK (difficulty >= 0 AND difficulty <= 100),
  search_volume integer,
  intent text DEFAULT 'informational' CHECK (intent IN ('informational', 'transactional', 'navigational', 'commercial')),
  status text DEFAULT 'idea' CHECK (status IN ('idea', 'target', 'published', 'dropped')),
  created_at timestamptz DEFAULT now()
);

-- Rank tracking
CREATE TABLE IF NOT EXISTS keyword_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid REFERENCES keywords(id) ON DELETE CASCADE NOT NULL,
  position integer CHECK (position > 0),
  date date DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'api')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Content generation jobs
CREATE TABLE IF NOT EXISTS content_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  keyword_id uuid REFERENCES keywords(id) ON DELETE SET NULL,
  website_id uuid REFERENCES websites(id) ON DELETE SET NULL,
  title text,
  meta_description text,
  content_html text,
  word_count integer,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'published', 'scheduled')),
  publish_method text DEFAULT 'download' CHECK (publish_method IN ('download', 'wordpress')),
  publish_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Usage tracking for quotas
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('keyword_research', 'content_generate', 'rank_track')),
  count integer DEFAULT 1,
  period text NOT NULL, -- YYYY-MM format
  created_at timestamptz DEFAULT now()
);

-- Email queue
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template text NOT NULL CHECK (template IN ('monthly_digest', 'welcome_1', 'welcome_2', 'welcome_3', 'limit_warning')),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see their own data
CREATE POLICY "Users can CRUD own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can CRUD own websites" ON websites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own keywords" ON keywords FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own rankings" ON keyword_rankings FOR ALL USING (
  EXISTS (SELECT 1 FROM keywords WHERE keywords.id = keyword_rankings.keyword_id AND keywords.user_id = auth.uid())
);
CREATE POLICY "Users can CRUD own content" ON content_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own usage" ON usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own emails" ON email_queue FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_website_id ON keywords(website_id);
CREATE INDEX IF NOT EXISTS idx_content_requests_user_id ON content_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_period ON usage_logs(user_id, period);
CREATE INDEX IF NOT EXISTS idx_rankings_keyword_date ON keyword_rankings(keyword_id, date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_requests_updated_at BEFORE UPDATE ON content_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
