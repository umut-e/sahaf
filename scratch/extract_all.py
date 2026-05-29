import json
import os

transcript_path = "/home/w4zel/.gemini/antigravity-ide/brain/9e8590e6-c961-4d9f-b179-d3fd2759c65d/.system_generated/logs/transcript.jsonl"
out_dir = "/home/w4zel/sahaf_app/scratch/recovered_files"

os.makedirs(out_dir, exist_ok=True)

files_data = {}

with open(transcript_path, "r") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "VIEW_FILE" and "File Path:" in data.get("content", ""):
                content = data["content"]
                
                # Extract file path
                lines = content.split("\n")
                file_path = None
                for ln in lines:
                    if ln.startswith("File Path:"):
                        # format: File Path: `file:///home/w4zel/sahaf_app/frontend/index.html`
                        import re
                        m = re.search(r'`file://([^`]+)`', ln)
                        if m:
                            file_path = m.group(1)
                        break
                
                if not file_path:
                    continue
                    
                if file_path not in files_data:
                    files_data[file_path] = {}
                    
                for p in lines:
                    if ":" in p:
                        num_str, rest = p.split(":", 1)
                        if num_str.isdigit():
                            line_num = int(num_str)
                            if rest.startswith(" "):
                                rest = rest[1:]
                            files_data[file_path][line_num] = rest
        except Exception as e:
            pass

# Write all recovered files
for fp, lines_dict in files_data.items():
    if not lines_dict:
        continue
    
    # We only care about sahaf_app files
    if not fp.startswith("/home/w4zel/sahaf_app/"):
        continue
        
    rel_path = fp.replace("/home/w4zel/sahaf_app/", "")
    out_path = os.path.join(out_dir, rel_path.replace("/", "_"))
    
    max_line = max(lines_dict.keys())
    with open(out_path, "w") as out:
        for i in range(1, max_line + 1):
            out.write(lines_dict.get(i, "") + "\n")
    print(f"Recovered {max_line} lines for {rel_path} -> {out_path}")
