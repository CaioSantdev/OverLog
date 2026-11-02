-- Execute como postgres APÓS as migrações e antes de iniciar a aplicação.
BEGIN;
REVOKE ALL ON ALL TABLES IN SCHEMA overlog FROM anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA overlog TO overlog_app;
GRANT INSERT, UPDATE, DELETE ON TABLE
  overlog.users, overlog.workout_templates, overlog.template_exercises,
  overlog.planned_sets, overlog.workout_sessions, overlog.session_exercises,
  overlog.performed_sets, overlog.rate_limit_buckets TO overlog_app;
COMMIT;
-- Reaplique após futuras migrações que criem tabelas.
