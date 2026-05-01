import re

from moderation import moderation_service
from services.notifications_service import NotificationsService
from services.base import BaseService, NotFoundError, PermissionDeniedError, ValidationError


class PostsService(BaseService):
    hashtag_re = re.compile(r"(?<!\w)#([\w]+)", re.UNICODE)

    def __init__(self, public_client=None, admin_client=None):
        super().__init__(public_client=public_client, admin_client=admin_client)
        self.notifications = NotificationsService(
            public_client=self.public_client,
            admin_client=self.admin_client,
        )

    def extract_hashtags(self, text):
        if not text:
            return []
        seen = set()
        tags = []
        for match in self.hashtag_re.finditer(text):
            raw = f"#{match.group(1)}"
            key = raw.lower()
            if key in seen:
                continue
            seen.add(key)
            tags.append(raw)
        return tags

    def enrich_post(self, post, current_user_id):
        likes_res = (
            self.public_client.table("likes")
            .select("user_id", count="exact")
            .eq("post_id", post["id"])
            .execute()
        )
        reposts_res = (
            self.public_client.table("post_reposts")
            .select("user_id", count="exact")
            .eq("post_id", post["id"])
            .execute()
        )
        saved_res = (
            self.public_client.table("saved_posts")
            .select("user_id")
            .eq("post_id", post["id"])
            .eq("user_id", current_user_id)
            .execute()
        )
        post["likes_count"] = likes_res.count or 0
        post["user_has_liked"] = any(like["user_id"] == current_user_id for like in (likes_res.data or []))
        post["reposts_count"] = reposts_res.count or 0
        post["user_has_reposted"] = any(repost["user_id"] == current_user_id for repost in (reposts_res.data or []))
        post["user_has_saved"] = bool(saved_res.data)
        post["hashtags"] = self.extract_hashtags(post.get("content"))
        return post

    def get_posts(self, current_user_id):
        posts = (
            self.public_client.table("posts")
            .select("*, profiles(username, full_name, avatar_initials, verified, role)")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return self.ok({"posts": [self.enrich_post(post, current_user_id) for post in (posts.data or [])]})

    def get_trending_hashtags(self):
        posts = (
            self.admin_client.table("posts")
            .select("id, content, created_at")
            .order("created_at", desc=True)
            .execute()
        )
        counters = {}
        for post in (posts.data or []):
            for tag in self.extract_hashtags(post.get("content")):
                key = tag.lower()
                counters.setdefault(key, {"tag": tag, "count": 0})
                counters[key]["count"] += 1

        trending = sorted(counters.values(), key=lambda item: (-item["count"], item["tag"].lower()))[:5]
        for index, item in enumerate(trending):
            item["hot"] = index < 3 and item["count"] > 1
        return self.ok({"trending": trending})

    def get_posts_by_hashtag(self, tag, current_user_id):
        target = (tag or "").strip()
        if not target:
            raise ValidationError("Hashtag requerido")
        if not target.startswith("#"):
            target = f"#{target}"
        target_key = target.lower()

        posts = (
            self.admin_client.table("posts")
            .select("*, profiles(username, full_name, avatar_initials, verified, role)")
            .order("created_at", desc=True)
            .execute()
        )

        filtered = []
        for post in (posts.data or []):
            hashtags = self.extract_hashtags(post.get("content"))
            if any(current_tag.lower() == target_key for current_tag in hashtags):
                filtered.append(self.enrich_post(post, current_user_id))

        display_tag = target
        if filtered:
            for current_tag in filtered[0]["hashtags"]:
                if current_tag.lower() == target_key:
                    display_tag = current_tag
                    break

        return self.ok({"tag": display_tag, "count": len(filtered), "posts": filtered})

    def create_post(self, data, user_id):
        content = (data.get("content") or "").strip()
        image_url = data.get("image_url")
        video_url = data.get("video_url")
        if not content and not image_url and not video_url:
            raise ValidationError("El post debe tener texto, imagen o video")
        if len(content) > 500:
            raise ValidationError("Máximo 500 caracteres")
        if content and moderation_service.contains_profanity(content):
            raise ValidationError("Tu mensaje contiene lenguaje inapropiado. Por favor, mantén un tono respetuoso.")

        post = self.public_client.table("posts").insert({
            "user_id": user_id,
            "content": content,
            "image_url": image_url,
            "video_url": video_url,
        }).execute()
        created = post.data[0]
        created["hashtags"] = self.extract_hashtags(created.get("content"))
        return self.ok({"post": created}, status_code=201)

    def delete_post(self, post_id, user_id, storage_bucket):
        post = self.public_client.table("posts").select("user_id, image_url").eq("id", post_id).single().execute()
        if not post.data:
            raise NotFoundError("Post no encontrado")
        if post.data["user_id"] != user_id:
            raise PermissionDeniedError("No tienes permiso para eliminar este post")

        image_url = post.data.get("image_url")
        if image_url:
            try:
                path_start = image_url.find(f"/{storage_bucket}/")
                if path_start != -1:
                    file_path = image_url[path_start + len(f"/{storage_bucket}/"):]
                    self.admin_client.storage.from_(storage_bucket).remove([file_path])
            except Exception:
                pass

        self.public_client.table("posts").delete().eq("id", post_id).execute()
        return self.ok({"message": "Post eliminado"})

    def toggle_like(self, post_id, user_id):
        existing = (
            self.public_client.table("likes").select("id")
            .eq("post_id", post_id).eq("user_id", user_id).execute()
        )
        if existing.data:
            self.public_client.table("likes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
            liked = False
        else:
            self.public_client.table("likes").insert({"post_id": post_id, "user_id": user_id}).execute()
            liked = True
            self.notifications.create_post_notification(user_id, post_id, "like")
        count = self.public_client.table("likes").select("id", count="exact").eq("post_id", post_id).execute()
        return self.ok({"liked": liked, "count": count.count})

    def toggle_repost(self, post_id, user_id):
        post = self.public_client.table("posts").select("id").eq("id", post_id).single().execute()
        if not post.data:
            raise NotFoundError("Post no encontrado")

        existing = (
            self.public_client.table("post_reposts").select("id")
            .eq("post_id", post_id).eq("user_id", user_id).execute()
        )
        if existing.data:
            self.public_client.table("post_reposts").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
            reposted = False
        else:
            self.public_client.table("post_reposts").insert({"post_id": post_id, "user_id": user_id}).execute()
            reposted = True
            self.notifications.create_post_notification(user_id, post_id, "repost")

        count = self.public_client.table("post_reposts").select("id", count="exact").eq("post_id", post_id).execute()
        return self.ok({"reposted": reposted, "count": count.count or 0})

    def toggle_save(self, post_id, user_id):
        post = self.public_client.table("posts").select("id").eq("id", post_id).single().execute()
        if not post.data:
            raise NotFoundError("Post no encontrado")

        existing = (
            self.public_client.table("saved_posts").select("id")
            .eq("post_id", post_id).eq("user_id", user_id).execute()
        )
        if existing.data:
            self.public_client.table("saved_posts").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
            saved = False
        else:
            self.public_client.table("saved_posts").insert({"post_id": post_id, "user_id": user_id}).execute()
            saved = True
            self.notifications.create_post_notification(user_id, post_id, "save")

        return self.ok({"saved": saved})

    def get_saved_posts(self, user_id):
        saved_rows = (
            self.admin_client.table("saved_posts")
            .select("post_id, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        saved_items = saved_rows.data or []
        if not saved_items:
            return self.ok({"posts": []})

        post_ids = [item["post_id"] for item in saved_items]
        posts_res = (
            self.admin_client.table("posts")
            .select("*, profiles(username, full_name, avatar_initials, verified, role)")
            .in_("id", post_ids)
            .execute()
        )
        posts_map = {post["id"]: self.enrich_post(post, user_id) for post in (posts_res.data or [])}
        ordered_posts = [posts_map[item["post_id"]] for item in saved_items if item["post_id"] in posts_map]
        return self.ok({"posts": ordered_posts})
