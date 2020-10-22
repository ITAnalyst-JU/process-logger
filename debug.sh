#!/bin/bash

strace -f -tt  $1  2>&1| python3 logger.py
