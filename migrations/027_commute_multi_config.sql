-- migrations/027_commute_multi_config.sql

ALTER TABLE commute_configs DROP CONSTRAINT commute_configs_user_id_key;
CREATE INDEX commute_configs_user_id_idx ON commute_configs(user_id);

ALTER TABLE commute_configs ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
UPDATE commute_configs SET is_default = true;

CREATE UNIQUE INDEX commute_configs_one_default_per_user
  ON commute_configs(user_id) WHERE is_default = true;
