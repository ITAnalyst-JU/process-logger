## Środowisko:
`pip install -r requirements.txt`

## Development
`./build.sh` - aby skompilować do kodu natywnego (w tym momencie nie działa bo jest dużo plików, trzeba ogarnąć to, żeby działało). Jeśli coś nie działa dodatkowo to trzeba się upewnwnić, że w skrypcie są wymienione odpowiednie wersje pythona.

`./debug_compiled.sh ./test_scripts/just_echo.sh` - odpala program po zbudowaniu

`./debug ./test_scripts/just_echo.sh` - do dewelopmentu najwygodniej odpalać bez budowania

Po odpaleniu programu w `local_data` powinien pojawić się plik `db.json` z zapisem egzekucji. Ponadto powinien się pojawić `index.html`, w którego po prostu można kliknąć
