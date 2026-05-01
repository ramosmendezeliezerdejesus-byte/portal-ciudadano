from flask import Flask
from flask_cors import CORS

from routes.admin import admin_bp
from routes.auth import auth_bp
from routes.biblioteca import biblioteca_bp
from routes.campaigns import campaigns_bp
from routes.comments import comments_bp
from routes.forums import forums_bp
from routes.meetings import meetings_bp
from routes.notifications import notifications_bp
from routes.polls import polls_bp
from routes.posts import posts_bp
from routes.profiles import profiles_bp
from routes.proposals import proposals_bp
from routes.reports import reports_bp
from routes.service_requests import service_requests_bp
from routes.upload import upload_bp
from routes.verification import verification_bp


class BackendApplication:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app, origins=["http://localhost:3000"])
        self._register_blueprints()

    def _register_blueprints(self):
        for blueprint in [
            auth_bp,
            upload_bp,
            posts_bp,
            comments_bp,
            forums_bp,
            meetings_bp,
            notifications_bp,
            proposals_bp,
            reports_bp,
            service_requests_bp,
            profiles_bp,
            biblioteca_bp,
            campaigns_bp,
            verification_bp,
            admin_bp,
            polls_bp,
        ]:
            self.app.register_blueprint(blueprint)

    def create_app(self):
        return self.app


application = BackendApplication()
app = application.create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
