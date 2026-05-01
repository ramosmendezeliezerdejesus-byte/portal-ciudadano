from flask import Blueprint, request

from middleware import require_auth, require_verified
from routes.base import BaseController
from services import ProfilesService


class ProfilesController(BaseController):
    def __init__(self):
        self.service = ProfilesService()
        self.blueprint = Blueprint("profiles", __name__, url_prefix="/api/profiles")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("/me/community", methods=["PATCH"])(require_auth(self.update_my_community))
        self.blueprint.route("/me/preferences", methods=["PATCH"])(require_auth(self.update_my_preferences))
        self.blueprint.route("/<username>", methods=["GET"])(require_auth(self.get_profile))
        self.blueprint.route("/<username>/follow", methods=["POST"])(require_verified(self.toggle_follow))
        self.blueprint.route("/<username>/followers", methods=["GET"])(require_auth(self.get_followers))
        self.blueprint.route("/<username>/following", methods=["GET"])(require_auth(self.get_following))

    def update_my_community(self):
        return self.handle(self.service.update_my_community, request.get_json() or {}, request.user_id)

    def update_my_preferences(self):
        return self.handle(self.service.update_my_preferences, request.get_json() or {}, request.user_id)

    def get_profile(self, username):
        return self.handle(self.service.get_profile, username, request.user_id)

    def toggle_follow(self, username):
        return self.handle(self.service.toggle_follow, username, request.user_id)

    def get_followers(self, username):
        return self.handle(self.service.get_followers, username)

    def get_following(self, username):
        return self.handle(self.service.get_following, username)


profiles_bp = ProfilesController().blueprint
