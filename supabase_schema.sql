create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  full_name   text not null,
  email       text unique not null,
  avatar_initials text default 'US',
  bio         text default '',
  verified    boolean default false,
  followers   integer default 0,
  following   integer default 0,
  proposals   integer default 0,
  created_at  timestamptz default now()
);

-- 2. Tabla de posts
create table if not exists public.posts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null check (char_length(content) <= 500),
  image_url   text,
  created_at  timestamptz default now()
);

-- 3. Tabla de likes
create table if not exists public.likes (
  id          uuid default gen_random_uuid() primary key,
  post_id     uuid references public.posts(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(post_id, user_id)
);

-- 4. Row Level Security (RLS) ──────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;

-- Profiles: cualquier autenticado puede leer; solo el propietario puede editar
create policy "Perfiles visibles para autenticados"
  on public.profiles for select to authenticated using (true);

create policy "Solo el propietario edita su perfil"
  on public.profiles for update using (auth.uid() = id);

-- Posts: lectura pública para autenticados; escritura solo del propietario
create policy "Posts visibles para autenticados"
  on public.posts for select to authenticated using (true);

create policy "Usuarios crean sus propios posts"
  on public.posts for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuarios eliminan sus propios posts"
  on public.posts for delete using (auth.uid() = user_id);

-- Likes
create policy "Likes visibles para autenticados"
  on public.likes for select to authenticated using (true);

create policy "Usuarios dan like"
  on public.likes for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuarios quitan like"
  on public.likes for delete using (auth.uid() = user_id);

-- Reposts de posts
create table if not exists public.post_reposts (
  id          uuid default gen_random_uuid() primary key,
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(post_id, user_id)
);

create index if not exists post_reposts_post_idx on public.post_reposts(post_id);
create index if not exists post_reposts_user_idx on public.post_reposts(user_id);

alter table public.post_reposts enable row level security;

create policy "Todos ven reposts"
  on public.post_reposts for select to authenticated using (true);

create policy "Usuarios repostean"
  on public.post_reposts for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuarios quitan repost"
  on public.post_reposts for delete to authenticated using (auth.uid() = user_id);

-- Guardados de posts
create table if not exists public.saved_posts (
  id          uuid default gen_random_uuid() primary key,
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(post_id, user_id)
);

create index if not exists saved_posts_post_idx on public.saved_posts(post_id);
create index if not exists saved_posts_user_idx on public.saved_posts(user_id);

alter table public.saved_posts enable row level security;

create policy "Usuario ve sus guardados"
  on public.saved_posts for select to authenticated using (auth.uid() = user_id);

create policy "Usuario guarda posts"
  on public.saved_posts for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuario quita guardados"
  on public.saved_posts for delete to authenticated using (auth.uid() = user_id);

-- 5. Trigger: crear perfil automático al registrarse ────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, email, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 2))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 1. Agregar columna role a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'verified', 'super_admin'));
 
-- 2. Asignar super_admin a tu cuenta
UPDATE public.profiles 
SET role = 'super_admin', verified = true
WHERE email = 'ramosmendezeliezerdejesus@gmail.com';
 
-- 3. Verificar que se aplicó
SELECT id, username, full_name, email, role, verified 
FROM public.profiles 
WHERE email = 'ramosmendezeliezerdejesus@gmail.com';

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.stories       enable row level security;
alter table public.story_hearts  enable row level security;

-- Stories: cualquier autenticado puede leer; solo propietario crea/elimina
create policy "Stories visibles para autenticados"
  on public.stories for select to authenticated using (true);

create policy "Usuarios crean sus stories"
  on public.stories for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuarios eliminan sus stories"
  on public.stories for delete using (auth.uid() = user_id);

-- Story hearts
create policy "Hearts visibles para autenticados"
  on public.story_hearts for select to authenticated using (true);

create policy "Usuarios dan heart a stories"
  on public.story_hearts for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuarios quitan heart a stories"
  on public.story_hearts for delete using (auth.uid() = user_id);

CREATE POLICY "Subir imágenes autenticados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Ver imágenes público"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Eliminar propias imágenes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Tabla de reuniones
CREATE TABLE IF NOT EXISTS meetings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) <= 150),
  description      TEXT CHECK (char_length(description) <= 600),
  date             DATE NOT NULL,
  time             TIME NOT NULL,
  location         TEXT NOT NULL CHECK (char_length(location) <= 200),
  category         TEXT NOT NULL DEFAULT 'general'
                     CHECK (category IN ('general','presupuesto','transporte','seguridad','ambiente','educacion')),
  duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  agenda           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de RSVPs
CREATE TABLE IF NOT EXISTS meeting_rsvp (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meeting_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meetings_date    ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_meeting_id  ON meeting_rsvp(meeting_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_user_id     ON meeting_rsvp(user_id);

-- RLS
ALTER TABLE meetings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_rsvp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_select" ON meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "meetings_insert" ON meetings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meetings_delete" ON meetings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "rsvp_select" ON meeting_rsvp
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rsvp_insert" ON meeting_rsvp
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rsvp_delete" ON meeting_rsvp
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

  -- ══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Sistema de roles verificados (diputado / presidente_junta)
-- Ejecutar en Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ampliar el CHECK de role en profiles para los nuevos roles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'verified', 'diputado', 'presidente_junta', 'super_admin'));

-- 2. Agregar campos extra al perfil (opcionales, solo para roles políticos)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS province       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS office_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS latitude       DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude      DOUBLE PRECISION DEFAULT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role TEXT DEFAULT 'user'
  CHECK (requested_role IN ('user', 'diputado', 'presidente_junta'));

-- 3. Tabla de solicitudes de verificación
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role  TEXT NOT NULL CHECK (requested_role IN ('diputado', 'presidente_junta')),
  province        TEXT NOT NULL,
  office_address  TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  proof_file_url  TEXT NOT NULL,           -- URL del archivo subido a Storage
  proof_file_path TEXT NOT NULL,           -- Path en el bucket (para borrar si se rechaza)
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes     TEXT DEFAULT NULL,       -- Notas del admin al aprobar/rechazar
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ DEFAULT NULL,
  reviewed_by     UUID REFERENCES public.profiles(id) DEFAULT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_verif_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_status  ON public.verification_requests(status);

-- RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede ver sus propias solicitudes
CREATE POLICY "Usuario ve sus solicitudes"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Solo el backend (service role) inserta
CREATE POLICY "Service inserta solicitudes"
  ON public.verification_requests FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Solo el backend (service role) actualiza (para aprobar/rechazar)
CREATE POLICY "Service actualiza solicitudes"
  ON public.verification_requests FOR UPDATE
  TO service_role
  USING (true);

-- Super admin puede ver todas (usando service role en el backend)
-- (El backend usa supabase_admin con service key, así que lee todo)

-- 4. Bucket para archivos de verificación
-- Ejecuta esto manualmente en Supabase → Storage → New Bucket
-- Nombre: "verification-docs"  |  Public: FALSE  (privado)
-- O usa el SQL de storage API:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  10485760,   -- 10 MB máximo
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas del bucket
CREATE POLICY "Usuarios autenticados suben pruebas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs');

CREATE POLICY "Usuarios ven sus propias pruebas"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Service lee todos los docs"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'verification-docs');

-- 5. Verificar resultado
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('role', 'province', 'office_address', 'latitude', 'longitude');

SELECT table_name FROM information_schema.tables
WHERE table_name = 'verification_requests';

-- Eliminar el perfil huérfano que bloquea el registro
-- (el usuario ya no existe en auth.users pero el perfil quedó en public.profiles)
 
DELETE FROM public.profiles 
WHERE email = 'ernestoalter2@gmail.com';
 
-- Verificar que se eliminó
SELECT email FROM public.profiles WHERE email = 'ernestoalter2@gmail.com';
-- Debe devolver 0 rows


-- Arreglar el trigger para que incluya role = 'user' por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, avatar_initials, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Asegurarse que role tiene DEFAULT 'user'
ALTER TABLE public.profiles 
  ALTER COLUMN role SET DEFAULT 'user';

-- Verificar
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';


-- 1. Ver si el trigger existe
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Ver el último usuario creado en auth.users
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Ver si hay perfiles huérfanos o faltantes
SELECT au.id, au.email, p.id as profile_id, p.username
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 5;

-- 4. Recrear el trigger desde cero
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, avatar_initials, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2)),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    username        = EXCLUDED.username,
    full_name       = EXCLUDED.full_name,
    email           = EXCLUDED.email,
    avatar_initials = EXCLUDED.avatar_initials;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Crear perfiles para usuarios que no lo tienen todavía
INSERT INTO public.profiles (id, username, full_name, email, avatar_initials, role)
SELECT
  au.id,
  split_part(au.email, '@', 1),
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.email,
  UPPER(LEFT(COALESCE(au.raw_user_meta_data->>'full_name', au.email), 2)),
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Verificar resultado final
SELECT au.id, au.email, p.username, p.role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Eliminar la política actual que permite a cualquier autenticado crear reuniones
DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;
 
-- Nueva política: solo diputados, presidentes de junta y super_admin pueden crear
CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('diputado', 'presidente_junta', 'super_admin')
  );
 
-- Verificar que quedó bien
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'meetings';


-- Verificar y recrear la política de insert en posts
DROP POLICY IF EXISTS "Usuarios crean sus propios posts" ON public.posts;

CREATE POLICY "Usuarios crean sus propios posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

  -- Crear bucket para videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-videos',
  'post-videos',
  true,
  104857600,  -- 100MB en bytes
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Política para subir
CREATE POLICY "Usuarios suben sus videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para ver
CREATE POLICY "Videos son públicos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'post-videos');

-- Política para eliminar
CREATE POLICY "Usuarios eliminan sus videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-videos' AND auth.uid()::text = (storage.foldername(name))[1]);


  -- Tabla de comentarios
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven comentarios"
  ON public.comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios crean comentarios"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus comentarios"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Verificar
SELECT COUNT(*) FROM public.comments;

-- ── Tabla de propuestas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) <= 150),
  description     TEXT NOT NULL CHECK (char_length(description) <= 1000),
  category        TEXT NOT NULL DEFAULT 'otro'
                  CHECK (category IN ('infraestructura','seguridad','ambiente','educacion','salud','transporte','otro')),
  image_url       TEXT,
  video_url       TEXT,
  media_urls      JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_text   TEXT,          -- dirección escrita
  latitude        FLOAT,
  longitude       FLOAT,
  status          TEXT NOT NULL DEFAULT 'recibida'
                  CHECK (status IN ('recibida','en_gestion','resuelta')),
  evidence_url    TEXT,          -- archivo de evidencia al resolver
  evidence_path   TEXT,
  evidence_files  JSONB NOT NULL DEFAULT '[]'::jsonb,
  managed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  managed_at      TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS proposals_user_id_idx   ON public.proposals(user_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx    ON public.proposals(status);
CREATE INDEX IF NOT EXISTS proposals_category_idx  ON public.proposals(category);
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON public.proposals(created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden ver propuestas
CREATE POLICY "Todos ven propuestas"
  ON public.proposals FOR SELECT TO authenticated
  USING (true);

-- Usuarios verificados pueden crear propuestas
CREATE POLICY "Usuarios crean propuestas"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT email_confirmed_at IS NOT NULL
      FROM auth.users WHERE id = auth.uid()
    )
  );

-- Solo el autor puede eliminar su propuesta
CREATE POLICY "Autor elimina su propuesta"
  ON public.proposals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Diputados, presidentes de junta y super_admin pueden actualizar el estado
CREATE POLICY "Roles politicos actualizan estado"
  ON public.proposals FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('diputado', 'presidente_junta', 'super_admin')
    OR auth.uid() = user_id
  );

-- ── Bucket para evidencias ────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposal-evidence',
  'proposal-evidence',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Roles politicos suben evidencia"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proposal-evidence'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('diputado', 'presidente_junta', 'super_admin')
  );

CREATE POLICY "Evidencia publica"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'proposal-evidence');

-- ── Verificar ─────────────────────────────────────────────────────────────────
SELECT COUNT(*) FROM public.proposals;

-- Eliminar la política problemática que accede a auth.users
DROP POLICY IF EXISTS "Usuarios crean propuestas" ON public.proposals;
 
-- Recrear sin acceder a auth.users directamente
-- La verificación de email la hace el backend con @require_verified
CREATE POLICY "Usuarios crean propuestas"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

  -- Eliminar la política problemática que accede a auth.users
DROP POLICY IF EXISTS "Usuarios crean propuestas" ON public.proposals;
 
-- Recrear sin acceder a auth.users directamente
-- La verificación de email la hace el backend con @require_verified
CREATE POLICY "Usuarios crean propuestas"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);


  -- Tabla de seguimiento
CREATE TABLE IF NOT EXISTS public.follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx  ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows(following_id);

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven follows"
  ON public.follows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios siguen"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuarios dejan de seguir"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- Verificar
SELECT COUNT(*) FROM public.follows;

-- Tabla de votos en propuestas
CREATE TABLE IF NOT EXISTS public.proposal_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)  -- 1 voto por persona por propuesta
);

CREATE INDEX IF NOT EXISTS proposal_votes_proposal_idx ON public.proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS proposal_votes_user_idx     ON public.proposal_votes(user_id);

-- RLS
ALTER TABLE public.proposal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven votos"
  ON public.proposal_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios votan"
  ON public.proposal_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios quitan su voto"
  ON public.proposal_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Verificar
SELECT COUNT(*) FROM public.proposal_votes;

-- Comentarios en propuestas
CREATE TABLE IF NOT EXISTS public.proposal_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS proposal_comments_proposal_idx ON public.proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS proposal_comments_user_idx     ON public.proposal_comments(user_id);

ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven comentarios propuestas"
  ON public.proposal_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios comentan propuestas"
  ON public.proposal_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus comentarios propuestas"
  ON public.proposal_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

SELECT COUNT(*) FROM public.proposal_comments;

-- Vista de propuestas resueltas con evidencia para la biblioteca
CREATE OR REPLACE VIEW public.biblioteca_evidencias AS
SELECT
  p.id,
  p.title,
  p.description,
  p.category,
  p.evidence_url,
  p.evidence_path,
  p.resolution_note,
  p.managed_at,
  p.location_text,
  p.image_url,
  pr.username        AS autor_username,
  pr.full_name       AS autor_name,
  pr.avatar_initials AS autor_initials,
  mg.username        AS gestor_username,
  mg.full_name       AS gestor_name,
  mg.role            AS gestor_role,
  mg.avatar_initials AS gestor_initials
FROM public.proposals p
LEFT JOIN public.profiles pr ON pr.id = p.user_id
LEFT JOIN public.profiles mg ON mg.id = p.managed_by
WHERE p.status = 'resuelta'
  AND p.evidence_url IS NOT NULL;

-- Verificar
SELECT COUNT(*) FROM public.biblioteca_evidencias;

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT CHECK (type IN ('like','comment','repost','save','proposal','meeting','system')),
  actor_name  TEXT,
  actor_initials TEXT,
  post_id     UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  post_excerpt TEXT,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus notificaciones"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Sistema crea notificaciones"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question    TEXT NOT NULL CHECK (char_length(question) <= 300),
  description TEXT CHECK (char_length(description) <= 500),
  ends_at     TIMESTAMPTZ DEFAULT NULL,   -- NULL = sin expiración
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
 
-- 2. Opciones de la encuesta (mínimo 2, máximo 10)
CREATE TABLE IF NOT EXISTS public.poll_options (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text     TEXT NOT NULL CHECK (char_length(text) <= 150),
  position SMALLINT NOT NULL DEFAULT 0   -- orden de aparición
);
 
-- 3. Votos (1 por usuario por encuesta)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)   -- un solo voto por encuesta
);
 
-- Índices
CREATE INDEX IF NOT EXISTS polls_user_id_idx      ON public.polls(user_id);
CREATE INDEX IF NOT EXISTS polls_created_at_idx   ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS poll_options_poll_idx  ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx    ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_idx    ON public.poll_votes(user_id);
 
-- RLS
ALTER TABLE public.polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes   ENABLE ROW LEVEL SECURITY;
 
-- Polls
CREATE POLICY "Todos ven encuestas"
  ON public.polls FOR SELECT TO authenticated USING (true);
 
CREATE POLICY "Usuarios crean encuestas"
  ON public.polls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
 
CREATE POLICY "Autor elimina su encuesta"
  ON public.polls FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
 
-- Poll options
CREATE POLICY "Todos ven opciones"
  ON public.poll_options FOR SELECT TO authenticated USING (true);
 
CREATE POLICY "Service inserta opciones"
  ON public.poll_options FOR INSERT TO service_role WITH CHECK (true);
 
CREATE POLICY "Service elimina opciones"
  ON public.poll_options FOR DELETE TO service_role USING (true);
 
-- Poll votes
CREATE POLICY "Todos ven votos"
  ON public.poll_votes FOR SELECT TO authenticated USING (true);
 
CREATE POLICY "Usuarios votan"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
 
CREATE POLICY "Usuarios quitan su voto"
  ON public.poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
 
-- Verificar
SELECT COUNT(*) FROM public.polls;
SELECT COUNT(*) FROM public.poll_options;
SELECT COUNT(*) FROM public.poll_votes;

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS video_url TEXT;

DROP POLICY IF EXISTS "Todos ven opciones" ON public.poll_options;

CREATE POLICY "Todos ven opciones"
  ON public.poll_options FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service inserta opciones" ON public.poll_options;

CREATE POLICY "Usuarios insertan opciones"
  ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (true);

SELECT COUNT(*) FROM public.polls;
SELECT * FROM public.polls LIMIT 1;

-- ============================================================================
-- ENDURECIMIENTO DE PERMISOS (parche seguro)
-- Objetivo: cerrar políticas demasiado abiertas sin cambiar relaciones ni tablas
-- ============================================================================

-- 1) Storage: limitar uploads al folder del propio usuario
DROP POLICY IF EXISTS "Subir imágenes autenticados" ON storage.objects;
CREATE POLICY "Subir imágenes autenticados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Usuarios autenticados suben pruebas" ON storage.objects;
CREATE POLICY "Usuarios autenticados suben pruebas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2) Poll options: solo el backend/service role debe crear opciones
DROP POLICY IF EXISTS "Usuarios insertan opciones" ON public.poll_options;
DROP POLICY IF EXISTS "Service inserta opciones" ON public.poll_options;
CREATE POLICY "Service inserta opciones"
  ON public.poll_options FOR INSERT TO service_role
  WITH CHECK (true);

-- 3) Notificaciones: evitar que cualquier autenticado cree notificaciones para otros
DROP POLICY IF EXISTS "Sistema crea notificaciones" ON public.notifications;
CREATE POLICY "Sistema crea notificaciones"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','repost','save','proposal','meeting','system'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS actor_initials TEXT,
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS post_excerpt TEXT;

-- ============================================================================
-- DENUNCIAS CIUDADANAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) <= 150),
  description     TEXT NOT NULL CHECK (char_length(description) <= 1000),
  category        TEXT NOT NULL DEFAULT 'otro'
                  CHECK (category IN ('infraestructura','seguridad','ambiente','educacion','salud','transporte','otro')),
  image_url       TEXT,
  video_url       TEXT,
  media_urls      JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_text   TEXT,
  latitude        FLOAT,
  longitude       FLOAT,
  status          TEXT NOT NULL DEFAULT 'recibida'
                  CHECK (status IN ('recibida','en_gestion','resuelta')),
  justice_served  BOOLEAN NOT NULL DEFAULT false,
  evidence_url    TEXT,
  evidence_path   TEXT,
  evidence_files  JSONB NOT NULL DEFAULT '[]'::jsonb,
  managed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  managed_at      TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_user_id_idx ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_category_idx ON public.reports(category);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven denuncias"
  ON public.reports FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios crean denuncias"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Autor elimina su denuncia"
  ON public.reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Roles politicos actualizan denuncias"
  ON public.reports FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('diputado', 'presidente_junta', 'super_admin')
    OR auth.uid() = user_id
  );

CREATE TABLE IF NOT EXISTS public.report_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

CREATE INDEX IF NOT EXISTS report_votes_report_idx ON public.report_votes(report_id);
CREATE INDEX IF NOT EXISTS report_votes_user_idx ON public.report_votes(user_id);

ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven votos denuncias"
  ON public.report_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios votan denuncias"
  ON public.report_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios quitan su voto denuncia"
  ON public.report_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.report_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_comments_report_idx ON public.report_comments(report_id);
CREATE INDEX IF NOT EXISTS report_comments_user_idx ON public.report_comments(user_id);

ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven comentarios denuncias"
  ON public.report_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuarios comentan denuncias"
  ON public.report_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus comentarios denuncias"
  ON public.report_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-evidence',
  'report-evidence',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','video/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Roles politicos suben evidencia denuncias"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-evidence'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('diputado', 'presidente_junta', 'super_admin')
  );

CREATE POLICY "Evidencia denuncias publica"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'report-evidence');

CREATE OR REPLACE VIEW public.biblioteca_casos AS
SELECT
  p.id,
  'propuesta'::TEXT AS case_type,
  p.title,
  p.description,
  p.category,
  false AS justice_served,
  p.evidence_url,
  p.evidence_path,
  p.resolution_note,
  p.managed_at,
  p.location_text,
  p.image_url,
  pr.username        AS autor_username,
  pr.full_name       AS autor_name,
  pr.avatar_initials AS autor_initials,
  mg.username        AS gestor_username,
  mg.full_name       AS gestor_name,
  mg.role            AS gestor_role,
  mg.avatar_initials AS gestor_initials
FROM public.proposals p
LEFT JOIN public.profiles pr ON pr.id = p.user_id
LEFT JOIN public.profiles mg ON mg.id = p.managed_by
WHERE p.status = 'resuelta'
  AND p.evidence_url IS NOT NULL

UNION ALL

SELECT
  r.id,
  'denuncia'::TEXT AS case_type,
  r.title,
  r.description,
  r.category,
  r.justice_served,
  r.evidence_url,
  r.evidence_path,
  r.resolution_note,
  r.managed_at,
  r.location_text,
  r.image_url,
  pr.username        AS autor_username,
  pr.full_name       AS autor_name,
  pr.avatar_initials AS autor_initials,
  mg.username        AS gestor_username,
  mg.full_name       AS gestor_name,
  mg.role            AS gestor_role,
  mg.avatar_initials AS gestor_initials
FROM public.reports r
LEFT JOIN public.profiles pr ON pr.id = r.user_id
LEFT JOIN public.profiles mg ON mg.id = r.managed_by
WHERE r.status = 'resuelta'
  AND r.evidence_url IS NOT NULL;


-- ============================================================================
-- FOROS TEMATICOS POR COMUNIDAD
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community TEXT,
  ADD COLUMN IF NOT EXISTS community_key TEXT,
  ADD COLUMN IF NOT EXISTS address_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_community_key
  ON public.profiles (community_key);

UPDATE public.profiles
SET community_key = lower(trim(both '-' from regexp_replace(coalesce(community, ''), '[^a-zA-Z0-9]+', '-', 'g')))
WHERE community IS NOT NULL
  AND community <> ''
  AND (community_key IS NULL OR community_key = '');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    avatar_initials,
    role,
    requested_role,
    community,
    community_key,
    address_reference
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2)),
    'user',
    CASE
      WHEN NEW.raw_user_meta_data->>'requested_role' IN ('diputado', 'presidente_junta')
        THEN NEW.raw_user_meta_data->>'requested_role'
      ELSE 'user'
    END,
    NULLIF(NEW.raw_user_meta_data->>'community', ''),
    NULLIF(NEW.raw_user_meta_data->>'community_key', ''),
    NULLIF(NEW.raw_user_meta_data->>'address_reference', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_initials = EXCLUDED.avatar_initials,
    requested_role = COALESCE(EXCLUDED.requested_role, public.profiles.requested_role),
    community = COALESCE(EXCLUDED.community, public.profiles.community),
    community_key = COALESCE(EXCLUDED.community_key, public.profiles.community_key),
    address_reference = COALESCE(EXCLUDED.address_reference, public.profiles.address_reference);
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.community_forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community TEXT NOT NULL,
  community_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID NOT NULL REFERENCES public.community_forums(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_forums_community_key
  ON public.community_forums (community_key, created_at);

CREATE INDEX IF NOT EXISTS idx_forum_threads_forum_id
  ON public.forum_threads (forum_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_messages_thread_id
  ON public.forum_messages (thread_id, created_at ASC);

ALTER TABLE public.community_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foros visibles autenticados" ON public.community_forums;
CREATE POLICY "Foros visibles autenticados"
  ON public.community_forums FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Foros creados autenticados" ON public.community_forums;
CREATE POLICY "Foros creados autenticados"
  ON public.community_forums FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Threads visibles autenticados" ON public.forum_threads;
CREATE POLICY "Threads visibles autenticados"
  ON public.forum_threads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Threads creados autenticados" ON public.forum_threads;
CREATE POLICY "Threads creados autenticados"
  ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Mensajes visibles autenticados" ON public.forum_messages;
CREATE POLICY "Mensajes visibles autenticados"
  ON public.forum_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Mensajes creados autenticados" ON public.forum_messages;
CREATE POLICY "Mensajes creados autenticados"
  ON public.forum_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- CANAL DE SOLICITUDES DE SERVICIOS PUBLICOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro'
    CHECK (category IN ('electricidad','agua','basura','alumbrado','alcantarillado','calles','transporte','otro')),
  image_url TEXT,
  video_url TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_url TEXT,
  evidence_path TEXT,
  evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'recibida'
    CHECK (status IN ('recibida','en_gestion','resuelta')),
  resolution_note TEXT,
  managed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  managed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_requests_user_id_idx ON public.service_requests(user_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS service_requests_category_idx ON public.service_requests(category);
CREATE INDEX IF NOT EXISTS service_requests_created_at_idx ON public.service_requests(created_at DESC);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven solicitudes servicios" ON public.service_requests;
CREATE POLICY "Todos ven solicitudes servicios"
  ON public.service_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios crean solicitudes servicios" ON public.service_requests;
CREATE POLICY "Usuarios crean solicitudes servicios"
  ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios eliminan sus solicitudes servicios" ON public.service_requests;
CREATE POLICY "Usuarios eliminan sus solicitudes servicios"
  ON public.service_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'recibida');

DROP POLICY IF EXISTS "Roles politicos actualizan solicitudes servicios" ON public.service_requests;
CREATE POLICY "Roles politicos actualizan solicitudes servicios"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('diputado','presidente_junta','super_admin')
  );

CREATE TABLE IF NOT EXISTS public.service_request_supports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

CREATE INDEX IF NOT EXISTS service_request_supports_request_idx ON public.service_request_supports(request_id);
CREATE INDEX IF NOT EXISTS service_request_supports_user_idx ON public.service_request_supports(user_id);

ALTER TABLE public.service_request_supports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven apoyos solicitudes servicios" ON public.service_request_supports;
CREATE POLICY "Todos ven apoyos solicitudes servicios"
  ON public.service_request_supports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios apoyan solicitudes servicios" ON public.service_request_supports;
CREATE POLICY "Usuarios apoyan solicitudes servicios"
  ON public.service_request_supports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios retiran apoyo solicitudes servicios" ON public.service_request_supports;
CREATE POLICY "Usuarios retiran apoyo solicitudes servicios"
  ON public.service_request_supports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.service_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_request_comments_request_idx ON public.service_request_comments(request_id);
CREATE INDEX IF NOT EXISTS service_request_comments_user_idx ON public.service_request_comments(user_id);

ALTER TABLE public.service_request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven comentarios solicitudes servicios" ON public.service_request_comments;
CREATE POLICY "Todos ven comentarios solicitudes servicios"
  ON public.service_request_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios comentan solicitudes servicios" ON public.service_request_comments;
CREATE POLICY "Usuarios comentan solicitudes servicios"
  ON public.service_request_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios eliminan sus comentarios solicitudes servicios" ON public.service_request_comments;
CREATE POLICY "Usuarios eliminan sus comentarios solicitudes servicios"
  ON public.service_request_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-request-evidence', 'service-request-evidence', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Usuarios suben evidencia solicitudes servicios" ON storage.objects;
CREATE POLICY "Usuarios suben evidencia solicitudes servicios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'service-request-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Todos ven evidencia solicitudes servicios" ON storage.objects;
CREATE POLICY "Todos ven evidencia solicitudes servicios"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'service-request-evidence');

ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evidence_url TEXT,
ADD COLUMN IF NOT EXISTS evidence_path TEXT,
ADD COLUMN IF NOT EXISTS evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notification_zone_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_topics_onboarding_done BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS topic_key TEXT,
ADD COLUMN IF NOT EXISTS community_key TEXT,
ADD COLUMN IF NOT EXISTS entity_type TEXT,
ADD COLUMN IF NOT EXISTS entity_id UUID;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('like','comment','repost','save','proposal','report','service_request','meeting','campaign','system'));

CREATE TABLE IF NOT EXISTS public.civic_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 160),
  description TEXT NOT NULL CHECK (char_length(description) <= 1500),
  campaign_date DATE NOT NULL,
  topic_key TEXT NOT NULL DEFAULT 'participacion',
  target_community TEXT,
  target_community_key TEXT,
  media_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS civic_campaigns_topic_idx
  ON public.civic_campaigns (topic_key, campaign_date DESC);

CREATE INDEX IF NOT EXISTS civic_campaigns_target_community_idx
  ON public.civic_campaigns (target_community_key, active, featured);

ALTER TABLE public.civic_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven campanas" ON public.civic_campaigns;
CREATE POLICY "Todos ven campanas"
  ON public.civic_campaigns FOR SELECT TO authenticated
  USING (true);
