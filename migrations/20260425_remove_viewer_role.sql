BEGIN;

-- 1) Convert legacy viewer users to editor.
UPDATE users
SET role = 'editor'
WHERE role = 'viewer';

-- 2) Recreate users.role CHECK constraint to allow only admin/editor.
-- Drop existing CHECK constraint(s) on users table's role column.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'users'
      AND nsp.nspname = current_schema()
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format(
      'ALTER TABLE users DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'editor'));

COMMIT;
