# Release startup compatibility; no system-runtime fallback.
import runpy,sys
from pathlib import Path
if '--with-signal' not in sys.argv:sys.argv.append('--with-signal')
runpy.run_path(str(Path(__file__).with_name('portable_launcher.py')),run_name='__main__')
