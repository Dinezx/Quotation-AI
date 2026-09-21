"""add performance and multitenant indexes

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-21 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Quotations query acceleration
    op.create_index(
        'ix_quotations_company_created',
        'quotations',
        ['company_id', sa.text('created_at DESC')],
    )
    op.create_index(
        'ix_quotations_company_status',
        'quotations',
        ['company_id', 'status'],
    )
    op.create_index('ix_quotations_customer_id', 'quotations', ['customer_id'])
    op.create_index('ix_quotations_purchase_order_id', 'quotations', ['purchase_order_id'])

    # 2. Purchase orders query acceleration
    op.create_index(
        'ix_pos_company_created',
        'purchase_orders',
        ['company_id', sa.text('created_at DESC')],
    )
    op.create_index(
        'ix_pos_company_status',
        'purchase_orders',
        ['company_id', 'status'],
    )
    op.create_index('ix_pos_customer_id', 'purchase_orders', ['customer_id'])

    # 3. Customers query acceleration
    op.create_index('ix_customers_company_active', 'customers', ['company_id', 'is_active'])
    op.create_index('ix_customers_company_gstin', 'customers', ['company_id', 'gstin'])

    # 4. Materials & Processes rate matching acceleration
    op.create_index('ix_materials_company_grade', 'materials', ['company_id', 'grade'])
    op.create_index('ix_materials_company_active', 'materials', ['company_id', 'is_active'])
    op.create_index('ix_processes_company_name', 'processes', ['company_id', 'name'])
    op.create_index('ix_processes_company_active', 'processes', ['company_id', 'is_active'])


def downgrade() -> None:
    op.drop_index('ix_processes_company_active', table_name='processes')
    op.drop_index('ix_processes_company_name', table_name='processes')
    op.drop_index('ix_materials_company_active', table_name='materials')
    op.drop_index('ix_materials_company_grade', table_name='materials')
    op.drop_index('ix_customers_company_gstin', table_name='customers')
    op.drop_index('ix_customers_company_active', table_name='customers')
    op.drop_index('ix_pos_customer_id', table_name='purchase_orders')
    op.drop_index('ix_pos_company_status', table_name='purchase_orders')
    op.drop_index('ix_pos_company_created', table_name='purchase_orders')
    op.drop_index('ix_quotations_purchase_order_id', table_name='quotations')
    op.drop_index('ix_quotations_customer_id', table_name='quotations')
    op.drop_index('ix_quotations_company_status', table_name='quotations')
    op.drop_index('ix_quotations_company_created', table_name='quotations')
