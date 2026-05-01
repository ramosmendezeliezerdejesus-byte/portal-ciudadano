from flask import Blueprint, request

from middleware import require_auth, require_verified
from routes.base import BaseController
from services import ProposalsService


class ProposalsController(BaseController):
    def __init__(self):
        self.service = ProposalsService()
        self.blueprint = Blueprint("proposals", __name__, url_prefix="/api/proposals")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_proposals))
        self.blueprint.route("/<proposal_id>", methods=["GET"])(require_auth(self.get_proposal))
        self.blueprint.route("", methods=["POST"])(require_verified(self.create_proposal))
        self.blueprint.route("/<proposal_id>", methods=["DELETE"])(require_verified(self.delete_proposal))
        self.blueprint.route("/<proposal_id>/status", methods=["PATCH"])(require_verified(self.update_status))
        self.blueprint.route("/<proposal_id>/vote", methods=["POST"])(require_verified(self.toggle_vote))
        self.blueprint.route("/upload-evidence", methods=["POST"])(require_verified(self.upload_evidence))
        self.blueprint.route("/<proposal_id>/comments", methods=["GET"])(require_auth(self.get_comments))
        self.blueprint.route("/<proposal_id>/comments", methods=["POST"])(require_verified(self.create_comment))
        self.blueprint.route("/<proposal_id>/comments/<comment_id>", methods=["DELETE"])(require_verified(self.delete_comment))

    def get_proposals(self):
        status = request.args.get("status")
        category = request.args.get("category")
        page = int(request.args.get("page", 1))
        per_page = min(max(int(request.args.get("per_page", 10)), 1), 200)
        return self.handle(self.service.get_proposals, status, category, page, per_page, request.user_id)

    def get_proposal(self, proposal_id):
        return self.handle(self.service.get_proposal, proposal_id, request.user_id)

    def create_proposal(self):
        return self.handle(self.service.create_proposal, request.get_json() or {}, request.user_id)

    def delete_proposal(self, proposal_id):
        return self.handle(self.service.delete_proposal, proposal_id, request.user_id)

    def update_status(self, proposal_id):
        return self.handle(self.service.update_status, proposal_id, request.get_json() or {}, request.user_id)

    def toggle_vote(self, proposal_id):
        return self.handle(self.service.toggle_vote, proposal_id, request.user_id)

    def upload_evidence(self):
        return self.handle(self.service.upload_evidence, request.files.get("evidence"), request.user_id)

    def get_comments(self, proposal_id):
        return self.handle(self.service.get_comments, proposal_id)

    def create_comment(self, proposal_id):
        return self.handle(self.service.create_comment, proposal_id, request.get_json() or {}, request.user_id)

    def delete_comment(self, proposal_id, comment_id):
        return self.handle(self.service.delete_comment, comment_id, request.user_id)


proposals_bp = ProposalsController().blueprint
