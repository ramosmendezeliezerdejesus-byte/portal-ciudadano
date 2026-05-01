from helpers import meeting_data_service
from services.base import BaseService, NotFoundError, ValidationError


class AdminService(BaseService):
    valid_roles = {"user", "verified", "diputado", "presidente_junta"}

    def list_users(self):
        result = (
            self.admin_client.table("profiles")
            .select("id, username, full_name, email, avatar_initials, role, verified, created_at, province")
            .order("created_at", desc=True)
            .execute()
        )
        return self.ok({"users": result.data or []})

    def change_role(self, user_id, current_user_id, new_role):
        if new_role not in self.valid_roles:
            raise ValidationError("Rol no válido")
        if user_id == current_user_id:
            raise ValidationError("No puedes cambiar tu propio rol")
        self.admin_client.table("profiles").update({
            "role": new_role,
            "verified": new_role in ("verified", "diputado", "presidente_junta"),
        }).eq("id", user_id).execute()
        return self.ok({"message": f"Rol actualizado a {new_role}"})

    def delete_user(self, user_id, current_user_id):
        if user_id == current_user_id:
            raise ValidationError("No puedes eliminarte a ti mismo")
        self.admin_client.auth.admin.delete_user(user_id)
        return self.ok({"message": "Usuario eliminado correctamente"})

    def list_meetings(self):
        result = self.admin_client.table("meetings").select("*").order("date", desc=False).execute()
        return self.ok({"meetings": meeting_data_service.attach_profiles_and_rsvp(result.data or [])})

    def delete_meeting(self, meeting_id):
        self.admin_client.table("meeting_rsvp").delete().eq("meeting_id", meeting_id).execute()
        self.admin_client.table("meetings").delete().eq("id", meeting_id).execute()
        return self.ok({"message": "Reunión eliminada"})

    def list_verification_requests(self, status_filter):
        result = (
            self.admin_client.table("verification_requests")
            .select("*")
            .eq("status", status_filter)
            .order("created_at", desc=False)
            .execute()
        )
        requests_data = result.data or []
        if requests_data:
            user_ids = list({request["user_id"] for request in requests_data})
            profiles_res = (
                self.admin_client.table("profiles")
                .select("id, username, full_name, email, avatar_initials")
                .in_("id", user_ids)
                .execute()
            )
            profiles_map = {profile["id"]: profile for profile in (profiles_res.data or [])}
            for request_row in requests_data:
                request_row["profile"] = profiles_map.get(request_row["user_id"], {})
        return self.ok({"requests": requests_data})

    def review_request(self, req_id, action, admin_notes, reviewer_id):
        if action not in ("approve", "reject"):
            raise ValidationError("Acción no válida")

        request_res = self.admin_client.table("verification_requests").select("*").eq("id", req_id).single().execute()
        if not request_res.data:
            raise NotFoundError("Solicitud no encontrada")

        verification_request = request_res.data
        new_status = "approved" if action == "approve" else "rejected"
        self.admin_client.table("verification_requests").update({
            "status": new_status,
            "admin_notes": admin_notes or None,
            "reviewed_at": "now()",
            "reviewed_by": reviewer_id,
        }).eq("id", req_id).execute()

        if action == "approve":
            self.admin_client.table("profiles").update({
                "role": verification_request["requested_role"],
                "verified": True,
                "province": verification_request["province"],
                "office_address": verification_request.get("office_address"),
                "latitude": verification_request.get("latitude"),
                "longitude": verification_request.get("longitude"),
            }).eq("id", verification_request["user_id"]).execute()

        return self.ok({
            "message": f"Solicitud {'aprobada' if action == 'approve' else 'rechazada'} correctamente.",
            "action": action,
        })

    def community_report_summary(self, community_key=None):
        profiles = (
            self.admin_client.table("profiles")
            .select("id, full_name, community, community_key")
            .execute()
        ).data or []
        profiles_map = {profile["id"]: profile for profile in profiles}

        reports = (
            self.admin_client.table("reports")
            .select("id, user_id, title, description, category, status, location_text, created_at")
            .order("created_at", desc=True)
            .execute()
        ).data or []
        service_requests = (
            self.admin_client.table("service_requests")
            .select("id, user_id, title, description, category, status, location_text, created_at")
            .order("created_at", desc=True)
            .execute()
        ).data or []

        requests = []
        for source_type, items in (("denuncia", reports), ("solicitud", service_requests)):
            for item in items:
                profile = profiles_map.get(item.get("user_id"), {})
                item_community_key = profile.get("community_key")
                if community_key and item_community_key != community_key:
                    continue
                requests.append({
                    **item,
                    "source_type": source_type,
                    "community": profile.get("community") or "Sin sector",
                    "community_key": item_community_key,
                    "reporter_name": profile.get("full_name") or "Usuario",
                })

        problem_counts = {}
        sector_counts = {}
        user_sector_counts = {}
        source_counts = {}

        for request in requests:
            category = request.get("category") or "otro"
            community = request.get("community") or "Sin sector"
            source_type = request.get("source_type") or "solicitud"
            problem_counts[category] = problem_counts.get(category, 0) + 1
            sector_counts[community] = sector_counts.get(community, 0) + 1
            source_counts[source_type] = source_counts.get(source_type, 0) + 1

        for profile in profiles:
            item_community_key = profile.get("community_key")
            if community_key and item_community_key != community_key:
                continue
            community = profile.get("community") or "Sin sector"
            user_sector_counts[community] = user_sector_counts.get(community, 0) + 1

        summary = {
            "total_requests": len(requests),
            "by_source": [{"label": key, "count": value} for key, value in sorted(source_counts.items(), key=lambda item: item[1], reverse=True)],
            "common_problems": [{"label": key, "count": value} for key, value in sorted(problem_counts.items(), key=lambda item: item[1], reverse=True)],
            "sectors_with_more_reports": [{"label": key, "count": value} for key, value in sorted(sector_counts.items(), key=lambda item: item[1], reverse=True)],
            "users_by_sector": [{"label": key, "count": value} for key, value in sorted(user_sector_counts.items(), key=lambda item: item[1], reverse=True)],
        }
        communities = sorted({
            (profile.get("community") or "Sin sector", profile.get("community_key") or "")
            for profile in profiles
        })

        return self.ok({
            "summary": summary,
            "requests": requests,
            "communities": [
                {"label": label, "value": value}
                for label, value in communities
                if value
            ],
        })
