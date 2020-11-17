# PZ

## Uruchomienie
```bash
pip3 install --upgrade websockets
cd process-logger/src # katalog jest ważny
python3 main.py command argument argument
```

## Uwagi
* Poprzedni kod w repozytorium został zintegrowany w to co jest teraz po refactoringu.
* Chwilowo kompilacja przez cython nie działa, warto byłoby zastanowić się również nad innymi rozwiązaniami, np wheel. Uwaga na dziwny katalog z resource'ami `frontend`, który mi się nie podoba i już w tej chwili np. przeszkadza w uruchomieniu `main.py` z katalogu innego niż `src/`

## Zarys architektury
* `main.py` - parsowanie argumentów, decydowanie o domyślnych nazwach plików. Tutaj można dodać np. opcję wiersza poleceń do ustalania nazwy logów. Kod jedynie tworzy instancję klasy `Invoker`.
* `Invoker` - właściwa klasa inicjująca wszystko i mająca referencje do monitorowanego procesu, instancji parsera, `FrontendEventWriter`, `WSBroadcastEventWriter`.
  * To tutaj następuje inicjalizacja i terminacja. Dodatkowym obowiązkiem invokera jest routowanie sygnałów do procesu monitorowanego (chwilowo tylko SIGINT, SIGTERM, SIGQUIT). Pracuję (@belamenso) nad SIGSTP oraz SIGCONT, ale to okazuje się dość trudne ponieważ naszy skrypt musi również odpowiednio na nie reagować, co pewnie będzie wiązało się z zapisywaniem gdzieś wskaźników na domyślne handlery tych sygnałów i uruchamianiem ich w odpowiednich momentach i po pierwszych próbach nie mogę doprowadzić tego do działania). 
  * Całość działa w ramach evnet loop z biblioteki `asyncio`, co oznacza, że duża część kodu jest `async`.
  * Plik z którego zczytywane są linie strace'a jest otwierany w trybie NOBLOCK, a następnie jego deskryptor jest przekazywany do `asyncio`, która korzysta z `epoll`a pod spodem i powiadamia nas o możliwości odczytania kolejnych bajtów.
  * Chwilowo plan na obsługę SSH jest taki, że na serwer prześle się jedynie plik przesyłający linie z strace'a po sockecie do nas, deskryptor tego socketu będzie wykorzystywany zamiast deskryptora pliku w tym miejscu, wszystko inne powinno działać dokładnie tak samo.
* `events.Event` - superklasa/interfejs data klas dla eventów. Event może przedstawić się jako xml albo protokół websocketowy (jsonowy zapis XMLu). Obecnie są trzy eventy: `OutputLineEvent`, `SubprocessEvent`, `ReturnValueEvent`. Nie mam jeszcze (@balemsso) pomysłu jak bedą na frontendzie reprezentowane procesy dzieci, to jest jakie eventy z nimi wiążemy ani jak to przedstawiać w UI.
* `StraceParser` - klasa parsera. Dostaje w konstruktorze callback do zgłaszania wykrytych eventów. Kod zawiera dużo niskopoziomowej wiedzy o syscallach, ich składni, sygnałach, parsuje on również literały znakowe w składni języka C. Mam w planach (@belamenso) ujednolicić parsowanie pewnhych kategorii linii `strace`a. Instancja ma swój stan per process oraz:
  * buforuje niepełne linie wyjścia
  * buforuje `strace`'owe linie `<unfinished ...>` oraz `<... resumed>` (strace ratuje się tak np. podczas otrzymania nieoczekiwanego sygnału).
  * zna obecny stan otwartych deskryptorów per process
* `EventWriter` - superklasa. Można do niej pisać eventy albo zakończyć jej działanie przez `terminate()` (z założenia te eventy są związane ze stanem)
    * `WSBroadcastEventWriter` - zarządza websocketem (inicjalizacja, terminacja, przyjmowanie nowych klientów). Na `write` rozgłasza event do wszystkich słuchaczy. Klientami są oczywiście przeglądarki, które otworzą plik z logami.
    * `FrontendEventWriter` - zarządza plikiem html (tworzy go, w locie dopisuje do niego logi w XMLu, na początku i po śmierci procesu monitorowanego edytuje port WS w skrypcie na początku pliku).
* Wynikowy plik html jest tworzony przez konstruktor `FrontendEventWriter` z szablonów i plików znajdujących się w katalogu `frontend/` (`index.html` oraz katalogi `css/`, `js/` nirekurencyjnie). Ze wzglęgu na to, że to osobne zasoby, chwilogo nie można uruchomić `main.py` z katalogu innego niż `src/`, ale kiedy zapadnie decyzja odnośnie metody dystrybucji (cython, wheel, cx-freeze...) będzie można include'ować te zasoby w bardziej akceptowalny sposób.

## Styl
* `assert`y są pożądane.
* `XXX` oznacza kod wyrażający nietrywialną logikę, uwaga przy pracy w okolicy takich linii.
* `TODO` oznacza coś, czym trzeba się zająć, ewentualnie uzasadnić że nie trzeba i usunąć, jeśli jakiś kod jest wątpliwej jakości, należy umieścić tam TODO.
 