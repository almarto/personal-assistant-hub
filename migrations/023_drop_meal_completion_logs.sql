-- migrations/023_drop_meal_completion_logs.sql

-- Meal completion tracking (checking off "I ate this") was removed: not
-- needed right now, and a future "alternative meal eaten instead" feature
-- will replace it with something richer. See migrations/021_wellness.sql
-- for the original table definition.
DROP TABLE IF EXISTS meal_completion_logs;
