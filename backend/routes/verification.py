from flask import Blueprint, request

from middleware import require_auth
from routes.base import BaseController
from services import VerificationService


class VerificationController(BaseController):
    def __init__(self):
        self.service = VerificationService()
        self.blueprint = Blueprint("verification", __name__, url_prefix="/api/verification")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("/request", methods=["POST"])(require_auth(self.create_verification_request))
        self.blueprint.route("/my-request", methods=["GET"])(require_auth(self.my_verification_request))

    def create_verification_request(self):
        return self.handle(self.service.create_request, request.get_json() or {}, request.user_id)

    def my_verification_request(self):
        return self.handle(self.service.get_my_request, request.user_id)


verification_bp = VerificationController().blueprint
