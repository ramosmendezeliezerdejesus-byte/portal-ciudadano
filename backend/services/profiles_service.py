import re
import unicodedata

from helpers import meeting_data_service
from services.base import BaseService, NotFoundError, ValidationError
from services.polls_service import PollsService
from topic_utils import normalize_topic_keys


class ProfilesService(BaseService):
    def __init__(self, public_client=None, admin_client=None):
        super().__init__(public_client=public_client, admin_client=admin_client)
        self.polls_service = PollsService(public_client=self.public_client, admin_client=self.admin_client)

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

    def get_counts(self, user_id):
        followers = self.admin_client.table("follows").select("id", count="exact").eq("following_id", user_id).execute()
        following = self.admin_client.table("follows").select("id", count="exact").eq("follower_id", user_id).execute()
        posts = self.admin_client.table("posts").select("id", count="exact").eq("user_id", user_id).execute()
        proposals = self.admin_client.table("proposals").select("id", count="exact").eq("user_id", user_id).execute()
        polls = self.admin_client.table("polls").select("id", count="exact").eq("user_id", user_id).execute()
        meetings = self.admin_client.table("meetings").select("id", count="exact").eq("user_id", user_id).execute()
        return {
            "followers_count": followers.count or 0,
            "following_count": following.count or 0,
            "posts_count": posts.count or 0,
            "proposals_count": proposals.count or 0,
            "polls_count": polls.count or 0,
            "meetings_count": meetings.count or 0,
        }

    def build_posts_payload(self, posts, current_user_id):
        payload = []
        for post in posts or []:
            likes_res = self.admin_client.table("likes").select("user_id", count="exact").eq("post_id", post["id"]).execute()
            comments_res = self.admin_client.table("comments").select("id", count="exact").eq("post_id", post["id"]).execute()
            payload.append({
                **post,
                "likes_count": likes_res.count or 0,
                "comments_count": comments_res.count or 0,
                "user_has_liked": any(like["user_id"] == current_user_id for like in (likes_res.data or [])),
                "reposts_count": (self.admin_client.table("post_reposts").select("id", count="exact").eq("post_id", post["id"]).execute().count or 0),
            })
        return payload

    def build_proposals_payload(self, proposals):
        payload = []
        for proposal in proposals or []:
            votes_res = self.admin_client.table("proposal_votes").select("id", count="exact").eq("proposal_id", proposal["id"]).execute()
            comments_res = self.admin_client.table("proposal_comments").select("id", count="exact").eq("proposal_id", proposal["id"]).execute()
            payload.append({**proposal, "votes_count": votes_res.count or 0, "comments_count": comments_res.count or 0})
        return payload

    def get_profile_record(self, username):
        result = (
            self.admin_client.table("profiles")
            .select("*")
            .eq("username", username)
            .single()
            .execute()
        )
        return result.data

    def update_my_community(self, data, user_id):
        community = self._normalize_community(data.get("community"))
        address_reference = (data.get("address_reference") or "").strip() or None
        result = (
            self.admin_client.table("profiles")
            .update({
                "community": community["community"],
                "community_key": community["community_key"],
                "address_reference": address_reference,
            })
            .eq("id", user_id)
            .execute()
        )
        if not result.data:
            raise NotFoundError("Perfil no encontrado")
        return self.ok({"user": result.data[0], "message": "Comunidad actualizada"})

    def update_my_preferences(self, data, user_id):
        notification_topics = normalize_topic_keys(data.get("notification_topics"))
        notification_zone_enabled = bool(data.get("notification_zone_enabled", True))
        notification_topics_onboarding_done = bool(data.get("notification_topics_onboarding_done", True))

        if not notification_topics:
            raise ValidationError("Debes seleccionar al menos un tema de interes")

        result = (
            self.admin_client.table("profiles")
            .update({
                "notification_topics": notification_topics,
                "notification_zone_enabled": notification_zone_enabled,
                "notification_topics_onboarding_done": notification_topics_onboarding_done,
            })
            .eq("id", user_id)
            .execute()
        )
        if not result.data:
            raise NotFoundError("Perfil no encontrado")
        return self.ok({"user": result.data[0], "message": "Preferencias actualizadas"})

    def get_profile(self, username, current_user_id):
        profile = self.get_profile_record(username)
        if not profile:
            raise NotFoundError("Usuario no encontrado")

        counts = self.get_counts(profile["id"])
        is_me = current_user_id == profile["id"]
        is_following = False
        if not is_me:
            follow_res = (
                self.admin_client.table("follows")
                .select("id")
                .eq("follower_id", current_user_id)
                .eq("following_id", profile["id"])
                .execute()
            )
            is_following = bool(follow_res.data)

        posts_res = self.admin_client.table("posts").select("id, user_id, content, image_url, video_url, created_at").eq("user_id", profile["id"]).order("created_at", desc=True).execute()
        proposals_res = self.admin_client.table("proposals").select("id, user_id, title, description, category, status, image_url, video_url, location_text, created_at").eq("user_id", profile["id"]).order("created_at", desc=True).execute()
        polls_res = self.admin_client.table("polls").select("id, user_id, question, description, ends_at, created_at").eq("user_id", profile["id"]).order("created_at", desc=True).execute()
        meetings_res = self.admin_client.table("meetings").select("*").eq("user_id", profile["id"]).order("date", desc=False).execute()

        return self.ok({
            "profile": {**profile, **counts},
            "is_following": is_following,
            "is_me": is_me,
            "posts": self.build_posts_payload(posts_res.data or [], current_user_id),
            "proposals": self.build_proposals_payload(proposals_res.data or []),
            "polls": self.polls_service.build_polls_payload(polls_res.data or [], current_user_id),
            "meetings": meeting_data_service.attach_profiles_and_rsvp(meetings_res.data or []),
        })

    def toggle_follow(self, username, current_user_id):
        target_res = self.admin_client.table("profiles").select("id").eq("username", username).single().execute()
        if not target_res.data:
            raise NotFoundError("Usuario no encontrado")
        target_id = target_res.data["id"]
        if target_id == current_user_id:
            raise ValidationError("No puedes seguirte a ti mismo")

        existing = (
            self.admin_client.table("follows")
            .select("id")
            .eq("follower_id", current_user_id)
            .eq("following_id", target_id)
            .execute()
        )
        if existing.data:
            self.admin_client.table("follows").delete().eq("follower_id", current_user_id).eq("following_id", target_id).execute()
            following = False
        else:
            self.admin_client.table("follows").insert({"follower_id": current_user_id, "following_id": target_id}).execute()
            following = True

        count_res = self.admin_client.table("follows").select("id", count="exact").eq("following_id", target_id).execute()
        return self.ok({"following": following, "followers_count": count_res.count or 0})

    def get_followers(self, username):
        target_res = self.admin_client.table("profiles").select("id").eq("username", username).single().execute()
        if not target_res.data:
            raise NotFoundError("Usuario no encontrado")
        follows_res = self.admin_client.table("follows").select("follower_id").eq("following_id", target_res.data["id"]).execute()
        follower_ids = [row["follower_id"] for row in (follows_res.data or [])]
        if not follower_ids:
            return self.ok({"followers": []})
        profiles_res = self.admin_client.table("profiles").select("id, username, full_name, avatar_initials, role, verified").in_("id", follower_ids).execute()
        return self.ok({"followers": profiles_res.data or []})

    def get_following(self, username):
        target_res = self.admin_client.table("profiles").select("id").eq("username", username).single().execute()
        if not target_res.data:
            raise NotFoundError("Usuario no encontrado")
        follows_res = self.admin_client.table("follows").select("following_id").eq("follower_id", target_res.data["id"]).execute()
        following_ids = [row["following_id"] for row in (follows_res.data or [])]
        if not following_ids:
            return self.ok({"following": []})
        profiles_res = self.admin_client.table("profiles").select("id, username, full_name, avatar_initials, role, verified").in_("id", following_ids).execute()
        return self.ok({"following": profiles_res.data or []})
