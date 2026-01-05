ALTER TABLE food_entries DROP CONSTRAINT IF EXISTS food_entries_reaction_score_check;
ALTER TABLE food_entries ADD CONSTRAINT food_entries_reaction_score_check CHECK (reaction_score >= 0 AND reaction_score <= 5);
