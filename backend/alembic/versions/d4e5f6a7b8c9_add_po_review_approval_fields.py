"""add po review and approval fields

Revision ID: d4e5f6a7b8c9
Revises: c751a29fc965
Create Date: 2026-09-19 20:21:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c751a29fc965'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add review and approval columns to purchase_orders
    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('supplier_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('delivery_terms', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('payment_terms', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('inspection_clauses', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('general_notes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('approved_by', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('approved_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
        batch_op.create_foreign_key('fk_purchase_orders_approved_by_users', 'users', ['approved_by'], ['id'], ondelete='SET NULL', onupdate='CASCADE')

    # Add columns to purchase_order_items
    with op.batch_alter_table('purchase_order_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('drawing_number', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('review_flags', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('purchase_order_items', schema=None) as batch_op:
        batch_op.drop_column('review_flags')
        batch_op.drop_column('drawing_number')

    with op.batch_alter_table('purchase_orders', schema=None) as batch_op:
        batch_op.drop_constraint('fk_purchase_orders_approved_by_users', type_='foreignkey')
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('approved_at')
        batch_op.drop_column('approved_by')
        batch_op.drop_column('general_notes')
        batch_op.drop_column('inspection_clauses')
        batch_op.drop_column('payment_terms')
        batch_op.drop_column('delivery_terms')
        batch_op.drop_column('supplier_name')
