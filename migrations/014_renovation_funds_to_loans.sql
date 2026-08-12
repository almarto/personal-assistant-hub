ALTER TABLE renovation_funds RENAME TO renovation_loans;

DELETE FROM renovation_loans WHERE type != 'loan';

UPDATE renovation_loans SET lender = 'Unknown' WHERE lender IS NULL;

ALTER TABLE renovation_loans
  DROP COLUMN type,
  DROP COLUMN source,
  DROP COLUMN include_in_budget;

ALTER TABLE renovation_loans RENAME COLUMN date_received TO date_borrowed;

ALTER TABLE renovation_loans ALTER COLUMN lender SET NOT NULL;
