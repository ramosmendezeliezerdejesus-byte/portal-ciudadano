from dataclasses import dataclass

from config import supabase, supabase_admin


@dataclass
class ServiceResult:
    payload: dict
    status_code: int = 200


class AppError(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code or self.status_code
        self.payload = payload or {}

    def to_response(self):
        return {"error": self.message, **self.payload}, self.status_code


class ValidationError(AppError):
    status_code = 400


class UnauthorizedError(AppError):
    status_code = 401


class PermissionDeniedError(AppError):
    status_code = 403


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class BaseService:
    def __init__(self, public_client=None, admin_client=None):
        self.public_client = public_client or supabase
        self.admin_client = admin_client or supabase_admin

    @staticmethod
    def ok(payload, status_code=200):
        return ServiceResult(payload=payload, status_code=status_code)
