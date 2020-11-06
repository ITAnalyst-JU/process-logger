import os
from tinydb import Query, TinyDB

from utils import lines_to_dict


def write_lines_to_db(lines, execution_name):
    try:
        os.mkdir("../local_data")
    except FileExistsError:
        pass
    db_file = open("../local_data/db.json", "w+")
    db_file.close()
    db = TinyDB("./local_data/db.json")
    db.insert(lines_to_dict(lines, execution_name))
