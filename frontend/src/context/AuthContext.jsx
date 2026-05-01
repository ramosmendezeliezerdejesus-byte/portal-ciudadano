import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const API = "http://localhost:5000/api";
const TOKEN_KEY = "pc_token";
const REFRESH_TOKEN_KEY = "pc_refresh_token";
const EXPIRES_AT_KEY = "pc_token_expires_at";
const REFRESH_BUFFER_SECONDS = 120;

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const saveSession = useCallback((sessionData) => {
    localStorage.setItem(TOKEN_KEY, sessionData.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, sessionData.refresh_token);
    if (sessionData.expires_at) localStorage.setItem(EXPIRES_AT_KEY, String(sessionData.expires_at));
    else localStorage.removeItem(EXPIRES_AT_KEY);
    setToken(sessionData.access_token);
    if (sessionData.user) setUser(sessionData.user);
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearSession();
      throw new Error("No refresh token");
    }

    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      clearSession();
      throw new Error(data.error || "No se pudo renovar la sesiÃ³n");
    }

    saveSession(data);
    return data;
  }, [clearSession, saveSession]);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ""}`,
  }), []);

  const authHeadersMultipart = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ""}`,
  }), []);

  // ── restaurar sesión ──────────────────────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!savedToken && !savedRefreshToken) { setLoading(false); return; }

    const restoreSession = async () => {
      let activeToken = savedToken;

      if (!activeToken && savedRefreshToken) {
        const refreshed = await refreshSession();
        activeToken = refreshed.access_token;
      }

      let res = await fetch(`${API}/auth/me`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
      });

      if (res.status === 401 && savedRefreshToken) {
        const refreshed = await refreshSession();
        activeToken = refreshed.access_token;
        res = await fetch(`${API}/auth/me`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        });
      }

      const data = await res.json();
      if (!res.ok || !data.user) throw new Error(data.error || "No se pudo restaurar la sesiÃ³n");
      setUser(data.user);
      setToken(activeToken);
    };

    restoreSession()
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession, refreshSession]);

  useEffect(() => {
    if (!token) return undefined;

    const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0);
    if (!expiresAt) return undefined;

    const refreshInMs = Math.max((expiresAt - REFRESH_BUFFER_SECONDS) * 1000 - Date.now(), 5_000);
    const timer = window.setTimeout(() => {
      refreshSession().catch(() => {});
    }, refreshInMs);

    return () => window.clearTimeout(timer);
  }, [token, refreshSession]);

  // ── auth ──────────────────────────────────────────────────────────────────
  async function login(email, password) {
    const res  = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "EMAIL_NOT_VERIFIED") throw new Error("EMAIL_NOT_CONFIRMED");
      throw new Error(data.error || "Error al iniciar sesión");
    }
    saveSession(data);
    return data.user;
  }

  async function register(formData) {
    const res  = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al registrarse");
    return data;
  }

  function logout() {
    clearSession();
  }

  // ── posts ─────────────────────────────────────────────────────────────────
  const getPosts = useCallback(async () => {
    const res  = await fetch(`${API}/posts`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.posts;
  }, [authHeaders]);

  const getTrendingHashtags = useCallback(async () => {
    const res  = await fetch(`${API}/posts/trending`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar tendencias");
    return data.trending ?? [];
  }, [authHeaders]);

  const getPostsByHashtag = useCallback(async (tag) => {
    const cleanTag = String(tag ?? "").trim().replace(/^#/, "");
    const res  = await fetch(`${API}/posts/hashtag/${encodeURIComponent(cleanTag)}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar hashtag");
    return data;
  }, [authHeaders]);

  async function createPost(content, imageUrl = null, videoUrl = null) {
    const res  = await fetch(`${API}/posts`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ content, image_url: imageUrl, video_url: videoUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "EMAIL_NOT_VERIFIED") throw new Error("EMAIL_NOT_VERIFIED");
      throw new Error(data.error);
    }
    return data.post;
  }

  async function deletePost(postId) {
    const res  = await fetch(`${API}/posts/${postId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function toggleLike(postId) {
    const res  = await fetch(`${API}/posts/${postId}/like`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function toggleRepost(postId) {
    const res  = await fetch(`${API}/posts/${postId}/repost`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al repostear");
    return data;
  }

  async function toggleSavePost(postId) {
    const res  = await fetch(`${API}/posts/${postId}/save`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al guardar post");
    return data;
  }

  const getSavedPosts = useCallback(async () => {
    const res  = await fetch(`${API}/posts/saved`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar guardados");
    return data.posts ?? [];
  }, [authHeaders]);

  // ── upload ────────────────────────────────────────────────────────────────
  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    const res  = await fetch(`${API}/upload/image`, { method: "POST", headers: authHeadersMultipart(), body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir la imagen");
    return data.url;
  }

  async function uploadVideo(file) {
    const formData = new FormData();
    formData.append("video", file);
    const res  = await fetch(`${API}/upload/video`, { method: "POST", headers: authHeadersMultipart(), body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir el video");
    return data.url;
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res  = await fetch(`${API}/upload/file`, { method: "POST", headers: authHeadersMultipart(), body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir el archivo");
    return data;
  }

  // ── comments ──────────────────────────────────────────────────────────────
  const getComments = useCallback(async (postId) => {
    const res  = await fetch(`${API}/posts/${postId}/comments`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar comentarios");
    return data.comments ?? [];
  }, [authHeaders]);

  async function createComment(postId, content) {
    const res  = await fetch(`${API}/posts/${postId}/comments`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "EMAIL_NOT_VERIFIED") throw new Error("EMAIL_NOT_CONFIRMED");
      throw new Error(data.error || "Error al comentar");
    }
    return data.comment;
  }

  async function deleteComment(postId, commentId) {
    const res  = await fetch(`${API}/posts/${postId}/comments/${commentId}`, {
      method: "DELETE", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar comentario");
    return data;
  }

  // notifications
  const getNotifications = useCallback(async () => {
    const res  = await fetch(`${API}/notifications`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar notificaciones");
    return data.notifications ?? [];
  }, [authHeaders]);

  const getUnreadNotificationsCount = useCallback(async () => {
    const res  = await fetch(`${API}/notifications/unread-count`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al contar notificaciones");
    return data.count ?? 0;
  }, [authHeaders]);

  async function markNotificationsAsRead() {
    const res  = await fetch(`${API}/notifications/read-all`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al marcar notificaciones");
    return data;
  }

  // ── public profiles ───────────────────────────────────────────────────────
  const getPublicProfile = useCallback(async (username) => {
    const res  = await fetch(`${API}/profiles/${username}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Usuario no encontrado");
    return data;
  }, [authHeaders]);

  async function toggleFollow(username) {
    const res  = await fetch(`${API}/profiles/${username}/follow`, {
      method: "POST", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al seguir");
    return data;
  }

  const getFollowers = useCallback(async (username) => {
    const res  = await fetch(`${API}/profiles/${username}/followers`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.followers ?? [];
  }, [authHeaders]);

  const getFollowing = useCallback(async (username) => {
    const res  = await fetch(`${API}/profiles/${username}/following`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.following ?? [];
  }, [authHeaders]);

  // ── proposals ─────────────────────────────────────────────────────────────
  const getProposalComments = useCallback(async (proposalId) => {
    const res  = await fetch(`${API}/proposals/${proposalId}/comments`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar comentarios");
    return data.comments ?? [];
  }, [authHeaders]);

  async function createProposalComment(proposalId, content) {
    const res  = await fetch(`${API}/proposals/${proposalId}/comments`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al comentar");
    return data.comment;
  }

  async function deleteProposalComment(proposalId, commentId) {
    const res  = await fetch(`${API}/proposals/${proposalId}/comments/${commentId}`, {
      method: "DELETE", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar");
    return data;
  }

  async function toggleVote(proposalId) {
    const res  = await fetch(`${API}/proposals/${proposalId}/vote`, {
      method: "POST", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al votar");
    return data;
  }

  const getProposals = useCallback(async ({ status, category, page } = {}) => {
    const params = new URLSearchParams();
    if (status)   params.set("status", status);
    if (category) params.set("category", category);
    if (page)     params.set("page", page);
    const res  = await fetch(`${API}/proposals?${params}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar propuestas");
    return data.proposals ?? [];
  }, [authHeaders]);

  async function createProposal(form) {
    const res  = await fetch(`${API}/proposals`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear propuesta");
    return data.proposal;
  }

  async function deleteProposal(proposalId) {
    const res  = await fetch(`${API}/proposals/${proposalId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar propuesta");
    return data;
  }

  async function updateProposalStatus(proposalId, status, resolutionNote, evidenceUrl, evidencePath, evidenceFiles = []) {
    const res  = await fetch(`${API}/proposals/${proposalId}/status`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({
        status,
        resolution_note: resolutionNote,
        evidence_url: evidenceUrl,
        evidence_path: evidencePath,
        evidence_files: Array.isArray(evidenceFiles) ? evidenceFiles : [],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar estado");
    return data.proposal;
  }

  async function uploadEvidence(file) {
    const formData = new FormData();
    formData.append("evidence", file);
    const res  = await fetch(`${API}/proposals/upload-evidence`, { method: "POST", headers: authHeadersMultipart(), body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir evidencia");
    return data;
  }

  const getReportComments = useCallback(async (reportId) => {
    const res  = await fetch(`${API}/denuncias/${reportId}/comments`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar comentarios");
    return data.comments ?? [];
  }, [authHeaders]);

  async function createReportComment(reportId, content) {
    const res  = await fetch(`${API}/denuncias/${reportId}/comments`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al comentar");
    return data.comment;
  }

  async function deleteReportComment(reportId, commentId) {
    const res  = await fetch(`${API}/denuncias/${reportId}/comments/${commentId}`, {
      method: "DELETE", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar");
    return data;
  }

  async function toggleReportVote(reportId) {
    const res  = await fetch(`${API}/denuncias/${reportId}/vote`, {
      method: "POST", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al votar");
    return data;
  }

  const getReports = useCallback(async ({ status, category, page } = {}) => {
    const params = new URLSearchParams();
    if (status)   params.set("status", status);
    if (category) params.set("category", category);
    if (page)     params.set("page", page);
    const res  = await fetch(`${API}/denuncias?${params}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar denuncias");
    return data.reports ?? [];
  }, [authHeaders]);

  async function createReport(form) {
    const res  = await fetch(`${API}/denuncias`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear denuncia");
    return data.report;
  }

  async function deleteReport(reportId) {
    const res  = await fetch(`${API}/denuncias/${reportId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar denuncia");
    return data;
  }

  async function updateReportStatus(reportId, status, resolutionNote, evidenceUrl, evidencePath, justiceServed, evidenceFiles = []) {
    const res  = await fetch(`${API}/denuncias/${reportId}/status`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({
        status,
        resolution_note: resolutionNote,
        evidence_url: evidenceUrl,
        evidence_path: evidencePath,
        justice_served: justiceServed,
        evidence_files: Array.isArray(evidenceFiles) ? evidenceFiles : [],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar estado");
    return data.report;
  }

  async function uploadReportEvidence(file) {
    const formData = new FormData();
    formData.append("evidence", file);
    const res  = await fetch(`${API}/denuncias/upload-evidence`, { method: "POST", headers: authHeadersMultipart(), body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir evidencia");
    return data;
  }

  // ── meetings ──────────────────────────────────────────────────────────────
  const getMeetings = useCallback(async () => {
    const res  = await fetch(`${API}/meetings`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar reuniones");
    return data.meetings ?? [];
  }, [authHeaders]);

  async function createMeeting(form) {
    const res  = await fetch(`${API}/meetings`, { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear la reunión");
    return data.meeting;
  }

  async function deleteMeeting(meetingId) {
    const res  = await fetch(`${API}/meetings/${meetingId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar la reunión");
    return data;
  }

  async function toggleRSVP(meetingId) {
    const res  = await fetch(`${API}/meetings/${meetingId}/rsvp`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar asistencia");
    return data;
  }

  // ── verificación de roles ─────────────────────────────────────────────────
  const getMyVerificationRequest = useCallback(async () => {
    const res  = await fetch(`${API}/verification/my-request`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al obtener solicitud");
    return data.request;
  }, [authHeaders]);

  // ── admin: reuniones ──────────────────────────────────────────────────────
  const adminGetMeetings = useCallback(async () => {
    const res  = await fetch(`${API}/admin/meetings`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar reuniones");
    return data.meetings ?? [];
  }, [authHeaders]);

  async function adminDeleteMeeting(meetingId) {
    const res  = await fetch(`${API}/admin/meetings/${meetingId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar reunión");
    return data;
  }

  // ── admin: usuarios ───────────────────────────────────────────────────────
  const adminGetUsers = useCallback(async () => {
    const res  = await fetch(`${API}/admin/users`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
    return data.users ?? [];
  }, [authHeaders]);

  async function adminDeleteUser(userId) {
    const res  = await fetch(`${API}/admin/users/${userId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar usuario");
    return data;
  }

  async function adminChangeRole(userId, role) {
    const res  = await fetch(`${API}/admin/users/${userId}/role`, {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cambiar rol");
    return data;
  }

  // ── admin: solicitudes de verificación ───────────────────────────────────
  const adminGetVerificationRequests = useCallback(async (status = "pending") => {
    const res  = await fetch(`${API}/admin/verification-requests?status=${status}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar solicitudes");
    return data.requests ?? [];
  }, [authHeaders]);

  async function adminReviewRequest(reqId, action, notes = "") {
    const res  = await fetch(`${API}/admin/verification-requests/${reqId}/review`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ action, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al revisar la solicitud");
    return data;
  }

  const adminGetCommunityReportSummary = useCallback(async (communityKey = "") => {
    const params = new URLSearchParams();
    if (communityKey) params.set("community_key", communityKey);
    const res  = await fetch(`${API}/admin/community-report-summary?${params}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar reporte comunitario");
    return data;
  }, [authHeaders]);

  // ── encuestas ─────────────────────────────────────────────────────────────
  const getPolls = useCallback(async (page = 1) => {
    const res  = await fetch(`${API}/polls?page=${page}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar encuestas");
    return data.polls ?? [];
  }, [authHeaders]);

  async function createPoll({ question, description, options, ends_at }) {
    const res  = await fetch(`${API}/polls`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ question, description, options, ends_at }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear encuesta");
    return data.poll;
  }

  async function deletePoll(pollId) {
    const res  = await fetch(`${API}/polls/${pollId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar encuesta");
    return data;
  }

  async function votePoll(pollId, optionId) {
    const res  = await fetch(`${API}/polls/${pollId}/vote`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ option_id: optionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al votar");
    return data;
  }

  async function updateMyCommunity(community, addressReference = "") {
    const res = await fetch(`${API}/profiles/me/community`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ community, address_reference: addressReference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar comunidad");
    setUser(prev => ({ ...(prev ?? {}), ...data.user }));
    return data.user;
  }

  async function updateMyPreferences({ notificationTopics, notificationZoneEnabled = true, onboardingDone = true }) {
    const res = await fetch(`${API}/profiles/me/preferences`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        notification_topics: notificationTopics,
        notification_zone_enabled: notificationZoneEnabled,
        notification_topics_onboarding_done: onboardingDone,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar preferencias");
    setUser(prev => ({ ...(prev ?? {}), ...data.user }));
    return data.user;
  }

  const getCampaigns = useCallback(async ({ includeInactive = false } = {}) => {
    const params = new URLSearchParams();
    if (includeInactive) params.set("include_inactive", "true");
    const res = await fetch(`${API}/campaigns?${params}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar campanas");
    return data.campaigns ?? [];
  }, [authHeaders]);

  async function createCampaign(payload) {
    const res = await fetch(`${API}/campaigns`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear campana");
    return data.campaign;
  }

  async function updateCampaign(campaignId, payload) {
    const res = await fetch(`${API}/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar campana");
    return data.campaign;
  }

  async function deleteCampaign(campaignId) {
    const res = await fetch(`${API}/campaigns/${campaignId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar campana");
    return data;
  }

  async function notifyCampaign(campaignId) {
    const res = await fetch(`${API}/campaigns/${campaignId}/notify`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al enviar notificaciones");
    return data;
  }

  const getForums = useCallback(async () => {
    const res = await fetch(`${API}/forums`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar foros");
    return data;
  }, [authHeaders]);

  async function createForum(payload) {
    const res = await fetch(`${API}/forums`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear foro");
    return data.forum;
  }

  async function getForumDetail(forumId) {
    const res = await fetch(`${API}/forums/${forumId}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar foro");
    return data;
  }

  async function createForumThread(forumId, payload) {
    const res = await fetch(`${API}/forums/${forumId}/threads`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear subforo");
    return data.thread;
  }

  async function getForumThread(threadId) {
    const res = await fetch(`${API}/forums/threads/${threadId}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar subforo");
    return data;
  }

  async function createForumMessage(threadId, content) {
    const res = await fetch(`${API}/forums/threads/${threadId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al publicar mensaje");
    return data.message;
  }

  // solicitudes de servicios publicos
  const getServiceRequests = useCallback(async ({ status, category, page } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (page) params.set("page", page);
    const res = await fetch(`${API}/solicitudes-servicios?${params}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar solicitudes");
    return data.requests ?? [];
  }, [authHeaders]);

  async function createServiceRequest(form) {
    const res = await fetch(`${API}/solicitudes-servicios`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al crear solicitud");
    return data.request;
  }

  async function deleteServiceRequest(requestId) {
    const res = await fetch(`${API}/solicitudes-servicios/${requestId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar solicitud");
    return data;
  }

  async function updateServiceRequestStatus(requestId, status, resolutionNote, evidenceUrl = null, evidencePath = null, evidenceFiles = []) {
    const res = await fetch(`${API}/solicitudes-servicios/${requestId}/status`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({
        status,
        resolution_note: resolutionNote,
        evidence_url: evidenceUrl,
        evidence_path: evidencePath,
        evidence_files: Array.isArray(evidenceFiles) ? evidenceFiles : [],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar solicitud");
    return data.request;
  }

  async function toggleServiceRequestSupport(requestId) {
    const res = await fetch(`${API}/solicitudes-servicios/${requestId}/support`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al apoyar solicitud");
    return data;
  }

  const getServiceRequestComments = useCallback(async (requestId) => {
    const res = await fetch(`${API}/solicitudes-servicios/${requestId}/comments`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al cargar comentarios");
    return data.comments ?? [];
  }, [authHeaders]);

  async function createServiceRequestComment(requestId, content) {
    const res = await fetch(`${API}/solicitudes-servicios/${requestId}/comments`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al comentar");
    return data.comment;
  }

  async function deleteServiceRequestComment(requestId, commentId) {
    const res = await fetch(`${API}/solicitudes-servicios/${requestId}/comments/${commentId}`, {
      method: "DELETE", headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al eliminar comentario");
    return data;
  }

  async function uploadServiceRequestEvidence(file) {
    const formData = new FormData();
    formData.append("evidence", file);
    const res = await fetch(`${API}/solicitudes-servicios/upload-evidence`, {
      method: "POST",
      headers: authHeadersMultipart(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir evidencia");
    return data;
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout,
      getPosts, getTrendingHashtags, getPostsByHashtag, createPost, deletePost, toggleLike, toggleRepost, toggleSavePost, getSavedPosts,
      uploadImage, uploadVideo, uploadFile,
      getComments, createComment, deleteComment,
      getNotifications, getUnreadNotificationsCount, markNotificationsAsRead,
      getPublicProfile, toggleFollow, getFollowers, getFollowing, updateMyCommunity, updateMyPreferences,
      getCampaigns, createCampaign, updateCampaign, deleteCampaign, notifyCampaign,
      getForums, createForum, getForumDetail, createForumThread, getForumThread, createForumMessage,
      getServiceRequests, createServiceRequest, deleteServiceRequest, updateServiceRequestStatus, toggleServiceRequestSupport,
      getServiceRequestComments, createServiceRequestComment, deleteServiceRequestComment, uploadServiceRequestEvidence,
      getProposals, createProposal, deleteProposal, updateProposalStatus, uploadEvidence, toggleVote,
      getProposalComments, createProposalComment, deleteProposalComment,
      getReports, createReport, deleteReport, updateReportStatus, uploadReportEvidence, toggleReportVote,
      getReportComments, createReportComment, deleteReportComment,
      getMeetings, createMeeting, deleteMeeting, toggleRSVP,
      getMyVerificationRequest,
      adminGetMeetings, adminDeleteMeeting,
      adminGetUsers, adminDeleteUser, adminChangeRole,
      adminGetVerificationRequests, adminReviewRequest, adminGetCommunityReportSummary,
      // encuestas
      getPolls, createPoll, deletePoll, votePoll,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
