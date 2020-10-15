##Odpalanie
instalacja pakietów `pip3 install -r requitements.txt`
Odpalenie głównej części `./debug.sh jeden_parametr_komenda` - parametr może być stringiem żeby wrzucić coś ze spacjami
sprzątanie po sobie - `python3 clean_env.py` - po każdym odpaleniu debug

##Co działa
Stawia bazę danych i drugiego dockera na którym będzie parsowanie. Miałam problem z równoległością dlatego postawiłam od razu dockera, mam nadzieję, że nam wolno.
odpala strace i przekierowuje do named_pipe. Czyta z pipa i zapisuje do bazy.

##Baza danych 
Influx to baza do zapisywania rzeczy z timestampem. Myślę, że będzie tu wygodniejsza niż zwykły sql 



W razie problemów piszcie ;)