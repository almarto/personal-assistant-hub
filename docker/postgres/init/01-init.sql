-- Initialize database for Personal Assistant Hub
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create a read-only user for monitoring (optional)
-- CREATE USER monitoring WITH PASSWORD 'monitoring_password';
-- GRANT CONNECT ON DATABASE personal_assistant_hub TO monitoring;
-- GRANT USAGE ON SCHEMA public TO monitoring;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring;