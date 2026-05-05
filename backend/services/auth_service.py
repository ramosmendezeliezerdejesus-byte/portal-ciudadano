import re
import time
import unicodedata

from services.base import BaseService, ConflictError, ServiceResult, ValidationError


class AuthService(BaseService):
    @staticmethod
    def _build_avatar_initials(full_name, email):
        words = [word[0].upper() for word in full_name.split() if word]
        if words:
            return "".join(words[:2])
        fallback = (email or "US").strip().upper()
        return fallback[:2] or "US"

    @staticmethod
    def _normalize_community_key(value):
        normalized = unicodedata.normalize("NFKD", value or "")
        ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
        ascii_only = ascii_only.lower().strip()
        ascii_only = re.sub(r"[^a-z0-9]+", "-", ascii_only)
        return ascii_only.strip("-")

    @classmethod
    def _normalize_community(cls, value):
        community = " ".join((value or "").strip().split())
        community_key = cls._normalize_community_key(community)
        if not community_key:
            raise ValidationError("La comunidad es requerida")
        return {
            "community": community.title(),
            "community_key": community_key,
        }

    def _find_auth_user_by_email(self, email):
        page = 1
        per_page = 100

        while True:
            users = self.admin_client.auth.admin.list_users(page=page, per_page=per_page)
            if not users:
                return None

            for user in users:
                if (getattr(user, "email", "") or "").strip().lower() == email:
                    return user

            if len(users) < per_page:
                return None
            page += 1

    def _confirm_email(self, email=None, user_id=None):
        auth_user = self.admin_client.auth.admin.get_user_by_id(user_id).user if user_id else self._find_auth_user_by_email(email)
        if not auth_user:
            return None
        if not getattr(auth_user, "email_confirmed_at", None):
            auth_user = self.admin_client.auth.admin.update_user_by_id(
                auth_user.id,
                {"email_confirm": True},
            ).user
        return auth_user

    @staticmethod
    def _normalize_requested_role(value):
        requested_role = (value or "user").strip()
        return requested_role if requested_role in ("diputado", "presidente_junta") else "user"

    @staticmethod
    def _is_missing_requested_role_column(error):
        message = str(error)
        return "requested_role" in message and ("PGRST204" in message or "schema cache" in message)

    def _profile_with_requested_role(self, profile_data, user_metadata=None):
        profile = dict(profile_data or {})
        if "requested_role" not in profile:
            profile["requested_role"] = self._normalize_requested_role((user_metadata or {}).get("requested_role"))
        return profile

    def _build_profile_payload(self, user_id, email, username, full_name, community, address_reference=None, requested_role="user"):
        normalized_community = self._normalize_community(community)
        return {
            "id": user_id,
            "email": email,
            "username": username,
            "full_name": full_name,
            "avatar_initials": self._build_avatar_initials(full_name, email),
            "community": normalized_community["community"],
            "community_key": normalized_community["community_key"],
            "address_reference": (address_reference or "").strip() or None,
            "requested_role": self._normalize_requested_role(requested_role),
        }

    def _ensure_profile(self, user_id, email, username, full_name, community, address_reference=None, requested_role="user"):
        profile_payload = self._build_profile_payload(
            user_id,
            email,
            username,
            full_name,
            community,
            address_reference,
            requested_role,
        )
        try:
            self.admin_client.table("profiles").upsert(profile_payload).execute()
        except Exception as error:
            if not self._is_missing_requested_role_column(error):
                raise
            fallback_payload = dict(profile_payload)
            fallback_payload.pop("requested_role", None)
            self.admin_client.table("profiles").upsert(fallback_payload).execute()
        return profile_payload

    def register(self, data) -> ServiceResult:
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        username = (data.get("username") or "").strip()
        full_name = (data.get("full_name") or "").strip()
        community = (data.get("community") or "").strip()
        address_reference = (data.get("address_reference") or "").strip()
        requested_role = self._normalize_requested_role(data.get("requested_role"))

        if not all([email, password, username, full_name, community]):
            raise ValidationError("Todos los campos obligatorios son requeridos")
        if len(password) < 6:
            raise ValidationError("La contrasena debe tener al menos 6 caracteres")
        if self._find_auth_user_by_email(email):
            raise ConflictError("Este email ya esta registrado")

        existing_username = (
            self.admin_client.table("profiles")
            .select("id")
            .eq("username", username)
            .limit(1)
            .execute()
        )
        if existing_username.data:
            raise ConflictError("Este nombre de usuario ya esta en uso")

        normalized_community = self._normalize_community(community)

        try:
            response = self.public_client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "username": username,
                        "full_name": full_name,
                        "community": normalized_community["community"],
                        "community_key": normalized_community["community_key"],
                        "address_reference": address_reference or None,
                        "requested_role": requested_role,
                    },
                },
            })
        except Exception as error:
            message = str(error)
            if "already registered" in message or "already exists" in message:
                raise ConflictError("Este email ya esta registrado")
            raise

        if not response.user:
            raise ValidationError("No se pudo crear la cuenta")

        auth_user = self.admin_client.auth.admin.get_user_by_id(response.user.id).user
        if not auth_user:
            raise ValidationError("No se pudo completar el registro del usuario")
        self._confirm_email(user_id=response.user.id)

        time.sleep(0.8)
        try:
            self._ensure_profile(
                response.user.id,
                email,
                username,
                full_name,
                normalized_community["community"],
                address_reference,
                requested_role,
            )
        except Exception as error:
            try:
                self.admin_client.auth.admin.delete_user(response.user.id)
            except Exception:
                pass
            raise ValidationError(f"No se pudo guardar el perfil del usuario: {error}")

        return self.ok({
            "message": "Registro exitoso. Ya puedes iniciar sesion.",
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "username": username,
                "full_name": full_name,
                "community": normalized_community["community"],
                "address_reference": address_reference or None,
                "requested_role": requested_role,
            },
        }, status_code=201)

    def login(self, data) -> ServiceResult:
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        if not email or not password:
            raise ValidationError("Email y contrasena son requeridos")

        try:
            response = self.public_client.auth.sign_in_with_password({"email": email, "password": password})
        except Exception as error:
            message = str(error).lower()
            if any(token in message for token in ["email not confirmed", "email_not_confirmed", "not confirmed", "confirmation"]):
                try:
                    self._confirm_email(email=email)
                    response = self.public_client.auth.sign_in_with_password({"email": email, "password": password})
                except Exception:
                    raise ValidationError(
                        "Debes verificar tu correo antes de iniciar sesion.",
                        status_code=401,
                        payload={"code": "EMAIL_NOT_VERIFIED"},
                    )
            else:
                raise ValidationError("Email o contrasena incorrectos", status_code=401)

        if not (response.user and response.session):
            raise ValidationError("Credenciales incorrectas", status_code=401)

        try:
            profile = self.public_client.table("profiles").select("*").eq("id", response.user.id).single().execute()
        except Exception:
            auth_user = self.admin_client.auth.admin.get_user_by_id(response.user.id).user
            user_metadata = auth_user.user_metadata or {}
            fallback_email = (response.user.email or "").strip().lower()
            fallback_community = (user_metadata.get("community") or "").strip() or "Comunidad pendiente"
            self._ensure_profile(
                response.user.id,
                fallback_email,
                (user_metadata.get("username") or "").strip() or email.split("@", 1)[0],
                (user_metadata.get("full_name") or "").strip() or email.split("@", 1)[0],
                fallback_community,
                (user_metadata.get("address_reference") or "").strip() or None,
                user_metadata.get("requested_role"),
            )
            profile = self.public_client.table("profiles").select("*").eq("id", response.user.id).single().execute()

        user_metadata = response.user.user_metadata or {}
        profile_data = self._profile_with_requested_role(profile.data, user_metadata)

        return self.ok({
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "email_verified": bool(response.user.email_confirmed_at),
                **profile_data,
            },
        })

    def refresh(self, data) -> ServiceResult:
        refresh_token = (data.get("refresh_token") or "").strip()
        if not refresh_token:
            raise ValidationError("Refresh token requerido", status_code=401)

        try:
            response = self.public_client.auth.refresh_session(refresh_token)
        except Exception:
            raise ValidationError("No se pudo renovar la sesion", status_code=401)

        if not (response.user and response.session):
            raise ValidationError("No se pudo renovar la sesion", status_code=401)

        try:
            profile = self.public_client.table("profiles").select("*").eq("id", response.user.id).single().execute()
        except Exception:
            auth_user = self.admin_client.auth.admin.get_user_by_id(response.user.id).user
            user_metadata = auth_user.user_metadata or {}
            email = (response.user.email or "").strip().lower()
            self._ensure_profile(
                response.user.id,
                email,
                (user_metadata.get("username") or "").strip() or email.split("@", 1)[0],
                (user_metadata.get("full_name") or "").strip() or email.split("@", 1)[0],
                (user_metadata.get("community") or "").strip() or "Comunidad pendiente",
                (user_metadata.get("address_reference") or "").strip() or None,
                user_metadata.get("requested_role"),
            )
            profile = self.public_client.table("profiles").select("*").eq("id", response.user.id).single().execute()

        user_metadata = response.user.user_metadata or {}
        profile_data = self._profile_with_requested_role(profile.data, user_metadata)

        return self.ok({
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "email_verified": bool(response.user.email_confirmed_at),
                **profile_data,
            },
        })

    def resend_verification(self, data) -> ServiceResult:
        email = (data.get("email") or "").strip().lower()
        if not email:
            raise ValidationError("Email requerido")
        self.public_client.auth.resend({"type": "signup", "email": email})
        return self.ok({"message": "Correo de verificacion reenviado"})

    def logout(self) -> ServiceResult:
        self.public_client.auth.sign_out()
        return self.ok({"message": "Sesion cerrada"})

    def me(self, token, user_id) -> ServiceResult:
        user = self.public_client.auth.get_user(token)
        profile = self.public_client.table("profiles").select("*").eq("id", user_id).single().execute()
        user_metadata = user.user.user_metadata or {}
        profile_data = self._profile_with_requested_role(profile.data, user_metadata)
        return self.ok({"user": {**profile_data, "email_verified": bool(user.user.email_confirmed_at)}})
