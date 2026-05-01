from flask import Blueprint, request

from middleware import require_auth
from routes.base import BaseController
from services import AuthService


class AuthController(BaseController):
    def __init__(self):
        self.service = AuthService()
        self.blueprint = Blueprint("auth", __name__, url_prefix="/api/auth")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("/register", methods=["POST"])(self.register)
        self.blueprint.route("/login", methods=["POST"])(self.login)
        self.blueprint.route("/refresh", methods=["POST"])(self.refresh)
        self.blueprint.route("/resend-verification", methods=["POST"])(self.resend_verification)
        self.blueprint.route("/logout", methods=["POST"])(require_auth(self.logout))
        self.blueprint.route("/me", methods=["GET"])(require_auth(self.me))

    def register(self):
        return self.handle(self.service.register, request.get_json() or {})

    def login(self):
        return self.handle(self.service.login, request.get_json() or {})

    def refresh(self):
        return self.handle(self.service.refresh, request.get_json() or {})

    def resend_verification(self):
        return self.handle(self.service.resend_verification, request.get_json() or {})

    def logout(self):
        return self.handle(self.service.logout)

    def me(self):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        return self.handle(self.service.me, token, request.user_id)


auth_bp = AuthController().blueprint
