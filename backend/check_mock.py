import re

mock_api_path = r"d:\SIH\js\mockApi.js"
with open(mock_api_path, "r", encoding="utf-8") as f:
    content = f.read()

# Verify that original content has Api.login
assert "Api.login =" in content
print("mockApi.js loaded successfully. Total lines:", len(content.splitlines()))
