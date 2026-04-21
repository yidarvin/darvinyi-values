CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS values_list (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  definition TEXT NOT NULL,
  original_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
  shuffle_order JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS session_values (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  value_id INTEGER REFERENCES values_list(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, value_id)
);
