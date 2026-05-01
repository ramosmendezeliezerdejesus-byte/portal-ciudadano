from flask import Blueprint, request

from middleware import require_auth, require_verified
from routes.base import BaseController
from services import MeetingsService


class MeetingsController(BaseController):
    def __init__(self):
        self.service = MeetingsService()
        self.blueprint = Blueprint("meetings", __name__, url_prefix="/api/meetings")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.get_meetings))
        self.blueprint.route("", methods=["POST"])(require_verified(self.create_meeting))
        self.blueprint.route("/<meeting_id>", methods=["DELETE"])(require_verified(self.delete_meeting))
        self.blueprint.route("/<meeting_id>/rsvp", methods=["POST"])(require_verified(self.toggle_rsvp))

    def get_meetings(self):
        return self.handle(self.service.get_meetings)

    def create_meeting(self):
        return self.handle(self.service.create_meeting, request.get_json() or {}, request.user_id)

    def delete_meeting(self, meeting_id):
        return self.handle(self.service.delete_meeting, meeting_id, request.user_id)

    def toggle_rsvp(self, meeting_id):
        return self.handle(self.service.toggle_rsvp, meeting_id, request.user_id)


meetings_bp = MeetingsController().blueprint
