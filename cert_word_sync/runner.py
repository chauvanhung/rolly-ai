import sys
import time
import traceback
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if __name__ == "__main__":
    from app import app
    from waitress import serve
    print(f"Runner starting Waitress WSGI server on port 5055 from {BASE_DIR}...")
    print("Registered Flask Rules:", [rule.rule for rule in app.url_map.iter_rules()])
    while True:
        try:
            serve(app, host="0.0.0.0", port=5055, threads=16, channel_timeout=120, cleanup_interval=30)
        except Exception as e:
            print(f"Server exception: {e}")
            traceback.print_exc()
            time.sleep(2)



