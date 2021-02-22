# Frontend

## Environment
Install dependencies using 
```
npm install
```
(tested on `npm` version 6.14.8, suggested node version: 10+)

## Compilation
Compile using 
```
npm run build
```
which emits a file `main.js` in the `js` directory

## Test
Test parser using 
```
npm run test
```

## Brief architecture description
We use Typescript and React. The main class is `App.tsx`. It communicates with the backend via websockets. It can receive a few types of events. They are parsed into proper js objects within `eventsParser.ts` file.

There are two components. The first one is `Input`. It is a text input window, where user can set some filters. Raw text is passed to the parser. Parser returns a predicate. Each data raw is filtered through the predicate. Default predicate is `==True`.

The second component is `LogTable`. We use [reactable](https://github.com/glittershark/reactable). The table displays content of parsed events. It is capable of displaying html (colors etc.). 
