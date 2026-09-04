-- migrations/020_trip_planner_creator_participant.sql
-- Backfill: trips created before the creator was auto-added as a
-- trip_participants row (see createTrip in src/lib/services/trips.ts).

INSERT INTO trip_participants (trip_id, user_id, email, display_name, invite_token)
SELECT
    t.id,
    t.created_by,
    u.email,
    u.name,
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
FROM trips t
JOIN "user" u ON u.id = t.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM trip_participants tp
    WHERE tp.trip_id = t.id AND tp.user_id = t.created_by
);
