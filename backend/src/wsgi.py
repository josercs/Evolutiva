from main import app as application

# This file exposes `application` for WSGI servers (gunicorn, waitress-serve, uwsgi)
# Example:
#   waitress-serve --listen=0.0.0.0:5000 main:app
#   gunicorn -w 2 -b 0.0.0.0:5000 wsgi:application
