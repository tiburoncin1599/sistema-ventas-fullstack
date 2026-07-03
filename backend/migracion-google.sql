ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id) WHERE google_id IS NOT NULL;
