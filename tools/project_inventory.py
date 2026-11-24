#!/usr/bin/env python3
"""
SignalForge - Project Inventory Generator
Scans the project tree, reports file counts, sizes, and structure.
"""
import os
import sys

EXCLUDE_DIRS = {'.git', '.agent', 'node_modules', '__pycache__', '.venv', '.idea', '.vscode'}

def scan_inventory(root_dir='.'):
    inventory = []
    total_files = 0
    total_bytes = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        rel_dir = os.path.relpath(dirpath, root_dir)
        if rel_dir == '.':
            rel_dir = ''
        
        for f in sorted(filenames):
            if f.endswith('.pyc') or f.startswith('.'):
                continue
            path = os.path.join(dirpath, f)
            try:
                size = os.path.getsize(path)
                total_bytes += size
                total_files += 1
                rel_path = os.path.join(rel_dir, f).replace('\\', '/')
                inventory.append((rel_path, size))
            except OSError:
                pass

    print(f"SignalForge Project Inventory ({total_files} files, {total_bytes / 1024:.1f} KB total):")
    print("-" * 60)
    for path, size in sorted(inventory):
        print(f"{path:<45} {size:>10} bytes")
    print("-" * 60)
    return inventory

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    scan_inventory(root)
