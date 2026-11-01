import os

# Only used for isolated tests; never a deployment secret.
os.environ.setdefault('JWT_SECRET_KEY', 'isolated-test-key-which-is-at-least-32-characters')
