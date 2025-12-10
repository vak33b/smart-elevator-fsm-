"""add project status

Revision ID: 4d2943523621
Revises: 58d7a629e9c3
Create Date: 2025-12-11 12:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4d2943523621"
down_revision = "58d7a629e9c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    project_status = sa.Enum("draft", "submitted", "reviewed", name="project_status")
    project_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "projects",
        sa.Column(
            "status",
            project_status,
            nullable=False,
            server_default="draft",
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "status")

    project_status = sa.Enum("draft", "submitted", "reviewed", name="project_status")
    project_status.drop(op.get_bind(), checkfirst=True)
