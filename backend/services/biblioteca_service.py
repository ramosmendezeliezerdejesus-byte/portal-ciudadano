from services.base import BaseService


class BibliotecaService(BaseService):
    valid_categories = {"infraestructura", "seguridad", "ambiente", "educacion", "salud", "transporte", "otro"}
    valid_types = {"propuesta", "denuncia"}

    def get_items(self, category="", search="", case_type=""):
        query = (
            self.admin_client.table("biblioteca_casos")
            .select("*")
            .order("managed_at", desc=True)
        )
        if category and category in self.valid_categories:
            query = query.eq("category", category)
        if case_type and case_type in self.valid_types:
            query = query.eq("case_type", case_type)
        if search:
            query = query.ilike("title", f"%{search}%")
        result = query.execute()
        return self.ok({"items": result.data or []})
