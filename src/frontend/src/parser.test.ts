import {Parser} from "./parser";


export function printNode(n: { type_: Parser.Type }, useIndent=false, firstInvocation=true, indent=0) {
    // XXX process.stdout.write works only in node, not browsers' JS

    if (Parser.any(x => x === n.type_, [Parser.Type.Or, Parser.Type.And, Parser.Type.Exp, Parser.Type.Add, Parser.Type.Sub, Parser.Type.Mul, Parser.Type.Div,
        Parser.Type.Match, Parser.Type.Eq, Parser.Type.Lt, Parser.Type.Leq, Parser.Type.Gt, Parser.Type.Geq])) {
      process.stdout.write('(' + n.type_ + ' ')
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      printNode((n as {type_: any, a: { type_: Parser.Type; }}).a, useIndent, false, indent+2)
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      else process.stdout.write(' ')
      printNode((n as {type_: any, b: { type_: Parser.Type; }}).b, useIndent, false, indent+2)
      process.stdout.write(')')
    } else if (Parser.any(x => x === n.type_, [Parser.Type.Not, Parser.Type.Parens])) {
      process.stdout.write('(' + n.type_ + ' ')
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      printNode((n as {type_: any, e: { type_: Parser.Type; }}).e, useIndent, false, indent+2)
      process.stdout.write(')')
    } else if (Parser.any(x => x === n.type_, [Parser.Type.NumberLiteral, Parser.Type.BooleanLiteral])) {
      process.stdout.write(`${(n as {type_: any, e: any}).e}`)
    } else if (n.type_ == Parser.Type.DottedSymbolLiteral) {
      process.stdout.write(`#${(n as {type_: any, e: any[]}).e.join('.')}`)
    } else if (n.type_ == Parser.Type.FunctionCall) {
      let n1 = n as {type_: any, name: Parser.DottedSymbolLiteral, args: { [x: string]: { type_: Parser.Type; }; }}
      process.stdout.write('(' + n.type_ + ' ' + `#${n1.name.e.join('.')}`)
      for (let i in n1.args) {
        if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
        else process.stdout.write(' ')
        printNode(n1.args[i], useIndent, false, indent+2)
      }
      process.stdout.write(')')
    } else if (n.type_ == Parser.Type.RelativeTimeLiteral) {
      let n1 = n as Parser.RelativeTimeLiteral
      let got = ['days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds'].map(name => n1.e[name] ? `${name}: ${n1.e[name]}` : '').filter(s => s !== '').join(', ')
      process.stdout.write(`(time ${n1.e.nonnegative ? '+' : '-'}{ ${got} }`)
    } else {
        Parser.assert(false, 'Add printing rule for the newly added expression type!')
    }
    if (firstInvocation) process.stdout.write('\n')
  }


describe('StringViev + item + pure', function(){
  it('Empty', function(){
    const a = Parser.parse(Parser.item, new Parser.StringView(""))
    expect(a).toHaveLength(0);
  })
  it('item', function() {
    const b = Parser.parse(Parser.item, new Parser.StringView("abc"))[0]
    expect(b[0]).toEqual('a');
    expect(b[1].toString()).toEqual('bc');
  })
  it('pure', function() {
    const b = Parser.parse(Parser.pure(1), new Parser.StringView("abc"))[0]
    expect(b[0]).toEqual(1);
    expect(b[1].toString()).toEqual('abc');
  })
})


describe('curry + bind + alternative', function(){
  it('curry', function(){
    let selectFirstAndThird = Parser.curry((a: any,b: any,c: any) => [a,c])
    let z = Parser.liftA2(Parser.liftA2(Parser.liftA2(Parser.pure(selectFirstAndThird), Parser.item), Parser.item), Parser.item)
    let a = Parser.parse(z, new Parser.StringView("abcd"))[0]
    let b = Parser.parse(z, new Parser.StringView("ad"))
    //console.log(a[0]) //tu jest problem z typemi, nie rozumiem lift wiec nwm czy to problem
    expect(a[1].toString()).toEqual('d');
    expect(b).toHaveLength(0);
  })
  it('bind', function() {
        let three = Parser.bind(Parser.item, a => Parser.bind(
          Parser.item, _ => Parser.bind(
          Parser.item, c => Parser.pure([a,c]))))
    let c = Parser.parse(three, new Parser.StringView("abcde"))[0]
    expect(c[0][0]=='a' && c[0][1]=='c').toBeTruthy();
    expect(c[1].toString()).toEqual('de');
  })
  it('alternative', function() {
    const a = Parser.parse(Parser.alternative(Parser.empty, Parser.pure('d')), new Parser.StringView("abc"))[0]
    expect(a[0]).toEqual('d');
    expect(a[1].toString()).toEqual('abc');

    const b = Parser.parse(Parser.alternative(Parser.pure('d'), Parser.empty), new Parser.StringView("abc"))[0]
    expect(b[0]).toEqual('d');
    expect(b[1].toString()).toEqual('abc');
  })
})


describe('basic types', function(){
  it('string_ + number literals', function(){
    const a = Parser.parse(Parser.string_("ala"), new Parser.StringView("ala ma kota"))[0]
    expect(a[0]).toEqual('ala');
    expect(a[1].toString()).toEqual(' ma kota');

    const b = Parser.parse(Parser.binaryLiteral, new Parser.StringView("0b10101 + 10"))[0]
    expect(b[0]).toEqual(0b10101);
    expect(b[1].toString()).toEqual("+ 10");

    const c = Parser.parse(Parser.hexLiteral, new Parser.StringView("0xab31      + 10"))[0]
    expect(c[0]).toEqual(0xab31);
    expect(c[1].toString()).toEqual("+ 10");

    const d = Parser.parse(Parser.hexLiteral, new Parser.StringView('- 0xf'))[0]
    expect(d[0]).toEqual(-0xf);
    expect(d[1].toString()).toEqual("");
  })
  it('digits', function() {
    const a = Parser.parse(Parser.binaryDigit, new Parser.StringView("abc"))
    expect(a).toHaveLength(0);

    const b = Parser.parse(Parser.some(Parser.binaryDigit), new Parser.StringView("01"))[0]
    expect(b[0][0] == '0' && b[0][1] == '1').toBeTruthy();
    expect(b[1].toString()).toEqual("");

    const c = Parser.parse(Parser.binaryDigit, new Parser.StringView("0x"))[0]
    expect(c[0]).toEqual("0");
    expect(c[1].toString()).toEqual("x");

  })
  it('symbol', function() {
    const a = Parser.parse(Parser.symbol, new Parser.StringView('new_Name10= 10'))[0]
    expect(a[0]).toEqual('new_Name10');
    expect(a[1].toString()).toEqual('= 10');

    const b = Parser.parse(Parser.dottedSymbol, new Parser.StringView('camelCase.c_style.a2    = 10'))[0]
    expect(b[0][0] == "camelCase" && b[0][1] =="c_style" && b[0][2] == "a2").toBeTruthy();
    expect(b[1].toString()).toEqual('= 10');
  })

  it('boolenLiteral + timeLiteral', function() {
    const a = Parser.parse(Parser.booleanLiteral, new Parser.StringView('true'))[0]
    expect(a[0]).toBeTruthy();
    expect(a[1].toString()).toEqual('');

    const b = Parser.parse(Parser.booleanLiteral, new Parser.StringView('#t'))[0]
    expect(b[0]).toBeTruthy();
    expect(b[1].toString()).toEqual("");

    const b1 = Parser.parse(Parser.timeLiteral, new Parser.StringView('5m 3 s'))[0]
    expect(b1[0].toMicroseconds()).toEqual((5*60+3)*1000000);
    expect(b1[1].toString()).toEqual("");

    const c = Parser.parse(Parser.timeLiteral, new Parser.StringView('5ms 3 us'))[0]
    console.log(c) //TODO poprawic ms traktuje jak m i konczy parsowanie
    expect(c[0].toMicroseconds()).toEqual(5003);
    expect(c[1].toString()).toEqual("");

    const d = Parser.parse(Parser.timeLiteral, new Parser.StringView('-3 us'))[0]
    expect(d[0].toMicroseconds()).toEqual(-3);
    expect(d[1].toString()).toEqual("");
  })
})




// console.log('---------')
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('1 + 2 * 3^0x10^1'))[0][0], true)
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('1 + 2 + 3 * 4 + 5'))[0][0], true)
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('#f and  module.a <= 10 or not x.y.z > 2^10-c'))[0][0], true)
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('line.content ~ someRegexp and pid >= 0x30ff'))[0][0], true)
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('Math.abs(line.pid - 10) <= 10'))[0][0], true)
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('abs(time.now() - line.time) <= 1h30m and (1 + 2)*3'))[0][0], true)
// printNode(Parser.parse(Parser.orExpr, new Parser.StringView('console.log(1+2, false, 1m 30   s 7us)'))[0][0], true)
printNode(Parser.parse(Parser.orExpr, new Parser.StringView('a+b+c'))[0][0], true)

