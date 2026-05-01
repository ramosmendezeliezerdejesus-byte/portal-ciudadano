from moderation import moderation_service
from services.notifications_service import NotificationsService
from services.base import BaseService, NotFoundError, PermissionDeniedError, ValidationError


class CommentsService(BaseService):
    def __init__(self, public_client=None, admin_client=None):
        super().__init__(public_client=public_client, admin_client=admin_client)
        self.notifications = NotificationsService(
            public_client=self.public_client,
            admin_client=self.admin_client,
        )

    def get_comments(self, post_id):
        result = (
            self.public_client.table("comments")
            .select("*, profiles(username, full_name, avatar_initials, role, verified)")
            .eq("post_id", post_id)
            .order("created_at", desc=False)
            .execute()
        )
        return self.ok({"comments": result.data or []})

    def create_comment(self, post_id, data, user_id):
        content = (data.get("content") or "").strip()
        if not content:
            raise ValidationError("El comentario no puede estar vacío")
        if len(content) > 300:
            raise ValidationError("Máximo 300 caracteres")
        if moderation_service.contains_profanity(content):
            raise ValidationError("Tu comentario contiene lenguaje inapropiado.")

        result = self.public_client.table("comments").insert({
            "post_id": post_id,
            "user_id": user_id,
            "content": content,
        }).execute()
        comment = result.data[0]
        self.notifications.create_post_notification(user_id, post_id, "comment", comment_text=content)
        profile = (
            self.admin_client.table("profiles")
            .select("username, full_name, avatar_initials, role, verified")
            .eq("id", user_id)
            .single()
            .execute()
        )
        comment["profiles"] = profile.data
        return self.ok({"comment": comment}, status_code=201)

    def delete_comment(self, post_id, comment_id, user_id):
        comment = (
            self.public_client.table("comments")
            .select("user_id")
            .eq("id", comment_id)
            .eq("post_id", post_id)
            .single()
            .execute()
        )
        if not comment.data:
            raise NotFoundError("Comentario no encontrado")
        if comment.data["user_id"] != user_id:
            raise PermissionDeniedError("No tienes permiso para eliminar este comentario")
        self.public_client.table("comments").delete().eq("id", comment_id).execute()
        return self.ok({"message": "Comentario eliminado"})
