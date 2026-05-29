import json
import sys

transcript_path = "/home/w4zel/.gemini/antigravity-ide/brain/9e8590e6-c961-4d9f-b179-d3fd2759c65d/.system_generated/logs/transcript.jsonl"
out_path = "/home/w4zel/sahaf_app/scratch/recovered_main_from_transcript.js"

lines_dict = {}

with open(transcript_path, "r") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "VIEW_FILE" and "frontend/assets/js/main.js" in data.get("content", ""):
            content = data["content"]
            # content has: "Showing lines X to Y" followed by "The following code has been modified..."
            # then lines formatted like "1: code..."
            parts = content.split("\n")
            for p in parts:
                if ":" in p:
                    num_str, rest = p.split(":", 1)
                    if num_str.isdigit():
                        line_num = int(num_str)
                        # remove the leading space
                        if rest.startswith(" "):
                            rest = rest[1:]
                        lines_dict[line_num] = rest

# write to file
if lines_dict:
    max_line = max(lines_dict.keys())
    with open(out_path, "w") as out:
        for i in range(1, max_line + 1):
            out.write(lines_dict.get(i, "") + "\n")
    print(f"Recovered {max_line} lines to {out_path}")
else:
    print("No lines recovered")
