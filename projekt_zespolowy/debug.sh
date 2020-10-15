#!/bin/bash

fifo=./logger_fifo

mkfifo $fifo
python3 prepare_env.py
docker build  -t logger ./logger

echo a
echo a > $fifo
strace -f -ttt -o $fifo $1

sleep 1 #trzeba jakos poczekac az sie wszystko skonczy

#python3 clean_env.py
