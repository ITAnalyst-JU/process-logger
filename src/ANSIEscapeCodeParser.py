import sys
from enum import Enum, auto


def _rgb(r,g,b):
    def f(n):
        x = hex(n)[2:]
        if len(x) == 2:
            return x
        elif len(x) == 1:
            return '0' + x
        else:
            assert False

    ret = f(r) + f(g) + f(b)
    assert len(ret) == 6
    return ret


def _is_in_3_or_4_bit_space(n):
    return n in range(30,38) or n in range(40,48) or n in range(90,98) or n in range(100,108)


def _is_in_3_or_4_bit_foreground_space(n):
    return _is_in_3_or_4_bit_space(n) and (n in range(30,38) or n in range(90,98))


def _3_or_4_bit_mapping(n):
    # Ubuntu theme from here: https://en.wikipedia.org/wiki/ANSI_escape_code#3-bit_and_4-bit
    mapping = {
            30: _rgb(1,1,1),
            31: _rgb(222,56,43),
            32: _rgb(57,181,74),
            33: _rgb(255,199,6),
            34: _rgb(0,111,184),
            35: _rgb(118,38,113),
            36: _rgb(44,181,233),
            37: _rgb(204,204,204),
            90: _rgb(128,128,128),
            91: _rgb(255,0,0),
            92: _rgb(0,255,0),
            93: _rgb(255,255,0),
            94: _rgb(0,0,255),
            95: _rgb(255,0,255),
            96: _rgb(0,255,255),
            97: _rgb(255,255,255),
    }

    assert n in mapping.keys() or (n-10) in mapping.keys()
    if n in range(40,48) or n in range(100, 108):
        n -= 10
    return mapping[n]


def _8_bit_color_mapping(n):
    mapping = [
      "000000", "800000", "008000", "808000", "000080", "800080", "008080",
      "c0c0c0", "808080", "ff0000", "00ff00", "ffff00", "0000ff", "ff00ff",
      "00ffff", "ffffff", "000000", "00005f", "000087", "0000af", "0000d7",
      "0000ff", "005f00", "005f5f", "005f87", "005faf", "005fd7", "005fff",
      "008700", "00875f", "008787", "0087af", "0087d7", "0087ff", "00af00",
      "00af5f", "00af87", "00afaf", "00afd7", "00afff", "00d700", "00d75f",
      "00d787", "00d7af", "00d7d7", "00d7ff", "00ff00", "00ff5f", "00ff87",
      "00ffaf", "00ffd7", "00ffff", "5f0000", "5f005f", "5f0087", "5f00af",
      "5f00d7", "5f00ff", "5f5f00", "5f5f5f", "5f5f87", "5f5faf", "5f5fd7",
      "5f5fff", "5f8700", "5f875f", "5f8787", "5f87af", "5f87d7", "5f87ff",
      "5faf00", "5faf5f", "5faf87", "5fafaf", "5fafd7", "5fafff", "5fd700",
      "5fd75f", "5fd787", "5fd7af", "5fd7d7", "5fd7ff", "5fff00", "5fff5f",
      "5fff87", "5fffaf", "5fffd7", "5fffff", "870000", "87005f", "870087",
      "8700af", "8700d7", "8700ff", "875f00", "875f5f", "875f87", "875faf",
      "875fd7", "875fff", "878700", "87875f", "878787", "8787af", "8787d7",
      "8787ff", "87af00", "87af5f", "87af87", "87afaf", "87afd7", "87afff",
      "87d700", "87d75f", "87d787", "87d7af", "87d7d7", "87d7ff", "87ff00",
      "87ff5f", "87ff87", "87ffaf", "87ffd7", "87ffff", "af0000", "af005f",
      "af0087", "af00af", "af00d7", "af00ff", "af5f00", "af5f5f", "af5f87",
      "af5faf", "af5fd7", "af5fff", "af8700", "af875f", "af8787", "af87af",
      "af87d7", "af87ff", "afaf00", "afaf5f", "afaf87", "afafaf", "afafd7",
      "afafff", "afd700", "afd75f", "afd787", "afd7af", "afd7d7", "afd7ff",
      "afff00", "afff5f", "afff87", "afffaf", "afffd7", "afffff", "d70000",
      "d7005f", "d70087", "d700af", "d700d7", "d700ff", "d75f00", "d75f5f",
      "d75f87", "d75faf", "d75fd7", "d75fff", "d78700", "d7875f", "d78787",
      "d787af", "d787d7", "d787ff", "d7af00", "d7af5f", "d7af87", "d7afaf",
      "d7afd7", "d7afff", "d7d700", "d7d75f", "d7d787", "d7d7af", "d7d7d7",
      "d7d7ff", "d7ff00", "d7ff5f", "d7ff87", "d7ffaf", "d7ffd7", "d7ffff",
      "ff0000", "ff005f", "ff0087", "ff00af", "ff00d7", "ff00ff", "ff5f00",
      "ff5f5f", "ff5f87", "ff5faf", "ff5fd7", "ff5fff", "ff8700", "ff875f",
      "ff8787", "ff87af", "ff87d7", "ff87ff", "ffaf00", "ffaf5f", "ffaf87",
      "ffafaf", "ffafd7", "ffafff", "ffd700", "ffd75f", "ffd787", "ffd7af",
      "ffd7d7", "ffd7ff", "ffff00", "ffff5f", "ffff87", "ffffaf", "ffffd7",
      "ffffff", "080808", "121212", "1c1c1c", "262626", "303030", "3a3a3a",
      "444444", "4e4e4e", "585858", "626262", "6c6c6c", "767676", "808080",
      "8a8a8a", "949494", "9e9e9e", "a8a8a8", "b2b2b2", "bcbcbc", "c6c6c6",
      "d0d0d0", "dadada", "e4e4e4", "eeeeee"
    ]

    assert n in range(len(mapping))
    return mapping[n]


class StyleElement(Enum):
    FgColor = auto()
    BgColor = auto()
    Bold = auto()
    Faint = auto()
    Italic = auto()
    Underline = auto()
    LineThrough = auto()


class ANSIEscapeCodeParser:
    def __init__(self):
        self.__active_parameters = dict()  # StyleElement -> value (or no key if not active)
        self.__tag_stack = []  # [(StyleElement, text of the opening tag)]


    def __current_prefix(self):
        return ''.join(x[1] for x in self.__tag_stack)


    def __current_suffix(self):
        return '</span>' * len(self.__tag_stack)


    def __handle_command(self, parameters):
        def remove_parameter(enum_type):
            if enum_type not in self.__active_parameters.keys():
                return ''
            else:
                ret = ''
                reverse_stack = []
                openings = ''
                for i in range(len(self.__tag_stack)-1, -1, -1):
                    if self.__tag_stack[i][0] != enum_type:
                        ret += '</span>'
                        openings = self.__tag_stack[i][1] + openings
                        reverse_stack.append(self.__tag_stack[i])
                    else:
                        self.__tag_stack = self.__tag_stack[:i] + reverse_stack[::-1]
                        return ret + openings


        def set_parameter(enum_type, css_style):
            if enum_type not in self.__active_parameters.keys():
                self.__tag_stack.append((enum_type, f'<span style="{css_style}">'))
                self.__active_parameters[enum_type] = self.__tag_stack[-1][-1]
                return self.__tag_stack[-1][-1]
            else:
                ret = ''
                for i in range(len(self.__tag_stack)-1, -1, -1):
                    if self.__tag_stack[i][0] != enum_type:
                        ret += '</span>'
                    else:
                        ret += '</span>'
                        self.__tag_stack[i] = (enum_type, f'<span style="{css_style}">')
                        ret += self.__tag_stack[i][1]
                        for j in range(i+1, len(self.__tag_stack)):
                            ret += self.__tag_stack[j][1]
                        self.__active_parameters[enum_type] = self.__tag_stack[i][-1]
                        return ret


        pi = 0
        ret = ''
        while pi < len(parameters):
            curr = parameters[pi]

            if curr == 0:  # clear all formatting
                ret = '</span>' * len(self.__tag_stack)
                self.__tag_stack = []
                self.__active_parameters = {}
                pi += 1
                continue

            if len(parameters) - pi >= 3 and parameters[pi:pi+2] == [38, 5]:  # 8-bit foreground
                assert parameters[pi+2] in range(0, 256)
                color = _8_bit_color_mapping(parameters[pi+2])
                ret += set_parameter(StyleElement.FgColor, f'color: #{color}')
                pi += 3
                continue

            if len(parameters) - pi >= 3 and parameters[pi:pi+2] == [48, 5]:  # 8-bit background
                assert parameters[pi+2] in range(0, 256)
                color = _8_bit_color_mapping(parameters[pi+2])
                ret += set_parameter(StyleElement.BgColor, f'background-color: #{color}')
                pi += 3
                continue

            if len(parameters) - pi >= 5 and parameters[pi:pi+2] == [38, 2]:  # 24-bit foreground
                assert all(x in range(0, 256) for x in parameters[pi+2:pi+5])
                color = _rgb(*parameters[pi+2:pi+5])
                ret += set_parameter(StyleElement.FgColor, f'color: #{color}')
                pi += 5
                continue


            if len(parameters) - pi >= 5 and parameters[pi:pi+2] == [48, 2]:  # 24-bit background
                assert all(x in range(0, 256) for x in parameters[pi+2:pi+5])
                color = _rgb(*parameters[pi+2:pi+5])
                ret += set_parameter(StyleElement.BgColor, f'background-color: #{color}')
                pi += 5
                continue

            if _is_in_3_or_4_bit_space(curr):  # 3- or 4-bit color foreground/background
                color = _3_or_4_bit_mapping(curr)
                if _is_in_3_or_4_bit_foreground_space(curr):
                    ret += set_parameter(StyleElement.FgColor, f'color: #{color};')
                else:
                    ret += set_parameter(StyleElement.BgColor, f'background-color: #{color};')
                pi += 1
                continue

            # bold, faint
            if curr == 1:
                ret += set_parameter(StyleElement.Bold, 'font-weight: bold;')
                pi += 1; continue
            if curr == 2:
                ret += set_parameter(StyleElement.Faint, 'font-weight: lighter;')
                pi += 1; continue
            if curr == 22:
                ret += remove_parameter(StyleElement.Bold)
                ret += remove_parameter(StyleElement.Faint)
                pi += 1; continue

            # italic
            if curr == 3:
                ret += set_parameter(StyleElement.Italic, 'font-style: italic;')
                pi += 1; continue
            if curr == 23:
                ret += remove_parameter(StyleElement.Italic)
                pi += 1; continue

            # underline
            if curr == 4:
                ret += set_parameter(StyleElement.Underline, 'text-decoration: underline;')  # XXX will duplicate text-decoration work? (between italic and line-through?)
                pi += 1; continue
            if curr == 24:
                ret += remove_parameter(StyleElement.Underline)
                pi += 1; continue

            # line-through
            if curr == 9:
                ret += set_parameter(StyleElement.LineThrough, 'text-decoration: line-through;')  # XXX will duplicate text-decoration work? (between italic and line-through?)
                pi += 1; continue
            if curr == 29:
                ret += remove_parameter(StyleElement.LineThrough)
                pi += 1; continue

            if curr == 39:
                remove_parameter(StyleElement.FgColor)  
                pi += 1; continue

            if curr == 49:
                remove_parameter(StyleElement.BgColor)  
                pi += 1; continue

            # TODO color spaces currently not handled (see https://en.wikipedia.org/wiki/ANSI_escape_code#24-bit)

            print('Unknown ansi escape:', parameters, parameters[pi:], file=sys.stderr)
            break

        return ret

    def feed(self, s):
        ret = self.__current_prefix()

        i = 0
        while i < len(s):
            c = s[i]

            if s[i:i+2] == '\033[': # parse \ESC[ (numbers seperated by ; or by :) m
                j = i+2
                inner_string = ''
                while j < len(s) and (s[j] in [str(i) for i in range(0,10)] or s[j] == ':' or s[j] == ';'):
                    inner_string += s[j]
                    j += 1
                if len(s) <= j or s[j] != 'm': # fail
                    i = i+1
                else: # success
                    inner_string = inner_string.replace(':', ';')
                    split = inner_string.split(';')
                    parameters = []
                    ok = True
                    for potential_number in split:
                        if potential_number == '':
                            i = i+1
                            ok = False
                            break
                        try:
                            parameters.append(int(potential_number))
                        except ValueError:
                            i = i+1
                            ok = False
                            break
                    if ok:
                        assert len(parameters) == len(split)
                        ret += self.__handle_command(parameters)
                        i = j + 1  # drop the 'm'
            else:
                ret += c
                i += 1

        return ret + self.__current_suffix()

