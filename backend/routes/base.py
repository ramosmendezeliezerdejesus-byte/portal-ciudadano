from flask import jsonify

from services.base import AppError


class BaseController:
    @staticmethod
    def _respond(result):
        return jsonify(result.payload), result.status_code

    def handle(self, action, *args, **kwargs):
        try:
            return self._respond(action(*args, **kwargs))
        except AppError as error:
            payload, status_code = error.to_response()
            return jsonify(payload), status_code
        except Exception as error:
            return jsonify({"error": str(error)}), 500
