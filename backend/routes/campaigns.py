from flask import Blueprint, request

from middleware import require_auth, require_super_admin
from routes.base import BaseController
from services import CampaignsService


class CampaignsController(BaseController):
    def __init__(self):
        self.service = CampaignsService()
        self.blueprint = Blueprint("campaigns", __name__, url_prefix="/api/campaigns")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("", methods=["GET"])(require_auth(self.list_campaigns))
        self.blueprint.route("", methods=["POST"])(require_super_admin(self.create_campaign))
        self.blueprint.route("/<campaign_id>", methods=["PATCH"])(require_super_admin(self.update_campaign))
        self.blueprint.route("/<campaign_id>", methods=["DELETE"])(require_super_admin(self.delete_campaign))
        self.blueprint.route("/<campaign_id>/notify", methods=["POST"])(require_super_admin(self.notify_campaign))

    def list_campaigns(self):
        include_inactive = request.args.get("include_inactive") == "true"
        return self.handle(self.service.list_campaigns, request.user_id, include_inactive)

    def create_campaign(self):
        return self.handle(self.service.create_campaign, request.get_json() or {}, request.user_id)

    def update_campaign(self, campaign_id):
        return self.handle(self.service.update_campaign, campaign_id, request.get_json() or {}, request.user_id)

    def delete_campaign(self, campaign_id):
        return self.handle(self.service.delete_campaign, campaign_id)

    def notify_campaign(self, campaign_id):
        return self.handle(self.service.notify_campaign, campaign_id, request.user_id)


campaigns_bp = CampaignsController().blueprint
