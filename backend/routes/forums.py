from flask import Blueprint, request

from middleware import require_auth
from routes.base import BaseController
from services import ForumsService


class ForumsController(BaseController):
    def __init__(self):
        self.service = ForumsService()
        self.blueprint = Blueprint("forums", __name__, url_prefix="/api/forums")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.list_forums))
        self.blueprint.route("", methods=["POST"])(require_auth(self.create_forum))
        self.blueprint.route("/<forum_id>", methods=["GET"])(require_auth(self.get_forum))
        self.blueprint.route("/<forum_id>/threads", methods=["POST"])(require_auth(self.create_thread))
        self.blueprint.route("/threads/<thread_id>", methods=["GET"])(require_auth(self.get_thread))
        self.blueprint.route("/threads/<thread_id>/messages", methods=["POST"])(require_auth(self.create_message))

    def list_forums(self):
        return self.handle(self.service.list_forums, request.user_id)

    def create_forum(self):
        return self.handle(self.service.create_forum, request.get_json() or {}, request.user_id)

    def get_forum(self, forum_id):
        return self.handle(self.service.get_forum, forum_id, request.user_id)

    def create_thread(self, forum_id):
        return self.handle(self.service.create_thread, forum_id, request.get_json() or {}, request.user_id)

    def get_thread(self, thread_id):
        return self.handle(self.service.get_thread, thread_id, request.user_id)

    def create_message(self, thread_id):
        return self.handle(self.service.create_message, thread_id, request.get_json() or {}, request.user_id)


forums_bp = ForumsController().blueprint
