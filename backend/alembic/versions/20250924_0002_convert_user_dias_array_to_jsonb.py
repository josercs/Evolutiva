"""Convert users.dias_disponiveis to JSONB using to_jsonb for arrays.

Safe on existing JSON/JSONB; only alters when current type is not JSONB.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '20250924_0002'
down_revision = '20250811_0001'
branch_labels = None
depends_on = None


def upgrade():
    try:
        bind = op.get_bind()
        if bind.dialect.name != 'postgresql':
            return
        # Check current type; only alter when not jsonb
        current_type = bind.execute(
            """
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name='users' AND column_name='dias_disponiveis'
            """
        ).scalar()
        if current_type and current_type.lower() in ('jsonb', 'json'):
            return
        # Perform conversion using to_jsonb() which handles arrays
        op.execute(
            """
            ALTER TABLE users
            ALTER COLUMN dias_disponiveis TYPE JSONB
            USING to_jsonb(dias_disponiveis)
            """
        )
    except Exception:
        # Non-fatal in case of permission issues; better to continue startup.
        pass


def downgrade():
    # No automatic downgrade; keep JSONB.
    pass
