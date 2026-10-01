"""add notifications table

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-10-01 17:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.String(length=255), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='INFO'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index('ix_notifications_company_id', ['company_id'], unique=False)
        batch_op.create_index('ix_notifications_user_id', ['user_id'], unique=False)
        batch_op.create_index('ix_notifications_type', ['type'], unique=False)
        batch_op.create_index('ix_notifications_company_created', ['company_id', 'created_at'], unique=False)
        batch_op.create_index('ix_notifications_company_read', ['company_id', 'read_at'], unique=False)
        batch_op.create_index('ix_notifications_company_type_entity', ['company_id', 'type', 'entity_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index('ix_notifications_company_type_entity')
        batch_op.drop_index('ix_notifications_company_read')
        batch_op.drop_index('ix_notifications_company_created')
        batch_op.drop_index('ix_notifications_type')
        batch_op.drop_index('ix_notifications_user_id')
        batch_op.drop_index('ix_notifications_company_id')
    op.drop_table('notifications')
