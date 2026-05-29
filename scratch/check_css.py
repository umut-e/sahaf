import json

transcript_path = "/home/w4zel/.gemini/antigravity-ide/brain/9e8590e6-c961-4d9f-b179-d3fd2759c65d/.system_generated/logs/transcript.jsonl"
css_views = []

with open(transcript_path, "r") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "VIEW_FILE" and "frontend/assets/css/style.css" in data.get("content", ""):
                lines = data["content"].split("\n")
                for ln in lines:
                    if ln.startswith("Showing lines"):
                        css_views.append((data["step_index"], ln))
        except:
            pass

print("CSS Views:", css_views)
