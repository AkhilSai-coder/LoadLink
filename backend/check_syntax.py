import os
import subprocess
import sys

BASE_DIR = r"d:\SIH"

has_error = False
for root, dirs, files in os.walk(BASE_DIR):
    if "backend" in root or ".git" in root or "node_modules" in root:
        continue
    for f in files:
        if f.endswith(".js"):
            path = os.path.join(root, f)
            res = subprocess.run(["node", "--check", path], capture_output=True, text=True)
            if res.returncode != 0:
                print(f"SYNTAX ERROR in {path}:")
                print(res.stderr)
                has_error = True
            else:
                print(f"OK: {os.path.relpath(path, BASE_DIR)}")

if has_error:
    print("ERRORS FOUND!")
    sys.exit(1)
else:
    print("ALL FRONTEND JS FILES SYNTAX VERIFIED CLEAN!")
