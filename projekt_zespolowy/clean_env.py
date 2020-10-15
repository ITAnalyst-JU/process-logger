import docker
import os

FIFO = './logger_fifo'

client = docker.from_env()
try:
    client.containers.get('db').stop()
except:
    pass

try:
    client.containers.get('logger').stop()
except:
    pass

client.containers.prune()

os.unlink(FIFO)
