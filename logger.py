import fileinput
import re
import os

from pyhtml import *
from tinydb import Query, TinyDB

line_types = [
    {"name": "write", "regex": "write", "function": "write_func"}
]

class Parsed_line:
    def __init__(self, time, desc, text):
        self.time = time
        self.desc = desc
        self.text = text

    def my_to_string(self):
        return "TIME: " + self.time + " DESCRIPTOR: " + self.desc + " CONTENT: " + self.text

    def my_to_dict(self):
        return {
            "time": self.time,
            "desc": self.desc,
            "text": self.text
        }

def write_func(line):
    line = re.sub("\s", "", line)
    #print(line)
    time = line[5:13]
    desc = re.findall("write\((.*),.*,",line)
    desc = desc[0]
    text = re.findall("write\(.*,\"(.*)\",",line)
    text = text[0]
    return Parsed_line(time, desc, text)


#https://pypi.org/project/PyHTML/
def f_links(ctx):
    for title, page in [('Home', './index.html')]:
        yield li(a(href=page)(title))

def create_home_page(content_list):
    items = lambda ctx: list(map(lambda x: li(div(x)), content_list))
    return html(
        head(
            title('Logger'),
            #script(src="http://path.to/script.js")
        ),
        body(
            header(
                img(src='./resources/logo.png'),
                nav(
                    ul(f_links)
                )
            ),
            ul(items),
            footer(
                hr,
                'Jagiellonian University: Logger Team'
            )
        )
    ).render()

def lines_to_dict(content_list):
    data = {"name": "some_execution_name"}
    parsed_lines = {}
    for i in range(len(content_list)):
        parsed_lines[str(i)] = content_list[i].my_to_dict()
    data["lines"] = parsed_lines
    return data

#MAIN:
lines = []
for line in fileinput.input():
    for line_type in line_types:
        if len(re.findall(line_type["regex"], line)) > 0:
            lines.append(eval(line_type["function"])(line))

html_file = open("index.html", "w+")
html_content = create_home_page(list(map(lambda x: x.my_to_string(), lines)))
#print(html_content)
html_file.write(html_content)

try:
    os.mkdir("local_data")
except FileExistsError:
    pass
db_file = open("./local_data/db.json", "w+")
db_file.close()
db = TinyDB('./local_data/db.json')
db.insert(lines_to_dict(lines))
