from services.base import BaseService
from topic_utils import normalize_topic_keys


class NotificationsService(BaseService):
    base_notification_types = {"like", "comment", "repost", "save", "proposal", "meeting", "system"}

    def _get_actor_profile(self, actor_id):
        profile = (
            self.admin_client.table("profiles")
            .select("full_name, username, avatar_initials")
            .eq("id", actor_id)
            .single()
            .execute()
        )
        return profile.data or {}

    def _get_post_owner(self, post_id):
        post = (
            self.admin_client.table("posts")
            .select("id, user_id, content")
            .eq("id", post_id)
            .single()
            .execute()
        )
        return post.data or None

    @staticmethod
    def _truncate(text, limit=80):
        value = " ".join(str(text or "").split())
        if len(value) <= limit:
            return value
        return value[: limit - 3].rstrip() + "..."

    def create_post_notification(self, actor_id, post_id, notification_type, comment_text=None):
        post = self._get_post_owner(post_id)
        if not post:
            return

        owner_id = post.get("user_id")
        if not owner_id or owner_id == actor_id:
            return

        actor = self._get_actor_profile(actor_id)
        actor_name = actor.get("full_name") or actor.get("username") or "Alguien"
        actor_initials = actor.get("avatar_initials") or "US"
        post_excerpt = self._truncate(post.get("content"), limit=90)

        config = {
            "like": {
                "title": "Nuevo like",
                "message": f"{actor_name} le dio like a tu publicacion.",
            },
            "comment": {
                "title": "Nuevo comentario",
                "message": f"{actor_name} comento en tu publicacion: \"{self._truncate(comment_text, limit=100)}\"",
            },
            "repost": {
                "title": "Nuevo repost",
                "message": f"{actor_name} reposteo tu publicacion.",
            },
            "save": {
                "title": "Post guardado",
                "message": f"{actor_name} guardo tu publicacion.",
            },
        }

        payload = config.get(notification_type)
        if not payload:
            return

        self.admin_client.table("notifications").insert({
            "user_id": owner_id,
            "title": payload["title"],
            "message": payload["message"],
            "type": notification_type,
            "actor_name": actor_name,
            "actor_initials": actor_initials,
            "post_id": post_id,
            "post_excerpt": post_excerpt,
        }).execute()

    def create_zone_topic_notifications(self, actor_id, topic_keys, community_key, title, message, notification_type, entity_type=None, entity_id=None):
        normalized_topics = normalize_topic_keys(topic_keys)
        if not normalized_topics:
            return

        try:
            query = self.admin_client.table("profiles").select(
                "id, notification_topics, notification_zone_enabled, notification_topics_onboarding_done"
            )
            if community_key:
                query = query.eq("community_key", community_key)
            recipients = query.execute().data or []
        except Exception:
            return

        rows = []
        for recipient in recipients:
            if recipient.get("id") == actor_id:
                continue
            if recipient.get("notification_zone_enabled") is False:
                continue
            if recipient.get("notification_topics_onboarding_done") is False:
                continue
            recipient_topics = normalize_topic_keys(recipient.get("notification_topics"))
            if not recipient_topics:
                continue
            if not any(topic in recipient_topics for topic in normalized_topics):
                continue
            rows.append({
                "user_id": recipient["id"],
                "title": title,
                "message": message,
                "type": notification_type,
                "actor_name": None,
                "actor_initials": None,
                "post_id": None,
                "post_excerpt": None,
                "topic_key": normalized_topics[0],
                "community_key": community_key,
                "entity_type": entity_type,
                "entity_id": entity_id,
            })

        if rows:
            try:
                self.admin_client.table("notifications").insert(rows).execute()
            except Exception:
                fallback_type = notification_type if notification_type in self.base_notification_types else "system"
                fallback_rows = [
                    {
                        "user_id": row["user_id"],
                        "title": row["title"],
                        "message": row["message"],
                        "type": fallback_type,
                    }
                    for row in rows
                ]
                self.admin_client.table("notifications").insert(fallback_rows).execute()

    def get_notifications(self, user_id):
        result = (
            self.admin_client.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return self.ok({"notifications": result.data or []})

    def get_unread_count(self, user_id):
        result = (
            self.admin_client.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("read", False)
            .execute()
        )
        return self.ok({"count": result.count or 0})

    def mark_all_as_read(self, user_id):
        (
            self.admin_client.table("notifications")
            .update({"read": True})
            .eq("user_id", user_id)
            .eq("read", False)
            .execute()
        )
        return self.ok({"message": "Notificaciones marcadas como leidas"})
