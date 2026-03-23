-- User target fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS correction_factor FLOAT DEFAULT 1.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_weight FLOAT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_weight FLOAT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_body_fat_pct FLOAT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_muscle_mass FLOAT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_waist_size FLOAT;

-- Weight logs
CREATE TABLE IF NOT EXISTS weight_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    weight FLOAT NOT NULL,
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Body metric logs
CREATE TABLE IF NOT EXISTS body_metric_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body_fat_pct FLOAT,
    muscle_mass FLOAT,
    waist_size FLOAT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    avg_weight FLOAT,
    calories_consumed FLOAT DEFAULT 0,
    calories_target FLOAT DEFAULT 0,
    calories_burned FLOAT DEFAULT 0,
    predicted_weight_change FLOAT,
    actual_weight_change FLOAT,
    correction_factor FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
