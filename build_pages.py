import json
import urllib.request
import re
import os

def html_to_jsx(html):
    jsx = html.replace('class="', 'className="')
    jsx = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', jsx)
    
    # Inline styles
    def style_replacer(match):
        style_str = match.group(1)
        style_obj = {}
        for rule in style_str.split(';'):
            if ':' in rule:
                key, val = rule.split(':', 1)
                key = key.strip()
                val = val.strip()
                parts = key.split('-')
                camel_key = parts[0] + ''.join(p.title() for p in parts[1:])
                style_obj[camel_key] = val
        
        obj_str = []
        for k, v in style_obj.items():
            if k == 'fontVariationSettings':
                obj_str.append(f"{k}: \"{v}\"")
        return 'style={{' + ', '.join(obj_str) + '}}'

    jsx = re.sub(r'style="(.*?)"', style_replacer, jsx)
    
    # Fix self closing tags like input and img that might be missing closing slash in raw HTML?
    # Actually Stitch HTML puts <input ... /> and <img ... />, but just to be safe, I'll trust it's well formed.
    # Wait, some <input> might not have closing slash in valid HTML5 but required in JSX.
    # I will replace <input (.*?)> with <input \1 /> if it doesn't end with />
    jsx = re.sub(r'<input([^>]*?)(?<!/)>', r'<input\1 />', jsx)
    jsx = re.sub(r'<img([^>]*?)(?<!/)>', r'<img\1 />', jsx)
    jsx = re.sub(r'<hr([^>]*?)(?<!/)>', r'<hr\1 />', jsx)
    jsx = re.sub(r'<br([^>]*?)(?<!/)>', r'<br\1 />', jsx)
    # also check for 'for='
    jsx = jsx.replace('for="', 'htmlFor="')
    
    return jsx

json_path = r"C:\Users\Prince Rohith\.gemini\antigravity\brain\61023ef1-d25f-4ba7-b77e-c159c67bed4f\.system_generated\steps\14\output.txt"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

os.makedirs('frontend/src/pages', exist_ok=True)

for screen in data['screens']:
    title = screen['title']
    url = screen['htmlCode']['downloadUrl']
    
    comp_name = re.sub(r'[^a-zA-Z0-9]', '', title.title())
    
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
    body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.IGNORECASE)
    if body_match:
        body_content = body_match.group(1)
        jsx_content = html_to_jsx(body_content)
        
        comp_code = f"import React from 'react';\n\nexport default function {comp_name}() {{\n  return (\n    <>\n{jsx_content}\n    </>\n  );\n}}\n"
        
        with open(f"frontend/src/pages/{comp_name}.jsx", "w", encoding="utf-8") as out:
            out.write(comp_code)
        print(f"Created {comp_name}.jsx")
