from flask import Blueprint, request

from config import container
from middleware import require_auth, require_verified
from routes.base import BaseController
from services import UploadService


class UploadController(BaseController):
    def __init__(self):
        self.service = UploadService()
        self.blueprint = Blueprint("upload", __name__, url_prefix="/api/upload")
        self._register_routes()

    def _register_routes(self):
        self.blueprint.route("/image", methods=["POST"])(require_verified(self.upload_image))
        self.blueprint.route("/proof", methods=["POST"])(require_auth(self.upload_proof))
        self.blueprint.route("/video", methods=["POST"])(require_verified(self.upload_video))
        self.blueprint.route("/file", methods=["POST"])(require_verified(self.upload_file))

    def upload_image(self):
        return self.handle(self.service.upload_image, request.files.get("image"), request.user_id, container.storage)

    def upload_proof(self):
        return self.handle(self.service.upload_proof, request.files.get("proof"), request.user_id, container.storage)

    def upload_video(self):
        return self.handle(self.service.upload_video, request.files.get("video"), request.user_id, container.storage)

    def upload_file(self):
        return self.handle(self.service.upload_public_file, request.files.get("file"), request.user_id, container.storage)


upload_bp = UploadController().blueprint
