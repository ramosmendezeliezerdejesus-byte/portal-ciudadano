from config import supabase, supabase_admin


class MeetingDataService:
    def __init__(self, public_client, admin_client):
        self.public_client = public_client
        self.admin_client = admin_client

    def attach_profiles_and_rsvp(self, meetings_data):
        if not meetings_data:
            return []

        user_ids = list({meeting["user_id"] for meeting in meetings_data})
        profiles_res = (
            self.admin_client.table("profiles")
            .select("id, username, full_name, avatar_initials, role, verified")
            .in_("id", user_ids)
            .execute()
        )
        profiles_map = {profile["id"]: profile for profile in (profiles_res.data or [])}

        result = []
        for meeting in meetings_data:
            meeting["profiles"] = profiles_map.get(
                meeting["user_id"],
                {
                    "username": "usuario",
                    "full_name": "Usuario",
                    "avatar_initials": "US",
                    "role": "user",
                    "verified": False,
                },
            )
            rsvp_res = (
                self.public_client.table("meeting_rsvp")
                .select("user_id")
                .eq("meeting_id", meeting["id"])
                .execute()
            )
            rsvp_list = rsvp_res.data or []
            if rsvp_list:
                rsvp_user_ids = [rsvp["user_id"] for rsvp in rsvp_list]
                rsvp_profiles_res = (
                    self.admin_client.table("profiles")
                    .select("id, username, avatar_initials, role")
                    .in_("id", rsvp_user_ids)
                    .execute()
                )
                rsvp_profiles_map = {profile["id"]: profile for profile in (rsvp_profiles_res.data or [])}
                for rsvp in rsvp_list:
                    rsvp["profiles"] = rsvp_profiles_map.get(rsvp["user_id"], {"avatar_initials": "US"})
            meeting["rsvp_users"] = rsvp_list
            meeting["rsvp_count"] = len(rsvp_list)
            result.append(meeting)
        return result


meeting_data_service = MeetingDataService(supabase, supabase_admin)


def attach_profiles_and_rsvp(meetings_data):
    return meeting_data_service.attach_profiles_and_rsvp(meetings_data)
