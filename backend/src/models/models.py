from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.dialects.postgresql import ARRAY, TEXT  # Postgres specific (legacy); evitar usar diretamente em colunas se quiser compat SQLite
from sqlalchemy import UniqueConstraint

db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)  # was 128; 255 avoids truncation
    role = db.Column(db.String(20), default='student')
    avatar_url = db.Column(db.String(255), nullable=True)
    has_onboarding = db.Column(db.Boolean, default=False)
    idade = db.Column(db.Integer)
    escolaridade = db.Column(db.String(64), nullable=True)     # antes podia ser muito curto
    objetivo = db.Column(db.String(120), nullable=True)
    # ATENÇÃO: ARRAY não é suportado pelo SQLite usado em testes. Usar JSON garante compatibilidade multi‑dialeto.
    # Em Postgres podemos futuramente migrar para ARRAY(TEXT) se for realmente necessário para operações específicas.
    dias_disponiveis = db.Column(db.JSON, nullable=True)
    tempo_diario = db.Column(db.Integer)
    estilo_aprendizagem = db.Column(db.String(32), nullable=True)
    ritmo = db.Column(db.String(16), nullable=True)            # ex.: leve | moderado | desafiador
    horario_inicio = db.Column(db.Time, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    curso_id = db.Column(db.Integer, db.ForeignKey('cursos.id'), nullable=True)

    # Relacionamentos (exemplo: progresso, conquistas)
    progress = db.relationship('Progress', backref='user', lazy=True)
    achievements = db.relationship('Achievement', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    # UserMixin já provê is_authenticated, is_active, is_anonymous, get_id
        
class Course(db.Model):
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    modules = db.relationship('Module', backref='course', lazy=True)
    progress = db.relationship('Progress', backref='course', lazy=True)
    
    def __repr__(self):
        return f'<Course {self.title}>'
        
class Module(db.Model):
    __tablename__ = 'modules'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'))
    materia_id = db.Column(db.Integer, db.ForeignKey('horarios_escolares.id'))  # <-- novo campo
    order = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    lessons = db.relationship('Lesson', backref='module', lazy=True)
    
    def __repr__(self):
        return f'<Module {self.title}>'
        
class Lesson(db.Model):
    __tablename__ = 'lessons'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    duration = db.Column(db.String(20))
    module_id = db.Column(db.Integer, db.ForeignKey('modules.id'), nullable=False)
    order = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    quizzes = db.relationship('Quiz', backref='lesson', lazy=True)
    completed_by = db.relationship('CompletedLesson', backref='lesson', lazy=True)
    
    def __repr__(self):
        return f'<Lesson {self.title}>'
        
class Quiz(db.Model):
    __tablename__ = 'quizzes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    questions = db.relationship('Question', backref='quiz', lazy=True)
    
    def __repr__(self):
        return f'<Quiz {self.title}>'
        
class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    options = db.relationship('Option', backref='question', lazy=True)
    
    def __repr__(self):
        return f'<Question {self.id}>'
        
class Option(db.Model):
    __tablename__ = 'options'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Option {self.id}>'
        
class Progress(db.Model):
    __tablename__ = 'progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    current_lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'))
    progress_percentage = db.Column(db.Integer, default=0)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    current_lesson = db.relationship('Lesson', foreign_keys=[current_lesson_id], lazy=True)

    def __repr__(self):
        return f'<Progress {self.user_id}-{self.course_id}>'
        
class CompletedLesson(db.Model):
    __tablename__ = 'completed_lessons'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CompletedLesson {self.user_id}-{self.lesson_id}>'
        
class Achievement(db.Model):
    __tablename__ = 'achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Achievement {self.title}>'

class HorariosEscolares(db.Model):
    __tablename__ = 'horarios_escolares'
    id = db.Column(db.Integer, primary_key=True)
    materia = db.Column(db.String)
    horario = db.Column(db.String)

class PlanoEstudo(db.Model):
    __tablename__ = 'planos_estudo'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), db.ForeignKey('users.email'), nullable=False)
    dados = db.Column(db.JSON, nullable=False)  # Armazena o plano como JSON
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<PlanoEstudo {self.email}>'

class SubjectContent(db.Model):
    __tablename__ = 'subject_contents'
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String)
    topic = db.Column(db.String)
    content_html = db.Column(db.Text)
    created_at = db.Column(db.DateTime)
    materia_id = db.Column(db.Integer)
    curso_id = db.Column(db.Integer)

    def __repr__(self):
        return f'<SubjectContent {self.subject} - {self.topic}>'

class Curso(db.Model):
    __tablename__ = 'cursos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255))

class CursoMateria(db.Model):
    __tablename__ = 'curso_materia'
    id = db.Column(db.Integer, primary_key=True)
    curso_id = db.Column(db.Integer, db.ForeignKey('cursos.id'))
    materia_id = db.Column(db.Integer, db.ForeignKey('horarios_escolares.id'))

class Conteudo(db.Model):
    __tablename__ = 'conteudos'
    id = db.Column(db.Integer, primary_key=True)
    materia_id = db.Column(db.Integer, db.ForeignKey('horarios_escolares.id'), nullable=False)
    titulo = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text)
    conteudo_html = db.Column(db.Text)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamento com HorariosEscolares (Materia)
    materia = db.relationship('HorariosEscolares', backref='conteudos', lazy=True)

    def __repr__(self):
        return f'<Conteudo {self.titulo}>'

class XPStreak(db.Model):
    __tablename__ = 'xp_streak'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, unique=True)
    xp = db.Column(db.Integer, default=0)
    streak = db.Column(db.Integer, default=0)

class CompletedContent(db.Model):
    __tablename__ = 'completed_content'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    content_id = db.Column(db.Integer, nullable=False)
    completed_at = db.Column(db.DateTime, default=db.func.now())

class ProgressoMateria(db.Model):
    __tablename__ = "progresso_materia"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subject = db.Column(db.String, nullable=False)
    percent = db.Column(db.Float, default=0)

class Tarefa(db.Model):
    __tablename__ = 'tarefas'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text)
    importante = db.Column(db.Boolean, default=False)
    urgente = db.Column(db.Boolean, default=False)
    prioridade = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='pendente')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    criado_em = db.Column(db.DateTime, default=db.func.now())
    atualizado_em = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    def __repr__(self):
        return f'<Tarefa {self.titulo}>'

class PomodoroSession(db.Model):
    __tablename__ = 'pomodoro_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    inicio = db.Column(db.DateTime, nullable=False)
    fim = db.Column(db.DateTime, nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # foco, pausa, pausa longa
    duracao = db.Column(db.Integer, nullable=False)

# --- Novas tabelas para agendas e hábitos ---
class AgendaBloco(db.Model):
    __tablename__ = 'agenda_blocos'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.String(20), nullable=False)  # formato dd/MM/YYYY
    start_time = db.Column(db.String(5), nullable=False)  # HH:MM
    end_time = db.Column(db.String(5), nullable=False)    # HH:MM
    activity_type = db.Column(db.String(40), nullable=False)
    subject = db.Column(db.String(255))
    topic = db.Column(db.String(255))
    duration = db.Column(db.Integer)
    priority = db.Column(db.Integer)
    status = db.Column(db.String(20))
    content_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class HabitoCheckin(db.Model):
    __tablename__ = 'habitos_checkin'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    habit = db.Column(db.String(50), nullable=False)  # ex: estudo_diario, leitura, etc.
    date = db.Column(db.String(20), nullable=False)   # formato dd/MM/YYYY
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'habit', 'date', name='uq_habito_user_habit_date'),
    )

# --- Persistente cache para resultados do YouTube ---
class YouTubeCache(db.Model):
    __tablename__ = 'youtube_cache'
    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.String(255), nullable=False, index=True)
    max_results = db.Column(db.Integer, nullable=False, default=3)
    results = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<YouTubeCache q={self.query} max={self.max_results}>'

# ==== Weekly quiz generated (deterministic, JSON payload) ====
class WeeklyQuiz(db.Model):
    __tablename__ = 'weekly_quizzes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    week_start = db.Column(db.Date, nullable=False, index=True)  # Monday (user TZ if available)
    status = db.Column(db.String(16), nullable=False, default='ready', index=True)  # ready|pending
    version = db.Column(db.Integer, nullable=False, default=1)
    data = db.Column(db.JSON, nullable=False)  # full quiz JSON array
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'week_start', name='uq_weekly_quiz_user_week'),
    )

    def __repr__(self):
        return f'<WeeklyQuiz user={self.user_id} id={self.id}>'

