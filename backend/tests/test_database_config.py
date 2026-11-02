import pytest
from app.core.config import Settings


def test_remote_database_keeps_tls_schema_and_password_encoding():
    settings = Settings(_env_file=None, jwt_secret_key='x' * 48, postgres_user='overlog_app.project',
                        postgres_password='p@ss:/?#with-symbols', postgres_schema='overlog',
                        postgres_sslmode='verify-full', postgres_sslrootcert='/run/certs/ca.crt')
    url = settings.database_url
    assert url.password == 'p@ss:/?#with-symbols'
    assert url.query['sslmode'] == 'verify-full'
    assert url.query['sslrootcert'] == '/run/certs/ca.crt'
    assert url.query['options'] == '-c search_path=overlog'
    assert settings.connection_options == '-c search_path=overlog'


@pytest.mark.parametrize('schema', ['public,malicious', 'overlog; DROP SCHEMA public', 'bad-name', 'a' * 64])
def test_rejects_unsafe_schema_names(schema):
    with pytest.raises(ValueError):
        Settings(_env_file=None, jwt_secret_key='x' * 48, postgres_schema=schema)
