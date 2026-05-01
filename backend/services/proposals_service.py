import uuid

from moderation import moderation_service
from services.base import BaseService, NotFoundError, PermissionDeniedError, ValidationError
from services.notifications_service import NotificationsService
from topic_utils import topics_for_content


class ProposalsService(BaseService):
    allowed_roles_manage = {"diputado", "presidente_junta", "super_admin"}
    valid_categories = {"infraestructura", "seguridad", "ambiente", "educacion", "salud", "transporte", "otro"}

    def __init__(self, public_client=None, admin_client=None):
        super().__init__(public_client=public_client, admin_client=admin_client)
        self.notifications = NotificationsService(
            public_client=self.public_client,
            admin_client=self.admin_client,
        )

    @staticmethod
    def _normalize_url_list(value):
        if not isinstance(value, list):
            return []
        urls = []
        for entry in value:
            if isinstance(entry, str):
                clean = entry.strip()
                if clean and clean not in urls:
                    urls.append(clean)
        return urls

    @staticmethod
    def _normalize_file_list(value):
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

    def attach_profiles(self, proposals_data, user_id=None):
        if not proposals_data:
            return []
        user_ids = list({proposal["user_id"] for proposal in proposals_data if proposal.get("user_id")})
        managed_ids = list({proposal["managed_by"] for proposal in proposals_data if proposal.get("managed_by")})
        all_ids = list(set(user_ids + managed_ids))
        profiles_map = {}
        if all_ids:
            profiles_res = (
                self.admin_client.table("profiles")
                .select("id, username, full_name, avatar_initials, role, verified")
                .in_("id", all_ids)
                .execute()
            )
            profiles_map = {profile["id"]: profile for profile in (profiles_res.data or [])}

        proposal_ids = [proposal["id"] for proposal in proposals_data]
        votes_res = self.admin_client.table("proposal_votes").select("proposal_id, user_id", count="exact").in_("proposal_id", proposal_ids).execute()
        votes_data = votes_res.data or []

        votes_count_map = {}
        user_voted_map = {}
        for vote in votes_data:
            proposal_id = vote["proposal_id"]
            votes_count_map[proposal_id] = votes_count_map.get(proposal_id, 0) + 1
            if user_id and vote["user_id"] == user_id:
                user_voted_map[proposal_id] = True

        for proposal in proposals_data:
            proposal["profile"] = profiles_map.get(proposal["user_id"], {})
            proposal["manager"] = profiles_map.get(proposal.get("managed_by"))
            proposal["votes_count"] = votes_count_map.get(proposal["id"], 0)
            proposal["user_voted"] = user_voted_map.get(proposal["id"], False)
        return proposals_data

    def get_proposals(self, status, category, page, per_page, user_id):
        offset = (page - 1) * per_page
        query = (
            self.public_client.table("proposals")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + per_page - 1)
        )
        if status:
            query = query.eq("status", status)
        if category:
            query = query.eq("category", category)
        result = query.execute()
        return self.ok({"proposals": self.attach_profiles(result.data or [], user_id)})

    def get_proposal(self, proposal_id, user_id):
        result = self.public_client.table("proposals").select("*").eq("id", proposal_id).single().execute()
        if not result.data:
            raise NotFoundError("Propuesta no encontrada")
        return self.ok({"proposal": self.attach_profiles([result.data], user_id)[0]})

    def create_proposal(self, data, user_id):
        profile = self.admin_client.table("profiles").select("full_name, community, community_key").eq("id", user_id).single().execute()
        author = profile.data or {}

        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        category = (data.get("category") or "otro").strip()
        image_url = data.get("image_url")
        video_url = data.get("video_url")
        media_urls = self._normalize_url_list(data.get("media_urls"))
        media_files = self._normalize_file_list(data.get("media_files"))
        location_text = (data.get("location_text") or "").strip()
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if not title:
            raise ValidationError("El titulo es requerido")
        if not description:
            raise ValidationError("La descripcion es requerida")
        if len(title) > 150:
            raise ValidationError("El titulo no puede superar 150 caracteres")
        if len(description) > 1000:
            raise ValidationError("La descripcion no puede superar 1000 caracteres")
        if category not in self.valid_categories:
            category = "otro"
        for field in [title, description]:
            if moderation_service.contains_profanity(field):
                raise ValidationError("El contenido tiene lenguaje inapropiado.")

        if not media_urls:
            media_urls = self._normalize_url_list([file_item.get("url") for file_item in media_files] + [image_url, video_url])
        if not image_url:
            image_url = next((file_item["url"] for file_item in media_files if file_item.get("kind") == "image"), None)
        if not video_url:
            video_url = next((file_item["url"] for file_item in media_files if file_item.get("kind") == "video"), None)

        result = self.public_client.table("proposals").insert({
            "user_id": user_id,
            "title": title,
            "description": description,
            "category": category,
            "image_url": image_url,
            "video_url": video_url,
            "media_urls": media_urls,
            "location_text": location_text or None,
            "latitude": latitude,
            "longitude": longitude,
            "status": "recibida",
        }).execute()
        created = self.attach_profiles([result.data[0]], user_id)[0]

        self.notifications.create_zone_topic_notifications(
            actor_id=user_id,
            topic_keys=topics_for_content("proposal", category),
            community_key=author.get("community_key"),
            title=f"Nueva propuesta en {author.get('community') or 'tu zona'}",
            message=f"{author.get('full_name', 'Un vecino')} publicó una propuesta: {title}.",
            notification_type="proposal",
            entity_type="proposal",
            entity_id=created["id"],
        )
        return self.ok({"proposal": created}, status_code=201)

    def delete_proposal(self, proposal_id, user_id):
        result = self.public_client.table("proposals").select("user_id").eq("id", proposal_id).single().execute()
        if not result.data:
            raise NotFoundError("Propuesta no encontrada")
        if result.data["user_id"] != user_id:
            raise PermissionDeniedError("No tienes permiso para eliminar esta propuesta")
        self.public_client.table("proposals").delete().eq("id", proposal_id).execute()
        return self.ok({"message": "Propuesta eliminada"})

    def update_status(self, proposal_id, data, user_id):
        profile_res = self.admin_client.table("profiles").select("role").eq("id", user_id).single().execute()
        user_role = profile_res.data.get("role", "user") if profile_res.data else "user"
        if user_role not in self.allowed_roles_manage:
            raise PermissionDeniedError("No tienes permiso para gestionar propuestas")

        current_res = self.admin_client.table("proposals").select("evidence_files, evidence_url, evidence_path").eq("id", proposal_id).single().execute()
        if not current_res.data:
            raise NotFoundError("Propuesta no encontrada")

        new_status = data.get("status")
        resolution_note = (data.get("resolution_note") or "").strip()
        evidence_url = data.get("evidence_url")
        evidence_path = data.get("evidence_path")
        existing_files = self._normalize_file_list(current_res.data.get("evidence_files"))
        incoming_files = self._normalize_file_list(data.get("evidence_files"))
        evidence_files = self._normalize_file_list(existing_files + incoming_files)

        valid_statuses = {"recibida", "en_gestion", "resuelta"}
        if new_status not in valid_statuses:
            raise ValidationError("Estado no valido")
        if evidence_files and not evidence_url:
            evidence_url = evidence_files[0]["url"]
        if evidence_files and not evidence_path:
            evidence_path = evidence_files[0]["path"]
        if not evidence_url:
            evidence_url = current_res.data.get("evidence_url")
        if not evidence_path:
            evidence_path = current_res.data.get("evidence_path")
        if new_status == "resuelta" and not evidence_url:
            raise ValidationError("Debes adjuntar evidencia para marcar como resuelta")

        update_data = {"status": new_status, "managed_by": user_id, "managed_at": "now()"}
        if resolution_note:
            update_data["resolution_note"] = resolution_note
        if evidence_url:
            update_data["evidence_url"] = evidence_url
        if evidence_path:
            update_data["evidence_path"] = evidence_path
        if evidence_files:
            update_data["evidence_files"] = evidence_files

        self.admin_client.table("proposals").update(update_data).eq("id", proposal_id).execute()
        result = self.admin_client.table("proposals").select("*").eq("id", proposal_id).single().execute()
        return self.ok({"proposal": self.attach_profiles([result.data], user_id)[0]})

    def toggle_vote(self, proposal_id, user_id):
        existing = (
            self.public_client.table("proposal_votes")
            .select("id")
            .eq("proposal_id", proposal_id)
            .eq("user_id", user_id)
            .execute()
        )
        if existing.data:
            self.public_client.table("proposal_votes").delete().eq("proposal_id", proposal_id).eq("user_id", user_id).execute()
            voted = False
        else:
            self.public_client.table("proposal_votes").insert({"proposal_id": proposal_id, "user_id": user_id}).execute()
            voted = True
        count = self.public_client.table("proposal_votes").select("id", count="exact").eq("proposal_id", proposal_id).execute()
        return self.ok({"voted": voted, "votes_count": count.count or 0})

    def upload_evidence(self, file_storage, user_id):
        if not file_storage:
            raise ValidationError("No se encontro el archivo")

        content_type = file_storage.content_type or ""
        allowed = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "video/mp4",
            "video/quicktime",
            "video/webm",
        }
        if content_type not in allowed:
            raise ValidationError("Solo se permiten imagenes, PDF, Word o videos compatibles")

        file_bytes = file_storage.read()
        if len(file_bytes) > 50 * 1024 * 1024:
            raise ValidationError("El archivo supera el limite de 50MB")

        extension = (
            content_type.split("/")[-1]
            .replace("jpeg", "jpg")
            .replace("quicktime", "mov")
            .replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "docx")
            .replace("msword", "doc")
        )
        file_name = f"{user_id}/{uuid.uuid4()}.{extension}"
        self.admin_client.storage.from_("proposal-evidence").upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )
        public_url = self.admin_client.storage.from_("proposal-evidence").get_public_url(file_name)
        return self.ok({"url": public_url, "path": file_name})

    def get_comments(self, proposal_id):
        result = (
            self.public_client.table("proposal_comments")
            .select("*, profiles(username, full_name, avatar_initials, role, verified)")
            .eq("proposal_id", proposal_id)
            .order("created_at", desc=False)
            .execute()
        )
        return self.ok({"comments": result.data or []})

    def create_comment(self, proposal_id, data, user_id):
        content = (data.get("content") or "").strip()
        if not content:
            raise ValidationError("El comentario no puede estar vacio")
        if len(content) > 300:
            raise ValidationError("Maximo 300 caracteres")
        if moderation_service.contains_profanity(content):
            raise ValidationError("Tu comentario contiene lenguaje inapropiado.")

        result = self.public_client.table("proposal_comments").insert({
            "proposal_id": proposal_id,
            "user_id": user_id,
            "content": content,
        }).execute()
        comment = result.data[0]
        profile = (
            self.admin_client.table("profiles")
            .select("username, full_name, avatar_initials, role, verified")
            .eq("id", user_id)
            .single()
            .execute()
        )
        comment["profiles"] = profile.data
        return self.ok({"comment": comment}, status_code=201)

    def delete_comment(self, comment_id, user_id):
        comment = self.public_client.table("proposal_comments").select("user_id").eq("id", comment_id).single().execute()
        if not comment.data:
            raise NotFoundError("Comentario no encontrado")
        if comment.data["user_id"] != user_id:
            raise PermissionDeniedError("No tienes permiso")
        self.public_client.table("proposal_comments").delete().eq("id", comment_id).execute()
        return self.ok({"message": "Comentario eliminado"})
