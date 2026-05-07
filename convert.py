import re

def html_to_jsx(html):
    # Basic class to className
    jsx = html.replace('class="', 'className="')
    
    # Comments
    jsx = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', jsx)
    
    # Self-closing tags (img, input)
    # img is already self closing in screen.html <img ... />
    # input is already self closing <input ... />
    
    # Inline styles
    def style_replacer(match):
        style_str = match.group(1)
        # simplistic conversion
        style_obj = {}
        for rule in style_str.split(';'):
            if ':' in rule:
                key, val = rule.split(':', 1)
                key = key.strip()
                val = val.strip()
                # camel case
                parts = key.split('-')
                camel_key = parts[0] + ''.join(p.title() for p in parts[1:])
                # remove single quotes wrapping if any
                style_obj[camel_key] = val
        
        # reconstruct as object string
        # style={{fontVariationSettings: "'FILL' 0"}}
        obj_str = []
        for k, v in style_obj.items():
            if k == 'fontVariationSettings':
                # v has 'FILL' 0 or 'FILL' 1
                obj_str.append(f"{k}: \"{v}\"")
        
        return 'style={{' + ', '.join(obj_str) + '}}'

    jsx = re.sub(r'style="(.*?)"', style_replacer, jsx)
    
    return jsx

with open('screen.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Body content is from line 121 (index 120) to line 312 (index 311)
body_lines = lines[120:312]
body_content = "".join(body_lines)

jsx_content = html_to_jsx(body_content)

app_template = f"""import React from 'react';

function App() {{
  return (
    <>
{jsx_content}
    </>
  );
}}

export default App;
"""

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_template)

print("Conversion complete.")
