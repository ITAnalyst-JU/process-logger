import html
import json


def _str(s): return html.escape(str(s))


class EventMessageBuilder:
    def __init__(self, event_name, content=None):
        self.event_name = str(event_name)
        self.content = str(content) if content is not None else ''
        self.attrs = {}

    def attributes(self, **attrs):
        r = EventMessageBuilder(self.event_name, self.content)
        r.attrs = {**self.attrs, **attrs}
        return r
    
    def to_xml(self):
        ret = f'<{self.event_name}'
        for k, v in self.attrs.items():
            if v is not None:
                ret += f' {str(k)}="{str(v)}"'
        ret += f'>{_str(self.content)}</{self.event_name}>'
        return ret

    def to_json(self):
        j = { 'type': self.event_name.upper()
            , 'content': _str(self.content)
            , 'attributes': [] }
        for k, v in self.attrs.items():
            if v is not None:
                j['attributes'].append({'name': str(k), 'value': str(v)})
        return json.dumps(j)

