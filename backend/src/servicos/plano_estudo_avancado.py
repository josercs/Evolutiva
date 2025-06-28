import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pydantic import BaseModel
from collections import deque

class Conteudo(BaseModel):
    id: int
    subject: str
    topic: str
    difficulty: str = "medium"
    estimated_time: int = 45
    dependencies: List[int] = []

class UserPreferences(BaseModel):
    available_days: List[str] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    daily_study_time: int = 120
    learning_style: str = "balanced"
    pace: str = "moderate"
    start_time: str = "08:00"
    focus_areas: Optional[List[str]] = None

class StudyBlock(BaseModel):
    id: int
    start_time: str
    end_time: str
    activity_type: str
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
    coverage: Dict[str, float]

def prioritize_contents(contents: List[Conteudo], user: UserPreferences) -> List[Conteudo]:
    prioritized = []
    seen = set()

    def add_with_dependencies(content):
        for dep_id in content.dependencies:
            dep = next((c for c in contents if c.id == dep_id), None)
            if dep and dep.id not in seen:
                add_with_dependencies(dep)
        if content.id not in seen:
            prioritized.append(content)
            seen.add(content.id)

    focus = user.focus_areas or []
    focus_contents = [c for c in contents if c.subject in focus]
    for c in focus_contents:
        add_with_dependencies(c)

    rest = [c for c in contents if c.id not in seen]
    rest.sort(key=lambda c: {"easy": 0, "medium": 1, "hard": 2}.get(c.difficulty, 1))
    for c in rest:
        add_with_dependencies(c)

    return prioritized

def create_daily_structure(user: UserPreferences) -> List[Dict]:
    total = user.daily_study_time
    start = datetime.strptime(user.start_time, "%H:%M")

    if user.pace == "slow":
        base_durations = [40, 40]
    elif user.pace == "intensive":
        base_durations = [60, 60, 45]
    else:
        base_durations = [50, 50, 40]

    durations, acc = [], 0
    for d in base_durations:
        if acc + d <= total:
            durations.append(d)
            acc += d
        else:
            break

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

    blocks = []
    for i, duration in enumerate(durations):
        block_type = types[i % len(types)]
        end = start + timedelta(minutes=duration)
        blocks.append({
            "start_time": start.strftime("%H:%M"),
            "end_time": end.strftime("%H:%M"),
            "activity_type": block_type,
            "duration": duration
        })
        if i < len(durations) - 1:
            start = end + timedelta(minutes=10)
        else:
            start = end
    return blocks

def allocate_contents(contents: List[Conteudo], daily_structure: List[Dict], user: UserPreferences) -> List[DailyPlan]:
    days = []
    content_queue = deque(contents)
    random.shuffle(content_queue)
    base_date = datetime.now()

    for i, dia in enumerate(user.available_days):
        blocks = []
        total_study = 0
        for block in daily_structure:
            if not content_queue:
                break
            content = content_queue.popleft()
            blocks.append(StudyBlock(
                id=content.id,
                start_time=block["start_time"],
                end_time=block["end_time"],
                activity_type=block["activity_type"],
                subject=content.subject,
                topic=content.topic,
                duration=block["duration"],
                priority=1
            ))
            total_study += block["duration"]
        date = (base_date + timedelta(days=i)).strftime("%d/%m/%Y")
        days.append(DailyPlan(
            date=date,
            blocks=blocks,
            total_study_time=total_study
        ))
    return days

def create_smart_goals(schedule: List[DailyPlan], user: UserPreferences) -> List[str]:
    n_practice = sum(1 for d in schedule for b in d.blocks if b.activity_type == "prática")
    n_quiz = sum(1 for d in schedule for b in d.blocks if b.activity_type == "quiz")
    n_review = sum(1 for d in schedule for b in d.blocks if b.activity_type == "revisão")
    return [
        f"Realizar pelo menos {n_practice} sessões de prática.",
        f"Completar {n_quiz} quizzes de autoavaliação.",
        f"Revisar conteúdos em {n_review} blocos diferentes.",
        f"Estudar em todos os dias disponíveis da semana."
    ]

def calculate_coverage(schedule: List[DailyPlan], all_contents: List[Conteudo]) -> Dict[str, float]:
    subjects = set(c.subject for c in all_contents)
    coverage = {}
    for subj in subjects:
        total = len([c for c in all_contents if c.subject == subj])
        done = len(set((b.subject, b.topic) for d in schedule for b in d.blocks if b.subject == subj))
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