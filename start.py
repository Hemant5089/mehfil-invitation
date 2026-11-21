#!/usr/bin/env python3
"""Start the invitation server on Windows or Termux."""
import json
import os
import secrets
import socket
import sys
from pathlib import Path

if sys.version_info < (3, 9):
    sys.exit('Python 3.9 or newer is required.')

root = Path(__file__).resolve().parent
os.chdir(root)
data = root / 'data'
data.mkdir(exist_ok=True)
config_file = data / 'admin-settings.json'
if not config_file.exists():
    settings = {'password': secrets.token_urlsafe(20), 'port': 8799}
    try:
        fd = os.open(str(config_file), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as file:
            json.dump(settings, file, indent=2)
    except FileExistsError:
        pass
try:
    settings = json.loads(config_file.read_text(encoding='utf-8'))
    password = settings['password']
    port = int(settings.get('port', 8799))
    if not isinstance(password, str) or len(password) < 12 or not 1 <= port <= 65535:
        raise ValueError('Invalid settings')
except (OSError, ValueError, KeyError, TypeError) as error:
    sys.exit('Cannot read data/admin-settings.json: ' + str(error))

def lan_address():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(('192.0.2.1', 9))
            return sock.getsockname()[0]
    except OSError:
        return None

os.environ['MEHFIL_ADMIN_PASSWORD'] = password
os.environ['MEHFIL_HOST'] = '0.0.0.0'
os.environ['MEHFIL_PORT'] = str(port)
address = lan_address()
print('\n=== MEHFIL INVITATION ===', flush=True)
print('Admin on this device: http://127.0.0.1:%d/admin' % port, flush=True)
if address:
    print('Admin on your Wi-Fi: http://%s:%d/admin' % (address, port), flush=True)
print('Admin password: ' + password, flush=True)
print('Password is also saved in data/admin-settings.json. Keep it private.', flush=True)
print('Keep this window open while using the invitation. Ctrl+C to stop.\n', flush=True)
import server
try:
    server.ThreadingHTTPServer(('0.0.0.0', port), server.Handler).serve_forever()
except KeyboardInterrupt:
    print('\nServer stopped.')
except OSError as error:
    sys.exit('Could not start on port %s: %s' % (port, error))
