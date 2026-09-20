"""add quotation metadata and item fields

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-19 22:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add metadata columns to quotations
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('inspection_terms', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('prepared_by', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('authorized_signatory', sa.String(length=255), nullable=True))

    # Add specification/material/process columns to quotation_items
    with op.batch_alter_table('quotation_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('drawing_number', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('material', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('process', sa.String(length=100), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('quotation_items', schema=None) as batch_op:
        batch_op.drop_column('process')
        batch_op.drop_column('material')
        batch_op.drop_column('drawing_number')

    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.drop_column('authorized_signatory')
        batch_op.drop_column('prepared_by')
        batch_op.drop_column('inspection_terms')
