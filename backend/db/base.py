from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import model modules so SQLAlchemy metadata is fully registered at startup.
from backend.models import *  # noqa: F401,F403,E402
