from ia_quiz import fallback_vf_from_topics

if __name__ == "__main__":
    # Exemplo de tópicos do usuário
    topicos = [
        "Matemática Financeira",
        "História do Brasil",
        "Química Orgânica",
        "Física Moderna"
    ]
    perguntas = fallback_vf_from_topics(topicos, 8)
    for p in perguntas:
        print(f"Pergunta: {p.question}")
        print(f"Resposta correta: {p.answer}")
        print(f"Explicação: {p.explanation}")
        print(f"Tópico: {p.topic}")
        print("-")
