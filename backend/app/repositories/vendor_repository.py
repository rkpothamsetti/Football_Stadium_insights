from app.models.vendor import Vendor
from app.repositories.base import BaseRepository

class VendorRepository(BaseRepository[Vendor]):
    def __init__(self):
        super().__init__("vendors", Vendor)
