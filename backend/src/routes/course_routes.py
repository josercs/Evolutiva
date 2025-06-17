from flask import Blueprint, request, jsonify

course_bp = Blueprint('course', __name__, url_prefix='/api/courses')

# Dados simulados de cursos
courses = [
    {
        'id': 1,
        'title': 'Matemática - Ensino Médio',
        'description': 'Curso completo de matemática para o ensino médio',
        'image': 'math_cover.jpg',
        'modules': [
            {
                'id': 1,
                'title': 'Álgebra Básica',
                'lessons': [
                    {'id': 1, 'title': 'Equações de 1º Grau', 'duration': '20 min'},
                    {'id': 2, 'title': 'Equações de 2º Grau', 'duration': '25 min'},
                    {'id': 3, 'title': 'Sistemas Lineares', 'duration': '30 min'}
                ]
            },
            {
                'id': 2,
                'title': 'Geometria',
                'lessons': [
                    {'id': 4, 'title': 'Triângulos', 'duration': '20 min'},
                    {'id': 5, 'title': 'Círculos', 'duration': '15 min'},
                    {'id': 6, 'title': 'Polígonos', 'duration': '25 min'}
                ]
            }
        ]
    },
    {
        'id': 2,
        'title': 'Física - Mecânica',
        'description': 'Fundamentos de mecânica para o ensino médio',
        'image': 'physics_cover.jpg',
        'modules': [
            {
                'id': 3,
                'title': 'Cinemática',
                'lessons': [
                    {'id': 7, 'title': 'Movimento Retilíneo Uniforme', 'duration': '25 min'},
                    {'id': 8, 'title': 'Movimento Uniformemente Variado', 'duration': '30 min'}
                ]
            },
            {
                'id': 4,
                'title': 'Dinâmica',
                'lessons': [
                    {'id': 9, 'title': 'Leis de Newton', 'duration': '35 min'},
                    {'id': 10, 'title': 'Forças e Movimento', 'duration': '25 min'}
                ]
            }
        ]
    },
    {
        'id': 3,
        'title': 'Química - Introdução',
        'description': 'Conceitos fundamentais de química',
        'image': 'chemistry_cover.jpg',
        'modules': [
            {
                'id': 5,
                'title': 'Tabela Periódica',
                'lessons': [
                    {'id': 11, 'title': 'Elementos e Propriedades', 'duration': '20 min'},
                    {'id': 12, 'title': 'Grupos e Períodos', 'duration': '25 min'}
                ]
            },
            {
                'id': 6,
                'title': 'Ligações Químicas',
                'lessons': [
                    {'id': 13, 'title': 'Ligações Iônicas', 'duration': '20 min'},
                    {'id': 14, 'title': 'Ligações Covalentes', 'duration': '25 min'}
                ]
            }
        ]
    }
]

@course_bp.route('/', methods=['GET'])
def get_all_courses():
    return jsonify({
        'success': True,
        'courses': [{'id': c['id'], 'title': c['title'], 'description': c['description'], 'image': c['image']} for c in courses]
    })

@course_bp.route('/<int:course_id>', methods=['GET'])
def get_course(course_id):
    course = next((c for c in courses if c['id'] == course_id), None)
    if course:
        return jsonify({'success': True, 'course': course})
    return jsonify({'success': False, 'message': 'Curso não encontrado'}), 404

@course_bp.route('/<int:course_id>/modules/<int:module_id>', methods=['GET'])
def get_module(course_id, module_id):
    course = next((c for c in courses if c['id'] == course_id), None)
    if not course:
        return jsonify({'success': False, 'message': 'Curso não encontrado'}), 404
    
    module = next((m for m in course['modules'] if m['id'] == module_id), None)
    if module:
        return jsonify({'success': True, 'module': module})
    return jsonify({'success': False, 'message': 'Módulo não encontrado'}), 404
