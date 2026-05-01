from flask import Blueprint, request

from middleware import require_auth, require_verified
from routes.base import BaseController
from services import CommentsService


class CommentsController(BaseController):
    def __init__(self):
        self.service = CommentsService()
        self.blueprint = Blueprint("comments", __name__, url_prefix="/api/posts")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("/<post_id>/comments", methods=["GET"])(require_auth(self.get_comments))
        self.blueprint.route("/<post_id>/comments", methods=["POST"])(require_verified(self.create_comment))
        self.blueprint.route("/<post_id>/comments/<comment_id>", methods=["DELETE"])(require_verified(self.delete_comment))

    def get_comments(self, post_id):
        return self.handle(self.service.get_comments, post_id)

    def create_comment(self, post_id):
        return self.handle(self.service.create_comment, post_id, request.get_json() or {}, request.user_id)

    def delete_comment(self, post_id, comment_id):
        return self.handle(self.service.delete_comment, post_id, comment_id, request.user_id)


comments_bp = CommentsController().blueprint
