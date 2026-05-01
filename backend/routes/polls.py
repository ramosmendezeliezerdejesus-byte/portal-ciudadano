from flask import Blueprint, request

from middleware import require_auth
from routes.base import BaseController
from services import PollsService


class PollsController(BaseController):
    def __init__(self):
        self.service = PollsService()
        self.blueprint = Blueprint("polls", __name__, url_prefix="/api/polls")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_polls))
        self.blueprint.route("", methods=["POST"])(require_auth(self.create_poll))
        self.blueprint.route("/<poll_id>", methods=["DELETE"])(require_auth(self.delete_poll))
        self.blueprint.route("/<poll_id>/vote", methods=["POST"])(require_auth(self.vote_poll))
        self.blueprint.route("/<poll_id>/vote", methods=["DELETE"])(require_auth(self.remove_vote))

    def get_polls(self):
        page = int(request.args.get("page", 1))
        return self.handle(self.service.get_polls, page, request.user_id)

    def create_poll(self):
        return self.handle(self.service.create_poll, request.get_json() or {}, request.user_id)

    def delete_poll(self, poll_id):
        return self.handle(self.service.delete_poll, poll_id, request.user_id)

    def vote_poll(self, poll_id):
        data = request.get_json() or {}
        return self.handle(self.service.vote_poll, poll_id, data.get("option_id"), request.user_id)

    def remove_vote(self, poll_id):
        return self.handle(self.service.remove_vote, poll_id, request.user_id)


polls_bp = PollsController().blueprint
