ALTER TABLE renovation_payments RENAME COLUMN method TO account_type;

UPDATE renovation_payments SET account_type = CASE account_type
  WHEN 'transfer' THEN 'shared'
  WHEN 'card' THEN 'personal'
  WHEN 'cash' THEN 'cash'
  ELSE account_type
END;

ALTER TABLE renovation_payments
  ADD CONSTRAINT renovation_payments_account_type_check
  CHECK (account_type IN ('shared','personal','cash'));

ALTER TABLE renovation_payments DROP COLUMN fund_id;
