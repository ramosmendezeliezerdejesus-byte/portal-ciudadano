from flask import Blueprint, request

from middleware import require_auth, require_verified
from routes.base import BaseController
from services import ReportsService


class ReportsController(BaseController):
    def __init__(self):
        self.service = ReportsService()
        self.blueprint = Blueprint("reports", __name__, url_prefix="/api/denuncias")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_reports))
        self.blueprint.route("/<report_id>", methods=["GET"])(require_auth(self.get_report))
        self.blueprint.route("", methods=["POST"])(require_verified(self.create_report))
        self.blueprint.route("/<report_id>", methods=["DELETE"])(require_verified(self.delete_report))
        self.blueprint.route("/<report_id>/status", methods=["PATCH"])(require_verified(self.update_status))
        self.blueprint.route("/<report_id>/vote", methods=["POST"])(require_verified(self.toggle_vote))
        self.blueprint.route("/upload-evidence", methods=["POST"])(require_verified(self.upload_evidence))
        self.blueprint.route("/<report_id>/comments", methods=["GET"])(require_auth(self.get_comments))
        self.blueprint.route("/<report_id>/comments", methods=["POST"])(require_verified(self.create_comment))
        self.blueprint.route("/<report_id>/comments/<comment_id>", methods=["DELETE"])(require_verified(self.delete_comment))

    def get_reports(self):
        status = request.args.get("status")
        category = request.args.get("category")
        page = int(request.args.get("page", 1))
        per_page = min(max(int(request.args.get("per_page", 10)), 1), 200)
        return self.handle(self.service.get_reports, status, category, page, per_page, request.user_id)

    def get_report(self, report_id):
        return self.handle(self.service.get_report, report_id, request.user_id)

    def create_report(self):
        return self.handle(self.service.create_report, request.get_json() or {}, request.user_id)

    def delete_report(self, report_id):
        return self.handle(self.service.delete_report, report_id, request.user_id)

    def update_status(self, report_id):
        return self.handle(self.service.update_status, report_id, request.get_json() or {}, request.user_id)

    def toggle_vote(self, report_id):
        return self.handle(self.service.toggle_vote, report_id, request.user_id)

    def upload_evidence(self):
        return self.handle(self.service.upload_evidence, request.files.get("evidence"), request.user_id)

    def get_comments(self, report_id):
        return self.handle(self.service.get_comments, report_id)

    def create_comment(self, report_id):
        return self.handle(self.service.create_comment, report_id, request.get_json() or {}, request.user_id)

    def delete_comment(self, report_id, comment_id):
        return self.handle(self.service.delete_comment, comment_id, request.user_id)


reports_bp = ReportsController().blueprint
