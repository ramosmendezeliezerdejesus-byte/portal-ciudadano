import uuid

from services.base import BaseService, ValidationError


class UploadService(BaseService):
    def _upload_file(self, *, file_storage, bucket, allowed_types, max_size_mb, user_id, error_label, signed_url=False):
        if not file_storage:
            raise ValidationError(f"No se encontro {error_label}")

        content_type = file_storage.content_type or ""
        if content_type not in allowed_types:
            if error_label == "ninguna imagen":
                raise ValidationError("Tipo de archivo no permitido. Solo JPG, PNG, GIF o WebP.")
            if error_label == "el archivo":
                raise ValidationError("Solo se permiten PDF, Word, JPG, PNG, WebP o videos compatibles")
            raise ValidationError("Solo se permiten videos MP4, MOV o WebM")

        file_bytes = file_storage.read()
        if len(file_bytes) > max_size_mb * 1024 * 1024:
            if error_label == "ninguna imagen":
                raise ValidationError(f"La imagen supera el limite de {max_size_mb}MB")
            if error_label == "el archivo":
                raise ValidationError(f"El archivo supera el limite de {max_size_mb}MB")
            raise ValidationError(f"El video supera el limite de {max_size_mb}MB")

        extension = (
            content_type.split("/")[-1]
            .replace("jpeg", "jpg")
            .replace("quicktime", "mov")
            .replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "docx")
            .replace("msword", "doc")
        )
        file_name = f"{user_id}/{uuid.uuid4()}.{extension}"
        self.admin_client.storage.from_(bucket).upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )

        if signed_url:
            signed = self.admin_client.storage.from_(bucket).create_signed_url(file_name, 31536000)
            return {"url": signed["signedURL"], "path": file_name}
        return {"url": self.admin_client.storage.from_(bucket).get_public_url(file_name), "path": file_name}

    def upload_image(self, file_storage, user_id, storage_settings):
        payload = self._upload_file(
            file_storage=file_storage,
            bucket=storage_settings.storage_bucket,
            allowed_types=storage_settings.allowed_types,
            max_size_mb=storage_settings.max_size_mb,
            user_id=user_id,
            error_label="ninguna imagen",
        )
        return self.ok(payload)

    def upload_proof(self, file_storage, user_id, storage_settings):
        payload = self._upload_file(
            file_storage=file_storage,
            bucket=storage_settings.verification_bucket,
            allowed_types=storage_settings.allowed_proof_types,
            max_size_mb=storage_settings.max_proof_mb,
            user_id=user_id,
            error_label="el archivo",
            signed_url=True,
        )
        return self.ok(payload)

    def upload_video(self, file_storage, user_id, storage_settings):
        payload = self._upload_file(
            file_storage=file_storage,
            bucket=storage_settings.video_bucket,
            allowed_types=storage_settings.allowed_video_types,
            max_size_mb=storage_settings.max_video_mb,
            user_id=user_id,
            error_label="ningun video",
        )
        return self.ok(payload)

    def upload_public_file(self, file_storage, user_id, storage_settings):
        allowed_types = (
            set(storage_settings.allowed_types)
            | set(storage_settings.allowed_proof_types)
            | set(storage_settings.allowed_video_types)
            | {
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
        )
        payload = self._upload_file(
            file_storage=file_storage,
            bucket=storage_settings.storage_bucket,
            allowed_types=frozenset(allowed_types),
            max_size_mb=max(storage_settings.max_size_mb, storage_settings.max_video_mb),
            user_id=user_id,
            error_label="el archivo",
        )
        return self.ok(payload)
