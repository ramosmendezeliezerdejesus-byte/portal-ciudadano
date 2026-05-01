from services.base import BaseService, ConflictError, ValidationError


class VerificationService(BaseService):
    def create_request(self, data, user_id):
        requested_role = (data.get("requested_role") or "").strip()
        province = (data.get("province") or "").strip()
        office_address = (data.get("office_address") or "").strip()
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        proof_file_url = (data.get("proof_file_url") or "").strip()
        proof_file_path = (data.get("proof_file_path") or "").strip()

        if requested_role not in ("diputado", "presidente_junta"):
            raise ValidationError("Rol no válido")
        if not province:
            raise ValidationError("La provincia es requerida")
        if not proof_file_url:
            raise ValidationError("Debes adjuntar un documento de prueba")

        existing = (
            self.admin_client.table("verification_requests")
            .select("id, status")
            .eq("user_id", user_id)
            .eq("status", "pending")
            .execute()
        )
        if existing.data:
            raise ConflictError("Ya tienes una solicitud pendiente de revisión")

        request_row = self.admin_client.table("verification_requests").insert({
            "user_id": user_id,
            "requested_role": requested_role,
            "province": province,
            "office_address": office_address or None,
            "latitude": latitude,
            "longitude": longitude,
            "proof_file_url": proof_file_url,
            "proof_file_path": proof_file_path,
            "status": "pending",
        }).execute()
        return self.ok({
            "message": "Solicitud enviada. El administrador revisará tu documentación.",
            "request": request_row.data[0],
        }, status_code=201)

    def get_my_request(self, user_id):
        result = (
            self.admin_client.table("verification_requests")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return self.ok({"request": result.data[0] if result.data else None})
