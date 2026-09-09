-- migrations/026_commute_distrust_check.sql

ALTER TABLE commute_routes
    DROP CONSTRAINT IF EXISTS commute_routes_distrust_multiplier_check;

ALTER TABLE commute_routes
    ADD CONSTRAINT commute_routes_distrust_multiplier_check
    CHECK (distrust_multiplier IS NULL OR distrust_multiplier >= 1);
