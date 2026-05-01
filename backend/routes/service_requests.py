from flask import Blueprint, request

from middleware import require_auth, require_verified
from routes.base import BaseController
from services import ServiceRequestsService


class ServiceRequestsController(BaseController):
    def __init__(self):
        self.service = ServiceRequestsService()
        self.blueprint = Blueprint("service_requests", __name__, url_prefix="/api/solicitudes-servicios")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_requests))
        self.blueprint.route("/<request_id>", methods=["GET"])(require_auth(self.get_request))
        self.blueprint.route("", methods=["POST"])(require_verified(self.create_request))
        self.blueprint.route("/<request_id>", methods=["DELETE"])(require_verified(self.delete_request))
        self.blueprint.route("/<request_id>/status", methods=["PATCH"])(require_verified(self.update_status))
        self.blueprint.route("/<request_id>/support", methods=["POST"])(require_verified(self.toggle_support))
        self.blueprint.route("/upload-evidence", methods=["POST"])(require_verified(self.upload_evidence))
        self.blueprint.route("/<request_id>/comments", methods=["GET"])(require_auth(self.get_comments))
        self.blueprint.route("/<request_id>/comments", methods=["POST"])(require_verified(self.create_comment))
        self.blueprint.route("/<request_id>/comments/<comment_id>", methods=["DELETE"])(require_verified(self.delete_comment))

    def get_requests(self):
        status = request.args.get("status")
        category = request.args.get("category")
        page = int(request.args.get("page", 1))
        per_page = min(max(int(request.args.get("per_page", 10)), 1), 200)
        return self.handle(self.service.get_requests, status, category, page, per_page, request.user_id)

    def get_request(self, request_id):
        return self.handle(self.service.get_request, request_id, request.user_id)

    def create_request(self):
        return self.handle(self.service.create_request, request.get_json() or {}, request.user_id)

    def delete_request(self, request_id):
        return self.handle(self.service.delete_request, request_id, request.user_id)

    def update_status(self, request_id):
        return self.handle(self.service.update_status, request_id, request.get_json() or {}, request.user_id)

    def toggle_support(self, request_id):
        return self.handle(self.service.toggle_support, request_id, request.user_id)

    def upload_evidence(self):
        return self.handle(self.service.upload_evidence, request.files.get("evidence"), request.user_id)

    def get_comments(self, request_id):
        return self.handle(self.service.get_comments, request_id)

    def create_comment(self, request_id):
        return self.handle(self.service.create_comment, request_id, request.get_json() or {}, request.user_id)

    def delete_comment(self, request_id, comment_id):
        return self.handle(self.service.delete_comment, comment_id, request.user_id)


service_requests_bp = ServiceRequestsController().blueprint
