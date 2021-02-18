// XXX: proszę kompilować przez komendę `tsc -t es5 --strictNullChecks parser.ts && node ./parser.js` (ewentualnie es6)
// XXX: jeśli są jakieś mocniejsze ogarniczenia na poprawność w TypeScripcie, proszę je dodać do komendy kompilującej i odpowiednio zmodyfikować kod
// XXX: parser to zaadoptowana wersja monadycznego parsera w Haskellu z 13ego rozdziału książki "Programming in Haskell" 2nd edition, Graham Hutton
// XXX: kiedy wybrana nazwa koliduje ze słowem kluczowym w JSie lub TypeScripcie, stosowana jest Pythonowa konwencja dodania pojedynczego podkreślenia po nazwie, np. type -> type_
// XXX: typeclassy z Haskella nie są zaimplementowane korzystając z generyków, one są jedynie dla typu Parser, jeśli da się to łatwo naprawić, można, jeśli nie, nie chch tak zostanie
// XXX: dodawanie lepszego typowania w TypeScripcie jest mile widziane, typowanie ono znacznie przyspisza proces naprawy błędów w tak abstrakcyjnym kodzie
// XXX: z uwagi na funkcyjny styl kod jest dość gęsty w znaczenie
// XXX: jeśli nie przeszkadza nam to w jednoznacznym parsowaniu, proponuję liberalnie akceprować wiele wesji konstruktów językowych zrozumiałych dla programistów (np. true oraz #t - rozwiązywane w parserze plus false oraz 0 - rozwiązywane w interpreterze/kompilatorze) albo różne wersje komentarzy (jeśli one rzeczywiście będą dodane)

// TODO: obecnie parsowane są jedynie symbole a.b.c albo funckje a.b.c(x,y), natomiast nie a(x).b(y).c(z). Naprawić
// TODO: dodać parsowanie stringów oraz raw stringów (może tak jak działa R"()" w C++?), ewentualnie parsowanie regexów
// TODO: constant propagation, czyszczenie wynikowego drzewa z FactorExp (tego, który wypisuje się jako (begin ))
// TODO: przepisać console.logi na dole pliku na testy, dodać jakąś bibliotekę do testów (ale nie commitować jej na GitHuba)
// TODO: left-/right-associativity jest prawie wszędzie niewłaściwe, naprawić to
// TODO: ogarnąć trochę kolejność tych funkcji, jest chaotyczna
// TODO: upewnić się, że token() jest stosowany odpowiednio, bo dodałem go późno i chyba pominąłem kilka miejsc
// TODO?: może dodać komentarze? -> możliwe style multiline comments to
//        (* Mathematica/ML *)
//        /* C */
//        #| lisp |#
// TODO?: może dodać komentarze? -> możliwe style single-line comments to
//        -- Haskell
//        // C
//        # Python
//        ; lisp

// XXX: cały parser oraz podstawowe optymalizacje, np. constant propagation powinny pozostać w tym jednym pliku, testy można przenieść do innego (testy będą uruchamiane jesynie przez node.js, można więc użyć modułów)
// XXX: wszędzie w kombinacjach parserów uważać na kolejność
// XXX: wszędzie w kombinacjach parserów uważać na różnicę między char(c) a string_(c), w TypeScripcie nie ma na to różnych typów, a nie chcę dodawać asserta c.length==1, bo char jest dość często wołany, choć może rzeczywiście warto dodać tam asserta?
// XXX: wszędzie w kombinacjach parserów uważać na różnicę między some(p) a many(p). Some zwraca niepustą listę wyników (jak + w regexie), many niekoniecznie (jak * w regexie)
// XXX: alternative w wersji wariadycznej trudno jest w TypeScripcie typować obecnie są dwie wersje alternative oraz alternative_ (wariadyczna)

// TODO: brakujące symbole/funckje podczas interpretacji powinny być brane z obiektu window w przeglądarkowym JSie

/*****************************
 * FUNCTIONAL PRIMITIVES
 ****************************/

class StringView {
  private s: string
  private start: number
  private len: number

  constructor(s: string, start: number = 0, len?: number) {
    this.s = s
    this.start = start
    this.len = len || s.length
  }

  public get length() { return this.s.length }

  public charAt(idx: number): string {
    return this.s[this.start + idx]
  }

  public substr(start: number, length?: number): StringView {
    if (start >= this.len) return new StringView("", 0, 0)
    if (length == undefined) {
      return new StringView(this.s, this.start+start, this.len-start)
    } else {
      return new StringView(this.s, this.start+start, Math.min(length, this.len-start))
    }
  }

  public equals(str: string) {
    return str == this.toString()
  }
  
  public toString(): string {
    return this.s.substr(this.start, this.len)
  }
}

// @ts-ignore
function curry(f) {
  // @ts-ignore
  return function recur() {
    const args = Array.prototype.slice.call(arguments);
    return args.length >= f.length ?
      f.apply(null, args) :
      // @ts-ignore
      recur.bind(null, ...args)
  }
}

function assert(c: true, s?: string): void;
function assert(c: false, s?: string): never;
function assert(c: any, s?: string)  {
  if (s) {
    if (!c) throw 'Assertion error: ' + s
  } else {
    if (!c) throw 'Assertion error!'
  }
}

function any<A>(pred: (_:A)=>boolean, xs: A[]): boolean {
  return !all(x => !pred(x), xs)
}

/*****************************
 * PARSER
 ****************************/

type Parser<T> = (_:StringView) => Array<[T, StringView]>

/*****************************
 *     USEFUL TYPECLASSES
 ****************************/

// FUNCTOR
function fmap<A,B>(f: (_:A)=>B, p: Parser<A>): Parser<B> {
  return sv => {
    const got = parse(p, sv)
    if (got.length == 0) return []
    else return [[f(got[0][0]), got[0][1]]]
  }
}
// /FUNCTOR

// APPLICATIVE
function pure<T>(x: T): Parser<T> {
  return sv => [[x, sv]]
}

function liftA2<A,B>(pf: Parser<(_:A)=>B>, pa: Parser<A>): Parser<B>  {
  return sv => {
    const got = parse(pf, sv)
    if (got.length == 0) return []
    else return parse(fmap(got[0][0], pa), got[0][1])
  }
}
// /APPLICATIVE

// MONAD
function bind<A,B>(pa: Parser<A>, fp: (_:A)=>Parser<B>): Parser<B> {
  return sv => {
    const got = parse(pa, sv)
    if (got.length == 0) return []
    else return parse(fp(got[0][0]), got[0][1])
  }
}
let return_ = pure
// /MONAD

// ALTERNATIVE
let empty: Parser<any> = sv => [];

function alternative_<A,B>(p: Parser<A>, ...ps: Parser<B>[]): Parser<A|B> { // XXX terrible hack, parameters second to last all have the same type
  return sv => {
    let got = parse(p, sv)
    if (got.length > 0) {
      return got
    } else {
      for (let pi in ps) {
        let got = parse(ps[pi], sv)
        if (got.length > 0) return got
      }
      return []
    }
  }
}

function alternative<A,B>(pa: Parser<A>, pb: Parser<B>): Parser<A|B> {
  return alternative_(pa, pb);
}

function many<A>(p: Parser<A>): Parser<A[]> {
  return alternative(some(p), pure([]))
}

function some<A>(p: Parser<A>): Parser<A[]> {
  // return liftA2(liftA2(pure(curry((x, xs) => Array.prototype.concat([x], xs))), p), many(p)) //--> doesn't work, JS is eager
  return sv => {
    let firstGot = parse(p, sv)
    if (firstGot.length == 0) return []
    else {
      let curr_sv = firstGot[0][1]
      let results = [firstGot[0][0]]
      while (true) {
        let got = parse(p, curr_sv)
        if (got.length == 0) return [[results, curr_sv]]
        else {
          results.push(got[0][0])
          curr_sv = got[0][1]
        }
      }
    }
  }
}
// /ALTERNATIVE

// WEIRD
function optional<A>(p: Parser<A>): Parser<A|null> { // XXX this, just like pure and return_ shoud never fail
  return sv => {
    let got = parse(p, sv)
    if (got.length == 0) return [[null, sv]]
    else return got
  }
}
// /WEIRD

/*****************************
 *     PARSER PROPER
 ****************************/

function parse<T>(parser: Parser<T>, sv: StringView): Array<[T, StringView]> {
  return parser(sv)
}

let item: Parser<string> = (sv: StringView) => {
  if (sv.length == 0) return []
  else return [[sv.charAt(0), sv.substr(1)]]
}

function sat(pred: (_:string)=>boolean): Parser<string> {
    return bind(item, c => pred(c) ? return_(c) : empty);
}

let digit = sat(c => /^[0-9]$/.test(c))
let nonzeroDigit = sat(c => /^[1-9]$/.test(c))
let char = (c: string) => sat(c1 => c === c1)
let letter = sat(c => /^[a-zA-Z]$/.test(c))
let symbolFirstChar = alternative(letter, char('_'))
let symbolOtherChar = alternative(symbolFirstChar, digit)
function string_(str: string): Parser<string> {
  return sv => {
    if (sv.length < str.length || !sv.substr(0, str.length).equals(str)) return []
    else return [[str, sv.substr(str.length)]]
  }
}

let space: Parser<null> = bind(many(sat(c => /^\s$/.test(c))), _ => pure(null))
let token = function<A>(p:Parser<A>): Parser<A>  {
  return bind(space, _ => bind(p, x => bind(space, _ => return_(x))))
}

let binaryDigit = alternative(char('0'), char('1'))
let octalDigit = sat(c => /^[0-7]$/.test(c))
let hexDigit = sat(c => /^[0-9a-fA-F]$/.test(c))

let nonnegativeBinaryLiteral =
  bind(string_('0b'), _ =>
    bind(some(binaryDigit), digits =>
      return_(parseInt(digits.join(''), 2))))
let nonnegativeOctalLiteral =
  bind(string_('0o'), _ =>
    bind(some(octalDigit), digits =>
      return_(parseInt(digits.join(''), 8))))
let nonnegativeHexLiteral =
  bind(string_('0x'), _ =>
    bind(some(hexDigit), digits =>
      return_(parseInt(digits.join(''), 16))))
let nonnegativeDecimalLiteral =
  bind(some(digit), ds =>
    return_(parseInt(ds.join(''), 10)))

function nonnegativeToInteger(p: Parser<number>): Parser<number> {
  return alternative(p, bind(char('-'), _ => bind(p, n => return_(-n))))
}

let nonnegative = alternative_(nonnegativeBinaryLiteral, nonnegativeOctalLiteral, nonnegativeHexLiteral, nonnegativeDecimalLiteral)

let binaryLiteral: Parser<number> = token(nonnegativeToInteger(nonnegativeBinaryLiteral))
let octalLiteral: Parser<number> = token(nonnegativeToInteger(nonnegativeOctalLiteral))
let hexLiteral: Parser<number> = token(nonnegativeToInteger(nonnegativeHexLiteral))
let decimalLiteral: Parser<number> = token(nonnegativeToInteger(nonnegativeDecimalLiteral))

let integerLiteral = alternative_(hexLiteral, binaryLiteral, octalLiteral, decimalLiteral)

let booleanLiteral: Parser<boolean> =
  token(bind(alternative_(string_('true'), string_('false'), string_('#t'), string_('#f')), got =>
    return_(got === 'true' || got == '#t')))

let symbol: Parser<string> =
  token(bind(symbolFirstChar, c =>
    bind(many(symbolOtherChar), cs =>
      return_(c + cs.join('')))))

let dottedSymbol: Parser<string[]> =
  token(bind(symbol, s =>
    bind(many(bind(token(char('.')), _ => symbol)), ss =>
      return_(Array.prototype.concat([s], ss)))))

// TIME LITERALS
class RelativeTime {
  constructor(public nonnegative: boolean = true,
              public days: number = 0, public hours: number = 0, public minutes: number = 0,
              public seconds: number = 0, public milliseconds: number = 0, public microseconds: number = 0) {
  }

  [key: string]: any;

  toMicroseconds(): number {
    return (this.microseconds + 10**3 * this.milliseconds + 10**6 * this.seconds +
           60*10**6 * this.minutes + 60*60*10**6 * this.hours + 24*60*60*10**6 * this.days)
  }

  copy(): RelativeTime {
    return new RelativeTime(this.nonnegative, this.days, this.hours, this.minutes, this.seconds, this.milliseconds, this.microseconds)
  }

  plus(...args: RelativeTime[]): RelativeTime {
    let ret = this.copy()
    for (let i in args) {
      let sign = args[i].nonnegative ? 1 : (-1)
      ret.days += sign * args[i].days
      ret.hours += sign * args[i].hours
      ret.minutes += sign * args[i].minutes
      ret.seconds += sign * args[i].seconds
      ret.milliseconds += sign * args[i].milliseconds
      ret.microseconds += sign * args[i].microseconds
    }
    return ret
  }
}

let days         = bind(nonnegative, n => bind(string_('d'),  _ => return_(new RelativeTime(true, n))))
let hours        = bind(nonnegative, n => bind(string_('h'),  _ => return_(new RelativeTime(true, 0, n))))
let minutes      = bind(nonnegative, n => bind(string_('m'),  _ => return_(new RelativeTime(true, 0, 0, n))))
let seconds      = bind(nonnegative, n => bind(string_('s'),  _ => return_(new RelativeTime(true, 0, 0, 0, n))))
let milliseconds = bind(nonnegative, n => bind(string_('ms'), _ => return_(new RelativeTime(true, 0, 0, 0, 0, n))))
let microseconds = bind(nonnegative, n => bind(string_('us'), _ => return_(new RelativeTime(true, 0, 0, 0, 0, 0, n))))

function all<A>(pred: (_:A)=>boolean, xs: A[]): boolean {
  for (let i in xs) {
    if (!pred(xs[i])) return false
  }
  return true
}

let nonnegativeTimeLiteral: Parser<RelativeTime> =
  bind(optional(days), d =>
    bind(optional(hours), h =>
      bind(optional(minutes), m =>
        bind(optional(seconds), s =>
          bind(optional(milliseconds), ms =>
            bind(optional(microseconds), us => 
              (()=>{
                let results: (RelativeTime|null)[] = [d,h,m,s,ms,us]
                if (!any(x => x !== null, results)) return empty
                let rt = new RelativeTime(true)
                for (let i in results)
                  if (results[i] !== null) rt = rt.plus(results[i] as RelativeTime)
                return pure(rt)
              })()))))))

let timeLiteral: Parser<RelativeTime> =
  alternative(
    nonnegativeTimeLiteral,
    bind(char('-'), _ => bind(nonnegativeTimeLiteral, rt =>
      return_((()=>{ rt.nonnegative = false; return rt })()))))
// /TIME LITERALS

// expressions

enum Type {
  Or = '∨', And = '∧', Exp = '^', Not = 'not', Add = '+', Sub = '-', Div = '/', Mul = '*',
  NumberLiteral = 'number', BooleanLiteral = 'bool', Parens = 'begin',
  Match = '~', Eq = '=', Leq = '≤', Geq = '≥', Lt = '<', Gt = '>',
  DottedSymbolLiteral = 'symbol', FunctionCall = 'apply', RelativeTimeLiteral = 'time',
}

function printNode(n: { type_: Type }, useIndent=false, firstInvocation=true, indent=0) {
  // XXX process.stdout.write works only in node, not browsers' JS

  if (any(x => x === n.type_, [Type.Or, Type.And, Type.Exp, Type.Add, Type.Sub, Type.Mul, Type.Div,
                               Type.Match, Type.Eq, Type.Lt, Type.Leq, Type.Gt, Type.Geq])) {
    process.stdout.write('(' + n.type_ + ' ')
    if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
    printNode((n as {type_: any, a: { type_: Type }}).a, useIndent, false, indent+2)
    if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
    else process.stdout.write(' ')
    printNode((n as {type_: any, b: { type_: Type }}).b, useIndent, false, indent+2)
    process.stdout.write(')')
  } else if (any(x => x === n.type_, [Type.Not, Type.Parens])) {
    process.stdout.write('(' + n.type_ + ' ')
    if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
    printNode((n as {type_: any, e: { type_: Type }}).e, useIndent, false, indent+2)
    process.stdout.write(')')
  } else if (any(x => x === n.type_, [Type.NumberLiteral, Type.BooleanLiteral])) {
    process.stdout.write(`${(n as {type_: any, e: any}).e}`)
  } else if (n.type_ == Type.DottedSymbolLiteral) {
    process.stdout.write(`#${(n as {type_: any, e: any[]}).e.join('.')}`)
  } else if (n.type_ == Type.FunctionCall) {
    let n1 = n as {type_: any, name: DottedSymbolLiteral, args: { [x: string]: { type_: Type } }}
    process.stdout.write('(' + n.type_ + ' ' + `#${n1.name.e.join('.')}`)
    for (let i in n1.args) {
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      else process.stdout.write(' ')
      printNode(n1.args[i], useIndent, false, indent+2)
    }
    process.stdout.write(')')
  } else if (n.type_ == Type.RelativeTimeLiteral) {
    let n1 = n as RelativeTimeLiteral
    let got = ['days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds'].map(name => n1.e[name] ? `${name}: ${n1.e[name]}` : '').filter(s => s !== '').join(', ')
    process.stdout.write(`(time ${n1.e.nonnegative ? '+' : '-'}{ ${got} }`)
  } else {
    assert(false, 'Add printing rule for the newly added expression type!')
  }
  if (firstInvocation) process.stdout.write('\n')
}

class FunctionCall { type_ = Type.FunctionCall; constructor(public name: DottedSymbolLiteral, public args: OrExpr[]){} }
class DottedSymbolLiteral { type_ = Type.DottedSymbolLiteral; constructor(public e: string[]){} }
class RelativeTimeLiteral { type_ = Type.RelativeTimeLiteral; constructor(public e: RelativeTime){} }
class NumberLiteral { type_ = Type.NumberLiteral; constructor(public e: number){} }
class BooleanLiteral { type_ = Type.BooleanLiteral; constructor(public e: boolean){} }
class Parens { type_ = Type.Parens; constructor(public e: OrExpr){} }
class Exp { type_ = Type.Exp; constructor(public a: Expr, public b: Expr){} }
class Mul { type_ = Type.Mul; constructor(public a: Expr, public b: Expr){} }
class Div { type_ = Type.Div; constructor(public a: Expr, public b: Expr){} }
class Add { type_ = Type.Add; constructor(public a: Expr, public b: Expr){} }
class Sub { type_ = Type.Sub; constructor(public a: Expr, public b: Expr) {} }

class Match { type_ = Type.Match; constructor(public a: Expr, public b: RelExp) {} }
class Lt { type_ = Type.Lt; constructor(public a: Expr, public b: RelExp) {} }
class Leq { type_ = Type.Leq; constructor(public a: Expr, public b: RelExp) {} }
class Eq { type_ = Type.Eq; constructor(public a: Expr, public b: RelExp) {} }
class Geq { type_ = Type.Geq; constructor(public a: Expr, public b: RelExp) {} }
class Gt { type_ = Type.Gt; constructor(public a: Expr, public b: RelExp) {} }

class Not { type_ = Type.Not;  constructor(public e: OrExpr){} }
class Or { type_ = Type.Or; constructor(public a: OrExpr, public b: OrExpr){} }
class And { type_ = Type.And; constructor(public a: OrExpr, public b: OrExpr){} }

type Factor = RelativeTimeLiteral | FunctionCall | DottedSymbolLiteral | NumberLiteral | BooleanLiteral | Parens
type ExpFactor = Exp | Factor
type Term = ExpFactor | Mul | Div
type Expr = Term | Add | Sub
type RelExp = Expr | Match | Lt | Leq | Eq | Gt | Geq
type NotExpr = RelExp | Not
type AndExpr = NotExpr | And
type OrExpr = AndExpr | Or

function orExpr(sv: StringView): [OrExpr, StringView][] {
  return (
    alternative(
      bind(andExpr, ae1 => bind(token(string_('or')), _ => bind(andExpr, ae2 => return_(new Or(ae1, ae2))))),
      andExpr))(sv)
}

function andExpr(sv: StringView): [AndExpr, StringView][] {
  return (
    alternative(
      bind(notExpr, ne1 => bind(token(string_('and')), _ => bind(notExpr, ne2 => return_(new And(ne1, ne2))))),
      notExpr))(sv)
}

function notExpr(sv: StringView): [NotExpr, StringView][] {
  return (
    alternative(
      bind(token(string_('not')), _ => bind(relExpr, e => return_(new Not(e)))),
      relExpr))(sv)
}

function relExpr(sv: StringView): [RelExp, StringView][] {
  return (
    bind(expr, e1 =>
      alternative(bind(token(string_('~')), _ => bind(relExpr, e2 => return_(new Match(e1,e2)))),
        alternative(bind(token(string_('=')), _ => bind(relExpr, e2 => return_(new Eq(e1, e2)))),
          alternative(bind(token(string_('<')), _ => bind(relExpr, e2 => return_(new Lt(e1, e2)))),
            alternative(bind(token(string_('<=')), _ => bind(relExpr, e2 => return_(new Leq(e1, e2)))),
              alternative(bind(token(string_('>')), _ => bind(relExpr, e2 => return_(new Gt(e1, e2)))),
                alternative(bind(token(string_('>=')), _ => bind(relExpr, e2 => return_(new Geq(e1, e2)))),
                  return_(e1))))))))
  )(sv)
}

function expr(sv: StringView): [Expr, StringView][] {
  return (
    bind(term, t =>
      alternative(
        bind(token(string_('+')), _ => bind(expr, e => return_(new Add(t, e)))),
        alternative(bind(token(string_('-')), _ => bind(expr, e => return_(new Sub(t, e)))),
                    return_(t)))))(sv)
}

function term(sv: StringView): [Term, StringView][] {
  return (
  bind(expFactor, ef =>
    alternative(
      bind(token(string_('*')), _ =>
        bind(term, t =>
          return_(new Mul(ef,t)))),
      alternative(
        bind(token(string_('/')), _ =>
          bind(term, t =>
            return_(new Div(ef, t)))),
        return_(ef)))))(sv)
}

function expFactor(sv: StringView): [ExpFactor, StringView][] {
  return (
  bind(factor, f =>
    alternative(
      bind(token(string_('^')), _ => bind(expFactor, ef => return_(new Exp(f,ef)))),  // XXX associativity!
      return_(f))))(sv)
}

function factor(sv: StringView): [Factor, StringView][] {
  return (
    alternative(
      bind(token(char('(')), _ => bind(orExpr, oe => bind(token(char(')')), _ => return_(new Parens(oe))))),
      alternative(
        bind(token(timeLiteral), tl => return_(new RelativeTimeLiteral(tl))),  // XXX TODO fix the alternatives!
        alternative(
          bind(token(integerLiteral), n => return_(new NumberLiteral(n))),
          alternative(
            bind(token(booleanLiteral), b => return_(new BooleanLiteral(b))),
            alternative( // TODO wyciągnąć dottedSymbol przed alternative
              bind(token(dottedSymbol), ss =>
                bind(token(string_('(')), _ =>
                  alternative(
                    bind(token(string_(')')), _ => return_(new FunctionCall(new DottedSymbolLiteral(ss), []))),
                    bind(orExpr, e1 =>
                      bind(many(bind(token(string_(',')), _ => bind(orExpr, ei => return_(ei)))), args =>
                        bind(token(string_(')')), _ =>
                          return_(new FunctionCall(new DottedSymbolLiteral(ss), Array.prototype.concat([e1], args))))))))),
              bind(token(dottedSymbol), ss => return_(new DottedSymbolLiteral(ss))))))))
    )(sv)
}

// TESTS

console.log(parse(item, new StringView("")))
console.log(parse(item, new StringView("abc")))
console.log(parse(pure(1), new StringView("abc")))

let selectFirstAndThird = curry((a: StringView,b: StringView,c: StringView) => [a,c])
let z = liftA2(liftA2(liftA2(pure(selectFirstAndThird), item), item), item)
console.log(parse(z, new StringView("abcd")))
console.log(parse(z, new StringView("ad")))

let three = bind(item, a => bind(
                 item, _ => bind(
                 item, c => pure([a,c]))))
console.log(parse(three, new StringView("abcde")))

console.log(parse(alternative(empty, pure('d')), new StringView("abc")))
console.log(parse(alternative(pure('d'), empty), new StringView("abc")))

console.log(parse(string_("abba"), new StringView("abba ojcze")))

console.log(parse(binaryLiteral, new StringView("0b10101 + 10")))
console.log(parse(hexLiteral, new StringView("0xab31 + 10")))

console.log('-----')
console.log(parse(binaryDigit, new StringView("abc")))
console.log(parse(some(binaryDigit), new StringView("01")))
console.log(parse(binaryDigit, new StringView("10")))
console.log(parse(binaryDigit, new StringView("1x")))
console.log(parse(binaryDigit, new StringView("0x")))
console.log(parse(symbol, new StringView('new_Name10 = 10')))
console.log(parse(dottedSymbol, new StringView('camelCase.c_style.a2 = 10')))
console.log(parse(hexLiteral, new StringView('-0xf')))

console.log('---------')
console.log(parse(booleanLiteral, new StringView('true')))
console.log(parse(booleanLiteral, new StringView('false')))
console.log(parse(booleanLiteral, new StringView('0')))
console.log(parse(booleanLiteral, new StringView('1')))

console.log('---------')
console.log(parse(timeLiteral, new StringView('10h5m')))
console.log(parse(timeLiteral, new StringView('-2d')))

console.log('---------')
printNode(parse(orExpr, new StringView('1 + 2 * 3^0x10^1'))[0][0], true)
printNode(parse(orExpr, new StringView('1 + 2 + 3 * 4 + 5'))[0][0], true)
printNode(parse(orExpr, new StringView('#f and  module.a <= 10 or not x.y.z > 2^10-c'))[0][0], true)
printNode(parse(orExpr, new StringView('line.content ~ someRegexp and pid >= 0x30ff'))[0][0], true)
printNode(parse(orExpr, new StringView('Math.abs(line.pid - 10) <= 10'))[0][0], true)
printNode(parse(orExpr, new StringView('abs(time.now() - line.time) <= 1h30m and (1 + 2)*3'))[0][0], true)
printNode(parse(orExpr, new StringView('console.log(1+2, false, 1m30s7us)'))[0][0], true)

