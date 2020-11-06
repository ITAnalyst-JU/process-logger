import re

line_types = [
    {"name": "write", "regex": "write", "function": "write_specific_data"},
    {"name": "execve", "regex": "execve", "function": "execve_specific_data"}
]


class ParsedLine:
    def __init__(self, pid, time, command, result, specific_data={}):
        self.pid = pid
        self.time = time
        self.command = command
        self.result = result
        self.specific_data = specific_data

    def my_to_string(self):
        return "->" + self.time + ": Process: " + self.pid + " executed " + self.command + ". Resulted with: " + self.result

    def my_to_dict(self):
        return {
            "pid": self.pid,
            "time": self.time,
            "command": self.command,
            "result": self.result,
            "specific_data": self.specific_data
        }


def parse_line(line):
    segments = line.split()
    pid = segments[0]
    time = segments[1]
    command = segments[2].split("(")[0]
    result = line[line.find("=") + 2:]
    specific_data = get_specific_data(line, command)
    return ParsedLine(pid, time, command, result, specific_data)


def get_specific_data(line, command):
    args = re.split("[()]", line)[1]
    args = re.split(", ", args)
    for line_type in line_types:
        pattern = re.compile(line_type["regex"])
        if pattern.match(command):
            return eval(line_type["function"])(args)
    return {}


def write_specific_data(args):
    return {
        "descriptor": args[0],
        "content": args[1],
        "content_size": args[2]
    }


def execve_specific_data(args):
    return {
        "path_name": args[0]
    }
