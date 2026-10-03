"""add audit_logs table

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-10-02 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('company_id', sa.String(length=36), nullable=True),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('user_email', sa.String(length=255), nullable=True),
        sa.Column('event', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.String(length=255), nullable=True),
        sa.Column('result', sa.String(length=20), nullable=False, server_default='SUCCESS'),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_index('ix_audit_logs_company_id', ['company_id'], unique=False)
        batch_op.create_index('ix_audit_logs_user_id', ['user_id'], unique=False)
        batch_op.create_index('ix_audit_logs_event', ['event'], unique=False)
        batch_op.create_index('ix_audit_logs_entity_type', ['entity_type'], unique=False)
        batch_op.create_index('ix_audit_logs_entity_id', ['entity_id'], unique=False)
        batch_op.create_index('ix_audit_logs_result', ['result'], unique=False)
        batch_op.create_index('ix_audit_logs_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_audit_logs_company_created', ['company_id', 'created_at'], unique=False)
        batch_op.create_index('ix_audit_logs_event_created', ['event', 'created_at'], unique=False)
        batch_op.create_index('ix_audit_logs_entity', ['entity_type', 'entity_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index('ix_audit_logs_entity')
        batch_op.drop_index('ix_audit_logs_event_created')
        batch_op.drop_index('ix_audit_logs_company_created')
        batch_op.drop_index('ix_audit_logs_created_at')
        batch_op.drop_index('ix_audit_logs_result')
        batch_op.drop_index('ix_audit_logs_entity_id')
        batch_op.drop_index('ix_audit_logs_entity_type')
        batch_op.drop_index('ix_audit_logs_event')
        batch_op.drop_index('ix_audit_logs_user_id')
        batch_op.drop_index('ix_audit_logs_company_id')
    op.drop_table('audit_logs')
