from better_profanity import profanity


class ModerationService:
    spanish_words = [
        "coño", "mierda", "puta", "puto", "pendejo", "pendeja", "cabron", "cabrona",
        "joder", "gilipollas", "imbecil", "idiota", "estupido", "estupida", "maricón",
        "maricon", "marica", "chinga", "chingada", "chingado", "verga", "pinga", "culo",
        "culero", "culera", "carajo", "hdp", "hijodeputa", "hp", "desgraciado", "maldito",
        "bastardo", "mamon", "culiao", "weon", "huevon", "malparido", "gonorrea",
        "singa", "singao", "singá", "comemierda", "mamabicho", "mamaguevo", "mamagüevo",
        "bicho", "coñazo", "jodido", "cabronazo", "mondá", "culicagao", "fangoso",
        "penco", "bozal", "ojete", "mamao", "malparida", "desgraciada", "maldita",
        "singadera", "come mierda", "mama bicho", "mama guevo", "tu madre", "tu mai","mmg",
    ]

    def __init__(self):
        profanity.load_censor_words()
        profanity.add_censor_words(self.spanish_words)

    def contains_profanity(self, text: str) -> bool:
        if not text or not text.strip():
            return False
        return profanity.contains_profanity(text)


moderation_service = ModerationService()


def contains_profanity(text: str) -> bool:
    return moderation_service.contains_profanity(text)
