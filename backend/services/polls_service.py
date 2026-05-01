from datetime import datetime, timezone

from services.base import BaseService, NotFoundError, PermissionDeniedError, ValidationError


class PollsService(BaseService):
    def parse_iso_datetime(self, value):
        if not value:
            return None
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    def load_profiles(self, user_ids):
        ids = [user_id for user_id in set(user_ids) if user_id]
        if not ids:
            return {}
        result = (
            self.admin_client.table("profiles")
            .select("id, username, full_name, avatar_initials, role, verified")
            .in_("id", ids)
            .execute()
        )
        return {profile["id"]: profile for profile in (result.data or [])}

    def build_polls_payload(self, polls, current_user_id):
        if not polls:
            return []

        poll_ids = [poll["id"] for poll in polls]
        profiles_map = self.load_profiles([poll.get("user_id") for poll in polls])

        options_res = (
            self.admin_client.table("poll_options")
            .select("id, poll_id, text, position")
            .in_("poll_id", poll_ids)
            .order("position", desc=False)
            .execute()
        )
        votes_res = (
            self.admin_client.table("poll_votes")
            .select("id, poll_id, option_id, user_id")
            .in_("poll_id", poll_ids)
            .execute()
        )

        options_map = {}
        for option in options_res.data or []:
            options_map.setdefault(option["poll_id"], []).append(option)

        votes_map = {}
        for vote in votes_res.data or []:
            votes_map.setdefault(vote["poll_id"], []).append(vote)

        payload = []
        for poll in polls:
            poll_options = options_map.get(poll["id"], [])
            poll_votes = votes_map.get(poll["id"], [])
            total_votes = len(poll_votes)
            user_vote = next((vote["option_id"] for vote in poll_votes if vote["user_id"] == current_user_id), None)

            serialized_options = []
            for option in poll_options:
                option_votes = sum(1 for vote in poll_votes if vote["option_id"] == option["id"])
                serialized_options.append({
                    "id": option["id"],
                    "text": option["text"],
                    "position": option["position"],
                    "votes": option_votes,
                    "percent": round((option_votes / total_votes) * 100, 1) if total_votes else 0,
                })

            payload.append({
                "id": poll["id"],
                "question": poll["question"],
                "description": poll.get("description"),
                "ends_at": poll.get("ends_at"),
                "created_at": poll["created_at"],
                "author": profiles_map.get(poll.get("user_id")),
                "options": serialized_options,
                "total_votes": total_votes,
                "user_vote": user_vote,
            })
        return payload

    def get_poll_payload(self, poll_id, current_user_id):
        result = (
            self.admin_client.table("polls")
            .select("id, user_id, question, description, ends_at, created_at")
            .eq("id", poll_id)
            .single()
            .execute()
        )
        if not result.data:
            return None
        payload = self.build_polls_payload([result.data], current_user_id)
        return payload[0] if payload else None

    def get_polls(self, page, user_id):
        limit = 10
        offset = (page - 1) * limit
        result = (
            self.admin_client.table("polls")
            .select("id, user_id, question, description, ends_at, created_at")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return self.ok({"polls": self.build_polls_payload(result.data or [], user_id)})

    def create_poll(self, data, user_id):
        question = (data.get("question") or "").strip()
        description = (data.get("description") or "").strip() or None
        ends_at = data.get("ends_at") or None
        options = data.get("options") or []

        if not question:
            raise ValidationError("La pregunta es requerida")
        if len(question) > 300:
            raise ValidationError("La pregunta no puede superar 300 caracteres")
        if len(options) < 2:
            raise ValidationError("Debes agregar al menos 2 opciones")
        if len(options) > 10:
            raise ValidationError("Máximo 10 opciones permitidas")

        clean_options = [(option or "").strip() for option in options]
        if any(not option for option in clean_options):
            raise ValidationError("Las opciones no pueden estar vacías")
        if any(len(option) > 150 for option in clean_options):
            raise ValidationError("Cada opción tiene máximo 150 caracteres")

        if ends_at:
            try:
                ends_at_dt = self.parse_iso_datetime(ends_at)
            except ValueError:
                raise ValidationError("Fecha de cierre inválida")
            if ends_at_dt <= datetime.now(timezone.utc):
                raise ValidationError("La fecha de cierre debe estar en el futuro")

        poll_res = (
            self.admin_client.table("polls")
            .insert({"user_id": user_id, "question": question, "description": description, "ends_at": ends_at})
            .execute()
        )
        if not poll_res.data:
            raise ValidationError("No se pudo crear la encuesta", status_code=500)

        poll_id = poll_res.data[0]["id"]
        options_payload = [{"poll_id": poll_id, "text": option, "position": index} for index, option in enumerate(clean_options)]
        try:
            options_res = self.admin_client.table("poll_options").insert(options_payload).execute()
            if len(options_res.data or []) != len(options_payload):
                raise RuntimeError("No se guardaron todas las opciones")
        except Exception:
            self.admin_client.table("polls").delete().eq("id", poll_id).execute()
            raise ValidationError("No se pudieron guardar las opciones de la encuesta", status_code=500)

        payload = self.get_poll_payload(poll_id, user_id)
        if not payload:
            raise ValidationError("La encuesta fue creada pero no se pudo cargar", status_code=500)
        return self.ok({"poll": payload}, status_code=201)

    def delete_poll(self, poll_id, user_id):
        poll_res = (
            self.admin_client.table("polls")
            .select("id, user_id")
            .eq("id", poll_id)
            .single()
            .execute()
        )
        if not poll_res.data:
            raise NotFoundError("Encuesta no encontrada")

        profile_res = self.admin_client.table("profiles").select("role").eq("id", user_id).single().execute()
        role = profile_res.data.get("role") if profile_res.data else "user"
        is_owner = poll_res.data["user_id"] == user_id
        is_admin = role == "super_admin"
        if not (is_owner or is_admin):
            raise PermissionDeniedError("No tienes permiso para eliminar esta encuesta")

        self.admin_client.table("polls").delete().eq("id", poll_id).execute()
        return self.ok({"message": "Encuesta eliminada"})

    def vote_poll(self, poll_id, option_id, user_id):
        if not option_id:
            raise ValidationError("Debes seleccionar una opción")

        poll_res = self.admin_client.table("polls").select("id, ends_at").eq("id", poll_id).single().execute()
        if not poll_res.data:
            raise NotFoundError("Encuesta no encontrada")

        ends_at = poll_res.data.get("ends_at")
        if ends_at and datetime.now(timezone.utc) > self.parse_iso_datetime(ends_at):
            raise ValidationError("Esta encuesta ya cerró")

        option_res = (
            self.admin_client.table("poll_options")
            .select("id")
            .eq("id", option_id)
            .eq("poll_id", poll_id)
            .single()
            .execute()
        )
        if not option_res.data:
            raise ValidationError("Opción inválida")

        existing_vote = (
            self.admin_client.table("poll_votes")
            .select("id")
            .eq("poll_id", poll_id)
            .eq("user_id", user_id)
            .execute()
        )
        if existing_vote.data:
            raise ValidationError("Ya votaste en esta encuesta", status_code=409, payload={"code": "ALREADY_VOTED"})

        self.admin_client.table("poll_votes").insert({"poll_id": poll_id, "option_id": option_id, "user_id": user_id}).execute()
        return self.ok({"message": "Voto registrado", "poll": self.get_poll_payload(poll_id, user_id)})

    def remove_vote(self, poll_id, user_id):
        self.admin_client.table("poll_votes").delete().eq("poll_id", poll_id).eq("user_id", user_id).execute()
        return self.ok({"message": "Voto eliminado"})
