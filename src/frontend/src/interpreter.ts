import {Parser} from "./parser";
import {ParseEvent} from "./types";


// XXX all these errors result in the predicate being false, this will allow eg. fd = 2 or childPid = 100
export class TypeError {constructor(public what:string="Type error"){} }
export class UnimplementedError {constructor(public what:string="This behavior is not yet implemented."){} }
export class NoSuchName {constructor(public what:string="This name cannot be retrieved"){} }
export class WrongTypeOfEvent {constructor(public what:string="This action cannot be performed on this event type"){} }


function assert(cond: boolean, what: string = "") { if (!cond) throw "Assertion error: " + what; }

function eval_maybe_bool(e: any, pe: ParseEvent): any {
    try {
        let got = eval_(e, pe);
        return got;
    } catch (e) {
        if (e instanceof WrongTypeOfEvent) {
            return false;
        } else {
            throw e;
        }
    }
}

export function eval_(e: any, pe: ParseEvent): any {
    if (e.type_ === Parser.Type.Parens) {
        return eval_(e.e, pe);
    } else if ([Parser.Type.NumberLiteral, Parser.Type.BooleanLiteral, Parser.Type.RelativeTimeLiteral, Parser.Type.StringLiteral].includes(e.type_)) {
        return e.e;
    } else if ([Parser.Type.Not].includes(e.type_)) {
        let value = eval_maybe_bool(e.e, pe);
        if (typeof value !== "boolean") {
            throw new TypeError("Not needs boolean and not " + (typeof value));
        }
        return !value;
    } else if ([Parser.Type.And, Parser.Type.Or].includes(e.type_)) {
        // XXX extra important! Bez leniwej evaluacji nie można będzie zrobić np (fd = 2) or (childPid = 100) bo jedno z nich zawsze się wywali!
        let v_a = eval_maybe_bool(e.a, pe);
        if (typeof v_a !== "boolean") {
            throw new TypeError(((e.type_ === Parser.Type.Or) ? "Or" : "And") + " needs a boolean as its first argument and not " + (typeof v_a));
        }
        if (e.type_ === Parser.Type.And) {
            if (!v_a) return false;
        } else if (e.type_ === Parser.Type.Or) {
            if (v_a) return true;
        } else assert(false, "sdf64343");

        let v_b = eval_maybe_bool(e.b, pe);
        if (typeof v_b !== "boolean") {
            throw new TypeError(((e.type_ === Parser.Type.Or) ? "Or" : "And") + " needs a boolean as its second argument and not " + (typeof v_b));
        }
        if (e.type_ === Parser.Type.And) {
            return (v_a && v_b);
        } else if (e.type_ === Parser.Type.Or) {
            return (v_a || v_b);
        } else assert(false, "ds4622");
    } else if ([Parser.Type.Exp, Parser.Type.Mul, Parser.Type.Div].includes(e.type_)) {
        let v_a = eval_(e.a, pe);
        let v_b = eval_(e.b, pe);
        if (typeof v_a !== "number" || typeof v_b !== "number") {
            throw new TypeError("^, * and / need two numbers and not " + (typeof v_a) + " and " + (typeof v_b));
        }
        if (e.type_ === Parser.Type.Exp) return Math.pow(v_a, v_b);
        if (e.type_ === Parser.Type.Mul) return v_a*v_b;
        if (e.type_ === Parser.Type.Div) return v_a/v_b;
        else assert(false, "45623");
    } else if ([Parser.Type.Add, Parser.Type.Sub].includes(e.type_)) {
        let v_a = eval_(e.a, pe);
        let v_b = eval_(e.b, pe);
        if (typeof v_a === "number" && typeof v_b === "number") {
        } else if (v_a instanceof Parser.RelativeTime && v_b instanceof Parser.RelativeTime) {
        } else {
            throw new TypeError("+ and - need two numbers (or relative time offsets) and not " + (typeof v_a) + " and " + (typeof v_b));
        }
        if (typeof v_a === "number" && typeof v_b === "number") {
            if (e.type_ === Parser.Type.Add) return v_a + v_b; 
            else if (e.type_ === Parser.Type.Sub) return v_a - v_b; 
            else assert(false, "65543");
        } else if (v_a instanceof Parser.RelativeTime && v_b instanceof Parser.RelativeTime) {
            if (e.type_ === Parser.Type.Add) {
                return v_a.plus(v_b);
            } else if (e.type_ === Parser.Type.Sub) {
                let v_b_copy = v_b.copy();
                v_b_copy.nonnegative = !v_b_copy.nonnegative;
                return v_a.plus(v_b_copy);
            } else assert(false, "84543");
        } else assert(false, "73454");
    } else if ([Parser.Type.Lt, Parser.Type.Leq, Parser.Type.Eq, Parser.Type.Geq, Parser.Type.Gt].includes(e.type_)) {
        let v_a = eval_(e.a, pe);
        let v_b = eval_(e.b, pe);
        if (typeof v_a === "number" && typeof v_b === "number") {
        } else if (v_a instanceof Parser.RelativeTime && v_b instanceof Parser.RelativeTime) {
        } else {
            throw new TypeError("Any relative operation needs two numbers (or relative time offsets) and not " + (typeof v_a) + " and " + (typeof v_b));
        }
        
        let v_a_ = 0, v_b_ = 0;
        if (v_a instanceof Parser.RelativeTime && v_b instanceof Parser.RelativeTime) {
            v_a_ = v_a.toMicroseconds();
            v_b_ = v_b.toMicroseconds();
        } else if (typeof v_a === "number" && typeof v_b === "number") {
            v_a_ = v_a;
            v_b_ = v_b;
        } else assert(false, "types are " + (typeof v_a) + " and " + (typeof v_b));

        if (e.type_ === Parser.Type.Lt) return v_a_ < v_b_;
        else if (e.type_ === Parser.Type.Leq) return v_a_ <= v_b_;
        else if (e.type_ === Parser.Type.Eq) return v_a_ == v_b_;
        else if (e.type_ === Parser.Type.Geq) return v_a_ >= v_b_;
        else if (e.type_ === Parser.Type.Gt) return v_a_ > v_b_;
        else assert(false, "sedond place " + e.type_);
    } else if (e.type_ === Parser.Type.Match) {
        let v_a = eval_(e.a, pe);
        let v_b = eval_(e.b, pe);
        if (typeof v_a !== "string" && typeof v_b !== "string") {
            throw new TypeError("~ needs two strings and not " + (typeof v_a) + " and " + (typeof v_b));
        }
        let matches = v_a.match(v_b);
        if (matches === null) return false;
        else return true;
    } else if (e.type_ === Parser.Type.FunctionCall) {
        let v_name = eval_(e.name, pe);
        if (!(v_name && Object.prototype.toString.call(v_name) === "[object Function]")) {
            throw new TypeError("Name to be called with arguments must be a function and " + Object.prototype.toString.call(v_name) + " is not");
        }
        let v_args = e.args.map((arg: any) => eval_(arg, pe));
        return v_name.apply(null, v_args);
    } else if (e.type_ === Parser.Type.DottedSymbolLiteral) {
        let names = e.e;
        assert(names.length > 0, "as23141");
        if (names.length == 1 && ["pid", "type", "child_pid", "ret", "fd", "text", "signal"].includes(names[0])) {
            if (names[0] == "pid") {
                return parseInt("" + pe.pid);
            } else if (names[0] == "type") {
                return pe.eventType;
            } else if (names[0] == "child_pid") {
                if ("childPid" in pe) return parseInt(pe["childPid"]);
                else throw new WrongTypeOfEvent();
            } else if (names[0] == "ret") {
                if ("returnValue" in pe) return parseInt(pe["returnValue"]);
                else throw new WrongTypeOfEvent();
            } else if (names[0] == "fd") {
                if ("fd" in pe) return parseInt(pe["fd"]);
                else throw new WrongTypeOfEvent();
            } else if (names[0] == "text") {
                if ("content" in pe) return pe["content"];
                else throw new WrongTypeOfEvent();
            } else if (names[0] == "signal") {
                if ("signalName" in pe) return pe["signalName"];
                else throw new WrongTypeOfEvent();
            } else assert(false, "as1223" + ">" + names[0] + "<");
        } else { // general search
            let currentObject: any = window;
            for (let i = 0; i < names.length; i++) {
                if (names[i] in currentObject) {
                    currentObject = currentObject[names[i]];
                } else {
                    throw new NoSuchName("Name cannot be evaluated:" + names.toString());
                }
            }
            return currentObject;
        }
    } else {
        console.error('unimplemented:', e);
        throw new UnimplementedError();
    }
}

