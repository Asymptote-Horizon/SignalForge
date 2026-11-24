#!/usr/bin/env python3
"""
SignalForge - Capacitor Web Assets Packager
Copies runtime web assets into www/ for Capacitor Android packaging.
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'www')

DIRECTORIES = ['css', 'js', 'assets', 'data', 'wasm']
FILES = ['index.html']

def prepare_www():
    if os.path.exists(WWW):
        shutil.rmtree(WWW)
    os.makedirs(WWW, exist_ok=True)
    
    for f in FILES:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(WWW, f))
            print(f"Copied {f} -> www/{f}")
            
    for d in DIRECTORIES:
        src = os.path.join(ROOT, d)
        dst = os.path.join(WWW, d)
        if os.path.exists(src):
            shutil.copytree(src, dst)
            print(f"Copied {d}/ -> www/{d}/")
            
    print("✅ www/ directory prepared successfully for Capacitor packaging.")

if __name__ == '__main__':
    prepare_www()
