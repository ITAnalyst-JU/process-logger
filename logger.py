import fileinput
import re

#regexy i nazwy funkcji do wywołania na liniach typu write, duplikacje portów, exec, exit...
line_types = [
    {"name": "write", "regex": "write", "function": "write_func"}
]


def write_func(line):
    line = re.sub("\s", "", line)
    #print(line)
    time = line[0:15]
    desc = re.findall("write\((.*),.*,",line)
    desc = desc[0]
    text = re.findall("write\(.*,\"(.*)\",",line)
    text = text[0]
    print(time, desc, text)


#glowna petla czyta stdin i dla kazdej lini jak pasuje do wzorca odpala odpowiednia funkcje
#glowna petla czyta stdin i dla kazdej lini jak pasuje do wzorca odpala odpowiednia funkcje
for line in fileinput.input():
    for line_type in line_types:
        if len(re.findall(line_type["regex"], line))>0:
            eval(line_type["function"])(line) #odpala funkcje po nazwie zeby nie robic wielkiego ifa, wszystkie funkcje powiinny przyjmowac jeden parametr-linie

