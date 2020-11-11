import re
import signal

from events.OutputLineEvent import OutputLineEvent
from events.ReturnValueEvent import ReturnValueEvent
from events.SubprocessEvent import SubprocessEvent

class StraceParser:
    def __init__(self, event_callback):
        self.__event_callback = event_callback
        self.__unfinished_syscalls = dict()
        self.__line_buffer = dict()  # pid -> 'stdout'|'stderr' -> (buffer, timestamp)
        self.__stdout = dict()
        self.__stderr = dict()
        # XXX openins (s are important
        self.__mapping = {
                '+++ exited with ': self.__parse_return_value,
                '+++ killed by ': self.__parse_killed,
                'write(': self.__parse_write,
                'close(': self.__parse_close,
                'dup(': self.__parse_dup,
                'dup2(': self.__parse_dup2, 
                # 'dup3(': self.__parse_dup3,
                'fcntl(': self.__parse_fcntl,  # XXX not fullt implemented
                # 'fork(': self.__parse_fork,
                # 'vfork(': self.__parse_vfork,
                'clone(': self.__parse_clone  # XXX not fullt implemented
                }

    
    # TODO rozważyć potrzebę napisania prawdziwego parsera, ewentualnie skorzystania z gotowego rozwiązania
    # TODO Jeśli nie, to chociaż przepisać to w jakiś bardziej cywilizowany sposób
    def feed_line(self, line):
        line = line.strip()

        self.pid = int(line.split()[0])  # XXX single-threaded
        i = 0
        seen_space = False
        while i < len(line):
            if line[i] == ' ':
                seen_space = True
            elif seen_space:
                break
            i += 1
        line = line[i:]  # drop the pid and whitespace

        # XXX single-threaded, XXX not always separated by ' ', sometimes just by more whitespace
        self.timestamp = int(line.split()[0].replace('.', ''))
        i = 0
        seen_space = False
        while i < len(line):
            if line[i] == ' ':
                seen_space = True
            elif seen_space:
                break
            i += 1
        self.line = line = line[i:]  # drop the timestamp and whitespace

        if not line.startswith('+++ '):  # TODO czy napewno 
            syscall_name = ''
            match_result = re.match('^<... ([0-9a-zA-Z_]+) resumed> ', self.line)
            if match_result is not None:
                # XXX PID seems necessary in order to avoid collisions, this part of strace's behavior appears to be entirely undocumented
                syscall_name = match_result.group(1)
                key = (syscall_name, self.pid)
                assert key in self.__unfinished_syscalls
                self.pid = self.__unfinished_syscalls[key]['pid']
                self.timestamp = self.__unfinished_syscalls[key]['timestamp']
                self.line = line = self.__unfinished_syscalls[key]['line_start'] + line[len(match_result.group(0)):]
                del self.__unfinished_syscalls[key]
            elif line.endswith(' <unfinished ...>'):
                syscall_name = line.split('(')[0]
                # XXX PID seems necessary in order to avoid collisions, this part of strace's behavior appears to be entirely undocumented
                key = (syscall_name, self.pid)
                assert key not in self.__unfinished_syscalls
                self.__unfinished_syscalls[key] = {
                        'pid': self.pid,
                        'timestamp': self.timestamp,
                        'line_start': self.line[:-len(' <unfinished ...>')] }
                return

        for k, v in self.__mapping.items():
            if line.startswith(k):
                return v()


    def __c_string_literal_to_python_str(self, literal):
        # XXX https://en.wikipedia.org/wiki/Escape_sequences_in_C#Table_of_escape_sequences
        mapping = {
                'a' : 0x07,
                'b' : 0x08,
                'e' : 0x1b,
                'f' : 0x0c,
                'n' : 0x0a,
                'r' : 0x0d,
                't' : 0x09,
                'v' : 0x0b,
                '\\': 0x5c,
                "'" : 0x27,
                '"' : 0x22,
                '?' : 0x3f}
        unicode_codepoint_length_mapping = {
                'x': 2,
                'u': 4,
                'U': 8}

        ret = ''

        i = 0
        escaping = False
        while i < len(literal):
            if escaping:
                if literal[i] in mapping:
                    ret += chr(mapping[literal[i]])
                    i += 1
                elif literal[i] in {'x', 'u', 'U'}:
                    substr_len = unicode_codepoint_length_mapping[literal[i]]
                    i += 1
                    assert i < len(literal)
                    assert substr_len <= len(literal) - i
                    ret += chr(int(literal[i:i+substr_len], 16))
                    i += substr_len
                else:
                    if len(literal) - i >= 3:
                        octal_matching = re.match('^[0-7][0-7][0-7]$', literal[i:i+3])
                        if octal_matching is not None:
                            ret += chr(int(literal[i:i+3], 8))
                            i += 3
                            escaping = False
                            continue
                    if len(literal) - i >= 2:
                        octal_matching = re.match('^[0-7][0-7]$', literal[i:i+2])
                        if octal_matching is not None:
                            ret += chr(int(literal[i:i+2], 8))
                            i += 2
                            escaping = False
                            continue
                    if len(literal) - i >= 1:
                        octal_matching = re.match('^[0-7]$', literal[i:i+1])
                        if octal_matching is not None:
                            ret += chr(int(literal[i:i+1], 8))
                            i += 1
                            escaping = False
                            continue
                    assert False
                escaping = False
                continue
            else:
                if literal[i] == '\\':
                    escaping = True
                else:
                    ret += literal[i]
                i += 1
                continue

        return ret


    def __handle_close(self, pid, fd):
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


    def __handle_copying_fd(self, pid, old_fd, new_fd):
        self.__stdout[pid] = self.__stdout.get(pid, {1})
        self.__stderr[pid] = self.__stderr.get(pid, {2})
        if old_fd in self.__stdout[pid]: self.__stdout[pid].add(new_fd)
        if old_fd in self.__stderr[pid]: self.__stderr[pid].add(new_fd)


    def __handle_write(self, python_str, requested_fd):
        requested_fd = int(requested_fd)
        assert requested_fd in {1, 2}
        requested_output = 'stdout' if requested_fd == 1 else 'stderr'

        if self.pid not in self.__line_buffer:
            self.__line_buffer[self.pid] = {
                    'stdout': ['', self.timestamp],
                    'stderr': ['', self.timestamp]}

        # TODO co teraz robić z timestampem?
        python_str = self.__line_buffer[self.pid][requested_output][0] + python_str
        if '\n' not in python_str:
            self.__line_buffer[self.pid][requested_output][0] = python_str
            return
        elif python_str[-1] != '\n':
            idx = python_str[::-1].index('\n')
            self.__line_buffer[self.pid][requested_output][0] = python_str[-idx:]
            python_str = python_str[:-idx]

        assert python_str[-1] == '\n'
        for line in python_str[:-1].split('\n'):
            self.__event_callback(OutputLineEvent(self.timestamp, self.pid, line, requested_fd))


    def __flush_line_buffers(self, pid, flush_stdout=True, flush_stderr=True):
        if pid not in self.__line_buffer: return

        if flush_stdout:
            buff = self.__line_buffer[pid]['stdout']
            if buff[0] != '':
                self.pid = pid
                self.timestamp = buff[1]
                self.__handle_write('\n', 1)  # TODO frontend should somehow signify this lack of '\n'

        if flush_stderr:
            buff = self.__line_buffer[pid]['stderr']
            if buff[0] != '':
                self.pid = pid
                self.timestamp = buff[1]
                self.__handle_write('\n', 2)  # TODO frontend should somehow signify this lack of '\n'


    def __parse_syscall_return_value(self, line):
        part_of_interest = line.split('=')[-1].strip()
        try:
            returned_fd = int(part_of_interest)
            return (returned_fd, None, None)
        except:
            matching = re.match('^ -1 ([a-zA-Z0-9_]+) \(([a-zA-Z ]+)\)$', part_of_interest)
            assert matching is not None
            return (-1, matching.group(1), matching.group(2))


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


    def __parse_dup(self):
        old_fd = int(self.line.split('(')[1].split(')')[0])
        returned_fd = self.__parse_syscall_return_value(self.line)[0]
        if returned_fd == -1: return
        self.__handle_copying_fd(self.pid, old_fd, returned_fd)


    def __parse_dup2(self):
        old_fd, requested_fd = [int(x.strip()) for x in self.line.split('(')[1].split(')')[0].split(', ')]
        returned_fd = self.__parse_syscall_return_value(self.line)[0]

        if returned_fd == -1: return  # no effect
        if returned_fd == old_fd: return  # no effect
        assert requested_fd == returned_fd

        self.__handle_close(self.pid, requested_fd)
        self.__handle_copying_fd(self.pid, old_fd, returned_fd)


    def __parse_fcntl(self):
        # TODO XXX to jest skaldalicznie niepoprawne i niebezpieczne parsowanie
        if ' F_DUPFD, ' not in self.line: return
        
        old_fd, command, requested_fd = [x.strip() for x in self.line.split('(')[1].split(')')[0].split(',')]
        old_fd = int(old_fd)
        requested_fd = int(requested_fd)
        returned_fd = self.__parse_syscall_return_value(self.line)[0]

        if not (requested_fd <= returned_fd): return
        self.__handle_copying_fd(self.pid, old_fd, returned_fd)


    def __parse_close(self):
        # XXX close on linux should always invalidate passed fd, no need to check return value

        closed_fd = int(self.line.split('(')[1].split(')')[0])
        self.__handle_close(self.pid, closed_fd)


    def __parse_write(self):
        front_matching = re.match('^write\(([0-9]+), "', self.line)
        assert front_matching is not None
        requested_fd = int(front_matching.group(1))

        back_matching  = re.search('", ([0-9]+)\) = ([0-9]+)$', self.line)
        if back_matching is not None:
            requested_len = int(back_matching.group(1))
            got_len = int(back_matching.group(2))
        else:
            back_matching = re.search(r'", ([0-9]+)\) = -1 ([A-Za-z_]+) \(([a-zA-Z ]+)\)$', self.line)
            assert back_matching is not None
            requested_len = int(back_matching.group(1))
            got_len = -1
            return

        if requested_fd not in self.__stdout.get(self.pid, {1}) and requested_fd not in self.__stderr.get(self.pid, {2}):
            return

        c_string_literal_requested = self.line[len(front_matching.group(0)):-1-self.line[::-1].index('"')]
        python_str = self.__c_string_literal_to_python_str(c_string_literal_requested)[:got_len]

        self.__handle_write(python_str, 1 if requested_fd in self.__stdout.get(self.pid, {1}) else 2)


    def __parse_clone(self):
        # TODO zastanowić się co tutaj powinno iść

        ret_value = self.__parse_syscall_return_value(self.line)[0]
        if ret_value == -1: return

        self.__event_callback(SubprocessEvent(self.timestamp, self.pid, ret_value))

