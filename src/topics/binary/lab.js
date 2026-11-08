// Binary Numbers Lab: step-by-step simulator (pure, no DOM) and SVG renderer.
// Every operation runs the Python algorithm in JS and records a "scene" after each step:
// a place-value row, a few aligned rows of bits, an optional table (the division ladder,
// running sums) and a note. The renderer at the bottom only draws those scenes.

export const LIMITS = {maxN: 4095, maxLen: 12, minT: -128, maxT: 127};

// ---------- small helpers (no toString(2): the lab computes bits the way it teaches) ----------
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const sup = (i) => String(i).split('').map((d) => SUP[d]).join('');
const plural = (n, w, ws) => `${n} ${n === 1 ? w : (ws || w + 's')}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const pyList = (a) => '[' + a.map((x) => `'${x}'`).join(', ') + ']';

/** Number of bits needed to write n (at least 1, so 0 is written "0"). */
export function bitLength(n) {
  let k = 0;
  while (n > 0) { n = Math.floor(n / 2); k++; }
  return Math.max(k, 1);
}
/** n as k cells, padded with '0' on the left. */
function padBits(n, k) {
  const a = Array(k).fill('0');
  for (let c = k - 1; n > 0 && c >= 0; c--) { a[c] = String(n % 2); n = Math.floor(n / 2); }
  return a;
}
/** n as k cells, right-aligned, leading places left blank (''). 0 is all blank. */
function sigBits(n, k) {
  const a = Array(k).fill('');
  for (let c = k - 1; n > 0 && c >= 0; c--) { a[c] = String(n % 2); n = Math.floor(n / 2); }
  return a;
}
const placeLabels = (k) => Array.from({length: k}, (_, c) => String(2 ** (k - 1 - c)));
const expLabels = (k) => Array.from({length: k}, (_, c) => '2' + sup(k - 1 - c));
/** k cells, list items left-aligned, the rest null (not drawn). */
const listCells = (items, k) => Array.from({length: k}, (_, c) => (c < items.length ? String(items[c]) : null));
const blank = (k) => Array(k).fill(null);

// ---------- code listings ----------
export const CODE = {
  div: [
    'def to_binary(n):',
    '    if n == 0:',
    '        return "0"',
    '    bits = []',
    '    while n > 0:',
    '        bits.append(str(n % 2))   # remainder = lowest bit',
    '        n //= 2',
    '    return "".join(reversed(bits))',
  ],
  bits: [
    'def to_binary_bits(n):',
    '    if n == 0:',
    '        return "0"',
    '    bits = []',
    '    while n > 0:',
    '        bits.append(str(n & 1))   # mask: keep the last bit',
    '        n >>= 1                   # shift: drop the last bit',
    '    return "".join(reversed(bits))',
  ],
  place: [
    'def to_decimal(s):',
    '    value = 0',
    '    for i, bit in enumerate(reversed(s)):',
    '        value += int(bit) * 2 ** i',
    '    return value',
  ],
  horner: [
    'def to_decimal_horner(s):',
    '    value = 0',
    '    for bit in s:',
    '        value = value * 2 + int(bit)   # shift left, add bit',
    '    return value',
  ],
  pop: [
    'def count_ones(n):',
    '    count = 0',
    '    while n:',
    '        n &= n - 1     # clear the lowest 1 bit',
    '        count += 1',
    '    return count',
  ],
  pow2: [
    'def is_power_of_two(n):',
    '    if n <= 0:',
    '        return False',
    '    return (n & (n - 1)) == 0',
  ],
  twos: [
    'def twos_complement(n, bits=8):',
    '    if not -2 ** (bits - 1) <= n < 2 ** (bits - 1):',
    '        raise ValueError("n does not fit in that many bits")',
    '    if n >= 0:',
    '        return to_binary(n).zfill(bits)',
    '    magnitude = to_binary(-n).zfill(bits)',
    '    flipped = "".join("1" if b == "0" else "0" for b in magnitude)',
    '    result = to_binary(int(flipped, 2) + 1)',
    '    return result   # 128..255, so always 8 digits',
  ],
};

// ---------- operations ----------
export const OPS = [
  {key: 'div', name: 'To binary: ÷ 2', big: 'O(log n)', input: 'n', def: 37,
   call: (n) => `to_binary(${n})`,
   sum: 'Divide by 2 again and again. Each remainder is the next bit, lowest first, so the list is read backwards at the end.'},
  {key: 'bits', name: 'To binary: & and >>', big: 'O(log n)', input: 'n', def: 37,
   call: (n) => `to_binary_bits(${n})`,
   sum: 'The same loop with bit operators: n & 1 reads the last bit, n >> 1 slides every bit one place right.'},
  {key: 'place', name: 'To decimal: place values', big: 'O(k)', input: 's', def: '100101',
   call: (s) => `to_decimal("${s}")`,
   sum: 'Add up bit × 2ⁱ for every position, where i counts from 0 at the right-hand end. k is the number of digits.'},
  {key: 'horner', name: 'To decimal: doubling', big: 'O(k)', input: 's', def: '100101',
   call: (s) => `to_decimal_horner("${s}")`,
   sum: 'Read left to right: double what you have and add the next bit. No powers needed (Horner\'s method).'},
  {key: 'pop', name: 'Count 1 bits', big: 'O(ones)', input: 'n', def: 44,
   call: (n) => `count_ones(${n})`,
   sum: 'n & (n - 1) wipes out the lowest 1 bit, so the loop runs once per 1 bit (Kernighan\'s trick).'},
  {key: 'pow2', name: 'Power of two?', big: 'O(1)', input: 'n', def: 16,
   call: (n) => `is_power_of_two(${n})`,
   sum: 'A power of two has exactly one 1 bit, so clearing the lowest 1 bit must leave 0.'},
  {key: 'twos', name: 'Negative: two\'s complement', big: 'O(bits)', input: 't', def: -37,
   call: (n) => `twos_complement(${n})`,
   sum: 'How a fixed 8-bit register stores a negative number: write |n| in 8 bits, flip every bit, add 1.'},
];

export const INPUTS = {
  n: {label: 'n (0 to 4095)', min: 0, max: LIMITS.maxN},
  s: {label: 'Bit string s (up to 12 digits)'},
  t: {label: 'n (−128 to 127)', min: LIMITS.minT, max: LIMITS.maxT},
};

// ---------- input parsing ----------
export function parseInt10(text, min, max) {
  const t = String(text).trim();
  if (!t) return {error: 'Type a whole number.'};
  if (/^[+-]?0[bxo]/i.test(t)) return {error: 'Type the number in decimal: no 0b / 0x prefix.'};
  if (!/^[+-]?\d+$/.test(t)) return {error: `"${t.slice(0, 12)}" is not a whole number.`};
  const v = parseInt(t, 10) + 0; // + 0 turns -0 into 0
  if (v < min || v > max) return {error: `Keep n between ${min} and ${max}${t.length > 9 ? '' : ` (got ${v})`}.`};
  return {value: v};
}
export function parseBits(text) {
  const t = String(text).replace(/\s+/g, '');
  if (!t) return {error: 'Type some 0s and 1s.'};
  if (/^0[bB]/.test(t)) return {error: 'Leave off the 0b prefix: these functions read plain digits (int("0b101", 2) allows it, ours does not).'};
  const bad = t.match(/[^01]/);
  if (bad) return {error: `Binary digits are only 0 and 1 ("${bad[0]}" is not one).`};
  if (t.length > LIMITS.maxLen) return {error: `Use at most ${LIMITS.maxLen} digits so every place value fits (you gave ${t.length}).`};
  return {value: t};
}
export function parseFor(kind, text) {
  if (kind === 's') return parseBits(text);
  const I = INPUTS[kind];
  return parseInt10(text, I.min, I.max);
}

// ---------- generators: each returns {steps, result} ----------
// A scene: {k, place, exp, pv:{label, cells, marks}, rows:[{key, label, kind, cells, marks, anim, show, gap}],
//           links:[{from:[row,col], to:[row,col]}], table:{cols, rows, hl, hlCol, up}, note, metaL, metaR,
//           line:[...], text, vars:[[name, value, cls]], ret}

function genToBinary(n0, bw) {
  const code = bw ? CODE.bits : CODE.div, steps = [];
  const k = bitLength(n0), place = placeLabels(k), exp = expLabels(k);
  const pv = Array(k).fill(''), bits = [], tab = [];
  const cols = bw ? ['n', 'n >> 1', 'n & 1'] : ['n', 'n // 2', 'n % 2'];
  let n = n0, loops = 0, result = null;
  const S = (line, text, x = {}) => {
    const nShow = x.nShow !== undefined ? x.nShow : n;
    const rows = [];
    if (bw) {
      rows.push({key: 'n', label: `n = ${nShow}`, kind: 'bits', cells: sigBits(nShow, k), marks: x.nMarks || {}, anim: x.nAnim || null, show: true});
      rows.push({key: 'mask', label: '& 1', kind: 'mask', cells: x.mask ? padBits(1, k) : blank(k), marks: x.mask ? {[k - 1]: 'focus'} : {}, show: !!x.mask});
    }
    rows.push({key: 'list', label: 'bits', kind: 'list', cells: listCells(bits, k), marks: x.listMarks || {}, show: n0 !== 0});
    rows.push({key: 'res', label: 'result', kind: 'bits', cells: x.result || blank(k), marks: {}, show: !!x.result, gap: 34});
    steps.push(clone({k, place, exp, pv: {label: 'binary', cells: pv, marks: x.pvMarks || {}}, rows,
      links: x.links || [], table: {cols, rows: tab, hl: x.tabHl ?? -1, hlCol: 2, up: !!x.up},
      note: x.note || null, metaL: `${n0} needs ${plural(k, 'bit')}`, metaR: `loops ${loops}`,
      line: Array.isArray(line) ? line : [line], text,
      vars: x.vars || [['n', n], ...(x.noBits ? [] : [['bits', pyList(bits)]])], ret: x.ret ?? null}));
  };
  const op = bw ? 'n & 1' : 'n % 2';
  S(-1, bw
    ? `Goal: write ${n0} in binary using bit operators. Inside the computer n is already binary; n & 1 and n >> 1 let us read it one bit at a time from the right.`
    : `Goal: write ${n0} in base 2 without bin(). Dividing by 2 splits n into "the last bit" (the remainder) and "everything else" (the quotient).`,
    {noBits: true});
  if (n0 === 0) {
    result = '0';
    S([1, 2], 'n == 0 is True, so return "0" straight away. Without this check the while loop would never run and the function would return "" (an empty string), not "0".',
      {result: ['0'], ret: '"0"', noBits: true});
    S(-1, 'Returned "0". bin(0) is \'0b0\', so this matches. Zero is the one number whose binary form is not built by the loop.',
      {result: ['0'], ret: '"0"', noBits: true, note: "bin(0) = '0b0'   format(0, 'b') = '0'   ✓"});
    return {steps, result};
  }
  S(1, `n == 0 is False (n is ${n0}), so skip the early return.`, {noBits: true});
  S(3, 'bits = []: an empty list to collect the bits as we find them.');
  for (let i = 0; n > 0; i++) {
    const r = bw ? n & 1 : n % 2, q = bw ? n >> 1 : Math.floor(n / 2), col = k - 1 - i;
    bits.push(String(r)); pv[col] = String(r);
    tab.push([String(n), '', String(r)]);
    const nb = sigBits(n, k).join('').trimStart() || '0';
    const t1 = bw
      ? `${n} > 0, so loop. n & 1 keeps only the last bit: ${nb} & ${'0'.repeat(nb.length - 1)}1 = ${r}. (Same answer as ${n} % 2.) `
      : `${n} > 0, so loop. ${n} % 2 = ${r}: ${n} is ${r ? 'odd' : 'even'}, so its lowest bit is ${r}. `;
    S([4, 5], t1 + `bits.append("${r}") puts it at index ${i} of the list, but it is bit ${i} of the number, worth 2${sup(i)} = ${2 ** i}.`,
      {pvMarks: {[col]: 'focus'}, listMarks: {[i]: 'focus'}, tabHl: tab.length - 1, mask: bw, nMarks: bw ? {[k - 1]: 'focus'} : {}});
    const old = n; n = q; loops++;
    tab[tab.length - 1][1] = String(q);
    S(6, bw
      ? `n >>= 1 slides every bit one place right; the last bit (${r}) falls off the end. ${old} >> 1 = ${q}, the same as ${old} // 2.`
      : `n //= 2: ${old} // 2 = ${q}. Floor division throws away the bit we just read and moves every other bit one place down.${old % 2 ? ` (${old} / 2 would give the float ${old / 2}.)` : ''}`,
      {tabHl: tab.length - 1, nAnim: bw ? 'shr' : null});
  }
  S(4, `n is now 0, so while n > 0 is False and the loop ends after ${plural(loops, 'pass', 'passes')}. bits = ${pyList(bits)} holds the bits lowest first: the opposite of how we write numbers.`,
    {up: true, listMarks: Object.fromEntries(bits.map((_, j) => [j, 'focus']))});
  const rev = bits.slice().reverse();
  result = rev.join('');
  const links = bits.map((_, j) => ({from: [bw ? 2 : 0, j], to: [bw ? 3 : 1, k - 1 - j]}));
  S(7, `reversed(bits) walks the list from the end, so bits[${k - 1}] (the highest bit) comes first and bits[0] comes last. "".join glues the strings together: "${result}". Read the ladder's remainders bottom to top and you get the same thing.`,
    {result: rev, links, up: true, ret: `"${result}"`});
  S(-1, `Returned "${result}". ${n0} took ${plural(loops, 'loop')}, one per bit, and n has floor(log₂ n) + 1 bits, so this is O(log n). Check in Python: bin(${n0}) gives '0b${result}' and format(${n0}, 'b') gives '${result}'.`,
    {result: rev, up: true, ret: `"${result}"`, note: `bin(${n0}) = '0b${result}'   format(${n0}, 'b') = '${result}'   ✓`});
  return {steps, result};
}

function genPlace(s) {
  const steps = [], k = s.length, place = placeLabels(k), exp = expLabels(k);
  const contrib = Array(k).fill(''), tab = [];
  let value = 0, result = null;
  const S = (line, text, x = {}) => steps.push(clone({k, place, exp,
    pv: {label: 's', cells: s.split(''), marks: x.pvMarks || {}},
    rows: [{key: 'contrib', label: 'bit * 2**i', kind: 'num', cells: contrib, marks: x.cMarks || {}, show: true}],
    links: [], table: {cols: ['i', 'bit', 'bit * 2**i', 'value'], rows: tab, hl: x.tabHl ?? -1, hlCol: 3, up: false},
    note: x.note || null, metaL: `len(s) = ${k}`, metaR: `value = ${value}`,
    line: Array.isArray(line) ? line : [line], text, vars: x.vars || [['value', value]], ret: x.ret ?? null}));
  S(-1, `Goal: turn the string "${s}" back into a number. Each position has a place value; the rightmost is 2⁰ = 1 and every step left doubles it.`, {vars: [['s', `"${s}"`]]});
  S(1, 'value = 0: the running total.');
  for (let i = 0; i < k; i++) {
    const col = k - 1 - i, bit = Number(s[col]), add = bit * 2 ** i, prev = value;
    value += add; contrib[col] = String(add);
    tab.push([String(i), `"${s[col]}"`, String(add), String(value)]);
    const where = i === 0 ? 'reversed(s) starts at the right-hand end, so i = 0 is the last character' : `i = ${i} is the character ${i} places from the right`;
    S([2, 3], `${where}: bit = "${s[col]}". ${bit} * 2 ** ${i} = ${bit} * ${2 ** i} = ${add}${bit ? '' : ' (a 0 bit adds nothing)'}. value = ${prev} + ${add} = ${value}.`,
      {pvMarks: {[col]: 'focus'}, cMarks: {[col]: 'focus'}, tabHl: i, vars: [['i', i], ['bit', `"${s[col]}"`], ['value', value]]});
  }
  result = value;
  const terms = [];
  for (let c = 0; c < k; c++) if (s[c] === '1') terms.push(place[c]);
  S(4, `Every digit has been used, so return value: ${value}.`, {ret: value});
  S(-1, `Returned ${value}. One pass over k = ${k} digits, so O(k). Only the 1 bits matter: ${terms.length ? terms.join(' + ') : '0'} = ${value}. Check in Python: int("${s}", 2) gives ${value}.`,
    {ret: value, note: `${terms.length ? terms.join(' + ') : '0'} = ${value}    int("${s}", 2) = ${value}   ✓`});
  return {steps, result};
}

function genHorner(s) {
  const steps = [], k = s.length, place = placeLabels(k), exp = expLabels(k), tab = [];
  let value = 0, result = null;
  const S = (line, text, x = {}) => steps.push(clone({k, place, exp,
    pv: {label: 's', cells: s.split(''), marks: x.pvMarks || {}},
    rows: [{key: 'value', label: `value = ${value}`, kind: 'bits', cells: sigBits(value, k), marks: x.vMarks || {}, anim: x.anim || null, show: true}],
    links: [], table: {cols: ['bit', 'value * 2 + bit', 'value'], rows: tab, hl: x.tabHl ?? -1, hlCol: 2, up: false},
    note: x.note || null, metaL: `len(s) = ${k}`, metaR: `value = ${value}`,
    line: Array.isArray(line) ? line : [line], text, vars: x.vars || [['value', value]], ret: x.ret ?? null}));
  S(-1, `Goal: turn "${s}" into a number reading left to right, the way the digits arrive. Watch the value row: it always holds the bits read so far.`, {vars: [['s', `"${s}"`]]});
  S(1, 'value = 0: nothing read yet.');
  for (let j = 0; j < k; j++) {
    const bit = Number(s[j]), prev = value;
    value = prev * 2 + bit;
    tab.push([`"${s[j]}"`, `${prev} * 2 + ${bit}`, String(value)]);
    const why = j === 0 ? 'Doubling 0 is still 0, so the first bit just becomes value.'
      : `Doubling shifts value's bits one place left (multiplying by 2 adds a 0 on the right, just as × 10 does in decimal), then + ${bit} fills that new last place.`;
    S([2, 3], `bit = "${s[j]}". value = ${prev} * 2 + ${bit} = ${value}. ${why}`,
      {pvMarks: {[j]: 'focus'}, vMarks: value ? {[k - 1]: 'focus'} : {}, anim: j && prev ? 'shl' : null, tabHl: j,
       vars: [['bit', `"${s[j]}"`], ['value', value]]});
  }
  result = value;
  S(4, `All ${plural(k, 'digit')} read: return value, ${value}.`, {ret: value});
  let nest = s.length ? s[0] : '0';
  for (let j = 1; j < k; j++) nest = `(${nest})·2+${s[j]}`;
  S(-1, `Returned ${value}, the same as the place-value version but with no powers of 2: one multiply and one add per digit, O(k). Python's int(s, 2) works this way. Written out: ${nest} = ${value}.`,
    {ret: value, note: `int("${s}", 2) = ${value}   ✓`});
  return {steps, result};
}

function genPop(n0) {
  const steps = [], k = bitLength(n0), place = placeLabels(k), exp = expLabels(k), tab = [];
  let n = n0, count = 0;
  const S = (line, text, x = {}) => {
    const shown = x.nShow !== undefined ? x.nShow : n;
    steps.push(clone({k, place, exp,
      pv: {label: 'n', cells: padBits(shown, k), marks: x.pvMarks || {}},
      rows: [
        {key: 'n1', label: 'n - 1', kind: 'bits', cells: x.n1 !== undefined ? padBits(x.n1, k) : blank(k), marks: x.n1Marks || {}, show: x.n1 !== undefined},
        {key: 'and', label: 'n & (n - 1)', kind: 'bits', cells: x.and !== undefined ? padBits(x.and, k) : blank(k), marks: x.andMarks || {}, show: x.and !== undefined},
      ],
      links: [], table: {cols: ['n', 'n - 1', 'n & (n - 1)', 'count'], rows: tab, hl: x.tabHl ?? -1, hlCol: 3, up: false},
      note: x.note || null, metaL: `${n0} has ${plural(k, 'bit')}`, metaR: `count = ${count}`,
      line: Array.isArray(line) ? line : [line], text, vars: [['n', n], ['count', count]], ret: x.ret ?? null}));
  };
  S(-1, `Goal: count the 1 bits in ${n0} (its "population count"). Checking every bit with n & 1 would take ${plural(k, 'loop')}; this trick takes one loop per 1 bit.`);
  S(1, 'count = 0: no 1 bits found yet.');
  while (n) {
    const old = n, m1 = n - 1, nn = n & (n - 1), low = n & -n, lowCol = k - 1 - Math.round(Math.log2(low));
    const a = padBits(old, k), b = padBits(m1, k);
    const chg = {}; a.forEach((v, c) => { if (v !== b[c]) chg[c] = 'chg'; });
    tab.push([String(old), String(m1), String(nn), '']);
    const below = Object.keys(chg).length - 1;
    S([2, 3], `n = ${old} is not 0, so loop. n - 1 = ${m1}: subtracting 1 turns the lowest 1 bit (worth ${low}) into 0${below ? ` and the ${plural(below, '0')} below it into 1s` : ''}. AND keeps a bit only when both rows have it, so n & (n - 1) = ${nn}: exactly that lowest 1 bit is gone.`,
      {nShow: old, n1: m1, and: nn, n1Marks: chg, andMarks: {[lowCol]: 'focus'}, pvMarks: {[lowCol]: 'focus'}, tabHl: tab.length - 1});
    n = nn; count++;
    tab[tab.length - 1][3] = String(count);
    S(4, `count += 1, so count = ${count}. n is now ${n}${n ? `, with ${plural(bitsSet(n), 'one')} left` : ''}.`, {tabHl: tab.length - 1});
  }
  S(2, n0 === 0 ? 'n is 0, which is falsy, so the loop never runs: 0 has no 1 bits.' : 'n is 0 (falsy): every 1 bit has been cleared, so the loop stops.');
  S(5, `return count: ${count}.`, {ret: count});
  S(-1, `Returned ${count}. The loop ran ${plural(count, 'time')}, once per 1 bit, instead of ${k} times (once per bit). In Python: bin(${n0}).count("1") = ${count}, and on 3.10+ (${n0}).bit_count() = ${count}.`,
    {ret: count, note: `bin(${n0}).count("1") = ${count}   (${n0}).bit_count() = ${count}   ✓`});
  return {steps, result: count};
}
function bitsSet(n) { let c = 0; while (n) { n &= n - 1; c++; } return c; }

function genPow2(n0) {
  const steps = [], k = bitLength(n0), place = placeLabels(k), exp = expLabels(k);
  let result = null;
  const S = (line, text, x = {}) => steps.push(clone({k, place, exp,
    pv: {label: 'n', cells: padBits(n0, k), marks: x.pvMarks || {}},
    rows: [
      {key: 'n1', label: 'n - 1', kind: 'bits', cells: x.n1 !== undefined ? padBits(x.n1, k) : blank(k), marks: x.n1Marks || {}, show: x.n1 !== undefined},
      {key: 'and', label: 'n & (n - 1)', kind: 'bits', cells: x.and !== undefined ? padBits(x.and, k) : blank(k), marks: x.andMarks || {}, show: x.and !== undefined},
    ],
    links: [], table: null, note: x.note || null, metaL: `n = ${n0}`, metaR: `1 bits: ${bitsSet(n0)}`,
    line: Array.isArray(line) ? line : [line], text, vars: [['n', n0]], ret: x.ret ?? null}));
  S(-1, `Goal: is ${n0} a power of two (1, 2, 4, 8, …)? In binary every power of two is a single 1 followed by 0s, so the question is "does n have exactly one 1 bit?".`);
  if (n0 <= 0) {
    result = false;
    S([1, 2], 'n <= 0 is True, so return False. 0 is not a power of two, but 0 & (0 - 1) = 0 & -1 = 0, so without this check the next line would wrongly say True.', {ret: 'False'});
    S(-1, 'Returned False. The n <= 0 guard matters: it is the only thing standing between 0 and a wrong answer.', {ret: 'False', note: '0 & (0 - 1) == 0, but 0 is not a power of two'});
    return {steps, result};
  }
  S(1, `n <= 0 is False (n is ${n0}), so go on.`);
  const m1 = n0 - 1, nn = n0 & m1;
  const a = padBits(n0, k), b = padBits(m1, k), chg = {};
  a.forEach((v, c) => { if (v !== b[c]) chg[c] = 'chg'; });
  S(3, `First n - 1 = ${m1}. Subtracting 1 flips the lowest 1 bit to 0 and every 0 below it to 1 (the highlighted places).`, {n1: m1, n1Marks: chg});
  result = nn === 0;
  const both = {}; a.forEach((v, c) => { if (v === '1' && b[c] === '1') both[c] = 'focus'; });
  S(3, result
    ? `n & (n - 1) = 0: no place has a 1 in both rows. ${n0} had one 1 bit, and n - 1 switched it off, so (n & (n - 1)) == 0 is True.`
    : `n & (n - 1) = ${nn}: the 1 bits above the lowest one are untouched by - 1, so they survive the AND. ${n0} has more than one 1 bit: return False.`,
    {n1: m1, and: nn, n1Marks: chg, andMarks: both, ret: result ? 'True' : 'False'});
  S(-1, `Returned ${result ? 'True' : 'False'}. One subtraction, one AND, one comparison: O(1) for numbers that fit in a machine word. ${result ? `Try ${n0 + 1 <= LIMITS.maxN ? n0 + 1 : n0 - 1} to see a False.` : 'Try 64 to see a True.'}`,
    {n1: m1, and: nn, n1Marks: chg, andMarks: both, ret: result ? 'True' : 'False',
     note: `(${n0} & ${m1}) == 0  →  ${result ? 'True' : 'False'}`});
  return {steps, result};
}

function genTwos(n0) {
  const steps = [], k = 8, exp = expLabels(k);
  const place = ['−128', '64', '32', '16', '8', '4', '2', '1'];
  let pv = blank(k).map(() => ''), result = null;
  const rowsOf = (x) => [
    {key: 'mag', label: x.magLabel || 'magnitude', kind: 'bits', cells: x.mag || blank(k), marks: x.magMarks || {}, show: !!x.mag},
    {key: 'flip', label: 'flipped', kind: 'bits', cells: x.flip || blank(k), marks: x.flipMarks || {}, show: !!x.flip},
    {key: 'plus', label: '+ 1', kind: 'bits', cells: x.plus || blank(k), marks: x.plusMarks || {}, show: !!x.plus},
  ];
  const S = (line, text, x = {}) => steps.push(clone({k, place, exp,
    pv: {label: 'result', cells: pv, marks: x.pvMarks || {}}, rows: rowsOf(x), links: [], table: null,
    note: x.note || null, metaL: `n = ${n0}, bits = 8`, metaR: 'range −128 … 127',
    line: Array.isArray(line) ? line : [line], text, vars: x.vars || [['n', n0], ['bits', 8]], ret: x.ret ?? null}));
  const weights = (cells) => {
    const t = []; cells.forEach((b, c) => { if (b === '1') t.push(c === 0 ? '−128' : place[c]); });
    return t.length ? t.join(' + ') : '0';
  };
  S(-1, `Goal: the 8-bit pattern for ${n0}. Python ints have no fixed width, so bin(${n0}) is just '${n0 < 0 ? '-' : ''}0b…' with a minus sign. Hardware stores numbers in a fixed number of bits, and there the top bit is worth −128 instead of +128.`);
  S(1, `${n0} is between −128 and 127, so it fits in 8 bits.`);
  if (n0 >= 0) {
    const raw = sigBits(n0, k); if (n0 === 0) raw[k - 1] = '0'; // to_binary(0) is "0"
    const ns = raw.join('');
    const z = padBits(n0, k); const zm = {}; raw.forEach((v, c) => { if (v === '') zm[c] = 'chg'; });
    pv = z; result = z.join('');
    S([3, 4], `n >= 0, so nothing special: to_binary(${n0}) = "${ns}", and .zfill(8) pads it with 0s on the left to "${result}". The top bit is 0, which is what makes it non-negative.`,
      {mag: z, magLabel: 'zfill(8)', magMarks: zm, pvMarks: {0: 'focus'}, ret: `"${result}"`});
    S(-1, `Returned "${result}". Check: ${weights(z)} = ${n0}. Every value from 0 to 127 starts with a 0 bit; try a negative n to see the flip-and-add-1 path.`,
      {mag: z, magLabel: 'zfill(8)', ret: `"${result}"`, note: `format(${n0} & 0xFF, "08b") = '${result}'   ✓`});
    return {steps, result};
  }
  S(3, 'n >= 0 is False: n is negative, so build it from its magnitude.');
  const mag = padBits(-n0, k);
  S(5, `magnitude = to_binary(${-n0}).zfill(8) = "${mag.join('')}". That is ${-n0} written in 8 bits.`,
    {mag, vars: [['n', n0], ['magnitude', `"${mag.join('')}"`]]});
  const flip = mag.map((b) => (b === '0' ? '1' : '0'));
  const fv = parseInt(flip.join(''), 2);
  S(6, `Flip every bit: 0 becomes 1 and 1 becomes 0, giving "${flip.join('')}" (this is the ones' complement). Flipping all 8 bits of m gives 255 − m = ${fv}.`,
    {mag, flip, flipMarks: Object.fromEntries(flip.map((_, c) => [c, 'chg'])), vars: [['n', n0], ['flipped', `"${flip.join('')}"`]]});
  const sum = fv + 1, plus = padBits(sum, k);
  let trail = 0; for (let c = k - 1; c >= 0 && flip[c] === '1'; c--) trail++;
  const pm = {}; plus.forEach((b, c) => { if (b !== flip[c]) pm[c] = 'chg'; });
  result = plus.join('');
  S(7, `Add 1: ${fv} + 1 = ${sum}, so result = "${result}". ${trail ? `The carry turns the ${plural(trail, 'trailing 1')} into 0s and the first 0 into a 1.` : 'The last bit was 0, so + 1 just sets it.'} ${sum} = 256 − ${-n0}: that is the rule, −m is stored as 2⁸ − m.`,
    {mag, flip, plus, plusMarks: pm, vars: [['n', n0], ['result', `"${result}"`]]});
  pv = plus;
  S(8, `return result: "${result}". The top bit is 1, which marks a negative number. Read with the −128 weight: ${weights(plus)} = ${n0}.`,
    {mag, flip, plus, pvMarks: {0: 'focus'}, ret: `"${result}"`});
  S(-1, `Returned "${result}". Shortcut: Python's & treats negative ints as having infinitely many leading 1s, so ${n0} & 0xFF = ${sum} and format(${n0} & 0xFF, "08b") gives the same "${result}". Going back: ${sum} − 256 = ${n0}.`,
    {mag, flip, plus, ret: `"${result}"`, note: `${weights(plus)} = ${n0}    format(${n0} & 0xFF, "08b") = '${result}'   ✓`});
  return {steps, result};
}

/** Run operation opIdx on input v. Returns {op, code, steps, result, call}. */
export function runOp(opIdx, v) {
  const op = OPS[opIdx];
  const input = v === undefined ? op.def : v;
  const gen = {div: () => genToBinary(input, false), bits: () => genToBinary(input, true), place: () => genPlace(input),
    horner: () => genHorner(input), pop: () => genPop(input), pow2: () => genPow2(input), twos: () => genTwos(input)}[op.key];
  const r = gen();
  return {op, code: CODE[op.key], steps: r.steps, result: r.result, call: op.call(input), input};
}

// ---------- rendering ----------
if (typeof document !== 'undefined' && document.getElementById('bn-stage')) initUI();

function initUI() {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('bn-stage'), layer = $('bn-layer');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GL = 124, PVH = 50, RH = 44, PVY = 64, COLW = 120, CH = 8.6; // CH: px per mono char at 14px
  let W = 800;
  let opIdx = 0, steps = [], idx = 0, prevIdx = -1, run = null, timer = 0, G = null;
  const custom = {}; // input kind -> value

  function el(t, a, p) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function txt(p, x, y, s, cls, extra) { const e = el('text', {x, y, class: cls, ...(extra || {})}, p); e.textContent = s; return e; }

  // Fixed geometry per operation so nothing jumps between steps.
  // The viewBox is sized to its content, so a 6-bit number is not lost in a wide empty stage on a phone.
  function geometry() {
    const sc = steps[0], k = sc.k;
    const cw = Math.min(64, Math.floor(628 / k));
    let y = PVY + PVH + 36;
    const rowY = sc.rows.map((r) => { if (r.gap) y += r.gap; const at = y; y += RH + (r.kind === 'list' ? 18 : 0) + 18; return at; });
    let maxTab = 0, hasTab = false, up = false, nc = 0;
    for (const s of steps) if (s.table && s.table.rows.length) { hasTab = true; nc = s.table.cols.length; up = up || s.table.up; maxTab = Math.max(maxTab, s.table.rows.length); }
    const w = Math.max(520, GL + k * cw + 28, hasTab ? COLW * nc + (up ? 170 : 40) : 0);
    // notes: one line if it fits, else one line per segment (segments are separated by 3+ spaces)
    const segs = (n) => n.split(/\s{3,}/).reduce((a, g) => { if (g === '✓' && a.length) a[a.length - 1] += '  ✓'; else a.push(g); return a; }, []);
    let widest = 0;
    for (const s of steps) if (s.note) for (const g of segs(s.note)) widest = Math.max(widest, g.length * CH + 32);
    const Wd = Math.max(w, Math.ceil(widest));
    let noteLines = 0;
    for (const s of steps) if (s.note) noteLines = Math.max(noteLines, s.note.length * CH + 32 <= Wd ? 1 : segs(s.note).length);
    const gx = Math.max(GL, Math.round((Wd - k * cw) / 2 + 30));
    const noteY = y + 4; if (noteLines) y += 14 + noteLines * 22;
    const tabY = y; if (hasTab) y += 30 + maxTab * 28 + 16;
    return {k, cw, gx, rowY, noteY, tabY, hasTab, W: Wd, segs, H: y + 4};
  }

  function cellState(v) { return v === '' ? 'is-blank' : v === '1' ? 'is-one' : v === '0' ? 'is-zero' : 'is-num'; }
  function drawCell(p, x, y, w, h, v, kind, mark, enter) {
    const cls = ['bn-cell', cellState(v), 'k-' + kind];
    if (mark) cls.push('is-' + mark);
    if (enter) cls.push('bn-enter');
    const g = el('g', {class: cls.join(' ')}, p);
    el('rect', {x: x + 3, y, width: w - 6, height: h, rx: kind === 'list' ? 14 : 6, class: 'bn-box'}, g);
    if (v !== '') {
      const shown = kind === 'list' ? `'${v}'` : v;
      txt(g, x + w / 2, y + h / 2 + 6, shown, 'bn-bit' + (shown.length > 2 ? ' bn-sm' : ''));
    }
    return g;
  }

  function draw(animate) {
    const sc = steps[idx], prev = animate ? steps[prevIdx] : null;
    const {k, cw, gx, rowY} = G;
    layer.innerHTML = '';
    txt(layer, 16, 26, sc.metaL, 'bn-meta');
    txt(layer, W - 16, 26, sc.metaR, 'bn-meta', {'text-anchor': 'end'});
    const cx = (c) => gx + c * cw + cw / 2;
    // place-value header
    for (let c = 0; c < k; c++) {
      txt(layer, cx(c), PVY - 9, sc.place[c], 'bn-place' + (sc.pv.cells[c] === '1' ? ' on' : ''));
      txt(layer, cx(c), PVY + PVH + 17, sc.exp[c], 'bn-exp');
    }
    txt(layer, gx - 12, PVY + PVH / 2 + 5, sc.pv.label, 'bn-rlab', {'text-anchor': 'end'});
    const gP = el('g', {}, layer);
    sc.pv.cells.forEach((v, c) => {
      const enter = prev && prev.pv.cells[c] !== v && v !== '';
      drawCell(gP, gx + c * cw, PVY, cw, PVH, v, 'pv', sc.pv.marks[c], enter);
    });
    // rows
    sc.rows.forEach((r, ri) => {
      if (!r.show) return;
      const y = rowY[ri];
      const pr = prev && prev.rows[ri] && prev.rows[ri].show ? prev.rows[ri] : null;
      txt(layer, gx - 12, y + RH / 2 + 5, r.label, 'bn-rlab', {'text-anchor': 'end'});
      const g = el('g', {}, layer);
      if (r.anim && prev && !reduce) {
        g.setAttribute('class', 'bn-shift');
        g.setAttribute('style', `--dx:${r.anim === 'shr' ? -cw : cw}px`);
      }
      r.cells.forEach((v, c) => {
        if (v === null) return;
        const enter = !r.anim && prev && (!pr || pr.cells[c] !== v);
        drawCell(g, gx + c * cw, y, cw, RH, v, r.kind, r.marks[c], enter);
        if (r.kind === 'list') txt(layer, cx(c), y + RH + 15, `[${c}]`, 'bn-exp');
      });
    });
    // reversal links
    if (sc.links.length) {
      const gL = el('g', {class: prev ? 'bn-enter' : ''}, layer);
      for (const L of sc.links) {
        const [ra, ca] = L.from, [rb, cb] = L.to;
        const x1 = cx(ca), y1 = rowY[ra] + RH + (sc.rows[ra].kind === 'list' ? 20 : 2), x2 = cx(cb), y2 = rowY[rb] - 3;
        const my = (y1 + y2) / 2;
        el('path', {d: `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`, class: 'bn-link'}, gL);
        el('path', {d: `M${x2 - 4} ${y2 - 6} L${x2} ${y2} L${x2 + 4} ${y2 - 6}`, class: 'bn-link'}, gL);
      }
    }
    if (sc.note) {
      const lines = sc.note.length * CH + 32 <= W ? [sc.note] : G.segs(sc.note);
      lines.forEach((ln, i) => txt(layer, W / 2, G.noteY + 16 + i * 22, ln, 'bn-note', {'text-anchor': 'middle'}));
    }
    // table: the division ladder / running totals
    const T = sc.table;
    if (T && T.cols && G.hasTab) {
      const nc = T.cols.length, colw = COLW, tw = colw * nc, tx = Math.round((W - tw) / 2), ty = G.tabY;
      T.cols.forEach((h, c) => txt(layer, tx + c * colw + colw / 2, ty + 18, h, 'bn-th' + (c === T.hlCol ? ' on' : ''), {'text-anchor': 'middle'}));
      el('line', {x1: tx, x2: tx + tw, y1: ty + 28, y2: ty + 28, class: 'bn-rule'}, layer);
      T.rows.forEach((row, r) => {
        const y = ty + 30 + r * 28;
        const isNew = prev && (!prev.table || !prev.table.rows[r] || prev.table.rows[r].join() !== row.join());
        const g = el('g', {class: isNew ? 'bn-enter' : ''}, layer);
        if (r === T.hl) el('rect', {x: tx, y: y + 1, width: tw, height: 26, rx: 4, class: 'bn-trow'}, g);
        row.forEach((v, c) => txt(g, tx + c * colw + colw / 2, y + 19, v, 'bn-td' + (c === T.hlCol ? ' on' : ''), {'text-anchor': 'middle'}));
      });
      if (T.up && T.rows.length) {
        const ax = tx + tw + 14, yTop = ty + 30 + 8, yBot = ty + 30 + (T.rows.length - 1) * 28 + 20;
        const g = el('g', {class: prev && !prev.table.up ? 'bn-enter' : ''}, layer);
        el('path', {d: `M${ax} ${yBot} L${ax} ${yTop}`, class: 'bn-up'}, g);
        el('path', {d: `M${ax - 5} ${yTop + 7} L${ax} ${yTop} L${ax + 5} ${yTop + 7}`, class: 'bn-up'}, g);
        txt(g, ax + 8, (yTop + yBot) / 2 + 4, 'read up', 'bn-uplab');
      }
    }
  }

  function describe(sc) {
    const parts = [`Place values ${sc.place.join(', ')}`];
    const cells = (a) => a.filter((v) => v !== null).map((v) => (v === '' ? 'blank' : v)).join(' ');
    parts.push(`${sc.pv.label}: ${cells(sc.pv.cells)}`);
    for (const r of sc.rows) if (r.show) parts.push(`${r.label}: ${cells(r.cells) || 'empty'}`);
    if (sc.table && sc.table.rows.length) parts.push(`table with ${sc.table.rows.length} row${sc.table.rows.length === 1 ? '' : 's'}`);
    return parts.join('. ');
  }

  function show() {
    const sc = steps[idx];
    const animate = prevIdx === idx - 1 && prevIdx >= 0 && !reduce;
    draw(animate);
    prevIdx = idx;
    svg.setAttribute('aria-label', describe(sc));
    const code = $('bn-code'); code.innerHTML = '';
    run.code.forEach((ln, i) => {
      const dv = document.createElement('div'); if (sc.line.includes(i)) dv.className = 'on';
      const n = document.createElement('span'); n.className = 'bn-ln'; n.textContent = i + 1;
      const c = document.createElement('span'); c.textContent = ln || ' ';
      dv.append(n, c); code.appendChild(dv);
    });
    const lines = sc.line[0] < 0 ? '' : ' · line' + (sc.line.length > 1 ? 's ' : ' ') + sc.line.map((x) => x + 1).join(', ');
    $('bn-stepno').textContent = idx === 0 ? 'Before the call' : idx === steps.length - 1 ? 'After the call' : `Step ${idx} of ${steps.length - 2}${lines}`;
    $('bn-narr').textContent = sc.text;
    const V = $('bn-vars'); V.innerHTML = '';
    const chip = (t, c) => { const s = document.createElement('span'); s.textContent = t; if (c) s.className = c; V.appendChild(s); };
    for (const [k, v] of sc.vars) chip(`${k} = ${v}`);
    if (sc.ret !== null) chip('returned ' + sc.ret, 'bn-ret');
    $('bn-prev').disabled = idx === 0;
    $('bn-next').disabled = idx === steps.length - 1;
    const dots = $('bn-dots'); dots.innerHTML = '';
    steps.forEach((_, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bn-dot' + (i === idx ? ' on' : '');
      b.setAttribute('aria-label', 'Go to step ' + i); if (i === idx) b.setAttribute('aria-current', 'step');
      b.onclick = () => { stop(); idx = i; show(); };
      dots.appendChild(b);
    });
  }

  function loadOp(keepStep) {
    stop();
    const op = OPS[opIdx];
    run = runOp(opIdx, custom[op.input]);
    steps = run.steps; idx = 0; prevIdx = -1;
    G = geometry();
    W = G.W;
    svg.setAttribute('viewBox', `0 0 ${W} ${G.H}`);
    svg.style.minWidth = Math.round(W * 0.66) + 'px';
    svg.style.maxWidth = Math.round(W * 1.3) + 'px';
    $('bn-call').textContent = run.call; $('bn-big').textContent = op.big; $('bn-sum').textContent = op.sum;
    document.querySelectorAll('#bn-ops .bn-op').forEach((b, i) => b.setAttribute('aria-pressed', i === opIdx ? 'true' : 'false'));
    renderCustom();
    if (keepStep !== undefined) idx = Math.max(0, Math.min(steps.length - 1, keepStep));
    show();
  }
  function renderOps() {
    const box = $('bn-ops'); box.innerHTML = '';
    OPS.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bn-op';
      const a = document.createElement('span'); a.textContent = o.name;
      const sm = document.createElement('small'); sm.textContent = o.big;
      b.append(a, sm); b.onclick = () => { opIdx = i; loadOp(); };
      box.appendChild(b);
    });
  }
  function renderCustom() {
    const op = OPS[opIdx], inp = $('bn-in');
    $('bn-err').textContent = ''; inp.removeAttribute('aria-invalid');
    $('bn-in-label').textContent = INPUTS[op.input].label;
    inp.value = String(custom[op.input] !== undefined ? custom[op.input] : op.def);
    inp.setAttribute('inputmode', op.input === 't' ? 'text' : 'numeric');
    $('bn-ex').hidden = custom[op.input] === undefined;
  }
  $('bn-custom').addEventListener('submit', (e) => {
    e.preventDefault();
    const op = OPS[opIdx], inp = $('bn-in'), r = parseFor(op.input, inp.value);
    if (r.error) { $('bn-err').textContent = r.error; inp.setAttribute('aria-invalid', 'true'); return; }
    custom[op.input] = r.value; loadOp();
  });
  $('bn-ex').onclick = () => { delete custom[OPS[opIdx].input]; loadOp(); };

  function stop() { clearInterval(timer); timer = 0; $('bn-play').textContent = '▶ Play'; $('bn-play').setAttribute('aria-pressed', 'false'); }
  $('bn-play').onclick = () => {
    if (timer) { stop(); return; }
    if (idx === steps.length - 1) { idx = 0; prevIdx = -1; show(); }
    $('bn-play').textContent = '❚❚ Pause'; $('bn-play').setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { if (idx < steps.length - 1) { idx++; show(); } if (idx === steps.length - 1) stop(); }, 2200);
  };
  $('bn-next').onclick = () => { stop(); if (idx < steps.length - 1) { idx++; show(); } };
  $('bn-prev').onclick = () => { stop(); if (idx > 0) { idx--; show(); } };
  $('bn-reset').onclick = () => { stop(); idx = 0; prevIdx = -1; show(); };
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') $('bn-next').click();
    if (e.key === 'ArrowLeft') $('bn-prev').click();
  });

  // ?op=0&step=5 opens a given step; ?n=100 or ?s=1011 sets the input (handy for links and screenshots)
  const q = new URLSearchParams(location.search);
  const qo = parseInt(q.get('op'), 10); if (qo >= 0 && qo < OPS.length) opIdx = qo;
  const kind = OPS[opIdx].input, qv = kind === 's' ? q.get('s') : q.get('n');
  if (qv !== null) { const r = parseFor(kind, qv); if (!r.error) custom[kind] = r.value; }
  const qs = parseInt(q.get('step'), 10);
  renderOps(); loadOp(Number.isFinite(qs) ? qs : undefined);
}
