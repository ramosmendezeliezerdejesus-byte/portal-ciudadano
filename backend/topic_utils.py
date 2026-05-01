TOPIC_OPTIONS = {
    "servicios_publicos": "Servicios publicos",
    "infraestructura": "Infraestructura",
    "seguridad": "Seguridad",
    "ambiente": "Medio ambiente",
    "educacion": "Educacion",
    "salud": "Salud",
    "transporte": "Transporte",
    "participacion": "Participacion ciudadana",
    "emergencias": "Emergencias",
    "limpieza": "Limpieza",
}


def normalize_topic_keys(values):
    if not isinstance(values, list):
        return []

    normalized = []
    for value in values:
        key = str(value or "").strip().lower()
        if key and key in TOPIC_OPTIONS and key not in normalized:
            normalized.append(key)
    return normalized


def topic_label(topic_key):
    return TOPIC_OPTIONS.get(topic_key, "Tema general")


def topics_for_content(content_type, category):
    current = str(category or "").strip().lower()
    mapping = {
        "proposal": {
            "infraestructura": ["infraestructura"],
            "seguridad": ["seguridad"],
            "ambiente": ["ambiente"],
            "educacion": ["educacion"],
            "salud": ["salud"],
            "transporte": ["transporte"],
            "otro": ["participacion"],
        },
        "report": {
            "infraestructura": ["infraestructura"],
            "seguridad": ["seguridad", "emergencias"],
            "ambiente": ["ambiente", "limpieza"],
            "educacion": ["educacion"],
            "salud": ["salud"],
            "transporte": ["transporte"],
            "otro": ["participacion"],
        },
        "service_request": {
            "electricidad": ["servicios_publicos"],
            "agua": ["servicios_publicos", "salud"],
            "basura": ["servicios_publicos", "limpieza"],
            "alumbrado": ["servicios_publicos", "seguridad"],
            "alcantarillado": ["servicios_publicos", "salud"],
            "calles": ["servicios_publicos", "infraestructura"],
            "transporte": ["servicios_publicos", "transporte"],
            "otro": ["servicios_publicos"],
        },
        "meeting": {
            "general": ["participacion"],
            "presupuesto": ["participacion"],
            "transporte": ["transporte"],
            "seguridad": ["seguridad"],
            "ambiente": ["ambiente", "limpieza"],
            "educacion": ["educacion"],
        },
        "campaign": {
            "servicios_publicos": ["servicios_publicos"],
            "infraestructura": ["infraestructura"],
            "seguridad": ["seguridad"],
            "ambiente": ["ambiente"],
            "educacion": ["educacion"],
            "salud": ["salud"],
            "transporte": ["transporte"],
            "participacion": ["participacion"],
            "emergencias": ["emergencias"],
            "limpieza": ["limpieza"],
        },
    }
    return normalize_topic_keys(mapping.get(content_type, {}).get(current, ["participacion"]))
