import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { toggleDark } from "../App";
import NavMenu from "../components/NavMenu";
import { useAuth } from "../context/AuthContext";

const CATEGORY_COLORS = {
  infraestructura: "bg-orange-100 text-orange-700",
  seguridad: "bg-red-100 text-red-700",
  ambiente: "bg-green-100 text-green-700",
  educacion: "bg-purple-100 text-purple-700",
  salud: "bg-pink-100 text-pink-700",
  transporte: "bg-blue-100 text-blue-700",
  otro: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABELS = {
  infraestructura: "Infraestructura",
  seguridad: "Seguridad",
  ambiente: "Medio Ambiente",
  educacion: "Educacion",
  salud: "Salud",
  transporte: "Transporte",
  otro: "Otro",
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "Ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

function fmtNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n ?? 0);
}

function fmtMeetingDate(dateStr, timeStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T${timeStr || "00:00:00"}`);
  return date.toLocaleString("es-DO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isPollClosed(endsAt) {
  return endsAt ? new Date(endsAt).getTime() < Date.now() : false;
}

function RoleBadge({ role, verified }) {
  if (role === "super_admin") return <span title="Super Admin" className="text-gray-800 dark:text-gray-200"><i className="fas fa-shield-alt text-xs"></i></span>;
  if (role === "diputado") return <span title="Diputado" className="text-amber-400"><i className="fas fa-star text-xs"></i></span>;
  if (role === "presidente_junta") return <span title="Presidente de Junta" className="text-green-500"><i className="fas fa-home text-xs"></i></span>;
  if (verified || role === "verified") return <span title="Verificado" className="text-brand-teal"><i className="fas fa-check-circle text-xs"></i></span>;
  return null;
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card-soft rounded-2xl p-4 border border-brand-teal/10 flex items-center gap-4 shadow-soft slide-in">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <i className={`fas ${icon} text-white text-lg`}></i>
      </div>
      <div>
        <p className="text-2xl font-bold font-serif text-brand-navy dark:text-brand-cream">{fmtNum(value)}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, getPublicProfile, toggleFollow, toggleLike, votePoll, toggleRSVP } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [polls, setPolls] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const [following, setFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const activityRef = useRef(null);

  const isMe = user?.username === username;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPublicProfile(username);
      setProfile(data.profile);
      setPosts(data.posts ?? []);
      setProposals(data.proposals ?? []);
      setPolls(data.polls ?? []);
      setMeetings(data.meetings ?? []);
      setFollowing(Boolean(data.is_following));
      setFollowCount(data.profile?.followers_count ?? 0);
    } catch (err) {
      setError(err.message || "No se pudo cargar el perfil.");
    }
    setLoading(false);
  }, [getPublicProfile, username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleFollow() {
    if (followLoading || isMe) return;
    setFollowLoading(true);
    try {
      const res = await toggleFollow(username);
      setFollowing(res.following);
      setFollowCount(res.followers_count ?? 0);
    } catch (_) {}
    setFollowLoading(false);
  }

  async function handleLike(postId) {
    try {
      const { liked, count } = await toggleLike(postId);
      setPosts(prev => prev.map(post => (
        post.id === postId
          ? { ...post, user_has_liked: liked, likes_count: count }
          : post
      )));
    } catch (_) {}
  }

  async function handleVote(pollId, optionId) {
    try {
      const result = await votePoll(pollId, optionId);
      if (!result.poll) return;
      setPolls(prev => prev.map(poll => poll.id === pollId ? result.poll : poll));
    } catch (_) {}
  }

  async function handleRSVP(meetingId) {
    try {
      const data = await toggleRSVP(meetingId);
      setMeetings(prev => prev.map(meeting => {
        if (meeting.id !== meetingId) return meeting;
        const rsvp_users = data.attending
          ? [...(meeting.rsvp_users ?? []), { user_id: user?.id }]
          : (meeting.rsvp_users ?? []).filter(item => item.user_id !== user?.id);
        return { ...meeting, rsvp_users, rsvp_count: data.count };
      }));
    } catch (_) {}
  }

  function scrollToActivity() {
    activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-bg flex items-center justify-center">
            <i className="fas fa-user text-white text-2xl animate-pulse"></i>
          </div>
          <p className="text-brand-teal font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="text-center card-soft rounded-2xl p-8 max-w-sm border border-brand-teal/10">
          <i className="fas fa-user-slash text-brand-teal/40 text-5xl mb-4"></i>
          <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream mb-2">Usuario no encontrado</h2>
          <p className="text-gray-400 text-sm mb-5">No existe ningun usuario con ese nombre.</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 btn-warm text-white font-semibold rounded-xl text-sm">
            <i className="fas fa-home mr-2"></i>Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "posts", label: "Posts", icon: "fa-newspaper", count: posts.length },
    { id: "propuestas", label: "Propuestas", icon: "fa-bullhorn", count: proposals.length },
    { id: "encuestas", label: "Encuestas", icon: "fa-poll", count: polls.length },
    { id: "reuniones", label: "Reuniones", icon: "fa-calendar-alt", count: meetings.length },
  ];

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-brand-teal transition-colors border border-brand-teal/20">
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div>
              <h1 className="font-serif font-bold text-brand-navy dark:text-brand-cream text-base leading-none">@{username}</h1>
              <p className="text-xs text-gray-400">
                {profile.posts_count + profile.proposals_count + profile.polls_count + profile.meetings_count} actividades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className="w-9 h-9 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20">
              <i className="fas fa-moon dark:hidden text-brand-navy text-sm"></i>
              <i className="fas fa-sun hidden dark:block text-brand-terracotta text-sm"></i>
            </button>
            <NavMenu currentPath={`/u/${username}`} />
          </div>
        </div>
      </header>

      <main className="pt-20 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
          <div className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
            <div className="h-28 gradient-bg relative">
              <div
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }}
              />
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-10 mb-4 gap-3">
                <div className="w-20 h-20 rounded-2xl avatar-teal flex items-center justify-center text-white font-bold text-2xl border-4 border-white dark:border-brand-navy shadow-lg shrink-0">
                  {profile.avatar_initials ?? "US"}
                </div>

                {!isMe ? (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`mb-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                      following
                        ? "border border-brand-teal text-brand-teal hover:bg-red-50 hover:border-red-400 hover:text-red-500 dark:hover:bg-red-900/20"
                        : "border border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
                    }`}
                  >
                    {followLoading ? "Procesando..." : following ? "Siguiendo" : "Seguir"}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/perfil")}
                    className="mb-1 px-4 py-2 rounded-xl border border-brand-teal text-brand-teal text-sm font-semibold hover:bg-brand-teal hover:text-white transition-all"
                  >
                    <i className="fas fa-edit mr-2"></i>Editar perfil
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">{profile.full_name}</h2>
                  <RoleBadge role={profile.role} verified={profile.verified} />
                </div>
                <p className="text-brand-teal text-sm font-medium">@{profile.username}</p>
                {profile.email && (
                  <p className="text-gray-400 text-sm flex items-center gap-1.5">
                    <i className="fas fa-envelope text-xs"></i>
                    {profile.email}
                  </p>
                )}
                {profile.province && (
                  <p className="text-gray-400 text-sm flex items-center gap-1.5">
                    <i className="fas fa-map-marker-alt text-xs"></i>
                    {profile.province}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 whitespace-pre-line leading-relaxed">{profile.bio}</p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 flex items-center gap-1.5">
                  <i className="fas fa-landmark text-brand-teal/60 text-xs"></i>
                  Ciudadano activo del Portal
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon="fa-newspaper"
              label="Publicaciones"
              value={profile.posts_count + profile.proposals_count}
              color="gradient-bg-warm"
            />
            <StatCard
              icon="fa-users"
              label="Seguidores"
              value={followCount}
              color="gradient-bg"
            />
            <StatCard
              icon="fa-poll"
              label="Encuestas"
              value={profile.polls_count}
              color="avatar-teal"
            />
            <StatCard
              icon="fa-calendar-alt"
              label="Reuniones"
              value={profile.meetings_count}
              color="avatar-navy"
            />
          </div>

          <div>
            <button
              onClick={scrollToActivity}
              className="w-full rounded-xl border border-brand-teal text-brand-teal text-sm font-semibold py-3 hover:bg-brand-teal hover:text-white transition-all"
            >
              Ver actividad
            </button>
          </div>

          <div ref={activityRef} className="card-soft rounded-2xl border border-brand-teal/10 shadow-soft overflow-hidden slide-in">
            <div className="flex border-b border-brand-teal/10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all relative ${
                  activeTab === tab.id ? "text-brand-teal font-semibold" : "text-gray-500 hover:text-brand-navy dark:hover:text-brand-cream"
                }`}
              >
                <i className={`fas ${tab.icon} text-xs`}></i>
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? "bg-brand-teal/10 text-brand-teal" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                  {tab.count}
                </span>
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal rounded-full" />}
              </button>
            ))}
            </div>
          </div>

          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="card-soft rounded-2xl p-10 text-center border border-brand-teal/10">
                  <i className="fas fa-feather-alt text-brand-teal/30 text-4xl mb-3"></i>
                  <p className="text-gray-400 text-sm">Este usuario aun no ha publicado nada.</p>
                </div>
              ) : posts.map(post => (
                <article key={post.id} className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden slide-in">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full avatar-teal flex items-center justify-center text-white font-bold text-sm">
                        {profile.avatar_initials ?? "US"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-brand-navy dark:text-brand-cream">{profile.full_name}</span>
                          <RoleBadge role={profile.role} verified={profile.verified} />
                        </div>
                        <span className="text-xs text-gray-400">@{profile.username} · {fmtDate(post.created_at)}</span>
                      </div>
                    </div>
                    {post.content && <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>}
                    {post.image_url && <div className="rounded-xl overflow-hidden border border-brand-teal/10 mb-3"><img src={post.image_url} alt="" className="w-full max-h-80 object-cover" /></div>}
                    {post.video_url && <div className="rounded-xl overflow-hidden border border-brand-teal/10 mb-3"><video src={post.video_url} controls className="w-full max-h-80 bg-black" /></div>}
                    <div className="flex items-center gap-3 pt-3 border-t border-brand-teal/10">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 text-sm transition-colors ${post.user_has_liked ? "text-brand-terracotta" : "text-gray-500 hover:text-brand-terracotta"}`}
                      >
                        <i className={`${post.user_has_liked ? "fas" : "far"} fa-heart`}></i>
                        <span>{fmtNum(post.likes_count)}</span>
                      </button>
                      <span className="text-sm text-gray-400">
                        <i className="far fa-comment mr-1"></i>{fmtNum(post.comments_count)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === "propuestas" && (
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <div className="card-soft rounded-2xl p-10 text-center border border-brand-teal/10">
                  <i className="fas fa-bullhorn text-brand-teal/30 text-4xl mb-3"></i>
                  <p className="text-gray-400 text-sm">Este usuario aun no ha hecho propuestas.</p>
                </div>
              ) : proposals.map(proposal => (
                <div key={proposal.id} className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 overflow-hidden slide-in">
                  {proposal.image_url && <img src={proposal.image_url} alt="" className="w-full h-40 object-cover" />}
                  <div className="p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[proposal.category] ?? CATEGORY_COLORS.otro}`}>
                        {CATEGORY_LABELS[proposal.category] ?? "Otro"}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-teal/10 text-brand-teal">
                        {proposal.status === "en_gestion" ? "En gestion" : proposal.status === "resuelta" ? "Resuelta" : "Recibida"}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream mb-1">{proposal.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-3">{proposal.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                      {proposal.location_text && <span><i className="fas fa-map-marker-alt text-brand-terracotta mr-1"></i>{proposal.location_text}</span>}
                      <span><i className="far fa-heart mr-1"></i>{fmtNum(proposal.votes_count)}</span>
                      <span><i className="far fa-comment mr-1"></i>{fmtNum(proposal.comments_count)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "encuestas" && (
            <div className="space-y-4">
              {polls.length === 0 ? (
                <div className="card-soft rounded-2xl p-10 text-center border border-brand-teal/10">
                  <i className="fas fa-poll text-brand-teal/30 text-4xl mb-3"></i>
                  <p className="text-gray-400 text-sm">Este usuario aun no ha creado encuestas.</p>
                </div>
              ) : polls.map(poll => {
                const closed = isPollClosed(poll.ends_at);
                return (
                  <div key={poll.id} className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 p-4 slide-in">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">{poll.question}</h3>
                        {poll.description && <p className="text-sm text-gray-500 mt-1">{poll.description}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${closed ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                        {closed ? "Cerrada" : "Activa"}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {poll.options.map(option => {
                        const selected = poll.user_vote === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => !closed && handleVote(poll.id, option.id)}
                            disabled={closed}
                            className={`w-full text-left rounded-xl border p-3 transition-all ${
                              selected
                                ? "border-brand-teal bg-brand-teal/10"
                                : "border-brand-teal/10 hover:border-brand-teal/30 hover:bg-brand-teal/5"
                            } ${closed ? "cursor-default" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="font-medium text-sm text-brand-navy dark:text-brand-cream">{option.text}</span>
                              <span className="text-xs text-gray-400">{option.percent}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-brand-cream dark:bg-brand-navy/40 overflow-hidden">
                              <div className={`h-full ${selected ? "bg-brand-teal" : "bg-brand-terracotta/60"}`} style={{ width: `${option.percent}%` }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                      <span>{fmtNum(poll.total_votes)} votos</span>
                      <span>{poll.ends_at ? `Cierra ${fmtDate(poll.ends_at)}` : "Sin fecha de cierre"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "reuniones" && (
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="card-soft rounded-2xl p-10 text-center border border-brand-teal/10">
                  <i className="fas fa-calendar-alt text-brand-teal/30 text-4xl mb-3"></i>
                  <p className="text-gray-400 text-sm">Este usuario aun no ha convocado reuniones.</p>
                </div>
              ) : meetings.map(meeting => {
                const attending = Boolean((meeting.rsvp_users ?? []).some(item => item.user_id === user?.id));
                return (
                  <div key={meeting.id} className="card-soft rounded-2xl shadow-soft border border-brand-teal/10 p-4 slide-in">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-serif font-bold text-brand-navy dark:text-brand-cream">{meeting.title}</h3>
                        {meeting.description && <p className="text-sm text-gray-500 mt-1">{meeting.description}</p>}
                      </div>
                      <button
                        onClick={() => handleRSVP(meeting.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          attending
                            ? "border border-brand-teal text-brand-teal hover:bg-brand-teal/5"
                            : "btn-warm text-white"
                        }`}
                      >
                        {attending ? "Asistire" : "Confirmar asistencia"}
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-500">
                      <p><i className="fas fa-clock text-brand-teal mr-2"></i>{fmtMeetingDate(meeting.date, meeting.time)}</p>
                      <p><i className="fas fa-map-marker-alt text-brand-terracotta mr-2"></i>{meeting.location}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-3 pt-3 border-t border-brand-teal/10">
                      <span><i className="fas fa-users mr-1"></i>{fmtNum(meeting.rsvp_count ?? 0)} asistentes</span>
                      <span><i className="fas fa-tag mr-1"></i>{meeting.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
