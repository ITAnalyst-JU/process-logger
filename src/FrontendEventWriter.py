import os
import re
import glob
import os.path

from EventWriter import EventWriter


class FrontendEventWriter(EventWriter):
    def __init__(self, fname, title, ws_port):
        super().__init__()
        ws_marker = 'undefined'
        new_data_marker = '⚗'

        included_css_files = ''.join(
                f'  <style>\n{open(css_fname).read()}  </style>\n'
                for css_fname in glob.glob('./frontend/css/*.css'))
        included_js_files = ''.join(
                f'  <script>\n{open(js_fname).read()}  </script>\n'
                for js_fname in glob.glob('./frontend/js/*.js'))

        # TODO depending on frontend choices, this parametrization might change
        index_html_formatted = open('./frontend/index.html').read().format(
                title=title,
                h1_title=title,
                included_css_files=included_css_files,
                included_js_files=included_js_files)

        self.__ws_port_index = index_html_formatted.index('undefined')
        self.__closing_tags_len = index_html_formatted[::-1].index('⚗') - len('-->\n')
        self.__closing_tags = index_html_formatted[-self.__closing_tags_len:]

        if os.path.isfile(fname): raise Exception(f'File "{fname}" already exists.')
        self.__f = open(fname, 'wb')
        self.__f.write(index_html_formatted.encode('utf-8'))
        self.__f.flush()
        self.__write_websocket_port(ws_port)


    def __format_nine_char_ws_port(self, ws_port_or_none):
        if ws_port_or_none is None:
            assert len('undefined') == 9
            return 'undefined'
        else:
            ws_port = int(ws_port_or_none)
            assert 1024 <= ws_port <= 65535
            assert 1 <= len(str(ws_port)) <= 8
            ws_port_str = str(ws_port) + '.'
            assert 9 - len(ws_port_str) >= 1
            ws_port_str += '0' * (9 - len(ws_port_str))
            assert len(ws_port_str) == 9
            return ws_port_str


    def __write_websocket_port(self, ws_port_or_none):
        assert super().is_open()

        ws_port_str = self.__format_nine_char_ws_port(ws_port_or_none)
        self.__f.seek(self.__ws_port_index)
        self.__f.write(ws_port_str.encode('utf-8'))
        self.__f.flush()

    
    def write(self, event):
        assert super().is_open()

        bytes_of_data = event.to_xml().encode('utf-8')

        self.__f.seek(-self.__closing_tags_len, os.SEEK_END)
        self.__f.write(bytes_of_data)
        self.__f.write(self.__closing_tags.encode('utf-8'))
        self.__f.flush()


    def terminate(self):
        if super().is_open():
            self.__write_websocket_port(None)
            self.__f.close()
            super()._EventWriter__close()

