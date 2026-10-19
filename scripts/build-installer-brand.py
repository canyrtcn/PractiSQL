"""Render the installer brand with the bundled display typeface."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / 'app/renderer/assets/fonts/practisql-display/PractiSQLDisplay-Regular.ttf'
PREVIEW = ROOT / 'artifacts/installer-brand'
PREVIEW.mkdir(exist_ok=True)
SCALE = 4
logo = Image.open(ROOT / 'app/renderer/assets/icon.png').convert('RGBA')
proof = {'typeface': 'PractiSQL Display', 'source': 'Bundled custom display typeface', 'assets': []}
for name, size, icon_box, baseline, font_size in [
    ('header', (150, 57), (8, 10, 36), 34, 17),
    ('sidebar', (164, 314), (37, 92, 90), 218, 26),
]:
    canvas = Image.new('RGB', (size[0] * SCALE, size[1] * SCALE), '#ffffff' if name == 'header' else '#f4f2ed')
    draw = ImageDraw.Draw(canvas)
    x, y, edge = icon_box
    icon = logo.resize((edge * SCALE, edge * SCALE), Image.Resampling.LANCZOS)
    canvas.paste(icon, (x * SCALE, y * SCALE), icon)
    font = ImageFont.truetype(str(FONT), font_size * SCALE)
    width = draw.textlength('PractiSQL', font=font)
    x = 52 * SCALE if name == 'header' else round((size[0] * SCALE - width) / 2)
    y = baseline * SCALE
    draw.text((x, y), 'Practi', font=font, fill='#1c1917', anchor='ls')
    draw.text((x + draw.textlength('Practi', font=font), y), 'SQL', font=font, fill='#518f00', anchor='ls')
    bounds = draw.textbbox((x, y), 'PractiSQL', font=font, anchor='ls')
    assert bounds[0] >= 3 * SCALE and bounds[2] <= (size[0] - 3) * SCALE
    canvas = canvas.resize(size, Image.Resampling.LANCZOS)
    canvas.save(ROOT / 'assets' / ('nsis-' + name + '.bmp'))
    canvas.save(PREVIEW / ('nsis-' + name + '.png'))
    proof['assets'].append({'name': name, 'size': size, 'fontSize': font_size, 'textBounds': [v / SCALE for v in bounds]})
(PREVIEW / 'source.json').write_text(json.dumps(proof, indent=2) + '\n', encoding='utf-8')
print(json.dumps(proof))
