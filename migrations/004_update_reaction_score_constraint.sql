ALTER TABLE food_entries DROP CONSTRAINT IF EXISTS food_entries_reaction_score_check;
ALTER TABLE food_entries ADD CONSTRAINT food_entries_reaction_score_check CHECK (reaction_score >= 1 AND reaction_score <= 3);

ALTER TABLE food_entries DROP CONSTRAINT IF EXISTS food_entries_feedback_score_check;
ALTER TABLE food_entries ADD CONSTRAINT food_entries_feedback_score_check CHECK (feedback_score >= 1 AND feedback_score <= 3);
