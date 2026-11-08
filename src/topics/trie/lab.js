// Trie Lab: step-by-step simulator (pure, no DOM) and SVG renderer.
// Each operation runs a scripted Sim that snapshots the trie after every step of Python.
// The renderer at the bottom only reads those snapshots.

export const WORDS = ['car', 'card', 'care', 'cat', 'dog', 'do'];
export const MAXLEN = 8;
export const ROOT = 'n0';

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const q = (w) => `"${w}"`;
const pyList = (a) => '[' + a.map(q).join(', ') + ']';
// "car, card and cat" (at most 6 shown)
function listWords(ws) {
  const a = ws.map(q);
  if (a.length > 6) return a.slice(0, 5).join(', ') + ` and ${a.length - 5} more`;
  return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}
const letters = (ks) => ks.map((c) => `'${c}'`).join(', ');

// ---------- the trie itself ----------
// Nodes live in a flat map so snapshots are plain JSON. kids keeps insertion order,
// which is also the order a Python dict iterates in.
export class Trie {
  constructor() {
    this.nodes = { [ROOT]: { ch: '', p: null, kids: {}, end: false } };
    this.seq = 1;
  }
  child(id, ch) { const k = this.nodes[id].kids; return has(k, ch) ? k[ch] : null; }
  add(id, ch) {
    const nid = 'n' + this.seq++;
    this.nodes[nid] = { ch, p: id, kids: {}, end: false };
    this.nodes[id].kids[ch] = nid;
    return nid;
  }
  remove(id) { const n = this.nodes[id]; delete this.nodes[n.p].kids[n.ch]; delete this.nodes[id]; }
  prefix(id) { let s = ''; while (id !== ROOT) { s = this.nodes[id].ch + s; id = this.nodes[id].p; } return s; }
  insert(w) { let id = ROOT; for (const c of w) id = this.child(id, c) || this.add(id, c); this.nodes[id].end = true; }
  wordsUnder(id) {
    const out = [];
    const rec = (x, p) => { const n = this.nodes[x]; if (n.end) out.push(p); for (const c in n.kids) rec(n.kids[c], p + c); };
    rec(id, this.prefix(id));
    return out;
  }
  words() { return this.wordsUnder(ROOT); }
  size() { return Object.keys(this.nodes).length; }
  kidKeys(id) { return Object.keys(this.nodes[id].kids); }
}

// ---------- simulator ----------
export class Sim {
  constructor(words) {
    this.t = new Trie();
    for (const w of words) this.t.insert(w);
    this.steps = [];
    this.cur = ROOT;
    this.dead = new Set(); this.hit = new Set();
    this.fresh = []; this.ghost = []; this.miss = null;
    this.tiles = null; this.stack = null; this.sc = {}; this.ret = null;
    this.count = { label: 'nodes visited', n: 0 };
    this.result = undefined; // the operation's real return value, for tests
  }
  name(id) { return id === ROOT ? 'root' : `node "${this.t.prefix(id)}"`; }
  path() { const out = []; let id = this.cur; while (id && this.t.nodes[id]) { out.unshift(id); id = this.t.nodes[id].p; } return out; }
  snap(line, text) {
    const nodes = JSON.parse(JSON.stringify(this.t.nodes));
    // a node pruned on this step is still drawn once, dashed, in its old place
    for (const g of this.ghost) {
      nodes[g.id] = { ...g.node, kids: {}, gone: true };
      const kids = {};
      for (const c of g.order) { if (c === g.node.ch) kids[c] = g.id; else if (has(nodes[g.node.p].kids, c)) kids[c] = nodes[g.node.p].kids[c]; }
      nodes[g.node.p].kids = kids;
    }
    this.steps.push({
      nodes, cur: this.cur, path: this.path(), dead: [...this.dead], hit: [...this.hit], fresh: this.fresh.slice(),
      miss: this.miss ? { ...this.miss } : null, tiles: this.tiles ? { ...this.tiles } : null,
      stack: this.stack ? this.stack.map((f) => ({ ...f })) : null, sc: { ...this.sc }, ret: this.ret,
      count: { ...this.count }, line: Array.isArray(line) ? line : [line], text,
    });
    this.fresh = []; this.ghost = []; this.miss = null;
  }
  // call-stack frames for the recursive operations
  enter(fn, id, i, extra) {
    this.stack.push({ fn, id, i, label: `${fn}(${this.name(id)}, ${extra !== undefined ? extra : i})` });
    this.cur = id; if (this.tiles && i !== null) this.tiles.i = i;
  }
  leave() {
    this.stack.pop();
    const top = this.stack[this.stack.length - 1];
    if (top) { this.cur = top.id; if (this.tiles && top.i !== null) this.tiles.i = top.i; }
  }
}

// ---------- code listings ----------
export const CODE = {
  insert: [
    'def insert(self, word):',
    '    node = self.root',
    '    for ch in word:',
    '        if ch not in node.children:',
    '            node.children[ch] = TrieNode()',
    '        node = node.children[ch]',
    '    node.is_end = True',
  ],
  search: [
    'def search(self, word):',
    '    node = self.root',
    '    for ch in word:',
    '        if ch not in node.children:',
    '            return False',
    '        node = node.children[ch]',
    '    return node.is_end',
  ],
  starts: [
    'def starts_with(self, prefix):',
    '    node = self.root',
    '    for ch in prefix:',
    '        if ch not in node.children:',
    '            return False',
    '        node = node.children[ch]',
    '    return True',
  ],
  match: [
    'def match(self, pattern):',
    '    def dfs(node, i):',
    '        if i == len(pattern):',
    '            return node.is_end',
    '        ch = pattern[i]',
    "        if ch == '.':",
    '            for child in node.children.values():',
    '                if dfs(child, i + 1):',
    '                    return True',
    '            return False',
    '        if ch not in node.children:',
    '            return False',
    '        return dfs(node.children[ch], i + 1)',
    '    return dfs(self.root, 0)',
  ],
  auto: [
    'def autocomplete(self, prefix):',
    '    node = self.root',
    '    for ch in prefix:',
    '        if ch not in node.children:',
    '            return []',
    '        node = node.children[ch]',
    '    words = []',
    '    def collect(node, path):',
    '        if node.is_end:',
    '            words.append(path)',
    '        for ch, child in node.children.items():',
    '            collect(child, path + ch)',
    '    collect(node, prefix)',
    '    return words',
  ],
  del: [
    'def delete(self, word):',
    '    def _delete(node, i):',
    '        if i == len(word):',
    '            if not node.is_end:',
    '                return False',
    '            node.is_end = False',
    '            return not node.children',
    '        ch = word[i]',
    '        child = node.children.get(ch)',
    '        if child is None:',
    '            return False',
    '        if _delete(child, i + 1):',
    '            del node.children[ch]',
    '            return not node.is_end and not node.children',
    '        return False',
    '    _delete(self.root, 0)',
  ],
};

// ---------- shared pieces ----------
// insert(word); L = index of "def insert" in the listing. quick: one step per letter (Build).
function insertSteps(s, L, word, quick) {
  s.tiles = { label: 'word', text: word, i: -1 };
  s.cur = ROOT;
  s.sc = { ...s.sc, word: q(word), node: 'root' };
  if (!quick) s.snap(L + 1, 'node = self.root. Every word starts at the root, which holds no letter of its own.');
  let made = 0, reused = 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], here = s.cur, ex = s.t.child(here, ch);
    s.tiles.i = i; s.sc.ch = `'${ch}'`;
    if (ex) {
      const shared = s.t.wordsUnder(ex);
      s.cur = ex; s.sc.node = s.name(ex); reused++;
      s.snap([L + 2, L + 3, L + 5], `ch = '${ch}'. ${cap(s.name(here))} already has a '${ch}' child${shared.length ? `, on the way to ${listWords(shared)}` : ''}. Nothing to create: node = node.children['${ch}'] moves down to ${s.name(ex)}.`);
    } else {
      const nid = s.t.add(here, ch); s.fresh.push(nid); made++; s.count.n++;
      if (quick) {
        s.cur = nid; s.sc.node = s.name(nid);
        s.snap([L + 2, L + 3, L + 4, L + 5], `ch = '${ch}' is not a child of ${s.name(here)}, so create a new TrieNode under '${ch}' and move down to it.`);
      } else {
        s.snap([L + 2, L + 3, L + 4], `ch = '${ch}'. ${cap(s.name(here))} has no '${ch}' child${s.t.kidKeys(here).length > 1 ? ` (it has ${letters(s.t.kidKeys(here).filter((c) => c !== ch))})` : ''}, so create an empty TrieNode and store it under '${ch}'.`);
        s.cur = nid; s.sc.node = s.name(nid);
        s.snap(L + 5, `node = node.children['${ch}']: move down to the new node. From here on every letter of "${word}" gets a new node.`);
      }
    }
  }
  s.tiles.i = word.length; delete s.sc.ch;
  const n = s.t.nodes[s.cur], was = n.end, kids = s.t.kidKeys(s.cur);
  n.end = true;
  let t;
  if (was) t = `node.is_end was already True: "${word}" was stored before, so this insert changed nothing.`;
  else if (kids.length) t = `node.is_end = True. ${cap(s.name(s.cur))} already had children (${letters(kids)}) and no new nodes were needed: the only change is this flag. Without it "${word}" would look like a mere prefix.`;
  else t = `node.is_end = True: mark ${s.name(s.cur)} as the end of a word, so search("${word}") can tell it apart from a prefix.`;
  s.snap(L + 6, t);
  return { made, reused, was };
}

// The loop shared by search, starts_with and autocomplete's first half.
// Returns true if the whole string was walked.
function walk(s, word, label, missRet) {
  s.tiles = { label, text: word, i: -1 };
  s.cur = ROOT; s.sc = { [label]: q(word), node: 'root' };
  s.snap(1, 'node = self.root: start at the root.');
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], here = s.cur, ex = s.t.child(here, ch);
    s.tiles.i = i; s.sc.ch = `'${ch}'`;
    if (!ex) {
      const ks = s.t.kidKeys(here);
      s.miss = { from: here, ch }; s.ret = missRet;
      s.snap([2, 3, 4], `ch = '${ch}'. ${cap(s.name(here))} has no '${ch}' child (${ks.length ? 'only ' + letters(ks) : 'it has no children at all'}). No stored word continues this way, so return ${missRet}. Note that nothing was created: looking up only reads.`);
      return false;
    }
    s.cur = ex; s.count.n++; s.sc.node = s.name(ex);
    s.snap([2, 3, 5], `ch = '${ch}' is a child of ${s.name(here)}: node = node.children['${ch}'] moves down to ${s.name(ex)}.`);
  }
  s.tiles.i = word.length; delete s.sc.ch;
  return true;
}

function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

// regex for a '.' pattern (letters only, so no escaping needed)
const fits = (pat) => new RegExp('^' + pat + '$');

// ---------- operations ----------
const BASE_INSERT = ['car', 'card', 'cat', 'dog', 'do'];
export const OPS = [
  {
    key: 'insert', name: 'Insert', big: 'O(L)', input: 'word', label: 'Word to insert', def: 'care',
    examples: [['care', 'shares "car"'], ['bat', 'all new'], ['ca', 'only a flag'], ['dog', 'already there']],
    words: () => BASE_INSERT,
    call: (a) => `trie.insert("${a}")`,
    sum: () => 'Walk down letter by letter. Reuse a child when it exists, create one when it does not, then mark the last node with is_end = True.',
    code: CODE.insert, count: 'nodes created',
    run(s, w) {
      s.snap(-1, `Goal: add "${w}" to a trie that holds ${listWords(s.t.words())}. L = len("${w}") = ${w.length}, so the loop runs ${w.length} time${w.length === 1 ? '' : 's'}.`);
      const r = insertSteps(s, 0, w, false);
      s.result = null;
      s.snap(-1, `Done. ${r.reused} letter${r.reused === 1 ? '' : 's'} reused existing nodes and ${r.made} new node${r.made === 1 ? ' was' : 's were'} created. The work was one step per letter, O(L), no matter how many words the trie holds.`);
    },
  },
  {
    key: 'build', name: 'Build from words', big: 'O(total letters)', input: null,
    words: () => [],
    call: () => 'for w in words: trie.insert(w)',
    sum: () => `Insert ${pyList(WORDS)} into an empty trie, one step per letter. Watch which letters get a new node and which reuse one.`,
    code: ['words = ' + pyList(WORDS), 'trie = Trie()', 'for w in words:', '    trie.insert(w)', ''].concat(CODE.insert),
    count: 'nodes created',
    run(s) {
      const L = 5;
      s.snap(-1, `Goal: insert ${WORDS.length} words, ${WORDS.join('').length} letters in total, and see how many nodes the trie really needs.`);
      s.sc = { words: pyList(WORDS) };
      s.snap(1, 'trie = Trie(): only a root TrieNode, with no children and is_end False.');
      for (const w of WORDS) {
        s.tiles = { label: 'word', text: w, i: -1 }; s.cur = ROOT;
        s.sc = { w: q(w), word: q(w), node: 'root' };
        s.snap([2, 3, L, L + 1], `w = "${w}": call trie.insert("${w}"). Inside, node = self.root.`);
        insertSteps(s, L, w, true);
      }
      s.sc = {}; s.tiles = null; s.cur = ROOT;
      const total = WORDS.join('').length, nodes = s.t.size() - 1;
      s.result = null;
      s.snap(-1, `Done: ${total} letters stored in only ${nodes} nodes (plus the root). "car", "card", "care" and "cat" share "ca"; "do" and "dog" share "do". The 4 nodes marked as word ends are what keep "car" and "do" from being lost inside longer words.`);
    },
  },
  {
    key: 'search', name: 'Search', big: 'O(L)', input: 'word', label: 'Word to search', def: 'card',
    examples: [['card', 'hit'], ['cab', 'miss'], ['ca', 'prefix, not a word'], ['do', 'word inside "dog"']],
    words: () => WORDS,
    call: (a) => `trie.search("${a}")`,
    sum: () => 'Follow one child per letter. A missing child means False. If the whole word is walked, the answer is the last node\'s is_end, not just "the path exists".',
    code: CODE.search,
    run(s, w) {
      s.snap(-1, `Goal: is "${w}" one of the stored words? The trie holds ${listWords(s.t.words())}.`);
      if (!walk(s, w, 'word', 'False')) {
        s.result = false;
        s.snap(-1, `Returned False after ${s.count.n} step${s.count.n === 1 ? '' : 's'} down. A miss can stop early: at most L = ${w.length} steps.`);
        return;
      }
      const n = s.t.nodes[s.cur], under = s.t.wordsUnder(s.cur);
      s.ret = n.end ? 'True' : 'False'; s.result = n.end;
      if (n.end) { s.hit.add(s.cur); s.snap(6, `Every letter matched. return node.is_end: ${s.name(s.cur)} is marked as a word end, so return True.`); }
      else s.snap(6, `Every letter matched, but ${s.name(s.cur)}.is_end is False: "${w}" is only a prefix of ${listWords(under)}. return False. Returning True here would claim "${w}" was inserted.`);
      s.snap(-1, `Returned ${s.ret}. Cost: ${w.length} step${w.length === 1 ? '' : 's'} down for ${w.length} letter${w.length === 1 ? '' : 's'}, O(L). With ${WORDS.length} words or a million, the walk is the same length.`);
    },
  },
  {
    key: 'starts', name: 'Starts with', big: 'O(L)', input: 'word', label: 'Prefix', def: 'ca',
    examples: [['ca', 'true'], ['do', 'true'], ['cu', 'false'], ['card', 'a whole word']],
    words: () => WORDS,
    call: (a) => `trie.starts_with("${a}")`,
    sum: () => 'The same walk as search, with one difference: if every letter has a child, return True without looking at is_end.',
    code: CODE.starts,
    run(s, w) {
      s.snap(-1, `Goal: does any stored word start with "${w}"? Same loop as search; only the last line differs.`);
      if (!walk(s, w, 'prefix', 'False')) {
        s.result = false;
        s.snap(-1, `Returned False: no stored word starts with "${w}".`);
        return;
      }
      const under = s.t.wordsUnder(s.cur);
      for (const id of [s.cur]) s.hit.add(id);
      s.ret = 'True'; s.result = true;
      s.snap(6, `The whole prefix was walked, so return True. is_end does not matter: ${s.name(s.cur)} has at least one word below it (${listWords(under)}), because nodes are only ever created on the way to a word.`);
      s.snap(-1, `Returned True after ${w.length} step${w.length === 1 ? '' : 's'}: O(L). Finding the matching words themselves is autocomplete's job.`);
    },
  },
  {
    key: 'match', name: 'Word matcher', big: 'O(26ᵏ · L)', input: 'pattern', label: 'Pattern (. = any letter)', def: '.o',
    examples: [['.o', 'dead end first'], ['c.r', ''], ['ca.e', ''], ['...d', ''], ['ca.', '. at the end'], ['d.t', 'no match']],
    words: () => WORDS,
    call: (a) => `trie.match("${a}")`,
    sum: () => "'.' matches any one letter (LeetCode 211, Add and Search Word). A letter has one child to follow; a '.' tries every child with depth-first search and backtracks from dead ends.",
    code: CODE.match, count: 'dfs calls', stack: true,
    run(s, pat) {
      const k = [...pat].filter((c) => c === '.').length;
      s.snap(-1, `Goal: is there a stored word of exactly ${pat.length} letter${pat.length === 1 ? '' : 's'} that fits "${pat}"? ${k ? `It has ${k} wildcard${k === 1 ? '' : 's'}, so the search may branch.` : 'No wildcards, so this is just search.'}`);
      s.tiles = { label: 'pattern', text: pat, i: -1 }; s.stack = [];
      let found = null;
      const setVars = (id, i) => { s.sc = { pattern: q(pat), node: s.name(id), i }; if (i < pat.length) s.sc.ch = `'${pat[i]}'`; };
      const dfs = (id, i) => {
        const node = s.t.nodes[id], nm = s.name(id);
        setVars(id, i);
        if (i === pat.length) {
          if (node.end) { found = id; s.snap([2, 3], `i = ${i} = len(pattern): every character matched on the way down. return node.is_end: ${nm} ends a word, so True.`); }
          else { s.dead.add(id); s.snap([2, 3], `i = ${i} = len(pattern), but ${nm}.is_end is False ("${s.t.prefix(id)}" is only a prefix). return False.`); }
          return node.end;
        }
        const ch = pat[i];
        if (ch === '.') {
          const kids = Object.entries(node.kids);
          s.snap([4, 5], `ch = pattern[${i}] = '.', the wildcard. Any one letter fits here, so try each child of ${nm} in turn: ${kids.length ? letters(kids.map((e) => e[0])) : 'it has none'}.`);
          for (let j = 0; j < kids.length; j++) {
            const [c, cid] = kids[j];
            s.enter('dfs', cid, i + 1); s.count.n++; setVars(cid, i + 1);
            s.snap([6, 7], `Try '${c}': call dfs(${s.name(cid)}, ${i + 1}). This frame waits on the stack; if the call fails we come back here.`);
            const r = dfs(cid, i + 1);
            s.leave(); setVars(id, i);
            if (r) { s.snap([7, 8], `dfs(${s.name(cid)}, ${i + 1}) returned True, so return True at once.${j < kids.length - 1 ? ` The other children (${letters(kids.slice(j + 1).map((e) => e[0]))}) are never tried.` : ''}`); return true; }
            s.dead.add(cid);
            s.snap(7, `dfs(${s.name(cid)}, ${i + 1}) returned False: a dead end. Backtrack to ${nm}${j < kids.length - 1 ? ` and try the next child, '${kids[j + 1][0]}'.` : '. That was its last child.'}`);
          }
          s.snap(9, kids.length ? `No child of ${nm} can finish the pattern, so return False.` : `${cap(nm)} has no children: the loop runs zero times and we return False. A '.' still needs a real letter.`);
          return false;
        }
        const cid = s.t.child(id, ch);
        if (!cid) {
          const ks = s.t.kidKeys(id);
          s.miss = { from: id, ch };
          s.snap([4, 5, 10, 11], `ch = pattern[${i}] = '${ch}', a plain letter, but ${nm} has no '${ch}' child (${ks.length ? 'only ' + letters(ks) : 'no children at all'}). return False.`);
          return false;
        }
        s.enter('dfs', cid, i + 1); s.count.n++; setVars(cid, i + 1);
        s.snap([4, 5, 10, 12], `ch = pattern[${i}] = '${ch}', a plain letter: only the '${ch}' child can match. return dfs(${s.name(cid)}, ${i + 1}) hands back whatever that call returns.`);
        const r = dfs(cid, i + 1);
        s.leave(); setVars(id, i);
        if (!r) s.dead.add(cid);
        return r;
      };
      s.enter('dfs', ROOT, 0); s.count.n++; setVars(ROOT, 0);
      s.snap(13, 'Call dfs(self.root, 0): start at the root, at pattern index 0.');
      const r = dfs(ROOT, 0);
      s.leave(); s.stack = [];
      s.result = r; s.ret = r ? 'True' : 'False';
      s.sc = { pattern: q(pat) };
      if (r) { s.cur = found; s.hit.add(found); s.tiles.i = pat.length; }
      else { s.cur = ROOT; s.tiles.i = -1; }
      const all = s.t.words().filter((w) => fits(pat).test(w));
      s.snap(13, r ? `dfs(self.root, 0) returned True: "${s.t.prefix(found)}" fits "${pat}". match returns True.` : `dfs(self.root, 0) returned False: no stored word fits "${pat}". match returns False.`);
      s.snap(-1, `Returned ${s.ret} after ${s.count.n} dfs call${s.count.n === 1 ? '' : 's'}${s.dead.size ? `, backing out of ${s.dead.size} dead end${s.dead.size === 1 ? '' : 's'}` : ''}. ${all.length ? `Stored words that fit: ${listWords(all)}; DFS stops at the first.` : 'No stored word fits.'} Each node is visited at most once, so the trie's size also caps the work.`);
    },
  },
  {
    key: 'auto', name: 'Autocomplete', big: 'O(L + subtree)', input: 'word', label: 'Prefix', def: 'ca',
    examples: [['ca', '4 words'], ['do', ''], ['c', ''], ['x', 'none']],
    words: () => WORDS,
    call: (a) => `trie.autocomplete("${a}")`,
    sum: () => 'Walk down the prefix like starts_with, then collect every word in the subtree below it with a depth-first search.',
    code: CODE.auto, stack: true, count: 'nodes visited',
    run(s, w) {
      s.snap(-1, `Goal: list every stored word that starts with "${w}". First find the node for "${w}", then gather everything below it.`);
      if (!walk(s, w, 'prefix', '[]')) {
        s.result = [];
        s.snap(-1, 'Returned []: no stored word starts with that prefix.');
        return;
      }
      const words = [], start = s.cur;
      s.sc.words = '[]';
      s.snap(6, `${cap(s.name(start))} found. words = []: the list collect() will fill.`);
      s.stack = [];
      const collect = (id, path, first, parent, c) => {
        s.enter('collect', id, null, q(path)); s.count.n++;
        s.sc = { prefix: q(w), node: s.name(id), path: q(path), words: pyList(words) };
        const n = s.t.nodes[id], ks = s.t.kidKeys(id);
        const head = first ? [12, 7, 8] : [10, 11, 7, 8];
        const intro = first ? `collect(${s.name(id)}, "${path}").` : `Next child of ${s.name(parent)}: '${c}'. collect(${s.name(id)}, "${path}").`;
        const tail = ks.length ? ` Then visit its children in order: ${letters(ks)}.` : ' It has no children, so this call ends here and we back up.';
        if (n.end) {
          words.push(path); s.hit.add(id); s.sc.words = pyList(words);
          s.snap(head.concat(9), `${intro} is_end is True, so words.append("${path}").${tail}`);
        } else s.snap(head, `${intro} is_end is False: "${path}" is not a word itself.${tail}`);
        for (const k of ks) collect(n.kids[k], path + k, false, id, k);
        s.leave();
      };
      collect(start, w, true);
      s.stack = []; s.cur = start;
      s.ret = pyList(words); s.result = words.slice();
      s.sc = { prefix: q(w), words: pyList(words) };
      s.snap(13, `collect is done. return words: ${pyList(words)}. The order is depth-first, children in insertion order, which here is also alphabetical.`);
      s.snap(-1, `Returned ${words.length} word${words.length === 1 ? '' : 's'}. Work: ${w.length} step${w.length === 1 ? '' : 's'} to reach the prefix plus ${s.count.n - w.length} node${s.count.n - w.length === 1 ? '' : 's'} in its subtree. Words that do not start with "${w}" are never touched.`);
    },
  },
  {
    key: 'delete', name: 'Delete', big: 'O(L)', input: 'word', label: 'Word to delete', def: 'dog',
    examples: [['dog', 'prune'], ['car', 'unmark only'], ['cat', 'prune'], ['ca', 'not stored']],
    words: () => WORDS,
    call: (a) => `trie.delete("${a}")`,
    sum: () => 'Recurse down to the last letter and clear is_end. On the way back up, delete each node that is now useless: not a word end and no children.',
    code: CODE.del, stack: true, count: 'nodes pruned',
    run(s, w) {
      s.snap(-1, `Goal: remove "${w}". Clearing one flag removes the word; the extra work is pruning nodes that no other word needs.`);
      s.tiles = { label: 'word', text: w, i: -1 }; s.stack = [];
      let found = false;
      const setVars = (id, i) => { s.sc = { word: q(w), node: s.name(id), i }; if (i < w.length) s.sc.ch = `'${w[i]}'`; };
      const del = (id, i) => {
        const node = s.t.nodes[id], nm = s.name(id);
        setVars(id, i);
        if (i === w.length) {
          if (!node.end) { s.snap([2, 3, 4], `i = ${i} = len(word), but ${nm}.is_end is False: "${w}" was never stored, it is only a prefix. return False and change nothing.`); return false; }
          node.end = false; found = true;
          s.snap([2, 3, 5], `i = ${i} = len(word) and ${nm}.is_end is True: "${w}" is here. node.is_end = False: from now on search("${w}") is False.`);
          const ks = s.t.kidKeys(id), prune = !ks.length;
          s.snap(6, prune ? `${cap(nm)} has no children, so no other word needs it: return True, telling the caller to delete it.` : `${cap(nm)} still has children (${letters(ks)}): other words run through it, so return False and keep the node.`);
          return prune;
        }
        const ch = w[i], cid = s.t.child(id, ch);
        if (!cid) {
          s.miss = { from: id, ch };
          s.snap([7, 8, 9, 10], `ch = '${ch}', but ${nm}.children.get('${ch}') is None: "${w}" is not stored. return False.`);
          return false;
        }
        s.enter('_delete', cid, i + 1); setVars(cid, i + 1);
        s.snap([7, 8, 9, 11], `ch = '${ch}': child = ${s.name(cid)}. Recurse: _delete(${s.name(cid)}, ${i + 1}).`);
        const r = del(cid, i + 1);
        s.leave(); setVars(id, i);
        if (r) {
          const cname = s.name(cid);
          s.ghost.push({ id: cid, node: { ...s.t.nodes[cid] }, order: s.t.kidKeys(id) });
          s.t.remove(cid); s.count.n++;
          s.snap([11, 12], `_delete(${cname}, ${i + 1}) returned True, so del node.children['${ch}']: ${cname} is pruned from ${nm}.`);
          const ks = s.t.kidKeys(id), again = !node.end && !ks.length;
          let t;
          if (id === ROOT) t = 'return not node.is_end and not node.children. The root is never removed: delete() ignores this value.';
          else if (node.end) t = `return not node.is_end and ...: ${nm} is itself the end of "${s.t.prefix(id)}", so it must stay. return False.`;
          else if (ks.length) t = `${cap(nm)} still has children (${letters(ks)}), so it stays. return False.`;
          else t = `${cap(nm)} is now a leaf and not a word end: return True so its parent prunes it too.`;
          s.snap(13, t);
          return again;
        }
        s.snap([11, 14], `_delete(${s.name(cid)}, ${i + 1}) returned False, so ${nm} keeps its '${ch}' child. return False: nothing above needs pruning either.`);
        return false;
      };
      s.enter('_delete', ROOT, 0); setVars(ROOT, 0);
      s.snap(15, 'Call _delete(self.root, 0). It returns True when its node should be deleted by the caller.');
      del(ROOT, 0);
      s.leave(); s.stack = []; s.cur = ROOT; s.sc = { word: q(w) };
      s.result = s.t.words();
      s.tiles.i = -1;
      s.snap(-1, found ? `"${w}" is gone and ${s.count.n} node${s.count.n === 1 ? ' was' : 's were'} pruned. Stored words now: ${listWords(s.result)}. At most one frame per letter, so O(L).` : `"${w}" was not stored, so the trie is unchanged.`);
    },
  },
];

// Run operation opIdx with argument arg. Returns {op, steps, sim}.
export function runOp(opIdx, arg) {
  const op = OPS[opIdx];
  const a = op.input ? (arg ?? op.def) : undefined;
  const s = new Sim(op.words());
  s.count.label = op.count || 'nodes visited';
  op.run(s, a);
  return { op, steps: s.steps, sim: s, arg: a };
}

// Validate a typed word or pattern. Returns {value} or {error}.
export function parseArg(kind, text) {
  const t = String(text ?? '').trim().toLowerCase();
  if (!t) return { error: 'Type at least one letter.' };
  if (t.length > MAXLEN) return { error: `Keep it to ${MAXLEN} characters or fewer so the tree fits (that was ${t.length}).` };
  if (kind === 'pattern') {
    if (!/^[a-z.]+$/.test(t)) return { error: 'Use only the letters a to z and "." (any one letter).' };
  } else if (!/^[a-z]+$/.test(t)) {
    return { error: t.includes('.') ? '"." only works in the word matcher. Use the letters a to z here.' : 'Use only the letters a to z.' };
  }
  return { value: t };
}

// ---------- rendering ----------
if (typeof document !== 'undefined' && document.getElementById('tr-stage')) initUI();

function initUI() {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('tr-stage'), layer = $('tr-layer');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = 800, R = 16, ROOTY = 112, LV = 68, SWMAX = 104, TW = 30, TG = 5, PX = 596, PW = 192;
  let opIdx = 0, steps = [], idx = 0, cur = {}, els = null, anim = 0, timer = 0, op = null;
  const MISS = '__miss';
  let geo = { stack: false, cx: 400, treeW: 760, H: 400 };
  const args = {}; // typed argument per op index

  function el(t, a, p) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  const prefixOf = (st, id) => { let s = ''; while (id && id !== ROOT && st.nodes[id]) { s = st.nodes[id].ch + s; id = st.nodes[id].p; } return s; };
  const wordsOf = (st) => Object.keys(st.nodes).filter((id) => st.nodes[id].end && !st.nodes[id].gone).map((id) => prefixOf(st, id));

  function layout(st) {
    const pos = {}; let leaf = 0;
    const rec = (id, d) => {
      if (id === MISS) { pos[id] = { slot: leaf, d }; return leaf++; }
      const ks = Object.values(st.nodes[id].kids);
      if (st.miss && st.miss.from === id) ks.push(MISS); // phantom slot for the child that is not there
      let slot;
      if (!ks.length) slot = leaf++;
      else { const ss = ks.map((k) => rec(k, d + 1)); slot = (ss[0] + ss[ss.length - 1]) / 2; }
      pos[id] = { slot, d }; return slot;
    };
    rec(ROOT, 0);
    const sw = Math.min(SWMAX, geo.treeW / Math.max(leaf, 1));
    const out = {};
    for (const id in pos) out[id] = { x: geo.cx + (pos[id].slot - (leaf - 1) / 2) * sw, y: ROOTY + pos[id].d * LV };
    return out;
  }

  function build() {
    const st = steps[idx];
    layer.innerHTML = ''; els = { nodes: {}, edges: [], tag: null, miss: null };
    const onPath = new Set(st.path), dead = new Set(st.dead), hit = new Set(st.hit), fresh = new Set(st.fresh);
    // header: letter tiles and counters
    if (st.tiles) {
      const T = st.tiles, x0 = 16 + 8.2 * T.label.length + 12;
      el('text', { x: 16, y: 40, class: 'tr-meta' }, layer).textContent = T.label;
      [...T.text].forEach((c, i) => {
        const cls = i === T.i ? 'cur' : i < T.i ? 'done' : '';
        const g = el('g', { class: 'tr-tile ' + cls + (c === '.' ? ' wild' : ''), transform: `translate(${x0 + i * (TW + TG)} 20)` }, layer);
        el('rect', { width: TW, height: TW, rx: 5, class: 'tr-tbox' }, g);
        el('text', { x: TW / 2, y: TW / 2 + 6, class: 'tr-tchar' }, g).textContent = c;
        el('text', { x: TW / 2, y: TW + 12, class: 'tr-tidx' }, g).textContent = i;
      });
    }
    const n = Object.keys(st.nodes).filter((id) => !st.nodes[id].gone).length;
    el('text', { x: W - 16, y: 40, class: 'tr-meta', 'text-anchor': 'end' }, layer).textContent = `nodes ${n} · ${st.count.label} ${st.count.n}`;
    // edges, with the letter on each edge
    const gE = el('g', {}, layer), gL = el('g', {}, layer), gM = el('g', {}, layer), gN = el('g', {}, layer);
    for (const id in st.nodes) {
      const nd = st.nodes[id]; if (!nd.p) continue;
      const on = onPath.has(id) && onPath.has(nd.p);
      const cls = (on ? ' on' : '') + (nd.gone ? ' gone' : '') + (dead.has(id) ? ' dead' : '');
      const line = el('line', { class: 'tr-edge' + cls }, gE);
      const lab = el('g', { class: 'tr-elab' + cls }, gL);
      el('rect', { x: -9, y: -10, width: 18, height: 18, rx: 4, class: 'tr-ebox' }, lab);
      el('text', { y: 4, class: 'tr-echar' }, lab).textContent = nd.ch;
      els.edges.push({ a: nd.p, b: id, line, lab });
    }
    // a child the code looked for and did not find
    if (st.miss) {
      const g = el('g', { class: 'tr-miss' }, gM);
      const line = el('line', { class: 'tr-mline' }, g);
      const lab = el('g', {}, g);
      el('rect', { x: -9, y: -10, width: 18, height: 18, rx: 4, class: 'tr-ebox' }, lab);
      el('text', { y: 4, class: 'tr-echar' }, lab).textContent = st.miss.ch;
      const end = el('g', {}, g);
      el('circle', { r: R - 3, class: 'tr-mdisc' }, end);
      el('text', { y: 5, class: 'tr-mx' }, end).textContent = '✕';
      els.miss = { from: st.miss.from, line, lab, end };
    }
    // nodes
    for (const id in st.nodes) {
      const nd = st.nodes[id], c = ['tr-node'];
      if (id === st.cur) c.push('cur'); else if (onPath.has(id)) c.push('path');
      if (nd.end) c.push('end');
      if (hit.has(id)) c.push('hit');
      if (dead.has(id) && id !== st.cur) c.push('dead');
      if (fresh.has(id)) c.push('fresh');
      if (nd.gone) c.push('gone');
      if (!cur[id]) c.push('tr-enter');
      const g = el('g', { class: c.join(' ') }, gN);
      el('circle', { r: R, class: 'tr-disc' }, g);
      if (nd.end) el('circle', { r: R - 5, class: 'tr-ring' }, g);
      if (dead.has(id) && id !== st.cur) el('text', { y: 5, class: 'tr-x' }, g).textContent = '✕';
      if (id === ROOT) el('text', { y: -R - 8, class: 'tr-rootlab' }, g).textContent = 'root';
      if (nd.end) el('text', { x: R + 6, y: 4, class: 'tr-wlab' }, g).textContent = prefixOf(st, id);
      els.nodes[id] = g;
    }
    // the local variable "node", like a label pointing at the node it holds
    if (st.cur && st.nodes[st.cur]) {
      els.tag = el('g', { class: 'tr-var' }, layer); // filled by placeTag once the layout is known
    }
    // call stack panel
    if (geo.stack) {
      const g = el('g', { transform: `translate(${PX} 70)` }, layer);
      const ttl = el('text', { x: 0, y: 0, class: 'tr-meta' }, g);
      ttl.textContent = 'call stack ';
      el('tspan', { class: 'tr-smeta' }, ttl).textContent = '· newest last';
      const fr = st.stack || [];
      if (!fr.length) el('text', { x: 0, y: 28, class: 'tr-smeta' }, g).textContent = st.line[0] < 0 ? '(no calls running)' : '(empty)';
      fr.forEach((f, i) => {
        const top = i === fr.length - 1;
        const b = el('g', { class: 'tr-frame' + (top ? ' top' : ''), transform: `translate(${Math.min(i, 6) * 4} ${12 + i * 30})` }, g);
        el('rect', { width: PW - Math.min(i, 6) * 4, height: 24, rx: 5, class: 'tr-fbox' }, b);
        const t = el('text', { x: 8, y: 16, class: 'tr-ftxt' }, b);
        t.textContent = f.label;
        if (f.label.length > 25) t.setAttribute('textLength', String(PW - Math.min(i, 6) * 4 - 14));
      });
    }
  }

  function apply(pos) {
    for (const id in els.nodes) { const p = pos[id]; if (p) els.nodes[id].setAttribute('transform', `translate(${p.x} ${p.y})`); }
    for (const e of els.edges) {
      const a = pos[e.a], b = pos[e.b]; if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      e.line.setAttribute('x1', a.x + ux * R); e.line.setAttribute('y1', a.y + uy * R);
      e.line.setAttribute('x2', b.x - ux * R); e.line.setAttribute('y2', b.y - uy * R);
      e.lab.setAttribute('transform', `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`);
    }
    if (els.miss) {
      const a = pos[els.miss.from], b = pos[MISS];
      if (a && b) {
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        els.miss.line.setAttribute('x1', a.x + ux * R); els.miss.line.setAttribute('y1', a.y + uy * R);
        els.miss.line.setAttribute('x2', b.x - ux * (R - 3)); els.miss.line.setAttribute('y2', b.y - uy * (R - 3));
        els.miss.lab.setAttribute('transform', `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`);
        els.miss.end.setAttribute('transform', `translate(${b.x} ${b.y})`);
      }
    }
    const st = steps[idx];
    if (els.tag && pos[st.cur]) els.tag.setAttribute('transform', `translate(${pos[st.cur].x} ${pos[st.cur].y})`);
  }

  // Put the "node" label beside the current node, on the first side that is free of
  // other nodes, word labels and edge letters (all measured in the final layout).
  const TAGW = 42, TAGH = 20, GAP = 10;
  const SPOTS = [
    { bx: -R - GAP - TAGW, by: -TAGH / 2, s: [-R - 3, 0, -R - GAP, 0] },          // left
    { bx: R + GAP, by: -TAGH / 2, s: [R + 3, 0, R + GAP, 0] },                     // right
    { bx: -R - GAP - TAGW + 4, by: -R - TAGH - 4, s: [-R * 0.7, -R * 0.7, -R - GAP + 4, -R - 6] }, // upper left
    { bx: R + GAP - 4, by: -R - TAGH - 4, s: [R * 0.7, -R * 0.7, R + GAP - 4, -R - 6] },          // upper right
  ];
  function placeTag(st, to) {
    const g = els.tag; if (!g) return;
    const c = to[st.cur], boxes = [];
    for (const id in to) {
      const p = to[id];
      if (id !== st.cur) boxes.push([p.x - R, p.y - R, p.x + R, p.y + R]);
      const nd = st.nodes[id];
      if (nd && nd.end) boxes.push([p.x + R + 4, p.y - 8, p.x + R + 8 + prefixOf(st, id).length * 7, p.y + 7]);
      const par = id === MISS ? st.miss.from : nd && nd.p;
      if (par && to[par]) { const q = to[par]; boxes.push([(p.x + q.x) / 2 - 10, (p.y + q.y) / 2 - 11, (p.x + q.x) / 2 + 10, (p.y + q.y) / 2 + 9]); }
    }
    const hit = (sp) => {
      const x0 = c.x + sp.bx, y0 = c.y + sp.by, x1 = x0 + TAGW, y1 = y0 + TAGH;
      if (x0 < 4 || x1 > (geo.stack ? PX - 6 : W - 4) || y0 < 60) return true;
      return boxes.some((b) => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);
    };
    const sp = SPOTS.find((x) => !hit(x)) || SPOTS[0];
    el('line', { x1: sp.s[0], y1: sp.s[1], x2: sp.s[2], y2: sp.s[3], class: 'tr-vstem' }, g);
    el('rect', { x: sp.bx, y: sp.by, width: TAGW, height: TAGH, rx: 5, class: 'tr-vbox' }, g);
    el('text', { x: sp.bx + TAGW / 2, y: sp.by + 14, class: 'tr-vtxt' }, g).textContent = 'node';
  }

  function show() {
    const st = steps[idx];
    cancelAnimationFrame(anim); build();
    const to = layout(st), from = {};
    placeTag(st, to);
    for (const id in to) {
      if (cur[id]) from[id] = cur[id];
      else { const p = id === MISS ? st.miss.from : st.nodes[id].p; from[id] = p && cur[p] ? cur[p] : to[id]; }
    }
    const dur = reduce ? 0 : 600, t0 = performance.now();
    const frame = (t) => {
      const k = dur ? Math.min(1, Math.max(0, (t - t0) / dur)) : 1, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, now = {};
      for (const id in to) { const a = from[id], b = to[id]; now[id] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }; }
      apply(now); if (k < 1) anim = requestAnimationFrame(frame);
    };
    frame(t0); cur = to; delete cur[MISS];
    // accessible description of the picture
    const ws = wordsOf(st);
    let lab = `Trie holding ${ws.length ? ws.join(', ') : 'no words'}`;
    if (st.cur && st.nodes[st.cur]) lab += `; node is at ${st.cur === ROOT ? 'the root' : '"' + prefixOf(st, st.cur) + '"'}`;
    if (st.tiles) lab += `; ${st.tiles.label} "${st.tiles.text}"` + (st.tiles.i >= 0 && st.tiles.i < st.tiles.text.length ? `, at letter ${st.tiles.i}` : '');
    if (st.stack && st.stack.length) lab += `; call stack: ${st.stack.map((f) => f.label).join(', ')}`;
    svg.setAttribute('aria-label', lab);
    // code
    const code = $('tr-code'); code.innerHTML = '';
    op.code.forEach((ln, i) => {
      const dv = document.createElement('div'); if (st.line.includes(i)) dv.className = 'on';
      const nn = document.createElement('span'); nn.className = 'ln'; nn.textContent = i + 1;
      const c = document.createElement('span'); c.textContent = ln || ' ';
      dv.append(nn, c); code.appendChild(dv);
    });
    const lines = st.line[0] < 0 ? '' : ' · line' + (st.line.length > 1 ? 's ' : ' ') + st.line.map((x) => x + 1).join(', ');
    $('tr-stepno').textContent = idx === 0 ? 'Before the call' : idx === steps.length - 1 ? 'After the call' : `Step ${idx} of ${steps.length - 2}${lines}`;
    $('tr-narr').textContent = st.text;
    const V = $('tr-vars'); V.innerHTML = '';
    const chip = (t, c) => { const s = document.createElement('span'); s.textContent = t; if (c) s.className = c; V.appendChild(s); };
    for (const k in st.sc) chip(`${k} = ${st.sc[k]}`, k === 'node' ? 'ix' : '');
    if (st.ret !== null) chip('returned ' + st.ret, 'ret');
    $('tr-prev').disabled = idx === 0;
    $('tr-next').disabled = idx === steps.length - 1;
    const dots = $('tr-dots'); dots.innerHTML = '';
    steps.forEach((_, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tr-dot' + (i === idx ? ' on' : '');
      b.setAttribute('aria-label', 'Go to step ' + i); if (i === idx) b.setAttribute('aria-current', 'step');
      b.onclick = () => { stop(); idx = i; show(); };
      dots.appendChild(b);
    });
  }

  function loadOp(keepStep) {
    stop();
    const r = runOp(opIdx, args[opIdx]); op = r.op; steps = r.steps; idx = 0; cur = {};
    let depth = 0;
    const depthOf = (st, x) => { let d = 0; while (st.nodes[x].p) { d++; x = st.nodes[x].p; } return d; };
    for (const st of steps) {
      for (const id in st.nodes) depth = Math.max(depth, depthOf(st, id));
      if (st.miss) depth = Math.max(depth, depthOf(st, st.miss.from) + 1);
    }
    const stack = !!op.stack;
    let frames = 0; for (const st of steps) if (st.stack) frames = Math.max(frames, st.stack.length);
    geo = { stack, cx: stack ? (PX - 12) / 2 + 4 : W / 2, treeW: stack ? PX - 40 : W - 60, H: 0 };
    geo.H = Math.max(ROOTY + depth * LV + 40, stack ? 70 + 24 + frames * 30 + 16 : 0, 260);
    svg.setAttribute('viewBox', `0 0 ${W} ${geo.H}`);
    $('tr-call').textContent = op.call(r.arg); $('tr-big').textContent = op.big; $('tr-sum').textContent = op.sum();
    document.querySelectorAll('#tr-ops .tr-op').forEach((b, i) => b.setAttribute('aria-pressed', i === opIdx ? 'true' : 'false'));
    renderCustom(r.arg);
    if (keepStep !== undefined) idx = Math.max(0, Math.min(steps.length - 1, keepStep));
    show();
  }

  function renderOps() {
    const box = $('tr-ops'); box.innerHTML = '';
    OPS.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tr-op';
      const a = document.createElement('span'); a.textContent = o.name;
      const sm = document.createElement('small'); sm.textContent = o.big;
      b.append(a, sm); b.onclick = () => { opIdx = i; loadOp(); }; box.appendChild(b);
    });
  }

  function renderCustom(a) {
    const form = $('tr-custom'), inp = $('tr-in'), err = $('tr-err'), ex = $('tr-ex');
    err.textContent = ''; inp.removeAttribute('aria-invalid');
    if (!op.input) { form.hidden = true; return; }
    form.hidden = false;
    $('tr-in-label').textContent = op.label;
    inp.value = a;
    ex.innerHTML = '';
    for (const [v, note] of op.examples) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tr-chip';
      b.setAttribute('aria-pressed', v === a ? 'true' : 'false');
      const s = document.createElement('span'); s.textContent = v; b.appendChild(s);
      if (note) { const sm = document.createElement('small'); sm.textContent = note; b.appendChild(sm); }
      b.onclick = () => { args[opIdx] = v; loadOp(); };
      ex.appendChild(b);
    }
  }

  $('tr-custom').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('tr-in'), err = $('tr-err');
    const r = parseArg(op.input, inp.value);
    if (r.error) { err.textContent = r.error; inp.setAttribute('aria-invalid', 'true'); return; }
    args[opIdx] = r.value; loadOp();
  });

  function stop() { clearInterval(timer); timer = 0; $('tr-play').textContent = '▶ Play'; $('tr-play').setAttribute('aria-pressed', 'false'); }
  $('tr-play').onclick = () => {
    if (timer) { stop(); return; }
    if (idx === steps.length - 1) { idx = 0; cur = {}; show(); }
    $('tr-play').textContent = '❚❚ Pause'; $('tr-play').setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { if (idx < steps.length - 1) { idx++; show(); } if (idx === steps.length - 1) stop(); }, 2200);
  };
  $('tr-next').onclick = () => { stop(); if (idx < steps.length - 1) { idx++; show(); } };
  $('tr-prev').onclick = () => { stop(); if (idx > 0) { idx--; show(); } };
  $('tr-reset').onclick = () => { stop(); idx = 0; cur = {}; show(); };
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') $('tr-next').click();
    if (e.key === 'ArrowLeft') $('tr-prev').click();
  });

  // ?op=4&arg=...d&step=5 opens a given step (handy for linking and screenshots)
  const qp = new URLSearchParams(location.search);
  const qo = parseInt(qp.get('op'), 10); if (qo >= 0 && qo < OPS.length) opIdx = qo;
  if (qp.has('arg') && OPS[opIdx].input) { const r = parseArg(OPS[opIdx].input, qp.get('arg')); if (r.value) args[opIdx] = r.value; }
  const qs = parseInt(qp.get('step'), 10);
  renderOps(); loadOp(Number.isFinite(qs) ? qs : undefined);
}
