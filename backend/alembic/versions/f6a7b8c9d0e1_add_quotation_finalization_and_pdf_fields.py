"""add quotation finalization and pdf fields

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-20 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add finalization and PDF persistence columns to quotations
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pdf_storage_path', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('pdf_file_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('pdf_generated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('pdf_sha256', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('finalized_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('finalized_by', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.drop_column('finalized_by')
        batch_op.drop_column('finalized_at')
        batch_op.drop_column('pdf_sha256')
        batch_op.drop_column('pdf_generated_at')
        batch_op.drop_column('pdf_file_name')
        batch_op.drop_column('pdf_storage_path')
