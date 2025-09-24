"""Baseline schema marker.

This initial revision intentionally performs no destructive DDL.
Historically the `users.dias_disponiveis` column is already JSON-compatible
in the live database; prior attempt to coerce type caused transaction noise
when the column already matched desired type. We retain a guarded noop for
Postgres just in case, wrapped in exception swallow, but effectively this
serves only to create the alembic_version table and mark head.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '20250811_0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Deliberate NO-OP baseline; do not execute any SQL here.
    # Type conversion is handled in subsequent guarded migrations.
    return


def downgrade():
    # Baseline downgrade is a noop (irreversible semantics intentionally).
    pass
