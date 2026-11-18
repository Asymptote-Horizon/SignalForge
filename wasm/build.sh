#!/bin/bash
# SignalForge WASM Build Script
# Tries build routes according to prompt specification:
# 1. emcc
# 2. clang --target=wasm32
# 3. wat2wasm via wabt

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Attempting Route 1: emcc..."
if command -v emcc >/dev/null 2>&1; then
    emcc engine.c -O2 --no-entry -s STANDALONE_WASM=1 \
      -s EXPORTED_FUNCTIONS='["_get_in_ptr","_get_out_ptr","_get_aux_ptr","_engine_version","_xor_cipher","_crc8","_hamming74_encode","_hamming74_decode","_count_errors","_bin_to_dec","_dec_to_bin"]' \
      -o engine.wasm
    if [ $? -eq 0 ]; then
        echo "Build succeeded via Route 1 (emcc)."
        exit 0
    fi
fi

echo "Attempting Route 2: clang --target=wasm32..."
if command -v clang >/dev/null 2>&1; then
    clang --target=wasm32 -O2 -nostdlib -Wl,--no-entry -Wl,--export-all -o engine.wasm engine.c
    if [ $? -eq 0 ]; then
        echo "Build succeeded via Route 2 (clang --target=wasm32)."
        exit 0
    fi
fi

echo "Attempting Route 3: wat2wasm..."
if command -v wat2wasm >/dev/null 2>&1 && [ -f engine.wat ]; then
    wat2wasm engine.wat -o engine.wasm
    if [ $? -eq 0 ]; then
        echo "Build succeeded via Route 3 (wat2wasm)."
        exit 0
    fi
fi

echo "Warning: No WASM compiler succeeded. engine.js JavaScript fallback will be used."
exit 1
