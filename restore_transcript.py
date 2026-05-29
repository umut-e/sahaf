import json
import os

transcript_path = '/home/w4zel/.gemini/antigravity-ide/brain/af6ad641-32eb-47db-a7f1-1ee68a514122/.system_generated/logs/transcript.jsonl'
workspace = '/home/w4zel/sahaf_app'

# First, checkout the files to their committed state so we have a clean slate to apply patches
# os.system("git checkout -- frontend/assets/js/main.js frontend/index.html frontend/assets/css/style.css backend/models/Book.php backend/controllers/BookController.php")

# Read transcript
with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    try:
        step = json.loads(line)
        if step.get('source') == 'MODEL' and 'tool_calls' in step:
            for call in step['tool_calls']:
                name = call.get('name')
                args = call.get('args', {})
                
                if name == 'replace_file_content':
                    target_file = args.get('TargetFile', '').strip('"')
                    if not target_file.startswith('/'): continue
                    
                    target_content = args.get('TargetContent', '')
                    # handle escaped quotes and newlines if they are string literals
                    if isinstance(target_content, str) and target_content.startswith('"') and target_content.endswith('"'):
                        target_content = target_content[1:-1].replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                    elif isinstance(target_content, str):
                        target_content = target_content.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')

                    replacement = args.get('ReplacementContent', '')
                    if isinstance(replacement, str) and replacement.startswith('"') and replacement.endswith('"'):
                        replacement = replacement[1:-1].replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                    elif isinstance(replacement, str):
                        replacement = replacement.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                    
                    if os.path.exists(target_file):
                        with open(target_file, 'r', encoding='utf-8') as tf:
                            content = tf.read()
                        if target_content in content:
                            content = content.replace(target_content, replacement, 1 if not args.get('AllowMultiple', False) else -1)
                            with open(target_file, 'w', encoding='utf-8') as tf:
                                tf.write(content)
                            print(f"Applied replace to {target_file}")
                        else:
                            # Target content not found exactly, maybe it was already applied or formatting differs
                            pass

                elif name == 'multi_replace_file_content':
                    target_file = args.get('TargetFile', '').strip('"')
                    if not target_file.startswith('/'): continue
                    
                    if os.path.exists(target_file):
                        with open(target_file, 'r', encoding='utf-8') as tf:
                            content = tf.read()
                            
                        chunks = args.get('ReplacementChunks', [])
                        # For JSON parsed chunks, they are lists of dicts
                        if isinstance(chunks, str):
                            import ast
                            try:
                                chunks = ast.literal_eval(chunks)
                            except:
                                chunks = []

                        applied = False
                        for chunk in chunks:
                            target_c = chunk.get('TargetContent', '')
                            rep_c = chunk.get('ReplacementContent', '')
                            if isinstance(target_c, str) and target_c.startswith('"') and target_c.endswith('"'):
                                target_c = target_c[1:-1].replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                            elif isinstance(target_c, str):
                                target_c = target_c.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')

                            if isinstance(rep_c, str) and rep_c.startswith('"') and rep_c.endswith('"'):
                                rep_c = rep_c[1:-1].replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                            elif isinstance(rep_c, str):
                                rep_c = rep_c.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                                
                            if target_c in content:
                                content = content.replace(target_c, rep_c, 1 if not chunk.get('AllowMultiple', False) else -1)
                                applied = True
                                
                        if applied:
                            with open(target_file, 'w', encoding='utf-8') as tf:
                                tf.write(content)
                            print(f"Applied multi_replace to {target_file}")

    except Exception as e:
        print(f"Error processing line: {e}")

print("Restore complete.")
