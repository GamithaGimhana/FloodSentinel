"""Start both local services; Ctrl+C stops the children. Run after installing dependencies."""
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
vite = ROOT / 'frontend/node_modules/vite/bin/vite.js'
if not vite.exists():
    raise SystemExit('Install frontend dependencies first: npm ci --prefix frontend')

children = []
try:
    children.append(subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend',
                                     '--host', '127.0.0.1', '--port', '8000'], cwd=ROOT))
    children.append(subprocess.Popen(['node', str(vite), '--host', '127.0.0.1', '--strictPort'], cwd=ROOT / 'frontend'))
    print('Dashboard: http://127.0.0.1:5173 | API: http://127.0.0.1:8000/docs', flush=True)
    while all(child.poll() is None for child in children):
        time.sleep(.5)
    raise SystemExit('A service exited; check output above.')
except KeyboardInterrupt:
    pass
finally:
    for child in children:
        if child.poll() is None:
            child.terminate()
    for child in children:
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
