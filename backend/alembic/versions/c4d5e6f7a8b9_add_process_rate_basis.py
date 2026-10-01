"""add process rate basis

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-10-01 13:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('processes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rate_basis', sa.String(length=50), nullable=True, server_default='Per Hour'))


def downgrade() -> None:
    with op.batch_alter_table('processes', schema=None) as batch_op:
        batch_op.drop_column('rate_basis')
