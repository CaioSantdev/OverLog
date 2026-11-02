"""Run migrations with the owner, then provision a restricted production login."""
import os
import subprocess

import psycopg
from psycopg import sql


def main():
    from app.core.config import get_settings
    get_settings()  # Reject unsafe runtime settings before touching the schema.
    env = os.environ.copy()
    owner = env.get('MIGRATION_POSTGRES_USER')
    if owner:
        if owner == env['POSTGRES_USER'] or env['MIGRATION_POSTGRES_PASSWORD'] == env['POSTGRES_PASSWORD']:
            raise RuntimeError('Migrações e API exigem usuários e senhas distintos.')
        env['POSTGRES_USER'] = owner
        env['POSTGRES_PASSWORD'] = env['MIGRATION_POSTGRES_PASSWORD']
    subprocess.run(['alembic', 'upgrade', 'head'], env=env, check=True)
    if not owner:
        return
    runtime = os.environ['POSTGRES_USER']
    if runtime == owner:
        raise RuntimeError('O usuário da API deve ser diferente do proprietário do banco.')
    with psycopg.connect(host=env['POSTGRES_HOST'], dbname=env['POSTGRES_DB'],
                         user=owner, password=env['POSTGRES_PASSWORD'], connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            if not cursor.execute('SELECT 1 FROM pg_roles WHERE rolname = %s', (runtime,)).fetchone():
                cursor.execute(sql.SQL('CREATE ROLE {} LOGIN').format(sql.Identifier(runtime)))
            cursor.execute(sql.SQL('ALTER ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD {}').format(
                sql.Identifier(runtime), sql.Literal(os.environ['POSTGRES_PASSWORD'])))
            cursor.execute('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
            cursor.execute(sql.SQL('GRANT CONNECT ON DATABASE {} TO {}').format(sql.Identifier(env['POSTGRES_DB']), sql.Identifier(runtime)))
            cursor.execute(sql.SQL('GRANT USAGE ON SCHEMA public TO {}').format(sql.Identifier(runtime)))
            cursor.execute(sql.SQL('GRANT SELECT ON ALL TABLES IN SCHEMA public TO {}').format(sql.Identifier(runtime)))
            for table in ('users', 'workout_templates', 'template_exercises', 'planned_sets',
                          'workout_sessions', 'session_exercises', 'performed_sets', 'rate_limit_buckets'):
                cursor.execute(sql.SQL('GRANT INSERT, UPDATE, DELETE ON TABLE {} TO {}').format(sql.Identifier(table), sql.Identifier(runtime)))


if __name__ == '__main__':
    main()
