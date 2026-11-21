#!/usr/bin/env python3
import os, secrets, hashlib, hmac, sqlite3, json, time, html, urllib.parse, mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie

BASE = Path(__file__).resolve().parent
PUBLIC = BASE / 'public'
DATA = BASE / 'data'
DATA.mkdir(exist_ok=True)
DB = DATA / 'invitations.sqlite3'
PASSWORD = os.environ.get('MEHFIL_ADMIN_PASSWORD','')
if len(PASSWORD) < 12:
    raise SystemExit('Set MEHFIL_ADMIN_PASSWORD to at least 12 characters.')
sessions = {}
attempts = {}
FIELDS = ['bride','groom','date','time','venue','city','address']
with sqlite3.connect(DB) as c:
    c.execute('CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY, content TEXT NOT NULL, updated INTEGER NOT NULL)')
def escape(value):
    return html.escape(str(value), quote=True)
def page(title,content):
    return ('''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta charset="utf-8"><title>'''+escape(title)+'''</title><style>
    body{font:16px system-ui;background:#f8edda;color:#503529;margin:0}main{max-width:780px;margin:40px auto;background:#fffaf1;padding:28px;border-radius:16px}
    label{display:block;margin:12px 0}input,textarea{display:block;box-sizing:border-box;width:100%;padding:11px;border:1px solid #bfa784;border-radius:6px;font:inherit}
    button,.btn{background:#833c49;color:white;padding:12px 18px;border:0;border-radius:8px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}
    a{color:#833c49}article{border-top:1px solid #dccbb2;padding:16px 0;overflow-wrap:anywhere}small{color:#786657}
    </style></head><body><main><h1>'''+escape(title)+'</h1>'+content+'</main></body></html>').encode()
class Handler(BaseHTTPRequestHandler):
    def send(self,status,body,ctype='text/html; charset=utf-8',headers=None):
        self.send_response(status)
        self.send_header('Content-Type',ctype)
        self.send_header('Content-Length',str(len(body)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store')
        for k,v in (headers or {}).items(): self.send_header(k,v)
        self.end_headers()
        self.wfile.write(body)
    def redirect(self,url,headers=None):
        self.send(303,b'',headers={'Location':url,**(headers or {})})
    def auth(self):
        cookie=SimpleCookie()
        try: cookie.load(self.headers.get('Cookie',''))
        except Exception: return None
        token=cookie.get('mehfil_session')
        item=sessions.get(token.value) if token else None
        if item and item['expires']>time.time(): return item
        return None
    def form(self):
        length=int(self.headers.get('Content-Length','0'))
        if length>16000: raise ValueError('Too large')
        return {k:v[0] for k,v in urllib.parse.parse_qs(self.rfile.read(length).decode(),keep_blank_values=True).items()}
    def do_GET(self):
        u=urllib.parse.urlsplit(self.path)
        if u.path=='/admin':
            session=self.auth()
            if not session:
                self.send(200,page('Admin login','<form method="post" action="/login"><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button>Login</button></form>'))
                return
            q=urllib.parse.parse_qs(u.query); key=q.get('edit',[''])[0]
            with sqlite3.connect(DB) as c:
                rows=c.execute('SELECT id,content FROM invitations ORDER BY updated DESC').fetchall()
            selected=next((json.loads(v) for k,v in rows if k==key),{})
            labels={'bride':'Bride name','groom':'Groom name','date':'Wedding date','time':'Wedding time (IST)','venue':'Venue','city':'City','address':'Address'}
            inputs=''.join('<label>'+label+'<input name="'+k+'" type="'+('date' if k=='date' else 'time' if k=='time' else 'text')+'" maxlength="240" required value="'+escape(selected.get(k,''))+'"></label>' for k,label in labels.items())
            form='<form method="post" action="/save"><input type="hidden" name="csrf" value="'+session['csrf']+'"><input type="hidden" name="id" value="'+escape(key)+'">'+inputs+'<button>Save invitation</button></form>'
            listing=''
            for k,v in rows:
                d=json.loads(v); link='/invite/'+k
                listing+='<article><b>'+escape(d['bride'])+' &amp; '+escape(d['groom'])+'</b><br><a href="'+link+'" target="_blank">Open guest invitation</a> · <a href="/admin?edit='+k+'">Edit</a><br><small>Guest link: <span class="guest-link" data-path="'+link+'"></span></small> <button type="button" onclick="navigator.clipboard.writeText(location.origin+\''+link+'\').then(()=>this.textContent=\'Copied\')">Copy link</button></article>'
            script='<script>document.querySelectorAll(".guest-link").forEach(e=>e.textContent=location.origin+e.dataset.path)</script>'
            logout='<form method="post" action="/logout"><input type="hidden" name="csrf" value="'+session['csrf']+'"><button>Logout</button></form>'
            self.send(200,page('Mehfil admin', '<p><a href="/admin">Create new invitation</a></p>'+form+'<h2>Invitations</h2>'+listing+logout+script));return
        if u.path.startswith('/invite/'):
            key=u.path.split('/')[-1]
            with sqlite3.connect(DB) as c: row=c.execute('SELECT content FROM invitations WHERE id=?',(key,)).fetchone()
            if not row: self.send(404,page('Invitation not found',''));return
            content=(PUBLIC/'index.html').read_text(encoding='utf-8').replace('<script src="/config.js"></script>','<script>window.INVITATION_CONFIG='+json.dumps(json.loads(row[0]),ensure_ascii=True).replace('<','\\u003c')+';</script>')
            self.send(200,content.encode());return
        if u.path=='/': self.redirect('/admin');return
        name=u.path.lstrip('/')
        path=(PUBLIC/name).resolve()
        if not path.is_relative_to(PUBLIC.resolve()) or not path.is_file() or name=='index.html':
            self.send(404,b'Not found','text/plain');return
        self.send(200,path.read_bytes(),mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
    def do_POST(self):
        u=urllib.parse.urlsplit(self.path)
        try: data=self.form()
        except (ValueError,UnicodeError): self.send(400,b'Invalid request','text/plain');return
        if u.path=='/login':
            ip=self.client_address[0]; now=time.time()
            attempts[ip]=[t for t in attempts.get(ip,[]) if now-t<900]
            if len(attempts[ip])>=10: self.send(429,page('Try again later','Too many attempts.'));return
            attempts[ip].append(now)
            if not hmac.compare_digest(data.get('password','').encode(),PASSWORD.encode()):
                self.send(403,page('Login failed','<a href="/admin">Try again</a>'));return
            attempts.pop(ip,None); token=secrets.token_urlsafe(32)
            sessions[token]={'csrf':secrets.token_urlsafe(32),'expires':now+43200}
            secure='; Secure' if os.environ.get('MEHFIL_HTTPS')=='1' else ''
            self.redirect('/admin',{'Set-Cookie':'mehfil_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+secure});return
        session=self.auth()
        if not session or not hmac.compare_digest(data.get('csrf',''),session['csrf']):
            self.send(403,b'Forbidden','text/plain');return
        if u.path=='/logout':
            self.redirect('/admin',{'Set-Cookie':'mehfil_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return
        if u.path!='/save': self.send(404,b'Not found','text/plain');return
        record={k:data.get(k,'').strip() for k in FIELDS}
        import datetime
        try:
            if any(not v or len(v)>240 for v in record.values()): raise ValueError()
            datetime.date.fromisoformat(record['date']);datetime.time.fromisoformat(record['time'])
        except ValueError: self.send(400,page('Invalid details','<a href="/admin">Go back</a>'));return
        key=data.get('id','')
        with sqlite3.connect(DB) as c:
            if key and not c.execute('SELECT 1 FROM invitations WHERE id=?',(key,)).fetchone():
                self.send(404,b'Not found','text/plain');return
            if not key: key=secrets.token_urlsafe(16)
            c.execute('INSERT INTO invitations VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,updated=excluded.updated',(key,json.dumps(record,ensure_ascii=False),int(time.time())))
        self.redirect('/admin?edit='+key)
if __name__=='__main__':
    host=os.environ.get('MEHFIL_HOST','127.0.0.1'); port=int(os.environ.get('MEHFIL_PORT','8799'))
    ThreadingHTTPServer((host,port),Handler).serve_forever()
