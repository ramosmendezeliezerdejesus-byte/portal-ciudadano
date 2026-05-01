import os
from dataclasses import dataclass

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


@dataclass(frozen=True)
class StorageSettings:
    storage_bucket: str = "post-images"
    verification_bucket: str = "verification-docs"
    video_bucket: str = "post-videos"
    allowed_types: frozenset[str] = frozenset({"image/jpeg", "image/png", "image/gif", "image/webp"})
    allowed_proof_types: frozenset[str] = frozenset({"image/jpeg", "image/png", "image/webp", "application/pdf"})
    allowed_video_types: frozenset[str] = frozenset({"video/mp4", "video/quicktime", "video/webm"})
    max_size_mb: int = 5
    max_proof_mb: int = 10
    max_video_mb: int = 100


@dataclass(frozen=True)
class SupabaseSettings:
    url: str | None
    key: str | None
    service_key: str | None

    @classmethod
    def from_env(cls) -> "SupabaseSettings":
        return cls(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_KEY"),
            service_key=os.getenv("SUPABASE_SERVICE_KEY"),
        )


class SupabaseClientFactory:
    def __init__(self, settings: SupabaseSettings):
        self._settings = settings
        self._public_client: Client | None = None
        self._admin_client: Client | None = None

    def get_public_client(self) -> Client:
        if self._public_client is None:
            self._public_client = create_client(self._settings.url, self._settings.key)
        return self._public_client

    def get_admin_client(self) -> Client:
        if self._admin_client is None:
            self._admin_client = create_client(self._settings.url, self._settings.service_key)
        return self._admin_client


class LazyClientProxy:
    def __init__(self, resolver):
        self._resolver = resolver

    def __getattr__(self, item):
        return getattr(self._resolver(), item)


class AppContainer:
    def __init__(self):
        self.supabase_settings = SupabaseSettings.from_env()
        self.storage = StorageSettings()
        self.clients = SupabaseClientFactory(self.supabase_settings)


container = AppContainer()

supabase: Client = LazyClientProxy(container.clients.get_public_client)
supabase_admin: Client = LazyClientProxy(container.clients.get_admin_client)

STORAGE_BUCKET = container.storage.storage_bucket
VERIFICATION_BUCKET = container.storage.verification_bucket
VIDEO_BUCKET = container.storage.video_bucket
ALLOWED_TYPES = container.storage.allowed_types
ALLOWED_PROOF_TYPES = container.storage.allowed_proof_types
ALLOWED_VIDEO_TYPES = container.storage.allowed_video_types
MAX_SIZE_MB = container.storage.max_size_mb
MAX_PROOF_MB = container.storage.max_proof_mb
MAX_VIDEO_MB = container.storage.max_video_mb
