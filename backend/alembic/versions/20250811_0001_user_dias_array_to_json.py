"""
Convert users.dias_disponiveis to JSON/JSONB on Postgres; noop on SQLite.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '20250811_0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == 'postgresql':
        # Try to alter type to JSONB preserving data
        try:
            op.execute('ALTER TABLE users ALTER COLUMN dias_disponiveis TYPE JSONB USING dias_disponiveis::jsonb')
        except Exception:
            pass
    else:
        # SQLite already uses JSON affinity, nothing to do
        pass


def downgrade():
    # Irreversible automatically; optionally attempt to cast back to TEXT
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == 'postgresql':
        try:
            op.execute('ALTER TABLE users ALTER COLUMN dias_disponiveis TYPE TEXT USING dias_disponiveis::text')
        except Exception:
            pass
