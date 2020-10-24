#!/bin/bash

FIFO_NAME='/tmp/logger.'$$

mkfifo $FIFO_NAME
strace -f -tt -o $FIFO_NAME $1 &
python3 logger.py < $FIFO_NAME
rm $FIFO_NAME
