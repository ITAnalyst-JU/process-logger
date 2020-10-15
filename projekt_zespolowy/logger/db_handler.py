from influxdb import InfluxDBClient
import os
import re


FIFO = '/projekt_zespolowy/logger_fifo'
db_client = InfluxDBClient(host='172.17.0.1', port=8086)

db_client.create_database('logger')
db_client.switch_database('logger')


def save_one_line(line):
    splitted = line.split(" ")
    if len(splitted) < 3:
        return
    data_to_db = {
            "measurement": "logger",
            "tags": {
                "process": splitted[0]
            },
            "time": int(float(splitted[1])*(10**9)),
            "fields": {
                "line": line
            }
        }
    db_client.write_points([data_to_db])


def save_all_to_db():
    print("started")
    with open(FIFO, 'r') as fifo:
        print("fifo open")
        while True:
            line = fifo.readline()
            line = re.sub('\s+', ' ', line)
            if "write" in line:
                print(line)
                save_one_line(line)
    os.unlink(FIFO)



def print_db():

    result = db_client.query('SELECT * FROM "logger"."default"."logger"')
    print(result.raw)

#print_db()
