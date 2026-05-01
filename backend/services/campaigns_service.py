from topic_utils import normalize_topic_keys, topic_label, topics_for_content
from services.base import BaseService, NotFoundError, ValidationError
from services.notifications_service import NotificationsService


class CampaignsService(BaseService):
    def __init__(self, public_client=None, admin_client=None):
        super().__init__(public_client=public_client, admin_client=admin_client)
        self.notifications = NotificationsService(
            public_client=self.public_client,
            admin_client=self.admin_client,
        )

    @staticmethod
    def _normalize_media_files(value):
        if not isinstance(value, list):
            return []
        files = []
        for entry in value:
            if not isinstance(entry, dict):
                continue
            url = str(entry.get("url") or "").strip()
            if not url or any(file_item["url"] == url for file_item in files):
                continue
            files.append({
                "url": url,
                "path": str(entry.get("path") or "").strip() or None,
                "name": str(entry.get("name") or "").strip() or None,
                "kind": str(entry.get("kind") or "").strip() or None,
            })
        return files

    def _get_profile(self, user_id):
        result = (
            self.admin_client.table("profiles")
            .select("id, full_name, community, community_key")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValidationError("Perfil no encontrado")
        return result.data

    def list_campaigns(self, user_id, include_inactive=False):
        profile = self._get_profile(user_id)
        try:
            query = self.admin_client.table("civic_campaigns").select("*").order("featured", desc=True).order("campaign_date", desc=True).order("created_at", desc=True)
        except Exception:
            return self.ok({"campaigns": []})
        if not include_inactive:
            query = query.eq("active", True)
        try:
            campaigns = query.execute().data or []
        except Exception:
            return self.ok({"campaigns": []})

        filtered = []
        for campaign in campaigns:
            target_community_key = campaign.get("target_community_key")
            if include_inactive or not target_community_key or target_community_key == profile.get("community_key"):
                filtered.append(campaign)
        return self.ok({"campaigns": filtered})

    def create_campaign(self, data, user_id):
        profile = self._get_profile(user_id)
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        campaign_date = (data.get("campaign_date") or "").strip()
        topic_values = normalize_topic_keys([data.get("topic_key")])
        topic_key = topic_values[0] if topic_values else "participacion"
        target_community = " ".join(str(data.get("target_community") or "").split()) or None
        target_community_key = str(data.get("target_community_key") or "").strip().lower() or None
        featured = bool(data.get("featured"))
        active = bool(data.get("active", True))
        media_files = self._normalize_media_files(data.get("media_files"))

        if not title:
            raise ValidationError("El titulo es requerido")
        if not description:
            raise ValidationError("La descripcion es requerida")
        if not campaign_date:
            raise ValidationError("La fecha es requerida")
        if len(title) > 160:
            raise ValidationError("El titulo no puede superar 160 caracteres")
        if len(description) > 1500:
            raise ValidationError("La descripcion no puede superar 1500 caracteres")

        created = (
            self.admin_client.table("civic_campaigns")
            .insert({
                "title": title,
                "description": description,
                "campaign_date": campaign_date,
                "topic_key": topic_key,
                "target_community": target_community,
                "target_community_key": target_community_key,
                "media_files": media_files,
                "featured": featured,
                "active": active,
                "created_by": user_id,
                "updated_by": user_id,
            })
            .execute()
        )
        campaign = created.data[0]
        if active:
            self.notifications.create_zone_topic_notifications(
                actor_id=user_id,
                topic_keys=topics_for_content("campaign", topic_key),
                community_key=target_community_key,
                title=f"Nueva campaña: {title}",
                message=f"{profile.get('full_name', 'Portal Ciudadano')} publicó una campaña sobre {topic_label(topic_key).lower()}.",
                notification_type="campaign",
                entity_type="campaign",
                entity_id=campaign["id"],
            )
        return self.ok({"campaign": campaign}, status_code=201)

    def update_campaign(self, campaign_id, data, user_id):
        current = self.admin_client.table("civic_campaigns").select("*").eq("id", campaign_id).single().execute()
        if not current.data:
            raise NotFoundError("Campaña no encontrada")

        updates = {}
        if "title" in data:
            title = (data.get("title") or "").strip()
            if not title:
                raise ValidationError("El titulo es requerido")
            updates["title"] = title
        if "description" in data:
            description = (data.get("description") or "").strip()
            if not description:
                raise ValidationError("La descripcion es requerida")
            updates["description"] = description
        if "campaign_date" in data:
            campaign_date = (data.get("campaign_date") or "").strip()
            if not campaign_date:
                raise ValidationError("La fecha es requerida")
            updates["campaign_date"] = campaign_date
        if "topic_key" in data:
            topic_values = normalize_topic_keys([data.get("topic_key")])
            updates["topic_key"] = topic_values[0] if topic_values else "participacion"
        if "target_community" in data:
            updates["target_community"] = " ".join(str(data.get("target_community") or "").split()) or None
        if "target_community_key" in data:
            updates["target_community_key"] = str(data.get("target_community_key") or "").strip().lower() or None
        if "media_files" in data:
            updates["media_files"] = self._normalize_media_files(data.get("media_files"))
        if "featured" in data:
            updates["featured"] = bool(data.get("featured"))
        if "active" in data:
            updates["active"] = bool(data.get("active"))

        updates["updated_by"] = user_id
        updated = self.admin_client.table("civic_campaigns").update(updates).eq("id", campaign_id).execute()
        return self.ok({"campaign": updated.data[0]})

    def delete_campaign(self, campaign_id):
        self.admin_client.table("civic_campaigns").delete().eq("id", campaign_id).execute()
        return self.ok({"message": "Campaña eliminada"})

    def notify_campaign(self, campaign_id, user_id):
        campaign_res = self.admin_client.table("civic_campaigns").select("*").eq("id", campaign_id).single().execute()
        if not campaign_res.data:
            raise NotFoundError("Campaña no encontrada")
        campaign = campaign_res.data
        actor = self._get_profile(user_id)
        self.notifications.create_zone_topic_notifications(
            actor_id=user_id,
            topic_keys=topics_for_content("campaign", campaign.get("topic_key")),
            community_key=campaign.get("target_community_key"),
            title=f"Campaña informativa: {campaign.get('title')}",
            message=f"{actor.get('full_name', 'Portal Ciudadano')} quiere difundir una campaña sobre {topic_label(campaign.get('topic_key')).lower()}.",
            notification_type="campaign",
            entity_type="campaign",
            entity_id=campaign["id"],
        )
        return self.ok({"message": "Notificaciones enviadas"})
