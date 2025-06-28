import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pydantic import BaseModel

class Conteudo(BaseModel):
    id: int
    subject: str
    topic: str
    difficulty: str = "medium"
    estimated_time: int = 45  # minutos
    dependencies: List[int] = []

class UserPreferences(BaseModel):
    available_days: List[str] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    daily_study_time: int = 120  # minutos
    learning_style: str = "balanced"  # visual, auditory, kinesthetic, reading, balanced
    pace: str = "moderate"  # slow, moderate, intensive
    start_time: str = "08:00"
    focus_areas: Optional[List[str]] = None

class StudyBlock(BaseModel):
    id: int  # <-- Adicione esta linha!
    start_time: str
    end_time: str
    activity_type: str  # theory, practice, review, quiz, break
    subject: str
    topic: str
    duration: int
    priority: int = 1

class DailyPlan(BaseModel):
    date: str
    blocks: List[StudyBlock]
    total_study_time: int
    focus_area: Optional[str] = None

class WeeklyPlan(BaseModel):
    week_number: int
    days: List[DailyPlan]
    weekly_goals: List[str]
    total_hours: int
    coverage: Dict[str, float]  # % de cobertura por matéria

def prioritize_contents(contents: List[Conteudo], user: UserPreferences) -> List[Conteudo]:
    # Prioriza por dependências, áreas de foco, dificuldade e ordem sugerida
    prioritized = []
    seen = set()
    # 1. Dependências primeiro
    def add_with_dependencies(content):
        for dep_id in content.dependencies:
            dep = next((c for c in contents if c.id == dep_id), None)
            if dep and dep.id not in seen:
                add_with_dependencies(dep)
        if content.id not in seen:
            prioritized.append(content)
            seen.add(content.id)
    # 2. Áreas de foco
    focus = user.focus_areas or []
    focus_contents = [c for c in contents if c.subject in focus]
    for c in focus_contents:
        add_with_dependencies(c)
    # 3. Restante por dificuldade (fácil primeiro)
    rest = [c for c in contents if c.id not in seen]
    rest.sort(key=lambda c: {"easy": 0, "medium": 1, "hard": 2}.get(c.difficulty, 1))
    for c in rest:
        add_with_dependencies(c)
    return prioritized

def create_daily_structure(user: UserPreferences) -> List[Dict]:
    # Estrutura baseada em ritmo e estilo de aprendizagem
    blocks = []
    total = user.daily_study_time
    start = datetime.strptime(user.start_time, "%H:%M")
    # Definições baseadas em ritmo
    if user.pace == "slow":
        block_durations = [40, 40]
    elif user.pace == "intensive":
        block_durations = [60, 60, 45]
    else:
        block_durations = [50, 50, 40]
    # Ajuste para não exceder o tempo diário
    block_durations = [d for d in block_durations if sum(block_durations[:block_durations.index(d)+1]) <= total]
    # Tipos de bloco baseados em estilo
    style = user.learning_style
    types = ["teoria", "prática", "revisão"]
    if style == "visual":
        types = ["teoria", "prática", "quiz"]
    elif style == "auditory":
        types = ["teoria", "quiz", "revisão"]
    elif style == "kinesthetic":
        types = ["prática", "teoria", "quiz"]
    elif style == "reading":
        types = ["teoria", "revisão", "quiz"]
    # Monta blocos
    for i, duration in enumerate(block_durations):
        block_type = types[i % len(types)]
        end = start + timedelta(minutes=duration)
        blocks.append({
            "start_time": start.strftime("%H:%M"),
            "end_time": end.strftime("%H:%M"),
            "activity_type": block_type,
            "duration": duration
        })
        # Pausa de 10min entre blocos (exceto o último)
        if i < len(block_durations) - 1:
            start = end + timedelta(minutes=10)
        else:
            start = end
    return blocks

def allocate_contents(contents: List[Conteudo], daily_structure: List[Dict], user: UserPreferences) -> List[DailyPlan]:
    # Aloca conteúdos priorizados nos blocos diários, alternando matérias e aplicando espaçamento
    days = []
    content_idx = 0
    n_days = len(user.available_days)
    used_subjects = set()
    for i, dia in enumerate(user.available_days):
        blocks = []
        total_study = 0
        for block in daily_structure:
            if content_idx >= len(contents):
                content_idx = 0  # Reinicia para espaçamento/revisão
            content = contents[content_idx]
            used_subjects.add(content.subject)
            blocks.append(StudyBlock(
                id=content.id,  # <-- ADICIONE ESTA LINHA
                start_time=block["start_time"],
                end_time=block["end_time"],
                activity_type=block["activity_type"],
                subject=content.subject,
                topic=content.topic,
                duration=block["duration"],
                priority=1
            ))
            total_study += block["duration"]
            content_idx += 1
        days.append(DailyPlan(
            date=dia,  # Exemplo: "Segunda", "Terça", etc.
            blocks=blocks,
            total_study_time=total_study,
            focus_area=None
        ))
    return days

def create_smart_goals(schedule: List[DailyPlan], user: UserPreferences) -> List[str]:
    # Metas SMART baseadas no plano
    n_practice = sum(
        1 for d in schedule for b in d.blocks if b.activity_type == "prática"
    )
    n_quiz = sum(
        1 for d in schedule for b in d.blocks if b.activity_type == "quiz"
    )
    n_review = sum(
        1 for d in schedule for b in d.blocks if b.activity_type == "revisão"
    )
    return [
        f"Realizar pelo menos {n_practice} sessões de prática.",
        f"Completar {n_quiz} quizzes de autoavaliação.",
        f"Revisar conteúdos em {n_review} blocos diferentes.",
        f"Estudar em todos os dias disponíveis da semana."
    ]

def calculate_coverage(schedule: List[DailyPlan], all_contents: List[Conteudo]) -> Dict[str, float]:
    # Calcula % de cobertura por matéria
    subjects = set(c.subject for c in all_contents)
    coverage = {}
    for subj in subjects:
        total = len([c for c in all_contents if c.subject == subj])
        done = len(set(
            (b.subject, b.topic)
            for d in schedule for b in d.blocks if b.subject == subj
        ))
        coverage[subj] = round(100 * done / total, 1) if total else 0.0
    return coverage

def generate_study_plan(user: UserPreferences, contents: List[Conteudo]) -> WeeklyPlan:
    prioritized_contents = prioritize_contents(contents, user)
    daily_structure = create_daily_structure(user)
    weekly_schedule = allocate_contents(prioritized_contents, daily_structure, user)
    weekly_goals = create_smart_goals(weekly_schedule, user)
    coverage = calculate_coverage(weekly_schedule, contents)
    total_hours = sum(day.total_study_time for day in weekly_schedule) // 60
    return WeeklyPlan(
        week_number=datetime.now().isocalendar()[1],
        days=weekly_schedule,
        weekly_goals=weekly_goals,
        total_hours=total_hours,
        coverage=coverage
    )