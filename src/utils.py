
def lines_to_dict(content_list, execution_name):
    data = {"name": execution_name}
    parsed_lines = {}
    for i in range(len(content_list)):
        parsed_lines[str(i)] = content_list[i].my_to_dict()
    data["lines"] = parsed_lines
    return data
