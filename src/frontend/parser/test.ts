//instalacja pakietu do testow 
//sudo npm i --save-dev @types/mocha 
//sudo apt install mocha
// kompilacja `tsc -t es5 --strictNullChecks test.ts` a potem odpalanie odpalanie przez `mocha` z folderu parser 


import {Parser} from "./parser";


export function printNode(n: { type_: Parser.Type }, useIndent=false, firstInvocation=true, indent=0) {
    // XXX process.stdout.write works only in node, not browsers' JS
  
    if (Parser.any(x => x === n.type_, [Parser.Type.Or, Parser.Type.And, Parser.Type.Exp, Parser.Type.Add, Parser.Type.Sub, Parser.Type.Mul, Parser.Type.Div,
        Parser.Type.Match, Parser.Type.Eq, Parser.Type.Lt, Parser.Type.Leq, Parser.Type.Gt, Parser.Type.Geq])) {
      process.stdout.write('(' + n.type_ + ' ')
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      printNode((n as {type_, a}).a, useIndent, false, indent+2)
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      else process.stdout.write(' ')
      printNode((n as {type_, b}).b, useIndent, false, indent+2)
      process.stdout.write(')')
    } else if (Parser.any(x => x === n.type_, [Parser.Type.Not, Parser.Type.Parens])) {
      process.stdout.write('(' + n.type_ + ' ')
      if (useIndent) process.stdout.write('\n' + ' '.repeat(indent+2))
      printNode((n as {type_, e}).e, useIndent, false, indent+2)
      process.stdout.write(')')
    } else if (Parser.any(x => x === n.type_, [Parser.Type.NumberLiteral, Parser.Type.BooleanLiteral])) {
      process.stdout.write(`${(n as {type_, e}).e}`)
    } else if (n.type_ == Parser.Type.DottedSymbolLiteral) {
      process.stdout.write(`#${(n as {type_, e}).e.join('.')}`)
    } else if (n.type_ == Parser.Type.FunctionCall) {
      let n1 = n as {type_, name: Parser.DottedSymbolLiteral, args}
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


var assert = require('assert');


describe('StringViev + item + pure', function(){
  it('Empty', function(){
    var a = Parser.parse(Parser.item, new Parser.StringView(""))
    assert.ok(a.length== 0)
  })
  it('item', function() {
    var b = Parser.parse(Parser.item, new Parser.StringView("abc"))[0]
    assert.ok(b[0] == 'a')
    assert.ok(b[1].toString() == "bc")
  })
  it('pure', function() {
    var b = Parser.parse(Parser.pure(1), new Parser.StringView("abc"))[0]
    assert.ok(b[0] == 1)
    assert.ok(b[1].toString() == "abc")
  })
})


describe('curry + bind + alternative', function(){
  it('curry', function(){
    let selectFirstAndThird = Parser.curry((a,b,c) => [a,c])
    let z = Parser.liftA2(Parser.liftA2(Parser.liftA2(Parser.pure(selectFirstAndThird), Parser.item), Parser.item), Parser.item)
    let a = Parser.parse(z, new Parser.StringView("abcd"))[0]
    let b = Parser.parse(z, new Parser.StringView("ad"))
    //console.log(a[0]) //tu jest problem z typemi, nie rozumiem lift wiec nwm czy to problem
    assert.ok(a[1].toString() == "d")
    assert.ok(b.length == 0)
  })
  it('bind', function() {
        let three = Parser.bind(Parser.item, a => Parser.bind(
          Parser.item, _ => Parser.bind(
          Parser.item, c => Parser.pure([a,c]))))
    let c = Parser.parse(three, new Parser.StringView("abcde"))[0]
    assert.ok(c[0][0]=='a' && c[0][1]=='c')
    assert.ok(c[1].toString() == "de")
  })
  it('alternative', function() {
    var a = Parser.parse(Parser.alternative(Parser.empty, Parser.pure('d')), new Parser.StringView("abc"))[0]
    assert.ok(a[0] == "d")
    assert.ok(a[1].toString() == "abc")

    var b = Parser.parse(Parser.alternative(Parser.pure('d'), Parser.empty), new Parser.StringView("abc"))[0]
    assert.ok(b[0] == "d")
    assert.ok(b[1].toString() == "abc")    
  })
})


describe('basic types', function(){
  it('string_ + number literals', function(){
    var a = Parser.parse(Parser.string_("ala"), new Parser.StringView("ala ma kota"))[0]
    assert.ok(a[0] == "ala")
    assert.ok(a[1].toString() == " ma kota")

    var b = Parser.parse(Parser.binaryLiteral, new Parser.StringView("0b10101 + 10"))[0]
    assert.ok(b[0] == 0b10101)
    assert.ok(b[1].toString() == "+ 10")

    var c = Parser.parse(Parser.hexLiteral, new Parser.StringView("0xab31      + 10"))[0]
    assert.ok(c[0] == 0xab31)
    assert.ok(c[1].toString() == "+ 10")

    var d = Parser.parse(Parser.hexLiteral, new Parser.StringView('- 0xf'))[0]
    assert.ok(d[0] == -0xf)
    assert.ok(d[1].toString() == "")
  })
  it('digits', function() {
    var a = Parser.parse(Parser.binaryDigit, new Parser.StringView("abc"))
    assert.ok(a.length == 0)

    var b = Parser.parse(Parser.some(Parser.binaryDigit), new Parser.StringView("01"))[0]
    assert.ok(b[0][0] == '0' && b[0][1] == '1')
    assert.ok(b[1].toString() == "")

    var c = Parser.parse(Parser.binaryDigit, new Parser.StringView("0x"))[0]
    assert.ok(c[0] == "0")
    assert.ok(c[1].toString() == "x")

  })
  it('symbol', function() {
    var a = Parser.parse(Parser.symbol, new Parser.StringView('new_Name10= 10'))[0]
    assert.ok(a[0] == "new_Name10")
    assert.ok(a[1].toString() == "= 10")

    var b = Parser.parse(Parser.dottedSymbol, new Parser.StringView('camelCase.c_style.a2    = 10'))[0]
    assert.ok(b[0][0] == "camelCase" && b[0][1] =="c_style" && b[0][2] == "a2")
    assert.ok(b[1].toString() == "= 10")    
  })

  it('boolenLiteral + timeLiteral', function() {
    var a = Parser.parse(Parser.booleanLiteral, new Parser.StringView('true'))[0]
    assert.ok(a[0] == true)
    assert.ok(a[1].toString() == "")

    var b = Parser.parse(Parser.booleanLiteral, new Parser.StringView('#t'))[0]
    assert.ok(b[0] == true)
    assert.ok(b[1].toString() == "")  
    
    var c = Parser.parse(Parser.timeLiteral, new Parser.StringView('5ms 3 us'))[0]
    console.log(c) //TODO poprawic ms traktuje jak m i konczy parsowanie
    assert.ok(c[0].toMicroseconds() == 5003)
    assert.ok(c[1].toString() == "") 

    var d = Parser.parse(Parser.timeLiteral, new Parser.StringView('-3 us'))[0]
    assert.ok(d[0].toMicroseconds() ==-3)
    assert.ok(d[1].toString() == "")
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

