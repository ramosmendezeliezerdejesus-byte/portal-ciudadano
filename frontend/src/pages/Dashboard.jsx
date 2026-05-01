import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { toggleDark } from "../App";
import NavMenu from "../components/NavMenu";
import InterestOnboardingModal from "../components/InterestOnboardingModal";
import { topicLabel } from "../utils/topics";

const HASHTAG_REGEX = /(#[\p{L}\p{N}_]+)/gu;

const CATEGORY_COLORS = {
  presupuesto: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  transporte:  { dot: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400" },
  seguridad:   { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400" },
  ambiente:    { dot: "bg-teal-500",    text: "text-teal-600 dark:text-teal-400" },
  educacion:   { dot: "bg-purple-500",  text: "text-purple-600 dark:text-purple-400" },
  general:     { dot: "bg-gray-400",    text: "text-gray-500 dark:text-gray-400" },
};

// ── RoleBadge ──────────────────────────────────────────────────────────────
function RoleBadge({ role, verified }) {
  if (role === "super_admin") {
    return (
      <span title="Administrador del Portal">
        <i className="fas fa-shield-alt text-gray-900 dark:text-white text-sm drop-shadow"></i>
      </span>
    );
  }
  if (verified || role === "verified") {
    return (
      <span title="Usuario verificado">
        <i className="fas fa-check-circle text-brand-teal text-sm"></i>
      </span>
    );
  }
  return null;
}

// ── Utils ──────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n;
}

function fmtDate(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60)    return "Ahora";
  if (diff < 3600)  return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

function isHashtagToken(value) {
  return /^#[\p{L}\p{N}_]+$/u.test(value);
}

function renderContentWithHashtags(content, onTagClick) {
  const parts = String(content ?? "").split(HASHTAG_REGEX);
  return parts.map((part, index) => {
    if (!isHashtagToken(part)) return <span key={`text-${index}`}>{part}</span>;
    return (
      <button
        key={`tag-${index}`}
        type="button"
        onClick={() => onTagClick?.(part)}
        className="font-semibold text-brand-teal hover:text-brand-terracotta transition-colors"
      >
        {part}
      </button>
    );
  });
}

function fmtMeetingDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime())    return "Hoy";
  if (d.getTime() === tomorrow.getTime()) return "Mañana";
  return d.toLocaleDateString("es-DO", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function isUpcoming(dateStr) {
  return new Date(dateStr + "T23:59:59") >= new Date();
}

// ── PostCard ───────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, onLike, onDelete, onComment, onDeleteComment, onRepost, onSave, onTagClick }) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [imgOpen,       setImgOpen]       = useState(false);
  const [showComments,  setShowComments]  = useState(false);
  const [commentText,   setCommentText]   = useState("");
  const [commenting,    setCommenting]    = useState(false);
  const [commentError,  setCommentError]  = useState("");
  const profile  = post.profiles ?? {};
  const initials = profile.avatar_initials ?? "US";
  const name     = profile.full_name  ?? "Usuario";
  const username = profile.username   ?? "usuario";
  const verified = profile.verified   ?? false;
  const isOwner  = post.user_id === currentUserId;
  const comments = post._comments ?? [];

  async function handleComment() {
    if (!commentText.trim() || commenting) return;
    setCommenting(true);
    setCommentError("");
    try {
      await onComment(post.id, commentText.trim());
      setCommentText("");
    } catch (err) {
      setCommentError(err.message === "EMAIL_NOT_CONFIRMED"
        ? "Debes verificar tu correo para comentar."
        : err.message || "Error al comentar");
    }
    setCommenting(false);
  }

  return (
    <>
      <article className="card-soft rounded-2xl shadow-soft slide-in overflow-hidden border border-brand-teal/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                onClick={() => !isOwner && window.location.assign(`/u/${username}`)}
                className={`w-11 h-11 rounded-full avatar-teal flex items-center justify-center text-white font-bold ${!isOwner ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
              >{initials}</div>
              <div>
                <div className="flex items-center gap-1">
                  <span
                    onClick={() => !isOwner && window.location.assign(`/u/${username}`)}
                    className={`font-semibold text-brand-navy dark:text-brand-cream ${!isOwner ? "cursor-pointer hover:text-brand-teal transition-colors" : ""}`}
                  >{name}</span>
                  <RoleBadge role={profile.role} verified={verified} />
                </div>
                <span className="text-sm text-gray-500">@{username} · {fmtDate(post.created_at)}</span>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="w-8 h-8 rounded-full hover:bg-brand-teal/10 flex items-center justify-center text-gray-400 transition-colors"
              >
                <i className="fas fa-ellipsis-h"></i>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-40 bg-white dark:bg-brand-navy border border-brand-teal/20 rounded-xl shadow-lg z-20 overflow-hidden"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {isOwner ? (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors"
                    >
                      <i className="fas fa-trash-alt"></i> Eliminar post
                    </button>
                  ) : (
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 text-sm transition-colors"
                    >
                      <i className="fas fa-flag"></i> Reportar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {post.content && (
            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line break-words mb-3">
              {renderContentWithHashtags(post.content, onTagClick)}
            </p>
          )}

          {post.image_url && (
            <div
              className="mb-3 rounded-xl overflow-hidden cursor-pointer border border-brand-teal/10"
              onClick={() => setImgOpen(true)}
            >
              <img
                src={post.image_url}
                alt="Imagen del post"
                className="w-full max-h-80 object-cover hover:opacity-95 transition-opacity"
              />
            </div>
          )}

          {post.video_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-brand-teal/10">
              <video
                src={post.video_url}
                controls
                className="w-full max-h-80 bg-black"
                preload="metadata"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-brand-teal/10">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-2 transition-colors group ${post._liked ? "text-brand-terracotta" : "text-gray-500 hover:text-brand-terracotta"}`}
            >
              <span className="w-9 h-9 rounded-full group-hover:bg-brand-terracotta/10 flex items-center justify-center transition-colors">
                <i className={`${post._liked ? "fas" : "far"} fa-heart`}></i>
              </span>
              <span className="text-sm">{fmtNum(post._likes ?? 0)}</span>
            </button>
            <button
              onClick={() => setShowComments(s => !s)}
              className={`flex items-center gap-2 transition-colors group ${showComments ? "text-brand-teal" : "text-gray-500 hover:text-brand-teal"}`}
            >
              <span className="w-9 h-9 rounded-full group-hover:bg-brand-teal/10 flex items-center justify-center transition-colors">
                <i className={`${showComments ? "fas" : "far"} fa-comment`}></i>
              </span>
              <span className="text-sm">{fmtNum(comments.length)}</span>
            </button>
            <button
              onClick={() => onRepost(post.id)}
              className={`flex items-center gap-2 transition-colors group ${post._reposted ? "text-green-600" : "text-gray-500 hover:text-green-600"}`}
            >
              <span className="w-9 h-9 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20 flex items-center justify-center transition-colors">
                <i className="fas fa-retweet"></i>
              </span>
              <span className="text-sm">{fmtNum(post._reposts ?? 0)}</span>
            </button>
            <button
              onClick={() => onSave(post.id)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${post._saved ? "text-brand-teal bg-brand-teal/10" : "text-gray-500 hover:text-brand-teal hover:bg-brand-teal/10"}`}
            >
              <i className={`${post._saved ? "fas" : "far"} fa-bookmark`}></i>
            </button>
          </div>

          {/* ── Sección de comentarios ── */}
          {showComments && (
            <div className="pt-3 border-t border-brand-teal/10 space-y-3">

              {/* Lista de comentarios */}
              {comments.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-hide">
                  {comments.map(c => {
                    const cp = c.profiles ?? {};
                    const isMyComment = c.user_id === currentUserId;
                    return (
                      <div key={c.id} className="flex gap-2.5 group">
                        <div className="w-8 h-8 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {cp.avatar_initials ?? "US"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-brand-cream dark:bg-brand-navy/30 rounded-2xl px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-semibold text-brand-navy dark:text-brand-cream">
                                {cp.full_name ?? "Usuario"}
                              </span>
                              <span className="text-[10px] text-gray-400">@{cp.username ?? "usuario"}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{c.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 px-2">
                            <span className="text-[10px] text-gray-400">{fmtDate(c.created_at)}</span>
                            {isMyComment && (
                              <button
                                onClick={() => onDeleteComment(post.id, c.id)}
                                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {comments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Sé el primero en comentar
                </p>
              )}

              {/* Input nuevo comentario */}
              <div className="flex gap-2.5 items-start">
                <div className="w-8 h-8 rounded-full avatar-teal flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {post._myInitials ?? "TU"}
                </div>
                <div className="flex-1">
                  <div className="flex gap-2">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
                      placeholder="Escribe un comentario..."
                      maxLength={300}
                      className="flex-1 px-3 py-2 rounded-2xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:outline-none text-sm transition-all"
                    />
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim() || commenting}
                      className="w-9 h-9 rounded-full btn-warm flex items-center justify-center text-white disabled:opacity-40 transition-all shrink-0"
                    >
                      {commenting
                        ? <i className="fas fa-spinner fa-spin text-xs"></i>
                        : <i className="fas fa-paper-plane text-xs"></i>
                      }
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-xs text-red-500 mt-1 px-1">{commentError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </article>

      {imgOpen && post.image_url && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setImgOpen(false)}
        >
          <button
            onClick={() => setImgOpen(false)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-brand-terracotta transition-colors z-10"
          >
            <i className="fas fa-times"></i>
          </button>
          <img
            src={post.image_url}
            alt="Imagen ampliada"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── SidebarAgenda ──────────────────────────────────────────────────────────
function HashtagModal({ tag, posts, loading, onClose, onLike, onDelete, onComment, onDeleteComment, currentUserId, onTagClick }) {
  return (
    <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[88vh] card-soft rounded-3xl shadow-2xl border border-brand-teal/20 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-brand-teal/10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-teal font-semibold">Tendencia</p>
            <h3 className="font-serif font-bold text-xl text-brand-navy dark:text-brand-cream">{tag}</h3>
            <p className="text-sm text-gray-500">{loading ? "Buscando mensajes..." : `${posts.length} mensaje${posts.length === 1 ? "" : "s"} encontrados`}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-brand-teal/10 flex items-center justify-center text-gray-400 hover:text-brand-navy dark:hover:text-brand-cream transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 scrollbar-hide">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-2xl animate-pulse bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/10" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-cream dark:bg-brand-navy/40 border border-brand-teal/20 flex items-center justify-center">
                <i className="fas fa-hashtag text-brand-teal/50 text-xl"></i>
              </div>
              <p className="font-semibold text-brand-navy dark:text-brand-cream mb-1">Todavía no hay mensajes para este hashtag</p>
              <p className="text-sm text-gray-500">Cuando más personas lo usen, aparecerán aquí.</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={`hashtag-${post.id}`}
                post={post}
                currentUserId={currentUserId}
                onLike={onLike}
                onDelete={onDelete}
                onComment={onComment}
                onDeleteComment={onDeleteComment}
                onTagClick={onTagClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarAgenda({ meetings, onViewAll, onRSVP, currentUserId }) {
  const upcoming = meetings
    .filter(m => isUpcoming(m.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  return (
    <div className="card-soft rounded-2xl p-4 shadow-soft slide-in border border-brand-teal/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif font-bold text-sm text-brand-navy dark:text-brand-cream flex items-center gap-2">
          <i className="fas fa-calendar-alt text-brand-teal"></i>
          Próximas reuniones
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs text-brand-teal hover:text-brand-terracotta font-semibold transition-colors"
        >
          Ver todas →
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-4">
          <i className="fas fa-calendar-times text-brand-teal/20 text-2xl mb-2"></i>
          <p className="text-xs text-gray-400">Sin reuniones próximas</p>
          <button
            onClick={onViewAll}
            className="mt-2 text-xs text-brand-teal hover:underline font-medium"
          >
            + Convocar una
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map(meeting => {
            const cat        = CATEGORY_COLORS[meeting.category] ?? CATEGORY_COLORS.general;
            const attending  = meeting.rsvp_users?.some(r => r.user_id === currentUserId);
            const dateLabel  = fmtMeetingDate(meeting.date);
            const isToday    = dateLabel === "Hoy";
            const isTomorrow = dateLabel === "Mañana";

            return (
              <div
                key={meeting.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-brand-teal/5 transition-colors group cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`}></span>
                  <div className={`text-[10px] font-bold leading-tight text-center whitespace-nowrap ${
                    isToday ? "text-brand-terracotta" : isTomorrow ? "text-brand-teal" : "text-gray-400"
                  }`}>
                    {dateLabel}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-navy dark:text-brand-cream leading-tight truncate">
                    {meeting.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <i className="fas fa-clock text-[9px] text-gray-400"></i>
                    <span className="text-[10px] text-gray-400">{fmtTime(meeting.time)}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <i className="fas fa-map-marker-alt text-[9px] text-gray-400"></i>
                    <span className="text-[10px] text-gray-400 truncate">{meeting.location}</span>
                  </div>
                  {meeting.rsvp_count > 0 && (
                    <span className="text-[10px] text-brand-terracotta font-medium">
                      <i className="fas fa-users text-[8px]"></i> {meeting.rsvp_count} confirmados
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRSVP(meeting.id, attending); }}
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all text-[10px] ${
                    attending
                      ? "bg-brand-teal text-white"
                      : "border border-brand-teal/30 text-brand-teal hover:bg-brand-teal hover:text-white opacity-0 group-hover:opacity-100"
                  }`}
                  title={attending ? "Cancelar asistencia" : "Confirmar asistencia"}
                >
                  <i className={`fas ${attending ? "fa-check" : "fa-plus"}`}></i>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    user, logout,
    getPosts, getTrendingHashtags, getPostsByHashtag, createPost, deletePost, toggleLike, toggleRepost, toggleSavePost,
    uploadImage, uploadVideo,
    getComments, createComment, deleteComment,
    getMeetings, toggleRSVP, getUnreadNotificationsCount, getCampaigns, updateMyPreferences, getPublicProfile,
  } = useAuth();

  const [posts,        setPosts]        = useState([]);
  const [trending,     setTrending]     = useState([]);
  const [meetings,     setMeetings]     = useState([]);
  const [content,      setContent]      = useState("");
  const [posting,      setPosting]      = useState(false);
  const [activeTag,    setActiveTag]    = useState(null);
  const [tagPosts,     setTagPosts]     = useState([]);
  const [loadingTag,   setLoadingTag]   = useState(false);

  const [selectedImage,  setSelectedImage]  = useState(null);
  const [imagePreview,   setImagePreview]   = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError,    setUploadError]    = useState("");

  const [selectedVideo,  setSelectedVideo]  = useState(null);
  const [videoPreview,   setVideoPreview]   = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [profileStats, setProfileStats] = useState({
    proposals: 0,
    followers: 0,
    following: 0,
  });
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");

  const postTextareaRef = useRef(null);
  const fileInputRef    = useRef(null);
  const videoInputRef   = useRef(null);

  const initials = user?.avatar_initials ?? user?.full_name?.slice(0, 2).toUpperCase() ?? "TU";
  const userStats = {
    proposals: profileStats.proposals,
    followers: profileStats.followers,
    following: profileStats.following,
  };

  function focusPostArea() {
    if (postTextareaRef.current) {
      postTextareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      postTextareaRef.current.focus();
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Solo se permiten imágenes."); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadError("La imagen no puede superar 5MB."); return; }
    setUploadError("");
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleVideoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(file.type)) { setUploadError("Solo se permiten videos MP4, MOV o WebM."); return; }
    if (file.size > 100 * 1024 * 1024) { setUploadError("El video no puede superar 100MB."); return; }
    setUploadError("");
    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    // No se puede tener imagen y video al mismo tiempo
    setSelectedImage(null);
    setImagePreview(null);
  }

  function removeVideo() {
    setSelectedVideo(null);
    setVideoPreview(null);
    setUploadError("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  // toggleDark viene importado de App.jsx — persiste en localStorage

  // ── fetch data ─────────────────────────────────────────────────────────
  const enrichPosts = useCallback(async (items) => {
    return Promise.all((items ?? []).map(async (p) => {
      let comments = [];
      let likesCount = 0;
      let liked = false;
      let repostsCount = 0;
      let reposted = false;
      let saved = false;
      try {
        comments  = await getComments(p.id);
        likesCount = p.likes_count ?? 0;
        liked      = p.user_has_liked ?? false;
        repostsCount = p.reposts_count ?? 0;
        reposted = p.user_has_reposted ?? false;
        saved = p.user_has_saved ?? false;
      } catch (_) {}
      return {
        ...p,
        _liked: liked,
        _likes: likesCount,
        _reposted: reposted,
        _reposts: repostsCount,
        _saved: saved,
        _comments: comments,
        _myInitials: user?.avatar_initials ?? "TU",
      };
    }));
  }, [getComments, user?.avatar_initials]);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getPosts();
      const enriched = await enrichPosts(data);
      setPosts(enriched);
    } catch (_) {}
  }, [enrichPosts, getPosts]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await getCampaigns();
      setCampaigns((data ?? []).filter((item) => item.active !== false).slice(0, 4));
    } catch (_) {
      setCampaigns([]);
    }
  }, [getCampaigns]);

  const fetchTrending = useCallback(async () => {
    try {
      const data = await getTrendingHashtags();
      setTrending(data);
    } catch (_) {
      setTrending([]);
    }
  }, [getTrendingHashtags]);

  const fetchProfileStats = useCallback(async () => {
    if (!user?.username) return;
    try {
      const data = await getPublicProfile(user.username);
      const profile = data?.profile ?? {};
      setProfileStats({
        proposals: Number(profile.proposals_count ?? profile.proposals ?? 0),
        followers: Number(profile.followers_count ?? profile.followers ?? 0),
        following: Number(profile.following_count ?? profile.following ?? 0),
      });
    } catch (_) {
      setProfileStats({
        proposals: Number(user?.proposals_count ?? user?.proposals ?? 0),
        followers: Number(user?.followers_count ?? user?.followers ?? 0),
        following: Number(user?.following_count ?? user?.following ?? 0),
      });
    }
  }, [getPublicProfile, user]);

  async function handleComment(postId, content) {
    const comment = await createComment(postId, content);
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _comments: [...(p._comments ?? []), comment] }
        : p
    ));
    setTagPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _comments: [...(p._comments ?? []), comment] }
        : p
    ));
  }

  async function handleDeleteComment(postId, commentId) {
    try {
      await deleteComment(postId, commentId);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, _comments: (p._comments ?? []).filter(c => c.id !== commentId) }
          : p
      ));
      setTagPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, _comments: (p._comments ?? []).filter(c => c.id !== commentId) }
          : p
      ));
    } catch (_) {}
  }

  const fetchMeetings = useCallback(async () => {
    try {
      const data = await getMeetings();
      setMeetings(data ?? []);
    } catch (_) {}
  }, [getMeetings]);

  useEffect(() => {
    fetchPosts();
    fetchTrending();
    fetchMeetings();
    fetchCampaigns();
    fetchProfileStats();
  }, [fetchPosts, fetchTrending, fetchMeetings, fetchCampaigns, fetchProfileStats]);

  useEffect(() => {
    let active = true;

    async function loadUnreadNotifications() {
      try {
        const count = await getUnreadNotificationsCount();
        if (active) setUnreadNotifications(count);
      } catch {
        if (active) setUnreadNotifications(0);
      }
    }

    loadUnreadNotifications();
    return () => {
      active = false;
    };
  }, [getUnreadNotificationsCount, posts.length]);

  const shouldShowInterestOnboarding = Boolean(
    user
    && user.email_verified !== false
    && user.community
    && user.notification_topics_onboarding_done === false
  );

  // ── posts ──────────────────────────────────────────────────────────────
  async function handlePublish() {
    if ((!content.trim() && !selectedImage && !selectedVideo) || posting) return;
    setPosting(true);
    setUploadError("");
    try {
      let imageUrl = null;
      let videoUrl = null;
      if (selectedImage) {
        setUploadingImage(true);
        imageUrl = await uploadImage(selectedImage);
        setUploadingImage(false);
      }
      if (selectedVideo) {
        setUploadingVideo(true);
        videoUrl = await uploadVideo(selectedVideo);
        setUploadingVideo(false);
      }
      const post = await createPost(content.trim(), imageUrl, videoUrl);
      setPosts(p => [{
        ...post, _liked: false, _likes: 0, _reposted: false, _reposts: 0, _saved: false, _comments: [], image_url: imageUrl, video_url: videoUrl,
        profiles: { full_name: user.full_name, username: user.username, avatar_initials: initials, verified: user.verified ?? false, role: user.role ?? "user" },
      }, ...p]);
      fetchTrending();
      setContent("");
      removeImage();
      removeVideo();
    } catch (err) {
      if (err.message === "EMAIL_NOT_VERIFIED") {
        setUploadError("Debes verificar tu correo electrónico para publicar.");
      } else {
        setUploadError(err.message || "Error al publicar. Intenta de nuevo.");
      }
      setUploadingImage(false);
      setUploadingVideo(false);
    }
    setPosting(false);
  }

  async function handleDeletePost(postId) {
    try {
      await deletePost(postId);
      setPosts(p => p.filter(post => post.id !== postId));
      setTagPosts(p => p.filter(post => post.id !== postId));
      fetchTrending();
    } catch (_) {}
  }

  async function handleLike(postId) {
    try {
      const { liked, count } = await toggleLike(postId);
      setPosts(p => p.map(post => post.id === postId ? { ...post, _liked: liked, _likes: count } : post));
      setTagPosts(p => p.map(post => post.id === postId ? { ...post, _liked: liked, _likes: count } : post));
    } catch (_) {}
  }

  async function handleRepost(postId) {
    try {
      const { reposted, count } = await toggleRepost(postId);
      setPosts(p => p.map(post => post.id === postId ? { ...post, _reposted: reposted, _reposts: count } : post));
      setTagPosts(p => p.map(post => post.id === postId ? { ...post, _reposted: reposted, _reposts: count } : post));
    } catch (_) {}
  }

  async function handleSave(postId) {
    try {
      const { saved } = await toggleSavePost(postId);
      setPosts(p => p.map(post => post.id === postId ? { ...post, _saved: saved } : post));
      setTagPosts(p => p.map(post => post.id === postId ? { ...post, _saved: saved } : post));
    } catch (_) {}
  }

  async function handleSavePreferences({ selectedTopics, zoneEnabled }) {
    setPreferencesSaving(true);
    setPreferencesError("");
    try {
      await updateMyPreferences({
        notificationTopics: selectedTopics,
        notificationZoneEnabled: zoneEnabled,
        onboardingDone: true,
      });
    } catch (err) {
      setPreferencesError(err.message || "No se pudieron guardar tus intereses");
    }
    setPreferencesSaving(false);
  }

  async function openHashtag(tag) {
    const cleanTag = String(tag ?? "").trim();
    if (!cleanTag) return;
    setActiveTag(cleanTag.startsWith("#") ? cleanTag : `#${cleanTag}`);
    setLoadingTag(true);
    try {
      const data = await getPostsByHashtag(cleanTag);
      const enriched = await enrichPosts(data.posts ?? []);
      setActiveTag(data.tag ?? cleanTag);
      setTagPosts(enriched);
    } catch (_) {
      setTagPosts([]);
    }
    setLoadingTag(false);
  }

  // ── RSVP desde sidebar ─────────────────────────────────────────────────
  async function handleSidebarRSVP(meetingId, currentlyAttending) {
    try {
      const data = await toggleRSVP(meetingId);
      setMeetings(m => m.map(meet => {
        if (meet.id !== meetingId) return meet;
        const rsvp_users = data.attending
          ? [...(meet.rsvp_users ?? []), { user_id: user?.id }]
          : (meet.rsvp_users ?? []).filter(r => r.user_id !== user?.id);
        return { ...meet, rsvp_users, rsvp_count: data.count };
      }));
    } catch (_) {}
  }

  return (
    <div className="font-sans bg-mesh min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 card-soft shadow-soft">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-landmark text-brand-teal text-xl"></i>
            <span className="font-serif font-bold text-brand-navy dark:text-brand-cream text-lg hidden sm:block">Portal Ciudadano</span>
          </div>
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <input type="text" placeholder="Buscar temas, ciudadanos..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-cream dark:bg-brand-navy/50 border border-brand-teal/20 focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm transition-all" />
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-teal/60"></i>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleDark} className="w-10 h-10 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20">
              <i className="fas fa-moon dark:hidden text-brand-navy"></i>
              <i className="fas fa-sun hidden dark:block text-brand-terracotta"></i>
            </button>
            <a href="/notificaciones" className="w-10 h-10 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-brand-teal/10 transition-colors border border-brand-teal/20 relative desktop-nav">
              <i className="fas fa-bell text-brand-navy dark:text-brand-cream"></i>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 notification-badge rounded-full text-white text-xs flex items-center justify-center font-semibold">
                  {Math.min(unreadNotifications, 99)}
                </span>
              )}
            </a>

            {/* ── Avatar → va al perfil al hacer click ── */}
            <NavMenu currentPath="/" />
            <a
              href="/perfil"
              title="Mi perfil"
              className="story-ring cursor-pointer hidden sm:block"
            >
              <div className="w-9 h-9 rounded-full avatar-teal flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
            </a>

            <button onClick={logout} title="Cerrar sesión" className="w-10 h-10 rounded-xl bg-brand-cream dark:bg-brand-navy/50 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors border border-brand-teal/20">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      {/* ── Banner verificación de email ───────────────────────────────── */}
      {user && user.email_verified === false && (
        <div className="fixed top-[65px] left-0 right-0 z-40 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-md">
          <i className="fas fa-envelope text-sm shrink-0"></i>
          <p className="text-sm font-medium">
            Verifica tu correo electrónico para publicar y participar.
            <span className="font-normal opacity-90"> Revisa tu bandeja de entrada en <strong>{user.email}</strong></span>
          </p>
          <button
            onClick={async () => {
              try {
                await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/resend-verification`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: user.email }),
                });
                alert("Correo de verificación reenviado. Revisa tu bandeja de entrada.");
              } catch (_) {}
            }}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            Reenviar correo
          </button>
        </div>
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="pt-20 pb-16 md:pb-0 h-screen overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 flex gap-6 h-full">

          {/* ── Left Sidebar ────────────────────────────────────────────── */}
          <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-full overflow-y-auto py-6 scrollbar-hide">
            <div className="space-y-4">
              {/* Profile card → clickeable */}
              <a
                href="/perfil"
                className="card-soft rounded-2xl p-5 shadow-soft slide-in border border-brand-teal/10 block hover:border-brand-teal/30 transition-all group"
              >
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full avatar-teal flex items-center justify-center text-white font-bold text-2xl ring-4 ring-brand-terracotta/30 group-hover:ring-brand-teal/50 transition-all">
                    {initials}
                  </div>
                  <h3 className="font-serif font-bold text-lg text-brand-navy dark:text-brand-cream flex items-center justify-center gap-2">
                    {user?.full_name}
                    <RoleBadge role={user?.role} verified={user?.verified} />
                  </h3>
                  <p className="text-brand-teal text-sm">@{user?.username}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">Ciudadano activo 🏛️</p>
                  <p className="text-xs text-brand-teal/70 mt-1 group-hover:text-brand-teal transition-colors">
                    <i className="fas fa-external-link-alt text-[10px] mr-1"></i>Ver mi perfil
                  </p>
                </div>
                <div className="flex justify-around mt-4 pt-4 border-t border-brand-teal/20">
                  {[["Propuestas", userStats.proposals], ["Seguidores", userStats.followers], ["Siguiendo", userStats.following]].map(([l, v]) => (
                    <div key={l} className="text-center">
                      <p className="font-bold text-lg text-brand-terracotta">{fmtNum(v)}</p>
                      <p className="text-xs text-gray-500">{l}</p>
                    </div>
                  ))}
                </div>
              </a>

              <div className="card-soft rounded-2xl p-3 shadow-soft slide-in border border-brand-teal/10">
                <nav className="space-y-1">
                  {[
                    ["fa-home",           "Inicio",         "/"],
                    ["fa-bullhorn",        "Propuestas",     "/propuestas"],
                    ["fa-triangle-exclamation", "Denuncias", "/denuncias"],
                    ["fa-bolt",            "Servicios",      "/solicitudes-servicios"],
                    ["fa-poll",            "Encuestas",      "/encuestas"],
                    ["fa-users",           "Foros",          "/foros"],
                    ["fa-map-marked-alt",  "Zonas",          "/zonas"],
                    ["fa-book",            "Biblioteca",     "/biblioteca"],
                    ["fa-landmark",        "Instituciones",  "#"],
                    ["fa-bell",            "Notificaciones", "/notificaciones"],
                    ["fa-bookmark",        "Guardados",      "/perfil?tab=guardados"],
                  ].map(([icon, label, href], i) => (
                    <a key={label} href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${i === 0 ? "bg-brand-teal/10 text-brand-teal font-medium" : "hover:bg-brand-teal/5 text-brand-navy dark:text-brand-cream"}`}>
                      <i className={`fas ${icon} w-5 text-center`}></i>
                      <span>{label}</span>
                    </a>
                  ))}

                  {/* Mi Perfil → enlace real */}
                  <a
                    href="/perfil"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-brand-teal/5 text-brand-navy dark:text-brand-cream"
                  >
                    <i className="fas fa-user w-5 text-center"></i>
                    <span>Mi Perfil</span>
                  </a>

                  {/* Panel Admin → solo super_admin */}
                  {user?.role === "super_admin" && (
                    <a
                      href="/admin"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-gray-900/10 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 group"
                    >
                      <i className="fas fa-shield-alt w-5 text-center group-hover:text-white transition-colors"></i>
                      <span className="flex-1">Panel Admin</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-900 dark:bg-white/10 text-gray-400">SA</span>
                    </a>
                  )}

                  <a href="/agenda" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-brand-teal/5 text-brand-navy dark:text-brand-cream group">
                    <i className="fas fa-calendar-alt w-5 text-center group-hover:text-brand-teal transition-colors"></i>
                    <span className="flex-1">Agenda</span>
                    {meetings.filter(m => isUpcoming(m.date)).length > 0 && (
                      <span className="w-5 h-5 rounded-full bg-brand-terracotta text-white text-[10px] font-bold flex items-center justify-center">
                        {Math.min(meetings.filter(m => isUpcoming(m.date)).length, 9)}
                      </span>
                    )}
                  </a>
                </nav>
                <button onClick={focusPostArea} className="w-full mt-3 py-3 btn-warm text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  <i className="fas fa-plus"></i><span>Nueva Propuesta</span>
                </button>
              </div>

              <SidebarAgenda
                meetings={meetings}
                currentUserId={user?.id}
                onViewAll={() => window.location.href = "/agenda"}
                onRSVP={handleSidebarRSVP}
              />
            </div>
          </aside>

          {/* ── Feed ────────────────────────────────────────────────────── */}
          <div className="flex-1 max-w-xl mx-auto lg:mx-0 h-full overflow-y-auto py-6 scrollbar-hide space-y-4">
            {campaigns.length > 0 && (
              <section className="card-soft rounded-2xl border border-brand-teal/10 p-4 shadow-soft slide-in">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-teal">Campanas activas</p>
                  <h2 className="font-serif text-lg font-bold text-brand-navy dark:text-brand-cream">Informacion importante para tu comunidad</h2>
                </div>
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <article key={campaign.id} className="rounded-2xl border border-brand-teal/10 bg-brand-cream/70 p-4 dark:bg-brand-navy/30">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-teal/10 px-2.5 py-1 text-[11px] font-semibold text-brand-teal">
                          {topicLabel(campaign.topic_key)}
                        </span>
                        {campaign.target_community && (
                          <span className="rounded-full bg-brand-terracotta/10 px-2.5 py-1 text-[11px] font-semibold text-brand-terracotta">
                            {campaign.target_community}
                          </span>
                        )}
                        {campaign.featured && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Destacada
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-brand-navy dark:text-brand-cream">{campaign.title}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{campaign.description}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        <i className="fas fa-calendar-alt mr-1 text-brand-teal"></i>
                        {campaign.campaign_date ? new Date(campaign.campaign_date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "Fecha pendiente"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="card-soft rounded-2xl p-4 shadow-soft slide-in border border-brand-teal/10">
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full avatar-teal flex items-center justify-center text-white font-bold shrink-0">{initials}</div>
                <div className="flex-1">
                    <textarea
                      ref={postTextareaRef}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="¿Qué quieres compartir con la ciudadanía?"
                      className="w-full p-3 rounded-xl bg-brand-cream dark:bg-brand-navy/30 border border-brand-teal/20 resize-none focus:ring-2 focus:ring-brand-teal focus:border-transparent focus:outline-none text-sm h-20 transition-all"
                      maxLength={500}
                    />
                    {imagePreview && (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-brand-teal/20">
                        <img src={imagePreview} alt="Preview" className="w-full max-h-52 object-cover" />
                        <button onClick={removeImage} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-xs transition-colors">
                          <i className="fas fa-times"></i>
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                          <i className="fas fa-image mr-1"></i>{selectedImage?.name}
                        </div>
                      </div>
                    )}
                    {videoPreview && (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-brand-teal/20">
                        <video src={videoPreview} controls className="w-full max-h-52 rounded-xl" />
                        <button onClick={removeVideo} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-xs transition-colors">
                          <i className="fas fa-times"></i>
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                          <i className="fas fa-video mr-1"></i>{selectedVideo?.name}
                        </div>
                      </div>
                    )}
                    {uploadError && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
                        <i className="fas fa-exclamation-circle shrink-0"></i>
                        <span>{uploadError}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors border ${selectedImage ? "bg-brand-teal/20 border-brand-teal text-brand-teal" : "bg-brand-cream dark:bg-brand-navy/30 border-brand-teal/20 hover:bg-brand-teal/10 text-brand-teal"}`}
                          title="Subir foto"
                        >
                          <i className="fas fa-image"></i>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors border ${selectedVideo ? "bg-brand-teal/20 border-brand-teal text-brand-teal" : "bg-brand-cream dark:bg-brand-navy/30 border-brand-teal/20 hover:bg-brand-teal/10 text-brand-teal"}`}
                          title="Subir video"
                        >
                          <i className="fas fa-video"></i>
                        </button>
                        <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoSelect} />
                        {["fa-poll", "fa-map-marker-alt"].map(icon => (
                          <button key={icon} className="w-9 h-9 rounded-lg bg-brand-cream dark:bg-brand-navy/30 flex items-center justify-center hover:bg-brand-teal/10 text-brand-teal transition-colors border border-brand-teal/20">
                            <i className={`fas ${icon}`}></i>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {content.length > 0 && (
                          <span className={`text-xs ${content.length > 450 ? "text-red-500" : "text-gray-400"}`}>{content.length}/500</span>
                        )}
                        <button
                          onClick={handlePublish}
                          disabled={(!content.trim() && !selectedImage) || posting}
                          className="px-5 py-2 btn-warm text-white font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                          {posting
                            ? <><i className="fas fa-spinner fa-spin"></i> <span>{uploadingImage ? "Subiendo imagen..." : uploadingVideo ? "Subiendo video..." : "Publicando..."}</span></>
                            : "Publicar"
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {posts.length === 0 ? (
              <div className="card-soft rounded-2xl p-8 text-center border border-brand-teal/10">
                <i className="fas fa-bullhorn text-brand-teal/40 text-4xl mb-3"></i>
                <p className="text-gray-400">Sé el primero en publicar algo hoy</p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onLike={handleLike}
                  onDelete={handleDeletePost}
                  onComment={handleComment}
                  onDeleteComment={handleDeleteComment}
                  onRepost={handleRepost}
                  onSave={handleSave}
                  onTagClick={openHashtag}
                />
              ))
            )}
          </div>

          {/* ── Right Sidebar ────────────────────────────────────────────── */}
          <aside className="hidden xl:flex xl:flex-col w-72 shrink-0 h-full overflow-y-auto py-6 scrollbar-hide">
            <div className="space-y-4">

              {/* ── Acceso rápido ── */}
              <div className="hidden grid grid-cols-2 gap-3 slide-in">
                <a href="/solicitudes-servicios"
                  className="card-soft rounded-2xl p-4 border border-brand-teal/10 hover:border-brand-teal/40 hover:shadow-lg transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-bolt text-white text-sm"></i>
                  </div>
                  <p className="font-semibold text-xs text-brand-navy dark:text-brand-cream">Servicios</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Solicita luz, agua y mas</p>
                </a>
                <a href="/encuestas"
                  className="card-soft rounded-2xl p-4 border border-brand-teal/10 hover:border-brand-teal/40 hover:shadow-lg transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-poll text-white text-sm"></i>
                  </div>
                  <p className="font-semibold text-xs text-brand-navy dark:text-brand-cream">Encuestas</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Participación y votación</p>
                </a>
                <a href="/zonas"
                  className="card-soft rounded-2xl p-4 border border-brand-teal/10 hover:border-brand-teal/40 hover:shadow-lg transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-map-marked-alt text-white text-sm"></i>
                  </div>
                  <p className="font-semibold text-xs text-brand-navy dark:text-brand-cream">Zonas</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Mapa de incidencias</p>
                </a>
                <a href="/foros"
                  className="card-soft rounded-2xl p-4 border border-brand-teal/10 hover:border-brand-teal/40 hover:shadow-lg transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-users text-white text-sm"></i>
                  </div>
                  <p className="font-semibold text-xs text-brand-navy dark:text-brand-cream">Foros</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Debates de tu comunidad</p>
                </a>
                <a href="/biblioteca"
                  className="card-soft rounded-2xl p-4 border border-brand-teal/10 hover:border-brand-terracotta/40 hover:shadow-lg transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl gradient-bg-warm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-book text-white text-sm"></i>
                  </div>
                  <p className="font-semibold text-xs text-brand-navy dark:text-brand-cream">Biblioteca</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Evidencias resueltas</p>
                </a>
                <a href="/denuncias"
                  className="card-soft rounded-2xl p-4 border border-brand-teal/10 hover:border-brand-terracotta/40 hover:shadow-lg transition-all group flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-brand-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-triangle-exclamation text-white text-sm"></i>
                  </div>
                  <p className="font-semibold text-xs text-brand-navy dark:text-brand-cream">Denuncias</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Reporta incidencias ciudadanas</p>
                </a>
              </div>
              <div className="card-soft rounded-2xl p-5 shadow-soft slide-in border border-brand-teal/10">
                <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2 text-brand-navy dark:text-brand-cream">
                  <i className="fas fa-chart-line text-brand-terracotta"></i> Tendencias
                </h3>
                <div className="space-y-3">
                  {trending.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-teal/20 p-4 text-center">
                      <p className="text-sm text-gray-500">Aun no hay hashtags en tendencia.</p>
                      <p className="text-xs text-gray-400 mt-1">Publica con # para empezar a mover temas.</p>
                    </div>
                  ) : trending.map(t => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => openHashtag(t.tag)}
                      className="block w-full text-left p-3 rounded-xl hover:bg-brand-teal/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-brand-navy dark:text-brand-cream flex items-center gap-2">
                            {t.tag} {t.hot && <span className="text-brand-terracotta text-xs">Hot</span>}
                          </p>
                          <p className="text-xs text-gray-500">{t.count} menciones</p>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-2 text-xs text-gray-400 space-x-2">
                {["Términos", "Privacidad", "Transparencia", "Ayuda"].map((l, i) => (
                  <span key={l}>{i > 0 && "· "}<a href="#" className="hover:text-brand-terracotta">{l}</a></span>
                ))}
                <p className="mt-2">© 2024 Portal Ciudadano</p>
                <p className="text-brand-terracotta italic">Donde la ciudadanía habla</p>
              </div>
            </div>
          </aside>
        </div>
      </main>


      {activeTag && (
        <HashtagModal
          tag={activeTag}
          posts={tagPosts}
          loading={loadingTag}
          onClose={() => { setActiveTag(null); setTagPosts([]); }}
          onLike={handleLike}
          onDelete={handleDeletePost}
          onComment={handleComment}
          onDeleteComment={handleDeleteComment}
          onRepost={handleRepost}
          onSave={handleSave}
          currentUserId={user?.id}
          onTagClick={openHashtag}
        />
      )}

      {/* ── Mobile Nav ──────────────────────────────────────────────────── */}
      {shouldShowInterestOnboarding && (
        <InterestOnboardingModal
          user={user}
          saving={preferencesSaving}
          error={preferencesError}
          onSave={handleSavePreferences}
        />
      )}

      <nav className="mobile-nav fixed bottom-0 left-0 right-0 card-soft shadow-soft border-t border-brand-teal/20 px-6 py-3 justify-around items-center z-50">
        {[["fa-home", "Inicio", "/"], ["fa-bell", "Avisos", "/notificaciones"]].map(([icon, label, href]) => (
          <a key={label} href={href} className="flex flex-col items-center gap-1 text-brand-teal">
            <i className={`fas ${icon} text-xl`}></i>
            <span className="text-xs font-medium">{label}</span>
          </a>
        ))}
        <button onClick={focusPostArea} className="w-12 h-12 -mt-6 rounded-full gradient-bg-warm shadow-lg flex items-center justify-center text-white">
          <i className="fas fa-plus text-xl"></i>
        </button>
        <a href="/denuncias" className="flex flex-col items-center gap-1 text-brand-navy/50 dark:text-brand-cream/50 hover:text-brand-teal">
          <i className="fas fa-triangle-exclamation text-xl"></i>
          <span className="text-xs">Denuncias</span>
        </a>
        {/* Mi Perfil en mobile nav */}
        <a href="/perfil" className="flex flex-col items-center gap-1 text-brand-navy/50 dark:text-brand-cream/50 hover:text-brand-teal">
          <i className="fas fa-user text-xl"></i>
          <span className="text-xs">Perfil</span>
        </a>
      </nav>

    </div>
  );
}
