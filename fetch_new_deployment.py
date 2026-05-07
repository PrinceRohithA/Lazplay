import urllib.request
import re

url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzViOGI0ODZlZjI2MzRiMzM4ZWYxOWE5YzVmYzU0NTgxEgsSBxCnvuPJ-gEYAZIBJAoKcHJvamVjdF9pZBIWQhQxNTA1OTg4MzUzNzY1OTY5MTM2Nw&filename=&opi=89354086'

def html_to_jsx(html):
    jsx = html.replace('class="', 'className="')
    jsx = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', jsx)
    
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
                obj_str.append(f'{k}: "{v}"')
        return 'style={{' + ', '.join(obj_str) + '}}'

    jsx = re.sub(r'style="(.*?)"', style_replacer, jsx)
    jsx = re.sub(r'<input([^>]*?)(?<!/)>', r'<input\1 />', jsx)
    jsx = re.sub(r'<img([^>]*?)(?<!/)>', r'<img\1 />', jsx)
    jsx = re.sub(r'<hr([^>]*?)(?<!/)>', r'<hr\1 />', jsx)
    jsx = re.sub(r'<br([^>]*?)(?<!/)>', r'<br\1 />', jsx)
    jsx = jsx.replace('for="', 'htmlFor="')
    return jsx

req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')
    body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.IGNORECASE)
    if body_match:
        jsx_content = html_to_jsx(body_match.group(1))
        comp_code = f"""import React, {{ useState }} from 'react';
import {{ Link }} from 'react-router-dom';

export default function DeveloperWorkspaceNewDeployment() {{
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <>
{jsx_content}
    </>
  );
}}
"""
        with open('frontend/src/pages/DeveloperWorkspaceNewDeployment.jsx', 'w', encoding='utf-8') as out:
            out.write(comp_code)
        print('Created DeveloperWorkspaceNewDeployment.jsx')
