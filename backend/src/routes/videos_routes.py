import os, time, threading, requests
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from models.models import db, YouTubeCache

videos_bp = Blueprint('videos', __name__)

# Config / caches (em memória – por processo)
_YT_CACHE: dict[str, tuple[float, list[dict]]] = {}
_YT_CACHE_TTL = int(os.getenv('YT_CACHE_TTL', '600'))
_YT_CACHE_MAX_ROWS = int(os.getenv('YT_CACHE_MAX_ROWS', '2000'))

def _prune_youtube_cache(max_rows: int = _YT_CACHE_MAX_ROWS):
    try:
        total = db.session.query(YouTubeCache.id).count()
        excess = max(0, total - int(max_rows))
        if excess > 0:
            ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
                   .order_by(YouTubeCache.created_at.asc())
                   .limit(excess)
                   .all()]
            if ids:
                db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
                db.session.commit()
    except Exception:
        db.session.rollback()

def _refresh_yt_cache_async(query: str, max_results: int):
    """Atualiza o cache persistente + memória em thread separada."""
    try:
        api_key = os.getenv('YT_API_KEY')
        if not api_key or not query:
            return
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query,
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = (it.get('snippet') or {})
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        now = time.time()
        cache_key = f"{query}|{max_results}"
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
    except Exception:
        pass

@videos_bp.route('/api/videos', methods=['GET'])
def get_videos():
    query = request.args.get('q') or request.args.get('query') or ''
    max_results = request.args.get('maxResults') or 6
    try:
        max_results = int(max_results)
    except Exception:
        max_results = 6
    if not query:
        return jsonify({"videos": []})

    api_key = os.getenv('YT_API_KEY')
    if not api_key:
        return jsonify({"videos": [], "error": "YT_API_KEY não configurada"})

    cache_key = f"{query}|{max_results}"
    now = time.time()
    cached = _YT_CACHE.get(cache_key)
    if cached and (now - cached[0] < _YT_CACHE_TTL):
        resp = jsonify({"videos": cached[1]})
        resp.headers['Cache-Control'] = 'public, max-age=300'
        return resp

    try:
        row = YouTubeCache.query.filter_by(query=query, max_results=max_results) \
            .order_by(YouTubeCache.created_at.desc()).first()
        if row:
            threading.Thread(target=_refresh_yt_cache_async, args=(query, max_results), daemon=True).start()
            _YT_CACHE[cache_key] = (now, row.results)
            resp = jsonify({"videos": row.results})
            resp.headers['Cache-Control'] = 'public, max-age=300'
            return resp
    except Exception:
        pass

    # Fetch externo
    try:
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params={
                'key': api_key,
                'part': 'snippet',
                'type': 'video',
                'q': query.strip()[:160],
                'maxResults': max_results,
                'safeSearch': 'moderate'
            }, timeout=4
        )
        resp.raise_for_status()
        items = resp.json().get('items', [])
        videos = []
        for it in items:
            vid = (it.get('id') or {}).get('videoId')
            sn = (it.get('snippet') or {})
            if not vid:
                continue
            videos.append({
                'id': vid,
                'title': sn.get('title'),
                'channelTitle': sn.get('channelTitle'),
                'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                    or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
            })
        _YT_CACHE[cache_key] = (now, videos)
        try:
            db.session.add(YouTubeCache(query=query, max_results=max_results, results=videos))
            db.session.commit()
            _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
        except Exception:
            db.session.rollback()
        out = jsonify({"videos": videos})
        out.headers['Cache-Control'] = 'public, max-age=300'
        return out
    except Exception as e:
        return jsonify({"videos": [], "error": str(e)})

@videos_bp.route('/api/videos/cache/stats', methods=['GET'])
def yt_cache_stats():
    try:
        total = db.session.query(YouTubeCache.id).count()
    except Exception:
        total = None
    return jsonify({
        'memory_cache_entries': len(_YT_CACHE),
        'persistent_total': total,
        'ttl_seconds': _YT_CACHE_TTL,
        'max_rows': _YT_CACHE_MAX_ROWS,
    })

@videos_bp.route('/api/videos/cache/purge', methods=['POST'])
def yt_cache_purge():
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        body = {}
    clear_memory = bool(body.get('clear_memory'))
    if clear_memory:
        _YT_CACHE.clear()
    purged = 0
    try:
        cutoff = datetime.utcnow() - timedelta(seconds=_YT_CACHE_TTL)
        ids = [rid for (rid,) in db.session.query(YouTubeCache.id)
               .filter(YouTubeCache.created_at < cutoff)
               .all()]
        if ids:
            db.session.query(YouTubeCache).filter(YouTubeCache.id.in_(ids)).delete(synchronize_session=False)
            db.session.commit()
            purged = len(ids)
    except Exception:
        db.session.rollback()
    try:
        total = db.session.query(YouTubeCache.id).count()
    except Exception:
        total = None
    return jsonify({'ok': True, 'cleared_memory': clear_memory, 'purged_rows': purged, 'persistent_total': total})

@videos_bp.route('/api/videos/batch', methods=['POST'])
def get_videos_batch():
    try:
        payload = request.get_json(force=True) or {}
    except Exception:
        payload = {}
    queries = payload.get('queries') or []
    if not isinstance(queries, list):
        return jsonify({"results": {}, "errors": {"_": "Formato inválido"}}), 400

    MAX_QUERIES = 12
    results: dict[str, list] = {}
    errors: dict[str, str] = {}
    api_key = os.getenv('YT_API_KEY')
    if not api_key:
        for item in queries[:MAX_QUERIES]:
            k = (item or {}).get('key') or ''
            if k:
                results[k] = []
                errors[k] = 'YT_API_KEY não configurada'
        return jsonify({"results": results, "errors": errors})

    now = time.time()
    for item in queries[:MAX_QUERIES]:
        try:
            k = (item or {}).get('key') or ''
            q = (item or {}).get('q') or ''
            max_results = int((item or {}).get('maxResults') or 3)
            if not k:
                continue
            if not q:
                results[k] = []
                continue
            q = q.strip()[:160]
            max_results = max(1, min(max_results, 6))
            cache_key = f"{q}|{max_results}"
            cached = _YT_CACHE.get(cache_key)
            if cached and now - cached[0] < _YT_CACHE_TTL:
                results[k] = cached[1]
                continue
            try:
                row = YouTubeCache.query.filter_by(query=q, max_results=max_results) \
                    .order_by(YouTubeCache.created_at.desc()).first()
                if row:
                    _YT_CACHE[cache_key] = (now, row.results)
                    results[k] = row.results
                    threading.Thread(target=_refresh_yt_cache_async, args=(q, max_results), daemon=True).start()
                    continue
            except Exception:
                pass
            resp = requests.get(
                'https://www.googleapis.com/youtube/v3/search',
                params={
                    'key': api_key,
                    'part': 'snippet',
                    'type': 'video',
                    'q': q,
                    'maxResults': max_results,
                    'safeSearch': 'moderate'
                }, timeout=4
            )
            resp.raise_for_status()
            items = resp.json().get('items', [])
            videos = []
            for it in items:
                vid = (it.get('id') or {}).get('videoId')
                sn = (it.get('snippet') or {})
                if not vid:
                    continue
                videos.append({
                    'id': vid,
                    'title': sn.get('title'),
                    'channelTitle': sn.get('channelTitle'),
                    'thumbnail': ((sn.get('thumbnails') or {}).get('medium') or {}).get('url')
                        or ((sn.get('thumbnails') or {}).get('default') or {}).get('url')
                })
            results[k] = videos
            _YT_CACHE[cache_key] = (now, videos)
            try:
                db.session.add(YouTubeCache(query=q, max_results=max_results, results=videos))
                db.session.commit()
                _prune_youtube_cache(_YT_CACHE_MAX_ROWS)
            except Exception:
                db.session.rollback()
        except Exception as e:
            key = (item or {}).get('key') or ''
            if key:
                errors[key] = str(e)
                results[key] = []

    resp_body = {"results": results}
    if errors:
        resp_body['errors'] = errors
    return jsonify(resp_body)
