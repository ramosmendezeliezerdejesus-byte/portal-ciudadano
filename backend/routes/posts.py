from flask import Blueprint, request

from config import container
from middleware import require_auth, require_verified
from routes.base import BaseController
from services import PostsService


class PostsController(BaseController):
    def __init__(self):
        self.service = PostsService()
        self.blueprint = Blueprint("posts", __name__, url_prefix="/api/posts")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_posts))
        self.blueprint.route("/saved", methods=["GET"])(require_auth(self.get_saved_posts))
        self.blueprint.route("/trending", methods=["GET"])(require_auth(self.get_trending_hashtags))
        self.blueprint.route("/hashtag/<tag>", methods=["GET"])(require_auth(self.get_posts_by_hashtag))
        self.blueprint.route("", methods=["POST"])(require_verified(self.create_post))
        self.blueprint.route("/<post_id>", methods=["DELETE"])(require_verified(self.delete_post))
        self.blueprint.route("/<post_id>/like", methods=["POST"])(require_verified(self.toggle_like))
        self.blueprint.route("/<post_id>/repost", methods=["POST"])(require_verified(self.toggle_repost))
        self.blueprint.route("/<post_id>/save", methods=["POST"])(require_auth(self.toggle_save))

    def get_posts(self):
        return self.handle(self.service.get_posts, request.user_id)

    def get_saved_posts(self):
        return self.handle(self.service.get_saved_posts, request.user_id)

    def get_trending_hashtags(self):
        return self.handle(self.service.get_trending_hashtags)

    def get_posts_by_hashtag(self, tag):
        return self.handle(self.service.get_posts_by_hashtag, tag, request.user_id)

    def create_post(self):
        return self.handle(self.service.create_post, request.get_json() or {}, request.user_id)

    def delete_post(self, post_id):
        return self.handle(self.service.delete_post, post_id, request.user_id, container.storage.storage_bucket)

    def toggle_like(self, post_id):
        return self.handle(self.service.toggle_like, post_id, request.user_id)

    def toggle_repost(self, post_id):
        return self.handle(self.service.toggle_repost, post_id, request.user_id)

    def toggle_save(self, post_id):
        return self.handle(self.service.toggle_save, post_id, request.user_id)


posts_bp = PostsController().blueprint
