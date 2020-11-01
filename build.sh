#!/bin/sh

mkdir -p build
cython --embed -3 -o build/logger.c logger.py
# gcc -Os -I /usr/include/python3.8/ -o build/logger build/logger.c -lpython3.8
gcc -Os -I /usr/include/python3.6m/ -o build/logger build/logger.c -lpython3.6m

