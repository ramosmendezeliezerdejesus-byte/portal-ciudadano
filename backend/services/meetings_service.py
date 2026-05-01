from helpers import meeting_data_service
from moderation import moderation_service
from services.base import BaseService, NotFoundError, PermissionDeniedError, ValidationError
from services.notifications_service import NotificationsService
from topic_utils import topics_for_content


class MeetingsService(BaseService):
    allowed_roles = {"diputado", "presidente_junta", "super_admin"}
    valid_categories = {"general", "presupuesto", "transporte", "seguridad", "ambiente", "educacion"}

    def __init__(self, public_client=None, admin_client=None):
        super().__init__(public_client=public_client, admin_client=admin_client)
        self.notifications = NotificationsService(
            public_client=self.public_client,
            admin_client=self.admin_client,
        )

    def get_meetings(self):
        meetings = (
            self.public_client.table("meetings")
            .select("*")
            .order("date", desc=False)
            .execute()
        )
        return self.ok({"meetings": meeting_data_service.attach_profiles_and_rsvp(meetings.data or [])})

    def create_meeting(self, data, user_id):
        profile = self.admin_client.table("profiles").select("role, full_name, community, community_key").eq("id", user_id).single().execute()
        user_role = profile.data.get("role", "user") if profile.data else "user"
        if user_role not in self.allowed_roles:
            raise PermissionDeniedError("Solo diputados y presidentes de junta pueden convocar reuniones")

        title = (data.get("title") or "").strip()
        date = (data.get("date") or "").strip()
        time = (data.get("time") or "").strip()
        location = (data.get("location") or "").strip()
        description = (data.get("description") or "").strip()
        category = (data.get("category") or "general").strip()
        duration_minutes = data.get("duration_minutes", 60)
        agenda = (data.get("agenda") or "").strip()

        if not all([title, date, time, location]):
            raise ValidationError("Título, fecha, hora y lugar son requeridos")
        if len(title) > 150:
            raise ValidationError("El título no puede superar 150 caracteres")
        if len(description) > 600:
            raise ValidationError("La descripción no puede superar 600 caracteres")
        for field in [title, description, location, agenda]:
            if field and moderation_service.contains_profanity(field):
                raise ValidationError("El contenido tiene lenguaje inapropiado. Mantén un tono respetuoso.")

        if category not in self.valid_categories:
            category = "general"

        insert_res = self.public_client.table("meetings").insert({
            "user_id": user_id,
            "title": title,
            "date": date,
            "time": time,
            "location": location,
            "description": description or None,
            "category": category,
            "duration_minutes": duration_minutes,
            "agenda": agenda or None,
        }).execute()
        enriched = meeting_data_service.attach_profiles_and_rsvp([insert_res.data[0]])
        author = profile.data or {}
        self.notifications.create_zone_topic_notifications(
            actor_id=user_id,
            topic_keys=topics_for_content("meeting", category),
            community_key=author.get("community_key"),
            title=f"Nueva reunion en {author.get('community') or 'tu zona'}",
            message=f"{author.get('full_name', 'Portal Ciudadano')} publico una reunion: {title}.",
            notification_type="meeting",
            entity_type="meeting",
            entity_id=insert_res.data[0]["id"],
        )
        return self.ok({"meeting": enriched[0]}, status_code=201)

    def delete_meeting(self, meeting_id, user_id):
        meeting = self.public_client.table("meetings").select("user_id").eq("id", meeting_id).single().execute()
        if not meeting.data:
            raise NotFoundError("Reunión no encontrada")
        if meeting.data["user_id"] != user_id:
            raise PermissionDeniedError("No tienes permiso para eliminar esta reunión")
        self.public_client.table("meeting_rsvp").delete().eq("meeting_id", meeting_id).execute()
        self.public_client.table("meetings").delete().eq("id", meeting_id).execute()
        return self.ok({"message": "Reunión eliminada"})

    def toggle_rsvp(self, meeting_id, user_id):
        existing = (
            self.public_client.table("meeting_rsvp").select("id")
            .eq("meeting_id", meeting_id).eq("user_id", user_id).execute()
        )
        if existing.data:
            self.public_client.table("meeting_rsvp").delete().eq("meeting_id", meeting_id).eq("user_id", user_id).execute()
            attending = False
        else:
            self.public_client.table("meeting_rsvp").insert({"meeting_id": meeting_id, "user_id": user_id}).execute()
            attending = True
        count = self.public_client.table("meeting_rsvp").select("id", count="exact").eq("meeting_id", meeting_id).execute()
        return self.ok({"attending": attending, "count": count.count})
