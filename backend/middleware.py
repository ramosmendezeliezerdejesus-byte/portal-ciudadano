from functools import wraps

from flask import jsonify, request

from config import supabase, supabase_admin


class AuthorizationMiddleware:
    def __init__(self, public_client, admin_client):
        self.public_client = public_client
        self.admin_client = admin_client

    @staticmethod
    def _extract_token():
        return request.headers.get("Authorization", "").replace("Bearer ", "")

    @staticmethod
    def _attach_user_context(user_id, email_verified=False):
        request.user_id = user_id
        request.email_verified = email_verified

    def require_auth(self, func):
        @wraps(func)
        def decorated(*args, **kwargs):
            token = self._extract_token()
            if not token:
                return jsonify({"error": "Token requerido"}), 401
            try:
                user = self.public_client.auth.get_user(token)
                self._attach_user_context(user.user.id, bool(user.user.email_confirmed_at))
            except Exception:
                return jsonify({"error": "Token inválido o expirado"}), 401
            return func(*args, **kwargs)

        return decorated

    def require_verified(self, func):
        @wraps(func)
        def decorated(*args, **kwargs):
            token = self._extract_token()
            if not token:
                return jsonify({"error": "Token requerido"}), 401
            try:
                user = self.public_client.auth.get_user(token)
                if not user.user.email_confirmed_at:
                    return jsonify({
                        "error": "Debes verificar tu correo electrónico para realizar esta acción.",
                        "code": "EMAIL_NOT_VERIFIED",
                    }), 403
                self._attach_user_context(user.user.id, True)
            except Exception:
                return jsonify({"error": "Token inválido o expirado"}), 401
            return func(*args, **kwargs)

        return decorated

    def require_super_admin(self, func):
        @wraps(func)
        def decorated(*args, **kwargs):
            token = self._extract_token()
            if not token:
                return jsonify({"error": "Token requerido"}), 401
            try:
                user_obj = self.public_client.auth.get_user(token)
                user_id = user_obj.user.id
                profile = self.admin_client.table("profiles").select("role").eq("id", user_id).single().execute()
                if profile.data.get("role") != "super_admin":
                    return jsonify({"error": "Acceso denegado"}), 403
                self._attach_user_context(user_id)
            except Exception:
                return jsonify({"error": "Token inválido o sin permisos"}), 401
            return func(*args, **kwargs)

        return decorated


authorization_middleware = AuthorizationMiddleware(supabase, supabase_admin)

require_auth = authorization_middleware.require_auth
require_verified = authorization_middleware.require_verified
require_super_admin = authorization_middleware.require_super_admin
