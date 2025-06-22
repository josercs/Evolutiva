from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='student')
    avatar_url = db.Column(db.String(255), nullable=True)
    has_onboarding = db.Column(db.Boolean, default=False)
    idade = db.Column(db.Integer)
    escolaridade = db.Column(db.String(50))
    objetivo = db.Column(db.String(100))
    dias_disponiveis = db.Column(db.ARRAY(db.String))
    tempo_diario = db.Column(db.Integer)
    estilo_aprendizagem = db.Column(db.String(50))
    ritmo = db.Column(db.String(50))
    horario_inicio = db.Column(db.Time)
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
        
    # Flask-Login integration
    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True  # ou lógica para desativar usuário

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)
        
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

