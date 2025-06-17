from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Boolean, Integer, String
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(db.String(20), default='student')
    avatar_url = db.Column(db.String(255))
    onboarding_done = db.Column(Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    progress = db.relationship('Progress', backref='user', lazy=True)
    achievements = db.relationship('Achievement', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.name}>'
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
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
    title = db.Column(db.String(100), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
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
    current_lesson = db.relationship('Lesson', foreign_keys=[current_lesson_id])
    
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
    horario = db.Column(db.String)
    materia = db.Column(db.String)
    conteudo = db.Column(db.String)
    status = db.Column(db.String)
    prioridade = db.Column(db.String)
    link = db.Column(db.String)
    videos = db.Column(db.String)
    anotacoes = db.Column(db.String)
    feito = db.Column(db.Boolean)
    pdf = db.Column(db.LargeBinary)
    pdf_nome = db.Column(db.String)
    dia = db.Column(db.Date)
    conteudo_id = db.Column(db.Integer)
    link1 = db.Column(db.String)

class PlanoEstudo(db.Model):
    __tablename__ = 'planos_estudo'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), db.ForeignKey('users.email'), nullable=False)
    dados = db.Column(db.JSON, nullable=False)  # Armazena o plano como JSON
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<PlanoEstudo {self.email}>'

