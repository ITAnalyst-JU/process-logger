from html_builder import create_home_page


def create_html_file(lines):
    html_file = open("./index.html", "w+")
    html_content = create_home_page(list(map(lambda x: x.my_to_string(), lines)))
    # print(html_content)
    html_file.write(html_content)
