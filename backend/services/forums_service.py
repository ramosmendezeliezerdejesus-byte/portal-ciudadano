from services.base import BaseService, NotFoundError, PermissionDeniedError, ValidationError


class ForumsService(BaseService):
    LEADER_ROLES = {"diputado", "presidente_junta", "super_admin"}

    def _get_profile(self, user_id):
        profile = (
            self.admin_client.table("profiles")
            .select("id, username, full_name, avatar_initials, role, verified, community, community_key")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not profile.data:
            raise NotFoundError("Perfil no encontrado")
        return profile.data

    @staticmethod
    def _require_community(profile):
        if not profile.get("community_key"):
            raise ValidationError("Debes completar tu comunidad para usar los foros")

    @staticmethod
    def _attach_counts(items, counts_map, key_name):
        enriched = []
        for item in items or []:
            enriched.append({
                **item,
                key_name: counts_map.get(item["id"], 0),
            })
        return enriched

    def _profiles_map(self, user_ids):
        ids = [user_id for user_id in set(user_ids or []) if user_id]
        if not ids:
            return {}
        profiles = (
            self.admin_client.table("profiles")
            .select("id, username, full_name, avatar_initials, role, verified, community")
            .in_("id", ids)
            .execute()
        )
        return {profile["id"]: profile for profile in (profiles.data or [])}

    def list_forums(self, user_id):
        profile = self._get_profile(user_id)
        self._require_community(profile)

        forums_res = (
            self.admin_client.table("community_forums")
            .select("*")
            .eq("community_key", profile["community_key"])
            .order("created_at", desc=False)
            .execute()
        )
        forums = forums_res.data or []
        forum_ids = [forum["id"] for forum in forums]

        threads_count = {}
        if forum_ids:
            counts = (
                self.admin_client.table("forum_threads")
                .select("forum_id")
                .in_("forum_id", forum_ids)
                .execute()
            )
            for row in (counts.data or []):
                threads_count[row["forum_id"]] = threads_count.get(row["forum_id"], 0) + 1

        creators_map = self._profiles_map([forum.get("created_by") for forum in forums])
        payload = []
        for forum in forums:
            payload.append({
                **forum,
                "threads_count": threads_count.get(forum["id"], 0),
                "creator": creators_map.get(forum.get("created_by")),
            })

        return self.ok({
            "forums": payload,
            "community": profile.get("community"),
            "can_create_main_forum": profile.get("role") in self.LEADER_ROLES,
        })

    def create_forum(self, data, user_id):
        profile = self._get_profile(user_id)
        self._require_community(profile)
        if profile.get("role") not in self.LEADER_ROLES:
            raise PermissionDeniedError("Solo diputados o presidentes de junta pueden crear foros principales")

        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        if not title:
            raise ValidationError("El titulo del foro es requerido")
        if len(title) > 120:
            raise ValidationError("El titulo no puede exceder 120 caracteres")
        if len(description) > 400:
            raise ValidationError("La descripcion no puede exceder 400 caracteres")

        forum = (
            self.admin_client.table("community_forums")
            .insert({
                "community": profile["community"],
                "community_key": profile["community_key"],
                "title": title,
                "description": description or None,
                "created_by": user_id,
            })
            .execute()
        )

        created = forum.data[0]
        created["creator"] = {
            "id": profile["id"],
            "username": profile["username"],
            "full_name": profile["full_name"],
            "avatar_initials": profile["avatar_initials"],
            "role": profile["role"],
            "verified": profile["verified"],
            "community": profile["community"],
        }
        created["threads_count"] = 0
        return self.ok({"forum": created}, status_code=201)

    def get_forum(self, forum_id, user_id):
        profile = self._get_profile(user_id)
        self._require_community(profile)

        forum_res = (
            self.admin_client.table("community_forums")
            .select("*")
            .eq("id", forum_id)
            .single()
            .execute()
        )
        forum = forum_res.data
        if not forum:
            raise NotFoundError("Foro no encontrado")
        if forum.get("community_key") != profile.get("community_key"):
            raise PermissionDeniedError("No tienes acceso a este foro")

        threads_res = (
            self.admin_client.table("forum_threads")
            .select("*")
            .eq("forum_id", forum_id)
            .order("is_pinned", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
        threads = threads_res.data or []
        thread_ids = [thread["id"] for thread in threads]

        messages_count = {}
        if thread_ids:
            messages = (
                self.admin_client.table("forum_messages")
                .select("thread_id")
                .in_("thread_id", thread_ids)
                .execute()
            )
            for row in (messages.data or []):
                messages_count[row["thread_id"]] = messages_count.get(row["thread_id"], 0) + 1

        creators_map = self._profiles_map([forum.get("created_by")] + [thread.get("created_by") for thread in threads])
        forum["creator"] = creators_map.get(forum.get("created_by"))

        payload_threads = []
        for thread in threads:
            payload_threads.append({
                **thread,
                "messages_count": messages_count.get(thread["id"], 0),
                "creator": creators_map.get(thread.get("created_by")),
            })

        return self.ok({"forum": forum, "threads": payload_threads})

    def create_thread(self, forum_id, data, user_id):
        profile = self._get_profile(user_id)
        self._require_community(profile)

        forum_res = (
            self.admin_client.table("community_forums")
            .select("*")
            .eq("id", forum_id)
            .single()
            .execute()
        )
        forum = forum_res.data
        if not forum:
            raise NotFoundError("Foro no encontrado")
        if forum.get("community_key") != profile.get("community_key"):
            raise PermissionDeniedError("No puedes publicar en este foro")

        title = (data.get("title") or "").strip()
        category = (data.get("category") or "").strip() or "general"
        content = (data.get("content") or "").strip()

        if not title:
            raise ValidationError("El titulo del subforo es requerido")
        if not content:
            raise ValidationError("La descripcion inicial es requerida")
        if len(title) > 140:
            raise ValidationError("El titulo no puede exceder 140 caracteres")
        if len(content) > 2000:
            raise ValidationError("La descripcion no puede exceder 2000 caracteres")

        thread_res = (
            self.admin_client.table("forum_threads")
            .insert({
                "forum_id": forum_id,
                "created_by": user_id,
                "title": title,
                "category": category,
                "content": content,
            })
            .execute()
        )
        thread = thread_res.data[0]
        thread["messages_count"] = 0
        thread["creator"] = {
            "id": profile["id"],
            "username": profile["username"],
            "full_name": profile["full_name"],
            "avatar_initials": profile["avatar_initials"],
            "role": profile["role"],
            "verified": profile["verified"],
            "community": profile["community"],
        }
        return self.ok({"thread": thread}, status_code=201)

    def get_thread(self, thread_id, user_id):
        profile = self._get_profile(user_id)
        self._require_community(profile)

        thread_res = (
            self.admin_client.table("forum_threads")
            .select("*")
            .eq("id", thread_id)
            .single()
            .execute()
        )
        thread = thread_res.data
        if not thread:
            raise NotFoundError("Subforo no encontrado")

        forum_res = (
            self.admin_client.table("community_forums")
            .select("*")
            .eq("id", thread["forum_id"])
            .single()
            .execute()
        )
        forum = forum_res.data
        if not forum:
            raise NotFoundError("Foro no encontrado")
        if forum.get("community_key") != profile.get("community_key"):
            raise PermissionDeniedError("No tienes acceso a este subforo")

        messages_res = (
            self.admin_client.table("forum_messages")
            .select("*")
            .eq("thread_id", thread_id)
            .order("created_at", desc=False)
            .execute()
        )
        messages = messages_res.data or []

        profiles_map = self._profiles_map(
            [forum.get("created_by"), thread.get("created_by")] + [message.get("user_id") for message in messages]
        )
        forum["creator"] = profiles_map.get(forum.get("created_by"))
        thread["creator"] = profiles_map.get(thread.get("created_by"))

        payload_messages = []
        for message in messages:
            payload_messages.append({
                **message,
                "profile": profiles_map.get(message.get("user_id")),
            })

        return self.ok({
            "forum": forum,
            "thread": thread,
            "messages": payload_messages,
        })

    def create_message(self, thread_id, data, user_id):
        profile = self._get_profile(user_id)
        self._require_community(profile)

        thread_res = (
            self.admin_client.table("forum_threads")
            .select("*")
            .eq("id", thread_id)
            .single()
            .execute()
        )
        thread = thread_res.data
        if not thread:
            raise NotFoundError("Subforo no encontrado")

        forum_res = (
            self.admin_client.table("community_forums")
            .select("id, community_key")
            .eq("id", thread["forum_id"])
            .single()
            .execute()
        )
        forum = forum_res.data
        if not forum:
            raise NotFoundError("Foro no encontrado")
        if forum.get("community_key") != profile.get("community_key"):
            raise PermissionDeniedError("No puedes responder en este subforo")

        content = (data.get("content") or "").strip()
        if not content:
            raise ValidationError("El mensaje es requerido")
        if len(content) > 2000:
            raise ValidationError("El mensaje no puede exceder 2000 caracteres")

        message_res = (
            self.admin_client.table("forum_messages")
            .insert({
                "thread_id": thread_id,
                "user_id": user_id,
                "content": content,
            })
            .execute()
        )
        message = message_res.data[0]
        message["profile"] = {
            "id": profile["id"],
            "username": profile["username"],
            "full_name": profile["full_name"],
            "avatar_initials": profile["avatar_initials"],
            "role": profile["role"],
            "verified": profile["verified"],
            "community": profile["community"],
        }
        return self.ok({"message": message}, status_code=201)
