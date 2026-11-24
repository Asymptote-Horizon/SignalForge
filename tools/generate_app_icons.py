#!/usr/bin/env python3
"""
SignalForge - Android App Icon Generator
Generates high-resolution adaptive and legacy launcher icons for Android.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFilter

RES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'android', 'app', 'src', 'main', 'res')

MIPMAP_SIZES = {
    'mipmap-mdpi': (48, 108),
    'mipmap-hdpi': (72, 162),
    'mipmap-xhdpi': (96, 216),
    'mipmap-xxhdpi': (144, 324),
    'mipmap-xxxhdpi': (192, 432)
}

def draw_signalforge_graphic(draw, width, height, is_foreground=False):
    cx, cy = width / 2.0, height / 2.0
    
    # 1. Background Hexagon / Squircle (only if not transparent foreground)
    if not is_foreground:
        pad = width * 0.06
        r = width * 0.22
        # Rounded rectangle
        draw.rounded_rectangle([pad, pad, width - pad, height - pad], radius=r, fill=(15, 23, 42, 255), outline=(56, 189, 248, 200), width=max(2, int(width * 0.035)))
    
    # 2. Glowing Sine Wave Path
    # Points along a modulated carrier wave: f(x) = sin(x) * envelope
    wave_width = width * (0.65 if is_foreground else 0.70)
    wave_height = height * (0.35 if is_foreground else 0.38)
    x_start = cx - wave_width / 2.0
    x_end = cx + wave_width / 2.0
    
    points = []
    num_pts = 60
    for i in range(num_pts):
        t = i / (num_pts - 1)
        x = x_start + t * wave_width
        # Carrier modulated by window
        angle = t * math.pi * 3.5 - math.pi * 0.2
        y = cy - math.sin(angle) * (wave_height / 2.0)
        points.append((x, y))
        
    # Draw thicker glow underneath
    stroke_w = max(3, int(width * 0.05))
    draw.line(points, fill=(56, 189, 248, 255), width=stroke_w, joint='curve')
    
    # Draw core bright line
    draw.line(points, fill=(240, 249, 255, 255), width=max(1, stroke_w // 2), joint='curve')
    
    # Telemetry node dots
    peak_indices = [12, 28, 44]
    for idx in peak_indices:
        if idx < len(points):
            px, py = points[idx]
            pr = max(2, int(width * 0.04))
            draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(99, 102, 241, 255), outline=(255, 255, 255, 255), width=max(1, pr // 2))

def create_icons():
    # Update ic_launcher_background.xml to deep navy #090d16
    bg_xml_path = os.path.join(RES_DIR, 'values', 'ic_launcher_background.xml')
    os.makedirs(os.path.dirname(bg_xml_path), exist_ok=True)
    with open(bg_xml_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#090d16</color>\n</resources>\n')
        
    for folder, (icon_sz, fg_sz) in MIPMAP_SIZES.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # 1. Standard Square Icon (ic_launcher.png)
        img_sq = Image.new('RGBA', (icon_sz * 2, icon_sz * 2), (0, 0, 0, 0))
        draw_sq = ImageDraw.Draw(img_sq)
        draw_signalforge_graphic(draw_sq, icon_sz * 2, icon_sz * 2, is_foreground=False)
        img_sq = img_sq.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
        img_sq.save(os.path.join(folder_path, 'ic_launcher.png'))
        
        # 2. Round Icon (ic_launcher_round.png)
        img_rd = Image.new('RGBA', (icon_sz * 2, icon_sz * 2), (0, 0, 0, 0))
        draw_rd = ImageDraw.Draw(img_rd)
        pad = icon_sz * 2 * 0.04
        draw_rd.ellipse([pad, pad, icon_sz * 2 - pad, icon_sz * 2 - pad], fill=(15, 23, 42, 255), outline=(56, 189, 248, 220), width=max(2, int(icon_sz * 2 * 0.035)))
        draw_signalforge_graphic(draw_rd, icon_sz * 2, icon_sz * 2, is_foreground=True)
        img_rd = img_rd.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
        img_rd.save(os.path.join(folder_path, 'ic_launcher_round.png'))
        
        # 3. Adaptive Foreground Icon (ic_launcher_foreground.png)
        img_fg = Image.new('RGBA', (fg_sz * 2, fg_sz * 2), (0, 0, 0, 0))
        draw_fg = ImageDraw.Draw(img_fg)
        draw_signalforge_graphic(draw_fg, fg_sz * 2, fg_sz * 2, is_foreground=True)
        img_fg = img_fg.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        img_fg.save(os.path.join(folder_path, 'ic_launcher_foreground.png'))
        
        print(f"Generated icons for {folder}: {icon_sz}x{icon_sz} and fg {fg_sz}x{fg_sz}")
        
    print("✅ All SignalForge Android launcher icons created successfully.")

if __name__ == '__main__':
    create_icons()
