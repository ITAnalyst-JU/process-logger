import re
import signal

from events.OutputLineEvent import OutputLineEvent
from events.ReturnValueEvent import ReturnValueEvent
from events.SubprocessEvent import SubprocessEvent
from ANSIEscapeCodeParser import ANSIEscapeCodeParser

class ParsedLine:
    def __init__(self, pid, syscall_name, args, args_raw, return_value, info=None, errno=None):
        self.pid = pid
        self.syscall_name = syscall_name
        self.args = args
        self.args_raw = args_raw
        self.return_value = return_value
        self.info = info
        self.errno = errno


class StraceParser:
    def __init__(self, event_callback):
        self.__event_callback = event_callback
        self.__unfinished_syscalls = dict()
        self.__line_buffer = dict()  # pid -> 'stdout'|'stderr' -> (buffer, timestamp)
        self.__stdout = dict()
        self.__stderr = dict()
        self.__ansi_parser = ANSIEscapeCodeParser()

        self.__special_mapping = {
                '+++ exited with ': self.__parse_return_value,
                '+++ killed by ': self.__parse_killed
                }
        self.__syscall_mapping = {
                'write': self.__handle_write,
                'close': self.__handle_close,
                'dup': self.__handle_dup,
                'dup2': self.__handle_dup2, 
                'dup3': self.__handle_dup3,
                'fcntl': self.__handle_fcntl,  # XXX not fullt implemented
                'fork': self.__handle_fork,     # TODO
                'vfork': self.__handle_vfork,   # TODO
                'clone': self.__handle_clone  # XXX not fullt implemented
        }

    
    # TODO rozważyć potrzebę napisania prawdziwego parsera, ewentualnie skorzystania z gotowego rozwiązania
    # TODO Jeśli nie, to chociaż przepisać to w jakiś bardziej cywilizowany sposób
    def feed_line(self, line):
        assert type(line) == type(bytes())
        line = line.strip()

        # retrieve pid
        self.pid = int(line.split()[0])  # XXX single-threaded
        i = 0
        seen_space = False
        while i < len(line):
            if line[i] == ord(' '):
                seen_space = True
            elif seen_space:
                break
            i += 1
        line = line[i:]  # drop the pid and whitespace

        # retrieve timestamp
        # XXX single-threaded, XXX not always separated by ' ', sometimes just by more whitespace
        self.timestamp = int(line.split()[0].replace(b'.', b''))
        i = 0
        seen_space = False
        while i < len(line):
            if line[i] == ord(' '):
                seen_space = True
            elif seen_space:
                break
            i += 1
        self.line = line = line[i:]  # drop the timestamp and whitespace

        # ignore lines starting with '---', containing signal information
        if line.startswith(b'--- '):
            return

        # handle unfinished syscalls
        if not line.startswith(b'+++ '):  # TODO czy napewno 
            syscall_name = ''
            match_result = re.match(b'^<... ([0-9a-zA-Z_]+) resumed>', self.line)
            if match_result is not None:
                # XXX PID seems necessary in order to avoid collisions, this part of strace's behavior appears to be entirely undocumented
                syscall_name = match_result.group(1)
                key = (syscall_name, self.pid)
                assert key in self.__unfinished_syscalls
                self.pid = self.__unfinished_syscalls[key]['pid']
                self.timestamp = self.__unfinished_syscalls[key]['timestamp']
                self.line = line = self.__unfinished_syscalls[key]['line_start'] + line[len(match_result.group(0)):]
                del self.__unfinished_syscalls[key]
            elif line.endswith(b' <unfinished ...>'):
                syscall_name = line.split(b'(')[0]
                # XXX PID seems necessary in order to avoid collisions, this part of strace's behavior appears to be entirely undocumented
                key = (syscall_name, self.pid)
                assert key not in self.__unfinished_syscalls
                self.__unfinished_syscalls[key] = {
                        'pid': self.pid,
                        'timestamp': self.timestamp,
                        'line_start': self.line[:-len(' <unfinished ...>')] }
                return

        for k, v in self.__special_mapping.items():
            if line.startswith(k.encode('utf-8')):
                self.line = line = self.line.decode('utf-8')
                return v()

        try:
            # TODO
            # parsing may throw, if somehow the line is not a syscall
            # - we shouldn't just ignore it, since it means uncaught
            # edge cases, but we will for now
            self.parsed = self.__parse_syscall()
        except:
            return
            
        for k, v in self.__syscall_mapping.items():
            if self.parsed.syscall_name == k.encode('utf-8'):
                self.line = line = self.line.decode('utf-8')
                return v()


    ########################
    ### SYSCALL HANDLERS ###
    ########################


    def __handle_close(self):
        pid = self.pid
        fd = self.parsed.args[0]
        self.__handle_closing_fd(pid, fd)


    def __handle_write(self, python_str=None, requested_fd=None):
        args = self.parsed.args
        if requested_fd is None:
            requested_fd = int(args[0])
        
            # retrieve output from file descriptor number
            if requested_fd in self.__stdout.get(self.pid, {1}):
                requested_fd = 1
            elif requested_fd in self.__stderr.get(self.pid, {2}):
                requested_fd = 2
            else:
                return

        requested_output = None
        if requested_fd == 1:
            requested_output = 'stdout'
        elif requested_fd == 2:
            requested_output = 'stderr'
        else:
            return

        if self.pid not in self.__line_buffer:
            self.__line_buffer[self.pid] = {
                    'stdout': [b'', self.timestamp],
                    'stderr': [b'', self.timestamp]}

        # translate the cstring literal to a python str (omitting quotation marks)
        # and trim length to the number of characters actually written
        if python_str is None:
            python_str = self.__c_string_literal_to_python_str(self.parsed.args_raw[1][1:-1])[:self.parsed.return_value]

        # TODO co teraz robić z timestampem?
        python_str = self.__line_buffer[self.pid][requested_output][0] + python_str
        if b'\n' not in python_str:
            self.__line_buffer[self.pid][requested_output][0] = python_str
            return
        elif python_str[-1] != ord('\n'):
            idx = python_str[::-1].index(b'\n')
            self.__line_buffer[self.pid][requested_output][0] = python_str[-idx:]
            python_str = python_str[:-idx]

        python_str = python_str.decode('utf-8')
        if python_str == '\n': return
        assert python_str[-1] == '\n'
        for line in python_str[:-1].split('\n'):
            self.__event_callback(OutputLineEvent(self.timestamp, self.pid, self.__ansi_parser.feed(line), requested_fd))


    def __handle_dup(self):
        old_fd = int(self.parsed.args[0])
        returned_fd = self.parsed.return_value
        assert isinstance(returned_fd, int)

        if returned_fd != -1:
            self.__handle_copying_fd(self.pid, old_fd, returned_fd)

    def __handle_dup2(self):
        args = self.parsed.args
        old_fd, requested_fd = int(args[0]), int(args[1])
        returned_fd = self.parsed.return_value
        assert isinstance(returned_fd, int)

        if returned_fd == -1: return
        if returned_fd == old_fd: return
        assert requested_fd == returned_fd

        self.__handle_closing_fd(self.pid, requested_fd)
        self.__handle_copying_fd(self.pid, old_fd, returned_fd)

    # for our purposes, these `should` be the same
    def __handle_dup3(self):
        return self.__handle_dup2()

    
    def __handle_fcntl(self):
        args = self.parsed.args
        cmd = args[1]

        # we only care about F_DUPFD for now
        if cmd != 'F_DUPFD':
            return
        
        old_fd, requested_fd = int(args[0]), int(args[2])
        returned_fd = self.parsed.return_value
        assert isinstance(returned_fd, int)

        if not (requested_fd <= returned_fd): return
        self.__handle_copying_fd(self.pid, old_fd, returned_fd)

    
    def __handle_fork(self):
        #TODO
        return

    def __handle_vfork(self):
        #TODO
        return

    def __handle_clone(self):
        # TODO zastanowić się, co tutaj powinno iść

        return_value = self.parsed.return_value
        if return_value == -1: return

        self.__event_callback(SubprocessEvent(self.timestamp, self.pid, return_value))

    ########################
    ### HELPER FUNCTIONS ###
    ########################

    def __handle_copying_fd(self, pid, old_fd, new_fd):
        self.__stdout[pid] = self.__stdout.get(pid, {1})
        self.__stderr[pid] = self.__stderr.get(pid, {2})
        if old_fd in self.__stdout[pid]: self.__stdout[pid].add(new_fd)
        if old_fd in self.__stderr[pid]: self.__stderr[pid].add(new_fd)


    def __handle_closing_fd(self, pid, fd):
        self.__stdout[pid] = self.__stdout.get(pid, {1})
        self.__stderr[pid] = self.__stderr.get(pid, {2})
        for fds in (self.__stdout[pid], self.__stderr[pid]):
            try:
                fds.remove(fd)
            except KeyError:
                pass

        if len(self.__stdout[pid]) == 0:
            self.__flush_line_buffers(pid, flush_stdout=True, flush_stderr=False)
        if len(self.__stderr[pid]) == 0:
            self.__flush_line_buffers(pid, flush_stdout=False, flush_stderr=True)


    def __flush_line_buffers(self, pid, flush_stdout=True, flush_stderr=True):
        if pid not in self.__line_buffer: return

        if flush_stdout:
            buff = self.__line_buffer[pid]['stdout']
            if buff[0] != '':
                self.pid = pid
                self.timestamp = buff[1]
                self.__handle_write(b'\n', 1)  # TODO frontend should somehow signify this lack of '\n'

        if flush_stderr:
            buff = self.__line_buffer[pid]['stderr']
            if buff[0] != '':
                self.pid = pid
                self.timestamp = buff[1]
                self.__handle_write(b'\n', 2)  # TODO frontend should somehow signify this lack of '\n'


    def __c_string_literal_to_python_str(self, literal):
        assert type(literal) == type(bytes())
        # XXX https://en.wikipedia.org/wiki/Escape_sequences_in_C#Table_of_escape_sequences
        mapping = {
                ord('a') : 0x07,
                ord('b') : 0x08,
                ord('e') : 0x1b,
                ord('f') : 0x0c,
                ord('n') : 0x0a,
                ord('r') : 0x0d,
                ord('t') : 0x09,
                ord('v') : 0x0b,
                ord('\\'): 0x5c,
                ord("'") : 0x27,
                ord('"') : 0x22,
                ord('?') : 0x3f}
        unicode_codepoint_length_mapping = {
                ord('x'): 2,
                ord('u'): 4,
                ord('U'): 8}

        ret = b''

        i = 0
        escaping = False
        while i < len(literal):
            if escaping:
                if literal[i] in mapping:
                    ret += bytes([ mapping[literal[i]] ])
                    i += 1
                elif literal[i] in {b'x', b'u', b'U'}:
                    substr_len = unicode_codepoint_length_mapping[literal[i]]
                    i += 1
                    assert i < len(literal)
                    assert substr_len <= len(literal) - i
                    ret += bytes([ int(literal[i:i+substr_len], 16) ])
                    i += substr_len
                else:
                    if len(literal) - i >= 3:
                        octal_matching = re.match(b'^[0-7][0-7][0-7]$', literal[i:i+3])
                        if octal_matching is not None:
                            ret += bytes([ int(literal[i:i+3], 8) ])
                            i += 3
                            escaping = False
                            continue
                    if len(literal) - i >= 2:
                        octal_matching = re.match(b'^[0-7][0-7]$', literal[i:i+2])
                        if octal_matching is not None:
                            ret += bytes([ int(literal[i:i+2], 8) ])
                            i += 2
                            escaping = False
                            continue
                    if len(literal) - i >= 1:
                        octal_matching = re.match(b'^[0-7]$', literal[i:i+1])
                        if octal_matching is not None:
                            ret += bytes([ int(literal[i:i+1], 8) ])
                            i += 1
                            escaping = False
                            continue
                    assert False
                escaping = False
                continue
            else:
                if literal[i] == ord('\\'):
                    escaping = True
                else:
                    ret += bytes([ literal[i] ])
                i += 1
                continue

        return ret


    #######################
    ### SYSCALL PARSERS ###
    #######################

    def __parse_return_value(self):
        l = self.line
        assert l.startswith('+++ exited with ') and l.endswith(' +++')

        if self.pid in self.__line_buffer:
            self.__flush_line_buffers(self.pid)  
            del self.__line_buffer[self.pid]

        self.__event_callback(ReturnValueEvent(self.timestamp, self.pid, int(l[len('+++ exited with '):-len(' +++')])))


    def __parse_killed(self):
        signal_name = self.line[len('+++ killed by '):-len(' +++')]
        if ' ' in signal_name:
            assert signal_name.endswith(' (core dumped)')
            signal_name = signal_name[:-len(' (core dumped)')]
            assert ' ' not in signal_name
        self.__event_callback(ReturnValueEvent(self.timestamp, self.pid, getattr(signal, signal_name) + 128, signal_name))

    
    def __parse_syscall(self):
        parentheses = self.line.find(b'(')
        # assert parentheses != -1
        if parentheses == -1:
            print('no parens!', self.line)
            exit(1)
        syscall_name, rest = self.line[:parentheses], self.line[parentheses:]

        info, errno = None, None
        if re.match(rb'\(.*\)\s+= [0-9xa-f]+$', rest) is None:
            # parse the information after the return value
            if rest[-1] == ord(')'):
                # returned flags / error information
                parentheses = rest.rfind(b'(')
                info, rest = rest[parentheses:], rest[:parentheses]
                rest = rest.rstrip()
            if re.match(rb'\(.*\)\s+= [0-9xa-f]+$', rest) is None:
                # errno code
                space = rest.rfind(b' ')
                errno, rest = rest[space+1:], rest[:space]

        parentheses = rest.rfind(b')')
        args, rest = rest[1:parentheses], rest[parentheses+1:]
        args = self.__split_args(args)
        try:
            return_value = int(rest[rest.find(b'=')+2:])
        except ValueError:
            return_value = rest[rest.find(b'=')+2:]
        return ParsedLine(self.pid, syscall_name, [s.decode('utf-8') for s in args], args, return_value, info, errno)

    def __split_args(self, args_bytes: bytes):
        args = []
        while args_bytes:
            if args_bytes[0] == ord('"'):
                # find the closing quote
                closing_quote = -1
                for i in range(1, len(args_bytes)):
                    if args_bytes[i] == ord('"') and args_bytes[i-1] != ord('\\'):
                        closing_quote = i
                        break
                args.append(args_bytes[:closing_quote+1])
                args_bytes = args_bytes[closing_quote+3:]
            else:
                comma = args_bytes.find(b', ')
                if comma == -1:
                    # last argument
                    args.append(args_bytes)
                    break
                args.append(args_bytes[:comma])
                args_bytes = args_bytes[comma+2:]
        return args


# for debugging purposes
if __name__ == "__main__":
    parser = StraceParser(lambda x: None)

    while True:
        try:
            parser.feed_line(input())
        except EOFError:
            break

