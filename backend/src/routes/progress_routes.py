from flask import Blueprint, request, jsonify

progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')

# Dados simulados de progresso
user_progress = {
    1: {  # user_id
        'courses': {
            1: {  # course_id
                'completed_lessons': [1, 2],
                'current_lesson': 3,
                'progress_percentage': 33,
                'last_activity': '2025-05-22T14:30:00Z'
            },
            2: {  # course_id
                'completed_lessons': [7],
                'current_lesson': 8,
                'progress_percentage': 25,
                'last_activity': '2025-05-21T16:45:00Z'
            }
        },
        'achievements': [
            {'id': 1, 'title': 'Primeiro Login', 'date_earned': '2025-05-20T10:00:00Z'},
            {'id': 2, 'title': 'Primeira Lição Concluída', 'date_earned': '2025-05-20T10:30:00Z'}
        ]
    }
}

@progress_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_progress(user_id):
    if user_id in user_progress:
        return jsonify({
            'success': True,
            'progress': user_progress[user_id]
        })
    return jsonify({'success': False, 'message': 'Usuário não encontrado'}), 404

@progress_bp.route('/user/<int:user_id>/course/<int:course_id>', methods=['GET'])
def get_course_progress(user_id, course_id):
    if user_id in user_progress and course_id in user_progress[user_id]['courses']:
        return jsonify({
            'success': True,
            'progress': user_progress[user_id]['courses'][course_id]
        })
    return jsonify({'success': False, 'message': 'Progresso não encontrado'}), 404

@progress_bp.route('/user/<int:user_id>/course/<int:course_id>/lesson/<int:lesson_id>', methods=['POST'])
def update_lesson_progress(user_id, course_id, lesson_id):
    # Simulação de atualização de progresso
    if user_id not in user_progress:
        user_progress[user_id] = {'courses': {}, 'achievements': []}
    
    if course_id not in user_progress[user_id]['courses']:
        user_progress[user_id]['courses'][course_id] = {
            'completed_lessons': [],
            'current_lesson': lesson_id,
            'progress_percentage': 0,
            'last_activity': '2025-05-23T00:00:00Z'
        }
    
    progress = user_progress[user_id]['courses'][course_id]
    
    if lesson_id not in progress['completed_lessons']:
        progress['completed_lessons'].append(lesson_id)
        progress['current_lesson'] = lesson_id + 1
        
        # Simulação de cálculo de porcentagem (na implementação real, seria baseado no total de lições)
        if course_id == 1:
            total_lessons = 6
        elif course_id == 2:
            total_lessons = 4
        else:
            total_lessons = 4
            
        progress['progress_percentage'] = min(100, int((len(progress['completed_lessons']) / total_lessons) * 100))
        progress['last_activity'] = '2025-05-23T00:00:00Z'  # Na implementação real, seria a data atual
    
    return jsonify({
        'success': True,
        'message': 'Progresso atualizado com sucesso',
        'progress': progress
    })
