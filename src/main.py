#!/bin/python

import time
import argparse

from Invoker import Invoker


def parse_cmd_name(parts):
    # TODO maybe for eg. 'make testall' this shoule return 'make testall' and not 'make'?
    assert len(parts) >= 1
    assert len(parts[0]) >= 1
    x = parts[0].split('/')[-1]
    assert ' ' not in x
    return x


def get_time_str():
    t = time.localtime()
    return f'{t.tm_year}.{t.tm_mon}.{t.tm_mday} {t.tm_hour}:{t.tm_min}:{t.tm_sec}'


# TODO better process for deciding filename and title
def main():
    parser = argparse.ArgumentParser(description="Monitor command's  output in real time.")
    parser.add_argument('cmd', type=str, nargs='+',
                        help='command invocation to be monitored')
    parser.add_argument('-o', '--output', metavar='filename', dest='log_file_location', default=None, type=str,
                        help='write the output to a given filename')
    args = parser.parse_args()
    title = parse_cmd_name(args.cmd) + ' ' + get_time_str()
    if args.log_file_location is None:
        args.log_file_location = title + '.html'

    Invoker(args.cmd, args.log_file_location, title)


if __name__ == '__main__':
    main()

