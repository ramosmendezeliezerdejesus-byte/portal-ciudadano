from flask import Blueprint, request

from middleware import require_auth
from routes.base import BaseController
from services import BibliotecaService


class BibliotecaController(BaseController):
    def __init__(self):
        self.service = BibliotecaService()
        self.blueprint = Blueprint("biblioteca", __name__, url_prefix="/api/biblioteca")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_biblioteca))

    def get_biblioteca(self):
        category = (request.args.get("category") or "").strip()
        search = (request.args.get("search") or "").strip()
        case_type = (request.args.get("type") or "").strip()
        return self.handle(self.service.get_items, category, search, case_type)


biblioteca_bp = BibliotecaController().blueprint
