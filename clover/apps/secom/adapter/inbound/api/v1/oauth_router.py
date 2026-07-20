from __future__ import annotations
import logging, os, secrets, urllib.parse
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fridge.models.database import engine
from secom.adapter.outbound.redis.token_store import get_token_store
from secom.app.utils.jwt_helper import create_access_token
from users.adapter.user import User

logger = logging.getLogger(__name__)
oauth_router = APIRouter(prefix='/auth', tags=['OAuth'])

_FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://cloverky.cloud')
_BACKEND_URL = os.getenv('BACKEND_URL', 'https://api.cloverky.cloud')
_GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
_GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
_GOOGLE_REDIRECT = f'{_BACKEND_URL}/auth/google/callback'
_KAKAO_CLIENT_ID = os.getenv('KAKAO_CLIENT_ID', '')
_KAKAO_REDIRECT = f'{_BACKEND_URL}/auth/kakao/callback'
_NAVER_CLIENT_ID = os.getenv('NAVER_CLIENT_ID', '')
_NAVER_CLIENT_SECRET = os.getenv('NAVER_CLIENT_SECRET', '')
_NAVER_REDIRECT = f'{_BACKEND_URL}/auth/naver/callback'


async def _upsert_oauth_user(db, provider, provider_id, email, name):
    result = await db.execute(select(User).where(User.email == email).limit(1))
    user = result.scalar_one_or_none()
    is_new = user is None
    if is_new:
        username = f'{provider}_{provider_id[:12]}'
        user = User(username=username, name=name, email=email, password_hash=f'oauth:{provider}', role='user')
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info('OAuth 신규 사용자 — %s %r', provider, email)
    return user, is_new


async def _issue_token_and_redirect(provider, provider_id, email, name):
    async with AsyncSession(engine) as db:
        user, is_new = await _upsert_oauth_user(db, provider, provider_id, email, name)
    token, jti = create_access_token(str(user.id), email, user.role)
    store = get_token_store()
    await store.save(jti, str(user.id))
    logger.info('JWT Redis 저장 jti=%s %s', jti, email)
    path = '/signup/consent' if is_new else '/oauth/callback'
    redirect_url = (
        f'{_FRONTEND_URL}{path}'
        f'?token={urllib.parse.quote(token)}'
        f'&name={urllib.parse.quote(name)}'
        f'&email={urllib.parse.quote(email)}'
    )
    return RedirectResponse(url=redirect_url)


@oauth_router.get('/google')
async def google_login():
    if not _GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail='Google OAuth 미설정')
    params = {'client_id': _GOOGLE_CLIENT_ID, 'redirect_uri': _GOOGLE_REDIRECT,
              'response_type': 'code', 'scope': 'openid email profile', 'state': secrets.token_urlsafe(16)}
    return RedirectResponse('https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params))


@oauth_router.get('/google/callback')
async def google_callback(code: str = Query(...), state: str = Query(default='')):
    async with httpx.AsyncClient() as c:
        tr = await c.post('https://oauth2.googleapis.com/token',
            data={'code': code, 'client_id': _GOOGLE_CLIENT_ID,
                  'client_secret': _GOOGLE_CLIENT_SECRET, 'redirect_uri': _GOOGLE_REDIRECT, 'grant_type': 'authorization_code'})
        tr.raise_for_status()
        ur = await c.get('https://www.googleapis.com/oauth2/v2/userinfo',
                         headers={'Authorization': f'Bearer {tr.json()[access_token]}'})
        ur.raise_for_status()
        info = ur.json()
    return await _issue_token_and_redirect('google', info['id'], info['email'], info.get('name', info['email']))


@oauth_router.get('/kakao')
async def kakao_login():
    if not _KAKAO_CLIENT_ID:
        raise HTTPException(status_code=503, detail='Kakao OAuth 미설정')
    params = {'client_id': _KAKAO_CLIENT_ID, 'redirect_uri': _KAKAO_REDIRECT, 'response_type': 'code'}
    return RedirectResponse('https://kauth.kakao.com/oauth/authorize?' + urllib.parse.urlencode(params))


@oauth_router.get('/kakao/callback')
async def kakao_callback(code: str = Query(...)):
    async with httpx.AsyncClient() as c:
        tr = await c.post('https://kauth.kakao.com/oauth/token',
            data={'grant_type': 'authorization_code', 'client_id': _KAKAO_CLIENT_ID,
                  'redirect_uri': _KAKAO_REDIRECT, 'code': code})
        tr.raise_for_status()
        ur = await c.get('https://kapi.kakao.com/v2/user/me',
                         headers={'Authorization': f'Bearer {tr.json()[access_token]}'})
        ur.raise_for_status()
        info = ur.json()
    acct = info.get('kakao_account', {})
    email = acct.get('email', f'kakao_{info[id]}@kakao.local')
    name = acct.get('profile', {}).get('nickname', '카카오 사용자')
    return await _issue_token_and_redirect('kakao', str(info['id']), email, name)


@oauth_router.get('/naver')
async def naver_login():
    if not _NAVER_CLIENT_ID:
        raise HTTPException(status_code=503, detail='Naver OAuth 미설정')
    params = {'response_type': 'code', 'client_id': _NAVER_CLIENT_ID,
              'redirect_uri': _NAVER_REDIRECT, 'state': secrets.token_urlsafe(16)}
    return RedirectResponse('https://nid.naver.com/oauth2.0/authorize?' + urllib.parse.urlencode(params))


@oauth_router.get('/naver/callback')
async def naver_callback(code: str = Query(...), state: str = Query(default='')):
    async with httpx.AsyncClient() as c:
        tr = await c.post('https://nid.naver.com/oauth2.0/token',
            params={'grant_type': 'authorization_code', 'client_id': _NAVER_CLIENT_ID,
                    'client_secret': _NAVER_CLIENT_SECRET, 'code': code, 'state': state})
        tr.raise_for_status()
        ur = await c.get('https://openapi.naver.com/v1/nid/me',
                         headers={'Authorization': f'Bearer {tr.json()[access_token]}'})
        ur.raise_for_status()
        info = ur.json()['response']
    return await _issue_token_and_redirect('naver', info['id'],
        info.get('email', f'naver_{info['id']}@naver.local'), info.get('name', '네이버 사용자'))
