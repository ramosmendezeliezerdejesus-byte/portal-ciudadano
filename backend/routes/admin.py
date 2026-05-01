from flask import Blueprint, request

from middleware import require_super_admin
from routes.base import BaseController
from services import AdminService


class AdminController(BaseController):
    def __init__(self):
        self.service = AdminService()
        self.blueprint = Blueprint("admin", __name__, url_prefix="/api/admin")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("/users", methods=["GET"])(require_super_admin(self.list_users))
        self.blueprint.route("/users/<user_id>/role", methods=["PATCH"])(require_super_admin(self.change_role))
        self.blueprint.route("/users/<user_id>", methods=["DELETE"])(require_super_admin(self.delete_user))
        self.blueprint.route("/meetings", methods=["GET"])(require_super_admin(self.list_meetings))
        self.blueprint.route("/meetings/<meeting_id>", methods=["DELETE"])(require_super_admin(self.delete_meeting))
        self.blueprint.route("/verification-requests", methods=["GET"])(require_super_admin(self.list_verification_requests))
        self.blueprint.route("/verification-requests/<req_id>/review", methods=["POST"])(require_super_admin(self.review_request))
        self.blueprint.route("/community-report-summary", methods=["GET"])(require_super_admin(self.community_report_summary))

    def list_users(self):
        return self.handle(self.service.list_users)

    def change_role(self, user_id):
        data = request.get_json() or {}
        return self.handle(self.service.change_role, user_id, request.user_id, data.get("role", "user"))

    def delete_user(self, user_id):
        return self.handle(self.service.delete_user, user_id, request.user_id)

    def list_meetings(self):
        return self.handle(self.service.list_meetings)

    def delete_meeting(self, meeting_id):
        return self.handle(self.service.delete_meeting, meeting_id)

    def list_verification_requests(self):
        return self.handle(self.service.list_verification_requests, request.args.get("status", "pending"))

    def review_request(self, req_id):
        data = request.get_json() or {}
        notes = (data.get("notes") or "").strip()
        return self.handle(self.service.review_request, req_id, data.get("action"), notes, request.user_id)

    def community_report_summary(self):
        return self.handle(self.service.community_report_summary, request.args.get("community_key"))


admin_bp = AdminController().blueprint
