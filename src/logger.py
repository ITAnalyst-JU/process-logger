import fileinput
import re

from db import write_lines_to_db
from html import create_html_file
from parse import line_types, parse_line

# MAIN:
parsed_lines = []
for line in fileinput.input():
    for line_type in line_types:
        if len(re.findall(line_type["regex"], line)) > 0:
            parsed_lines.append(parse_line(line))

create_html_file(parsed_lines)
write_lines_to_db(parsed_lines, "exec1")
