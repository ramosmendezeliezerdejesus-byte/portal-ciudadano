from flask import Blueprint, request

from middleware import require_auth
from routes.base import BaseController
from services import NotificationsService


class NotificationsController(BaseController):
    def __init__(self):
        self.service = NotificationsService()
        self.blueprint = Blueprint("notifications", __name__, url_prefix="/api/notifications")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_notifications))
        self.blueprint.route("/unread-count", methods=["GET"])(require_auth(self.get_unread_count))
        self.blueprint.route("/read-all", methods=["POST"])(require_auth(self.mark_all_as_read))

    def get_notifications(self):
        return self.handle(self.service.get_notifications, request.user_id)

    def get_unread_count(self):
        return self.handle(self.service.get_unread_count, request.user_id)

    def mark_all_as_read(self):
        return self.handle(self.service.mark_all_as_read, request.user_id)


notifications_bp = NotificationsController().blueprint
