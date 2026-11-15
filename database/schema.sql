CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  conference TEXT NOT NULL,
  division TEXT NOT NULL,
  cap_space INTEGER NOT NULL DEFAULT 255500000,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  overall INTEGER,
  potential INTEGER,
  age INTEGER,
  speed INTEGER,
  strength INTEGER,
  awareness INTEGER,
  team_id TEXT REFERENCES teams(id),
  is_free_agent INTEGER DEFAULT 0,
  dev_trait TEXT DEFAULT 'normal',
  injury_weeks INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contracts (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  team_id TEXT REFERENCES teams(id),
  salary INTEGER,
  years_remaining INTEGER
);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  week INTEGER,
  home_team TEXT,
  away_team TEXT,
  home_score INTEGER,
  away_score INTEGER,
  played INTEGER DEFAULT 0
);
-- ... (Remaining tables: draft_picks, player_season_stats, etc. can be added as needed)
ALTER TABLE teams ADD COLUMN claimed INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS trade_offers (
  id TEXT PRIMARY KEY,
  from_team TEXT NOT NULL,
  to_team TEXT NOT NULL,
  offer_players TEXT NOT NULL,
  request_players TEXT NOT NULL,
  offer_picks TEXT NOT NULL,
  request_picks TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL
);