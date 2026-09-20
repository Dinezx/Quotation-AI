"""add quotation email dispatch fields

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-09-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email dispatch and audit columns to quotations
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email_status', sa.String(length=50), server_default='NOT_SENT', nullable=False))
        batch_op.add_column(sa.Column('email_sent_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('email_sent_by', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('email_recipient', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('email_error', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('email_message_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('quotations', schema=None) as batch_op:
        batch_op.drop_column('email_message_id')
        batch_op.drop_column('email_error')
        batch_op.drop_column('email_recipient')
        batch_op.drop_column('email_sent_by')
        batch_op.drop_column('email_sent_at')
        batch_op.drop_column('email_status')
