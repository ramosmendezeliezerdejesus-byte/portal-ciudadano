# 🏛️ Portal Ciudadano — Full Stack

---

## 📋 Nombre del Proyecto

**Portal Ciudadano** - Plataforma digital de participación ciudadana y gestión comunitaria.

---

## 📝 Descripción del Proyecto

Portal Ciudadano es una aplicación web diseñada para fortalecer la democracia participativa, permitiendo a los ciudadanos:
- Crear propuestas y denuncias ciudadanas por categoría
- Participar en encuestas públicas con transparencia de resultados
- Verificar perfiles (diputados, presidentes de junta)
- Agenda de reuniones comunitarias con RSVP
- Biblioteca de evidencias de casos resueltos
- Notificaciones en tiempo real
- Mapas de incidencias por zona
- Foros temáticos por comunidad
- Moderación de contenido anti-insultos
- Exportación de reportes comunitarios

---

## 🛠️ Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 18.3.1 | UI Library |
| Vite | 5.4.10 | Build tool |
| Tailwind CSS | 3.4.14 | Estilos |
| React Router DOM | 7.13.1 | Enrutamiento |
| Leaflet + React Leaflet | 1.9.4 / 4.2.1 | Mapas interactivos |
| Recharts | 3.8.0 | Gráficos y dashboards |
| jsPDF | 4.2.1 | Generación de PDF |
| PPTXGenJS | 4.0.1 | Generación de PowerPoint |
| XLSX | 0.18.5 | Exportación a Excel |

### Backend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Flask | 3.0.3 | Framework web |
| Flask-CORS | 4.0.1 | Cross-Origin Resource Sharing |
| Supabase | 2.5.3 | Base de datos + Auth |
| PyJWT | 2.8.0 | Tokens JWT |
| python-dotenv | 1.0.1 | Variables de entorno |
| better-profanity | 0.7.0 | Filtro de palabras |
| detoxify | 0.5.2 | Moderación de contenido IA |

### Base de Datos
- **Supabase (PostgreSQL)** con Row Level Security (RLS)
- **Storage Buckets:** post-images, post-videos, verification-docs, report-evidence, proposal-evidence

---

## ✨ Características del Sistema

### Autenticación y Perfiles
- Registro e inicio de sesión con Supabase Auth
- Perfiles con username, bio, avatar initials, sector/barrio opcional
- Sistema de verificación de roles (user, verified, diputado, presidente_junta, super_admin)
- Solicitudes de verificación con documentos

### Contenido Ciudadano
- **Posts:** Crear, likes, reposts, guardados, comentarios
- **Propuestas:** Categorías (infraestructura, seguridad, ambiente, educación, salud, transporte), votación (1 por usuario), estados (recibida, en gestión, resuelta)
- **Denuncias:** Similar a propuestas + campo justice_served, evidencia de respuesta
- **Encuestas:** Preguntas, opciones múltiples, 1 voto por usuario, resultados transparentes
- **Foros temáticos:** Discusiones por comunidad

### Reuniones y Agenda
- Crear reuniones (solo roles políticos)
- RSVP de usuarios
- Categorías: general, presupuesto, transporte, seguridad, ambiente, educación

### Mapas y Zonas
- Mapas de incidencias (baches, iluminación, basura)
- Dashboard de demandas por zona
- Geolocalización de propuestas y denuncias

### Biblioteca
- Vista unificada de propuestas y denuncias resueltas con evidencia
- Documentos públicos de casos gestionados

### Notificaciones
- En tiempo real: likes, comentarios, reposts, guardados, propuestas, reuniones, sistema
- Filtrado por zona/tema

### Administración
- Panel de super_admin
- Gestión de campañas informativas (educación cívica)
- Control de perfiles verificados
- Auditoría y trazabilidad

### Moderación
- Filtro automático de insultos (better-profanity)
- Moderación con IA (detoxify)
- Contenido moderado en posts, comentarios, propuestas y denuncias

---

## 💻 Requisitos del Sistema

### Backend
- Python 3.11 o superior
- pip (gestor de paquetes)
- Entorno virtual (recomendado)

### Frontend
- Node.js 18 o superior
- npm (incluido con Node.js)

### Servicios Externos
- Cuenta en Supabase (gratis o de pago)
- Proyecto creado en Supabase

### Navegador
- Chrome, Firefox, Edge, Safari (versiones recientes)
- JavaScript habilitado

---

## 📥 Instalación del Proyecto

### Paso 1: Clonar repositorio de GitHub

```bash
git clone https://github.com/TU_USUARIO/portal-ciudadano.git
cd portal-ciudadano
```

### Paso 2: Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** → pegar y ejecutar `supabase_schema.sql`
3. En **Settings → API** copiar:
   - `Project URL`
   - `anon public key`
   - `service_role key` (para operaciones admin)

### Paso 3: Configurar Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
```

Crear archivo `.env` en la carpeta backend:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_role_key
JWT_SECRET=tu_jwt_secret
```

### Paso 4: Configurar Frontend

```bash
cd ../frontend
npm install
```

Crear archivo `.env` en la carpeta frontend:
```env
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Paso de Ejecución del Proyecto Paso a Paso

### Terminal 1 - Backend
```bash
cd backend
venv\Scripts\activate
python app.py
# Corre en http://localhost:5000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
# Corre en http://localhost:3000
```

### Acceder a la aplicación
Abrir navegador en: `http://localhost:3000`

---

## 📁 Estructura del Proyecto

```
portal-ciudadano/
├── backend/                          ← Flask API
│   ├── app.py                        ← Aplicación principal
│   ├── config.py                     ← Configuración y clientes Supabase
│   ├── helpers.py                    ← Funciones auxiliares
│   ├── middleware.py                 ← Middleware de autenticación
│   ├── moderation.py                 ← Moderación de contenido
│   ├── requirements.txt              ← Dependencias Python
│   ├── .env                         ← Variables de entorno (no subir a git)
│   ├── routes/                       ← Blueprints de Flask
│   │   ├── admin.py                 ← Panel de administración
│   │   ├── auth.py                  ← Registro, login, logout
│   │   ├── biblioteca.py            ← Biblioteca de evidencias
│   │   ├── campaigns.py             ← Gestión de campañas
│   │   ├── comments.py              ← Comentarios en posts
│   │   ├── forums.py                ← Foros temáticos
│   │   ├── meetings.py              ← Reuniones comunitarias
│   │   ├── notifications.py         ← Sistema de notificaciones
│   │   ├── polls.py                 ← Encuestas públicas
│   │   ├── posts.py                 ← Posts del feed
│   │   ├── profiles.py              ← Perfiles de usuario
│   │   ├── proposals.py             ← Propuestas ciudadanas
│   │   ├── reports.py               ← Denuncias ciudadanas
│   │   ├── service_requests.py      ← Canal de solicitudes
│   │   ├── upload.py                ← Subida de archivos
│   │   └── verification.py          ← Verificación de roles
│   └── services/                     ← Lógica de negocio
│       ├── admin_service.py
│       ├── auth_service.py
│       ├── base.py
│       ├── biblioteca_service.py
│       ├── campaigns_service.py
│       ├── comments_service.py
│       ├── forums_service.py
│       ├── meetings_service.py
│       ├── notifications_service.py
│       ├── polls_service.py
│       ├── posts_service.py
│       ├── profiles_service.py
│       ├── proposals_service.py
│       ├── reports_service.py
│       ├── upload_service.py
│       └── verification_service.py
│
├── frontend/                         ← React + Vite + Tailwind
│   ├── src/
│   │   ├── components/              ← Componentes reutilizables
│   │   │   ├── NavMenu.jsx         ← Navegación principal
│   │   │   ├── RoleBadge.jsx       ← Badge de roles
│   │   │   └── VerificationForm.jsx ← Formulario de verificación
│   │   ├── context/
│   │   │   └── AuthContext.jsx      ← Estado global de autenticación
│   │   ├── pages/                  ← Páginas de la aplicación
│   │   │   ├── Admin.jsx           ← Panel de administrador
│   │   │   ├── Agenda.jsx          ← Reuniones y eventos
│   │   │   ├── Biblioteca.jsx       ← Documentos y evidencias
│   │   │   ├── Dashboard.jsx       ← Feed principal
│   │   │   ├── Denuncias.jsx       ← Sistema de denuncias
│   │   │   ├── Encuestas.jsx       ← Encuestas públicas
│   │   │   ├── Login.jsx           ← Inicio de sesión
│   │   │   ├── Notificaciones.jsx  ← Notificaciones
│   │   │   ├── Profile.jsx         ← Perfil propio
│   │   │   ├── PublicProfile.jsx   ← Perfil público
│   │   │   ├── Propuestas.jsx      ← Propuestas ciudadanas
│   │   │   ├── Register.jsx        ← Registro
│   │   │   ├── Zonas.jsx           ← Mapas y zonas
│   │   │   └── ZonasDenuncias.jsx  ← Mapa de denuncias
│   │   ├── App.jsx                 ← Enrutador principal
│   │   ├── main.jsx                ← Punto de entrada
│   │   └── index.css               ← Estilos globales
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── supabase_schema.sql               ← Esquema completo de base de datos
└── README.md                        ← Este archivo
```

---

## 🎮 Uso del Sistema

### Ciudadanos
1. **Registro:** Crear cuenta con email, username y nombre completo
2. **Login:** Iniciar sesión con email y contraseña
3. **Dashboard:** Ver feed de posts, crear publicaciones, dar likes, comentar
4. **Propuestas:** Crear propuestas por categoría, votar propuestas de otros
5. **Denuncias:** Reportar incidencias, subir evidencias
6. **Reuniones:** Ver agenda, RSVP a reuniones comunitarias
7. **Encuestas:** Participar en encuestas públicas
8. **Biblioteca:** Consultar casos resueltos con evidencia
9. **Mapas:** Ver incidencias geolocalizadas por zona
10. **Perfil:** Editar información personal, ver estadísticas
11. **Verificación:** Solicitar verificación como diputado o presidente de junta

### Roles Verificados (Diputado/Presidente Junta)
- Crear reuniones comunitarias
- Gestionar propuestas y denuncias (cambiar estados)
- Subir evidencias de resolución
- Crear campañas informativas

### Super Admin
- Panel de administración completo
- Aprobar/rechazar solicitudes de verificación
- Gestión de campañas educativas
- Auditoría y trazabilidad total
- Exportación de reportes comunitarios

---

## 🔑 Credenciales Relevantes

### Supabase
- **URL:** `https://[tu-proyecto].supabase.co`
- **Anon Key:** Clave pública para operaciones del cliente
- **Service Role Key:** Clave privada para operaciones administrativas (backend)
- **JWT Secret:** Para validación de tokens

### Variables de Entorno - Backend (.env)
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_role_key
JWT_SECRET=tu_jwt_secret
```

### Variables de Entorno - Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

---

## 🔌 API Utilizada y su Implementación Paso a Paso

### Supabase (Base de Datos + Auth + Storage)

#### 1. Configuración inicial
```python
# backend/config.py
from supabase import Client, create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Cliente público (operaciones con RLS)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cliente admin (operaciones con service role)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```

#### 2. Autenticación
```python
# backend/routes/auth.py
import jwt
from supabase import Client

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')
    full_name = data.get('full_name')
    
    # Registrar en Supabase Auth
    auth_response = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {
                "username": username,
                "full_name": full_name
            }
        }
    })
    
    return jsonify({"message": "Usuario registrado"}), 201
```

#### 3. Operaciones CRUD con RLS
```python
# backend/services/posts_service.py
def get_posts():
    # RLS se aplica automáticamente según el usuario autenticado
    response = supabase.table('posts').select('*, profiles(username, avatar_initials)').execute()
    return response.data

def create_post(user_id, content, image_url=None):
    response = supabase.table('posts').insert({
        'user_id': user_id,
        'content': content,
        'image_url': image_url
    }).execute()
    return response.data
```

#### 4. Storage (Subida de archivos)
```python
# backend/routes/upload.py
def upload_image():
    file = request.files['file']
    user_id = get_jwt_identity()
    
    # Subir a Supabase Storage
    file_path = f"{user_id}/{file.filename}"
    supabase.storage.from_('post-images').upload(
        file_path,
        file.read(),
        {"content-type": file.content_type}
    )
    
    # Obtener URL pública
    url = supabase.storage.from_('post-images').get_public_url(file_path)
    return jsonify({"url": url})
```

#### 5. Verificación de JWT en rutas protegidas
```python
# backend/middleware.py
from functools import wraps
import jwt

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "Token requerido"}), 401
        
        try:
            payload = jwt.decode(token.split()[1], JWT_SECRET, algorithms=['HS256'])
            request.user_id = payload['sub']
        except:
            return jsonify({"error": "Token inválido"}), 401
        
        return f(*args, **kwargs)
    return decorated
```

#### 6. Uso desde el Frontend (React)
```javascript
// frontend/src/context/AuthContext.jsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Login
const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (data.session) {
    localStorage.setItem('token', data.session.access_token)
  }
}

// Llamada a API con token
const createPost = async (content) => {
  const token = localStorage.getItem('token')
  const response = await fetch('http://localhost:5000/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  })
  return response.json()
}
```

---

## 👥 Autores

### Desarrollador del Proyecto
**Eliezer de Jesús Ramos Méndez**
- Email: ramosmendezeliezerdejesus@gmail.com
- Rol: Desarrollador Full Stack

### Administrador de Proyecto
**Rijo**
- Rol: Administrador de Proyecto

---

## 📄 Licencia

Este proyecto es privado y propietario. Todos los derechos reservados.

---

## 🚀 Producción

### Frontend
```bash
cd frontend
npm run build
# Subir carpeta dist/ a Vercel / Netlify / S3
```

### Backend
- Usar Gunicorn: `gunicorn -w 4 app:app`
- Configurar Nginx como proxy inverso
- O desplegar en Railway / Render

### Variables de entorno
- Configurar en el panel de tu hosting
- **NUNCA** subir archivos `.env` al repositorio

---

## 📊 Estado del Proyecto

### ✅ Completado (100%)
- Política de privacidad y consentimiento
- Perfil con sector/barrio (opcional)
- Biblioteca de documentos públicos
- Agenda de reuniones comunitarias
- Registro de asistencia
- Registro con verificación
- Control de perfiles verificados
- Moderación de contenido
- Sistema de denuncias
- Propuestas ciudadanas
- Comentarios moderados
- Encuestas públicas
- Votación de propuestas
- Estados de solicitudes
- Evidencia de respuesta
- Dashboard de demandas por zona
- Mapas de incidencias
- Transparencia de historial

