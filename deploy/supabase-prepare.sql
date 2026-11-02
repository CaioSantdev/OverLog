-- Execute como postgres no SQL Editor do projeto Supabase antes das migrações.
-- Substitua o placeholder por uma senha aleatória exclusiva (>=16 caracteres).
-- Não salve a versão com senha real no Git.
BEGIN;
CREATE SCHEMA IF NOT EXISTS overlog AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA overlog FROM PUBLIC;
DO $$
DECLARE runtime_password text := 'SUBSTITUA_POR_UMA_SENHA_ALEATORIA_EXCLUSIVA';
BEGIN
  IF runtime_password LIKE 'SUBSTITUA%' OR length(runtime_password) < 16 THEN
    RAISE EXCEPTION 'Substitua o placeholder por uma senha aleatória exclusiva.';
  END IF;
  EXECUTE format('CREATE ROLE overlog_app LOGIN PASSWORD %L', runtime_password);
END $$;
GRANT CONNECT ON DATABASE postgres TO overlog_app;
GRANT USAGE ON SCHEMA overlog TO overlog_app;
COMMIT;
-- Não adicione overlog aos schemas expostos na Data API.
