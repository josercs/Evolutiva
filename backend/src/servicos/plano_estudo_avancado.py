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
    status: str = "ok"  # "ok", "dificuldade", "pendente"

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

def get_pending_blocks(semana_anterior: List[DailyPlan]) -> List[StudyBlock]:
    return [
        b for d in semana_anterior for b in d.blocks
        if getattr(b, "status", "ok") in ["pendente", "dificuldade"]
    ]

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

    # Todos os blocos serão do tipo "leitura"
    types = ["leitura"] * len(durations)

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

def get_next_week_dates(selected_days: List[str]) -> List[str]:
    dias_map = {
        "segunda": 0, "terça": 1, "terca": 1, "quarta": 2, "quinta": 3, "sexta": 4, "sábado": 5, "sabado": 5, "domingo": 6
    }
    today = datetime.now()
    week_dates = []
    used_weekdays = set()
    for dia in selected_days:
        dia_idx = dias_map[dia.strip().lower()]
        if today.weekday() == dia_idx:
            target_date = today
        else:
            days_ahead = (dia_idx - today.weekday() + 7) % 7
            target_date = today + timedelta(days=days_ahead)
        if target_date.weekday() not in used_weekdays:
            used_weekdays.add(target_date.weekday())
            week_dates.append(target_date.strftime("%d/%m/%Y"))
    return week_dates

def allocate_contents(conteudos_pendentes, novos_conteudos, daily_structure, user, revisoes_agendadas=None):
    days = []
    content_queue = deque(conteudos_pendentes + novos_conteudos)
    random.shuffle(content_queue)
    week_dates = get_next_week_dates(user.available_days)

    revisoes_agendadas = revisoes_agendadas or {}

    for i, date in enumerate(week_dates):
        dia_semana = datetime.strptime(date, "%d/%m/%Y").weekday()  # 5 = sábado
        blocks = []
        total_study = 0

        if dia_semana == 5:  # Sábado
            # Só adiciona revisões marcadas pelo usuário
            for bloco in revisoes_agendadas.get(date, []):
                blocks.append(bloco)
                total_study += bloco.duration

        else:
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
                    priority=1,
                    status=getattr(content, "status", "ok")
                ))
                total_study += block["duration"]

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

def generate_study_plan(user: UserPreferences, contents: List[Conteudo], semana_anterior: Optional[List[DailyPlan]] = None):
    try:
        prioritized_contents = prioritize_contents(contents, user)
        daily_structure = create_daily_structure(user)
        conteudos_pendentes = get_pending_blocks(semana_anterior) if semana_anterior else []
        revisoes_agendadas = extrair_revisoes_agendadas(None)
        weekly_schedule = allocate_contents(conteudos_pendentes, prioritized_contents, daily_structure, user, revisoes_agendadas)
        if conteudos_pendentes:
            bloco_revisao = StudyBlock(
                id=-1,
                start_time="19:00",
                end_time="19:45",
                activity_type="revisão",
                subject="Revisão Geral",
                topic="Conteúdos com dificuldade",
                duration=45,
                status="pendente"
            )
            weekly_schedule[-1].blocks.append(bloco_revisao)
        weekly_goals = create_smart_goals(weekly_schedule, user)
        coverage = calculate_coverage(weekly_schedule, contents)
        total_hours = sum(day.total_study_time for day in weekly_schedule) // 60
        novo_plano = WeeklyPlan(
            week_number=datetime.now().isocalendar()[1],
            days=weekly_schedule,
            weekly_goals=weekly_goals,
            total_hours=total_hours,
            coverage=coverage
        )
        def garantir_hoje_no_plano(days_list, daily_structure, conteudos_pendentes, novos_conteudos, user):
            hoje = datetime.now()
            dia_semana = hoje.strftime("%A").lower()
            dias_map = {
                "monday": "segunda",
                "tuesday": "terça",
                "wednesday": "quarta",
                "thursday": "quinta",
                "friday": "sexta",
                "saturday": "sabado",
                "sunday": "domingo"
            }
            dia_hoje_nome = dias_map[dia_semana]
            # Só gera plano para hoje se hoje está nos dias disponíveis do usuário
            if dia_hoje_nome.capitalize() in [d.capitalize() for d in user.available_days]:
                hoje_str = hoje.strftime("%d/%m/%Y")
                if not any(day.date == hoje_str for day in days_list):
                    content_queue = deque(conteudos_pendentes + novos_conteudos)
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
                            priority=1,
                            status=getattr(content, "status", "ok")
                        ))
                        total_study += block["duration"]
                    days_list.append(DailyPlan(
                        date=hoje_str,
                        blocks=blocks,
                        total_study_time=total_study,
                        focus_area=None
                    ))
            return days_list

        novo_plano.days = garantir_hoje_no_plano(
            novo_plano.days,
            daily_structure,
            conteudos_pendentes,
            prioritized_contents,
            user
        )

        hoje = datetime.now().strftime("%d/%m/%Y")
        dia_hoje = next((d for d in novo_plano.days if d.date == hoje), None)
        plano = {
            "foco_do_dia": dia_hoje.blocks[0].subject if dia_hoje and dia_hoje.blocks else None,
            "tarefas_do_dia": [f"{b.subject} - {b.topic}" for b in dia_hoje.blocks] if dia_hoje else [],
            "tarefas_da_semana": [
                f"{b.subject} - {b.topic}"
                for d in novo_plano.days for b in d.blocks
            ],
            "tarefas_pendentes": [
                f"{b.subject} - {b.topic}"
                for b in conteudos_pendentes
            ],
            "foco_principal": (user.focus_areas[0] if user.focus_areas else None),
            "tarefas_rapidas": [
                f"{c.subject} - {c.topic}" for c in contents if c.difficulty == "easy"
            ],
            "tarefas_basicas": [
                f"{c.subject} - {c.topic}" for c in contents if c.difficulty != "hard"
            ]
        }
        return novo_plano.dict(), plano
    except Exception as e:
        # log o erro se quiser
        return {}, {}  # ou lance uma exceção customizada se preferir

# Extraia revisões agendadas do plano salvo do usuário
def extrair_revisoes_agendadas(plano_dados):
    revisoes = {}
    if not plano_dados or "days" not in plano_dados:
        return revisoes
    for dia in plano_dados["days"]:
        data = dia["date"]
        for bloco in dia.get("blocks", []):
            # Pega revisões marcadas pelo usuário (id > 0 e activity_type revisão/review)
            if bloco.get("activity_type") in ["revisão", "review"] and bloco.get("id", 0) > 0:
                revisoes.setdefault(data, []).append(StudyBlock(**bloco))
    return revisoes