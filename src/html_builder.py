from pyhtml import *

# https://pypi.org/project/PyHTML/
def f_links(ctx):
    for title, page in [('Home', './index.html')]:
        yield li(a(href=page)(title))


def create_home_page(content_list):
    items = lambda ctx: list(map(lambda x: li(div(x)), content_list))
    return html(
        head(
            title('Logger'),
            # script(src="http://path.to/script.js")
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
