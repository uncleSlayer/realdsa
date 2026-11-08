// Dijkstra Lab: step-by-step simulator and renderer.
// The top half is pure (no DOM): each operation runs the Python on the page against a small
// weighted graph and snapshots { dist, prev, pq, done, ... } after every step. The bottom half
// only reads those snapshots and draws them (graph, dist/prev table, priority queue, code).
//
// The priority queue is kept as a plain array and popped by the same rule heapq uses:
// the smallest (d, v) tuple, comparing d first and the vertex name on a tie.

// ---------- graphs ----------
// adj lists keep Python's order: for v, w in graph[u] visits them left to right.
// pos: where each vertex sits in a 480 x 270 drawing. lab: dist label above (n) or below (s).
// side: which side of an edge its weight label sits (+1 / -1 along the left normal).
export const GRAPHS = {
  main: {
    name: 'graph',
    adj: {
      A: [['B', 4], ['C', 1]],
      B: [['D', 1]],
      C: [['B', 2], ['D', 5], ['E', 8]],
      D: [['E', 3], ['F', 6]],
      E: [['F', 1]],
      F: [],
    },
    pos: { A: [50, 135], B: [180, 52], C: [180, 218], D: [310, 52], E: [310, 218], F: [436, 135] },
    lab: { A: 's', B: 'n', C: 's', D: 'n', E: 's', F: 's' },
    side: { 'A>B': -1, 'A>C': 1, 'C>B': -1, 'B>D': -1, 'C>D': 1, 'C>E': 1, 'D>E': -1, 'D>F': -1, 'E>F': 1 },
  },
  stale: {
    name: 'small',
    adj: {
      S: [['A', 6], ['B', 2]],
      A: [['C', 1]],
      B: [['A', 3], ['C', 7]],
      C: [],
    },
    pos: { S: [60, 135], A: [240, 52], B: [240, 218], C: [420, 135] },
    lab: { S: 's', A: 'n', B: 's', C: 's' },
    side: { 'S>A': -1, 'S>B': 1, 'B>A': -1, 'A>C': -1, 'B>C': 1 },
  },
  neg: {
    name: 'neg',
    adj: {
      A: [['B', 4], ['C', 2]],
      B: [['C', -3]],
      C: [],
    },
    pos: { A: [70, 200], B: [240, 60], C: [410, 200] },
    lab: { A: 's', B: 'n', C: 's' },
    side: { 'A>B': -1, 'A>C': 1, 'B>C': -1 },
  },
};
export const verts = (G) => Object.keys(G.adj);
export const edges = (G) => verts(G).flatMap((u) => G.adj[u].map(([v, w]) => [u, v, w]));

// ---------- code listings ----------
export const DIJ_CODE = [
  'import heapq',
  '',
  'def dijkstra(graph, source):',
  "    dist = {v: float('inf') for v in graph}",
  '    prev = {v: None for v in graph}',
  '    dist[source] = 0',
  '    pq = [(0, source)]',
  '    while pq:',
  '        d, u = heapq.heappop(pq)',
  '        if d > dist[u]:          # stale entry, u already finalised with a shorter distance',
  '            continue',
  '        for v, w in graph[u]:',
  '            nd = d + w',
  '            if nd < dist[v]:     # relaxation',
  '                dist[v] = nd',
  '                prev[v] = u',
  '                heapq.heappush(pq, (nd, v))',
  '    return dist, prev',
];
export const PATH_CODE = [
  'def shortest_path(prev, source, target):',
  '    path = []',
  '    v = target',
  '    while v is not None:',
  '        path.append(v)',
  '        v = prev[v]',
  '    path.reverse()',
  '    return path if path[0] == source else []',
];

// ---------- Python-style formatting ----------
export const q = (v) => (v === null || v === undefined ? 'None' : `'${v}'`);
export const num = (x) => (x === Infinity ? '∞' : String(x));
export const tup = ([d, v]) => `(${num(d)}, ${q(v)})`;
const plus = (d, w) => `${d} + ${w < 0 ? `(${w})` : w}`;
const pyList = (a) => '[' + a.map(q).join(', ') + ']';
const pyDict = (o, f) => '{' + Object.keys(o).map((k) => `${q(k)}: ${f(o[k])}`).join(', ') + '}';
const adjRepr = (G, u) => '[' + G.adj[u].map(([v, w]) => `(${q(v)}, ${w})`).join(', ') + ']';
const plural = (n, s, p = s + 's') => `${n} ${n === 1 ? s : p}`;
export const cmpEntry = (a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);

// ---------- simulator ----------
class Run {
  constructor(G, source) {
    this.G = G; this.src = source; this.init = false;
    this.dist = {}; this.prev = {};
    for (const v of verts(G)) { this.dist[v] = Infinity; this.prev[v] = null; }
    this.pq = []; this.done = new Set(); this.reopen = new Set(); this.popsOf = {};
    this.stats = { pushes: 0, pops: 0, stale: 0, checks: 0 };
    this.steps = [];
  }
  push(e) { this.pq.push(e); this.pq.sort(cmpEntry); this.stats.pushes++; }
  pop() { this.stats.pops++; return this.pq.shift(); }
  snap(line, text, extra = {}) {
    this.steps.push({
      init: this.init,
      source: this.src,
      dist: { ...this.dist },
      prev: { ...this.prev },
      pq: this.pq.map((e) => e.slice()),
      done: [...this.done],
      reopen: [...this.reopen],
      stats: { ...this.stats },
      line: Array.isArray(line) ? line : [line],
      text,
      vars: extra.vars || {},
      cur: extra.cur ?? null,
      rel: extra.rel ?? null,
      relOk: !!extra.relOk,
      popped: extra.popped ?? null,
      poppedStale: !!extra.poppedStale,
      pushed: extra.pushed ?? null,
      changed: extra.changed || [],
      path: extra.path ?? null,
      pathEdges: extra.pathEdges || [],
      walk: extra.walk ?? null,
      ret: extra.ret ?? null,
      notes: extra.notes || [],
    });
  }
}

// Follow prev pointers from v back to the source (used for narration only).
function routeTo(prev, v) {
  const r = [];
  for (let x = v; x !== null && r.length < 50; x = prev[x]) r.push(x);
  return r.reverse();
}

// Final dist/prev without snapshots (used for the goal text and by the path operation).
export function solve(G, source) {
  const steps = dijkstraSteps(G, source, { quiet: true }).steps;
  const last = steps[steps.length - 1];
  return { dist: last.dist, prev: last.prev };
}

export function dijkstraSteps(G, source, { explainStale = false, quiet = false } = {}) {
  const r = new Run(G, source);
  const V = verts(G), E = edges(G);
  const hasNeg = E.some((e) => e[2] < 0);
  const vs = (o) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined));

  // Goal text: point at a direct edge from the source that loses to a detour, if there is one.
  let hook = '';
  const truth = quiet ? null : solve(G, source).dist;
  if (!quiet && !hasNeg) {
    const fin = { dist: truth };
    const beaten = G.adj[source].find(([v, w]) => fin.dist[v] < w);
    if (beaten) hook = ` Notice the direct edge ${source} → ${beaten[0]} costs ${beaten[1]}: is it the shortest way to ${beaten[0]}?`;
  }
  r.snap(-1, hasNeg
    ? `Goal: shortest distances from ${q(source)}, but one edge is negative: ${E.filter((e) => e[2] < 0).map(([u, v, w]) => `${u} → ${v} = ${w}`).join(', ')}. Dijkstra's argument assumes every weight is ≥ 0. Watch the moment that assumption fails.`
    : explainStale
      ? `Goal: watch one vertex get pushed twice. heapq has no way to lower the priority of an entry already inside the heap (no decrease-key), so when a shorter route turns up the code pushes a second entry and leaves the old one behind. The old one is skipped when it surfaces. This is called lazy deletion.`
      : `Goal: the cheapest total weight from ${q(source)} to every vertex, plus prev pointers to rebuild each route. Every weight is ≥ 0.${hook}`);

  r.init = true;
  r.dist[source] = 0;
  r.push([0, source]);
  r.snap([3, 4, 5, 6], `dist starts at ∞, float('inf'), for every vertex and prev at None: nothing has been reached yet. Then dist[${q(source)}] = 0, because the source is 0 away from itself, and pq holds one entry, (0, ${q(source)}).`,
    { changed: ['dist:' + source], pushed: [0, source], vars: { source: q(source) } });

  while (r.pq.length) {
    const [d, u] = r.pop();
    const next = r.pq[0];
    const tie = next && next[0] === d ? ` It ties with ${tup(next)} on distance, so Python compares the second item: ${q(u)} < ${q(next[1])}.` : '';
    const base = { popped: [d, u], cur: u, vars: { d, u: q(u) } };
    if (d > r.dist[u]) {
      r.stats.stale++;
      let why = '';
      if (explainStale) {
        const scans = G.adj[u].map(([v, w]) => `${v}: ${plus(d, w)} = ${d + w}, not < ${num(r.dist[v])}`);
        why = scans.length
          ? ` Without this check the loop would scan ${u}'s ${plural(scans.length, 'edge')} again with the old d = ${d}: ${scans.join('; ')}. Nothing can improve, because ${u}'s edges were already relaxed from the smaller dist[${q(u)}] = ${r.dist[u]}. The check saves wasted work; it does not change the answer.`
          : ` ${u} has no outgoing edges, so even without the check nothing would happen here, but on a real graph each stale pop would re-scan every edge of ${u}.`;
      } else {
        why = G.adj[u].length ? ` Skipping it saves re-scanning ${u}'s edges for nothing.` : ` ${u} has no outgoing edges, so there is little to save here, but in general this skips a whole wasted scan.`;
      }
      r.snap([7, 8, 9, 10], `heappop gives ${tup([d, u])}, but dist[${q(u)}] is already ${r.dist[u]}. This entry was pushed before ${u} found its shorter route, and heapq cannot remove an entry from the middle of the heap, so it stayed behind. d > dist[u]: stale, so continue.${why}`,
        { ...base, poppedStale: true });
      continue;
    }
    const second = r.done.has(u);
    r.done.add(u); r.reopen.delete(u);
    r.popsOf[u] = (r.popsOf[u] || 0) + 1;
    const rest = r.pq.length ? `every other entry in pq is ≥ ${d}` : 'nothing else is waiting in pq';
    let t;
    if (second) {
      t = `heappop gives ${tup([d, u])}. d = ${d} matches dist[${q(u)}], which was lowered after ${u} had already been popped, so this entry is not stale and ${u} is processed a second time. Dijkstra is supposed to finalise each vertex exactly once; this lazy version only gets the right answer because it re-pushed ${u}. Had ${u} any outgoing edges, every one would be relaxed again, and so on downstream.`;
    } else if (u === source && d === 0) {
      t = `pq is not empty, so heappop takes the smallest tuple, ${tup([d, u])}. d = 0 matches dist[${q(u)}], so it is not stale. ${u} is final: nothing can be closer than the source itself.`;
    } else if (hasNeg) {
      t = `heappop takes the smallest tuple, ${tup([d, u])}.${tie} d = ${d} matches dist[${q(u)}]. Dijkstra now treats ${u} as final at ${d}: ${rest}, so it assumes no detour can come back cheaper. That assumption needs every weight ≥ 0.${truth && truth[u] < d ? ` The true distance to ${u} is ${truth[u]}, so this is already wrong.` : ''}`;
    } else {
      t = `heappop takes the smallest tuple, ${tup([d, u])}.${tie} d = ${d} matches dist[${q(u)}], so it is not stale. ${u} is now final at ${d}: ${rest}, and with weights ≥ 0 no detour can come back cheaper.`;
    }
    r.snap([7, 8, 9], t, base);

    const out = G.adj[u];
    if (!out.length) {
      r.snap(11, `graph[${q(u)}] is empty: ${u} has no outgoing edges, so the for loop does nothing.`, { cur: u, vars: { d, u: q(u), [`graph[${q(u)}]`]: '[]' } });
      continue;
    }
    for (const [v, w] of out) {
      r.stats.checks++;
      const nd = d + w, old = r.dist[v];
      const vars = vs({ d, u: q(u), v: q(v), w, nd, [`graph[${q(u)}]`]: adjRepr(G, u) });
      const head = `Edge ${u} → ${v}, weight ${w}: nd = d + w = ${plus(d, w)} = ${nd}.`;
      if (nd < old) {
        const wasDone = r.done.has(v);
        r.dist[v] = nd; r.prev[v] = u; r.push([nd, v]);
        if (wasDone) r.reopen.add(v);
        let t2;
        if (wasDone) {
          t2 = `${head} ${nd} < dist[${q(v)}] = ${old}, so ${v} gets a shorter distance even though it was already popped as final. That is exactly what Dijkstra's greedy rule promised could not happen. dist[${q(v)}] = ${nd}, prev[${q(v)}] = ${q(u)}, push ${tup([nd, v])}. A version that skips finished vertices (if v in done: continue) would never make this update, and one that returns as soon as the target is popped would already have answered ${old}.`;
        } else if (old === Infinity) {
          t2 = `${head} ${nd} < dist[${q(v)}] = ∞, so this is the first route found to ${v}: dist[${q(v)}] = ${nd}, prev[${q(v)}] = ${q(u)}, and push ${tup([nd, v])}.`;
        } else {
          t2 = `${head} ${nd} < dist[${q(v)}] = ${old}: going through ${u} is shorter. dist[${q(v)}] = ${nd}, prev[${q(v)}] = ${q(u)}, push ${tup([nd, v])}. The old entry ${tup([old, v])} is still in pq and is now stale.`;
        }
        r.snap([11, 12, 13, 14, 15, 16], t2,
          { cur: u, rel: [u, v], relOk: true, pushed: [nd, v], changed: ['dist:' + v, 'prev:' + v], vars });
      } else {
        const fin = r.done.has(v) ? ` ${v} is already final, so this was never going to win.` : ` ${v} already has a route that is at least as short, so nothing changes.`;
        r.snap([11, 12, 13], `${head} Is ${nd} < dist[${q(v)}] = ${num(old)}? No.${fin}`, { cur: u, rel: [u, v], relOk: false, vars });
      }
    }
  }
  r.snap(7, 'pq is empty, so the while loop stops. Every reachable vertex has been popped.', {});
  const unreached = V.filter((v) => r.dist[v] === Infinity);
  r.snap(17, `return dist, prev.${unreached.length ? ` ${unreached.join(', ')} kept dist = ∞ and prev = None: no route from ${source} reaches ${unreached.length === 1 ? 'it' : 'them'}.` : ''}`,
    { ret: `dist = ${pyDict(r.dist, num)}` });

  // closing summary
  const twice = V.filter((v) => (r.popsOf[v] || 0) > 1);
  const s = r.stats;
  let fin;
  if (twice.length) {
    fin = `Finished: dist = ${pyDict(r.dist, num)}. That matches the true answer (Bellman-Ford agrees), but only because ${twice.join(', ')} was processed twice. A done-set version that never touches a finished vertex again would return ${twice.map((v) => `${v} = ${firstPopDist(r, v)}`).join(', ')}. On bigger graphs this re-processing can repeat exponentially often, and a negative cycle never stops. With negative weights, use Bellman-Ford.`;
  } else {
    const reach = V.filter((v) => r.dist[v] < Infinity).length;
    fin = `Finished: dist = ${pyDict(r.dist, num)}. ${plural(s.pops, 'pop')} for ${plural(reach, 'reachable vertex', 'reachable vertices')}: ${s.stale ? `${plural(s.stale, 'stale entry was', 'stale entries were')} skipped by the d > dist[u] check` : 'no stale entries this time'}. ${plural(s.pushes, 'push', 'pushes')}, never more than E + 1 = ${E.length + 1}.`;
    const beaten = G.adj[source].find(([v, w]) => r.dist[v] < w);
    if (beaten) {
      const route = routeTo(r.prev, beaten[0]);
      fin += ` The direct edge ${source} → ${beaten[0]} costs ${beaten[1]}, but the shortest path is ${route.join(' → ')} = ${r.dist[beaten[0]]}.`;
    }
    fin += ' The blue prev edges form the shortest-path tree.';
  }
  r.snap(-1, fin, { ret: `dist = ${pyDict(r.dist, num)}` });
  return { steps: r.steps, dist: r.dist, prev: r.prev, stats: s };
}
// distance a vertex had when it was first popped (only meaningful for the negative-edge story)
function firstPopDist(r, v) {
  for (const st of r.steps) if (st.popped && st.popped[1] === v && !st.poppedStale) return st.popped[0];
  return '?';
}

export function pathSteps(G, source, target) {
  const { dist, prev } = solve(G, source);
  const all = verts(G);
  const r = new Run(G, source);
  r.init = true; r.dist = dist; r.prev = prev;
  for (const v of all) if (dist[v] < Infinity) r.done.add(v);
  r.snap(-1, `dijkstra(graph, ${q(source)}) has already run: the table shows its final dist and prev. prev[v] is the vertex just before v on its shortest path, so the route to ${q(target)} can be read backwards: start at the target and follow prev until you fall off the source.`,
    { vars: { target: q(target) } });
  const path = [];
  const pe = () => {
    const out = [];
    for (let i = 0; i + 1 < path.length; i++) out.push([path[i + 1], path[i]]);
    return out;
  };
  r.snap([1, 2], `path = [] and v = ${q(target)}. The walk starts at the target.`, { path: [], walk: target, vars: { v: q(target) } });
  let v = target;
  while (v !== null) {
    path.push(v);
    const nxt = prev[v];
    const why = nxt === null
      ? (v === source ? `prev[${q(v)}] is None because ${v} is the source.` : `prev[${q(v)}] is None because ${v} was never reached (dist = ∞).`)
      : `${nxt} is the vertex just before ${v} on the shortest path, so the edge ${nxt} → ${v} joins the highlighted route.`;
    r.snap([3, 4, 5], `v = ${q(v)} is not None, so append it: path = ${pyList(path)}. Then v = prev[${q(v)}] = ${q(nxt)}. ${why}`,
      { path: path.slice(), walk: v, pathEdges: nxt === null ? pe() : [...pe(), [nxt, v]], cur: v, vars: { v: q(nxt) } });
    v = nxt;
  }
  r.snap(3, `v is None, so the loop stops. path = ${pyList(path)} lists the route backwards, target first.`, { path: path.slice(), pathEdges: pe(), vars: { v: 'None' } });
  path.reverse();
  r.snap(6, `path.reverse() flips it in place: ${pyList(path)}, source first.`, { path: path.slice(), pathEdges: pe(), changed: [], vars: { v: 'None' } });
  let ret, fin;
  if (path[0] === source) {
    ret = path.slice();
    const ws = [];
    for (let i = 0; i + 1 < path.length; i++) ws.push(G.adj[path[i]].find((e) => e[0] === path[i + 1])[1]);
    const sum = ws.length ? `${ws.join(' + ')} = ${dist[target]}` : '0';
    r.snap(7, `path[0] is ${q(source)}, the source, so return the path. Its weights add up to ${sum}, which is exactly dist[${q(target)}].`,
      { path: path.slice(), pathEdges: pe(), ret: pyList(ret) });
    fin = path.length === 1
      ? `Returned [${q(source)}]: the target is the source, so the path is just that vertex, with distance 0.`
      : `Returned ${pyList(ret)}: ${path.length - 1} ${path.length - 1 === 1 ? 'edge' : 'edges'}, total ${dist[target]}. One loop step per vertex on the path, so rebuilding costs O(V) at most. dist tells you how far; prev tells you how.`;
  } else {
    ret = [];
    r.snap(7, `path[0] is ${q(path[0])}, not the source ${q(source)}: the walk fell off at the target itself, because ${target} was never reached. Return [].`,
      { path: path.slice(), pathEdges: [], ret: '[]' });
    fin = `Returned []: there is no path from ${source} to ${target}, and dist[${q(target)}] is still ∞. Checking dist[target] == float('inf') before walking works too.`;
  }
  r.snap(-1, fin, { path: path.slice(), pathEdges: path[0] === source ? pe() : [], ret: pyList(ret) });
  return { steps: r.steps, path: ret, dist, prev };
}

// ---------- operations ----------
export const OPS = [
  {
    name: 'Run Dijkstra', big: 'O((V + E) log V)', graph: 'main', pick: ['source'], code: DIJ_CODE,
    call: (c) => `dijkstra(graph, '${c.source}')`,
    sum: 'Pop the closest unfinished vertex from the min heap, then relax each of its edges. Every improvement is pushed as a new (distance, vertex) entry.',
    build: (c) => dijkstraSteps(GRAPHS.main, c.source),
  },
  {
    name: 'Rebuild a path', big: 'O(V)', graph: 'main', pick: ['source', 'target'], code: PATH_CODE,
    call: (c) => `shortest_path(prev, '${c.source}', '${c.target}')`,
    sum: 'dist only says how far. To get the route, start at the target, follow prev back to the source, then reverse.',
    build: (c) => pathSteps(GRAPHS.main, c.source, c.target),
  },
  {
    name: 'Stale entries', big: 'skip in O(1)', graph: 'stale', pick: [], code: DIJ_CODE, source: 'S',
    call: () => "dijkstra(small, 'S')",
    sum: 'A shorter route to a vertex pushes a second entry instead of updating the first. Watch the old entries surface and get skipped by the d > dist[u] check.',
    build: () => dijkstraSteps(GRAPHS.stale, 'S', { explainStale: true }),
  },
  {
    name: 'Negative edge', big: 'needs w ≥ 0', graph: 'neg', pick: [], code: DIJ_CODE, source: 'A',
    call: () => "dijkstra(neg, 'A')",
    sum: 'Three vertices and one edge of weight −3. The greedy step finalises C too early, before the cheaper route through B is seen.',
    build: () => dijkstraSteps(GRAPHS.neg, 'A'),
  },
];

export function buildSteps(opIdx, cfg = { source: 'A', target: 'F' }) {
  const op = OPS[opIdx];
  return { op, ...op.build(cfg) };
}

// ---------- rendering (browser only) ----------
if (typeof document !== 'undefined' && document.getElementById('dj-svg')) initUI();

function initUI() {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('dj-svg'), layer = $('dj-layer');
  const R = 19;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = { source: 'A', target: 'F' };
  let opIdx = 0, steps = [], idx = 0, timer = 0, lastIdx = -1, op = OPS[0];

  const elS = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const elH = (t, cls, text, p) => { const e = document.createElement(t); if (cls) e.className = cls; if (text != null) e.textContent = text; if (p) p.appendChild(e); return e; };

  function nodeState(st, v) {
    if (!st.init) return 'un';
    if (st.reopen.includes(v)) return 'reopen';
    if (st.done.includes(v)) return 'done';
    if (st.dist[v] < Infinity) return 'queue';
    return 'un';
  }
  const STATE_WORD = { un: 'not reached', queue: 'in pq', done: 'final', reopen: 'lowered after final' };

  function edgePath(G, u, v) {
    const [x1, y1] = G.pos[u], [x2, y2] = G.pos[v];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const tip = R + 4;
    return { d: `M${x1 + ux * R} ${y1 + uy * R}L${x2 - ux * tip} ${y2 - uy * tip}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, nx: -uy, ny: ux };
  }

  function renderDrawing(st) {
    const G = GRAPHS[op.graph];
    layer.innerHTML = '';
    const tree = new Set();
    if (st.init) for (const v in st.prev) if (st.prev[v] !== null) tree.add(st.prev[v] + '>' + v);
    const pathE = new Set(st.pathEdges.map(([a, b]) => a + '>' + b));
    const relK = st.rel ? st.rel[0] + '>' + st.rel[1] : null;
    const gE = elS('g', {}, layer), gW = elS('g', {}, layer), gN = elS('g', {}, layer);
    for (const [u, v, w] of edges(G)) {
      const k = u + '>' + v, p = edgePath(G, u, v);
      let cls = 'dj-edge', mk = 'dj-mk';
      if (tree.has(k)) { cls += ' dj-tree'; mk = 'dj-mk-ptr'; }
      if (pathE.has(k)) { cls += ' dj-path'; mk = 'dj-mk-hl'; }
      if (k === relK) { cls += st.relOk ? ' dj-rel' : ' dj-rel dj-relno'; mk = 'dj-mk-hl'; }
      elS('path', { d: p.d, class: cls, 'marker-end': `url(#${mk})` }, gE);
      const s = G.side[k] || 1, off = 13;
      const t = elS('text', { x: p.mx + p.nx * off * s, y: p.my + p.ny * off * s + 5, class: 'dj-w' + (k === relK ? ' dj-on' : '') + (w < 0 ? ' dj-neg' : '') }, gW);
      t.textContent = w < 0 ? '−' + Math.abs(w) : String(w);
    }
    const changed = new Set(st.changed);
    const pathV = new Set(st.path || []);
    for (const v of verts(G)) {
      const [x, y] = G.pos[v];
      const state = nodeState(st, v);
      let cls = 'dj-node dj-' + state;
      if (st.cur === v) cls += ' dj-cur';
      if (st.rel && st.rel[1] === v) cls += ' dj-tgt';
      if (pathV.has(v)) cls += ' dj-onpath';
      if (op.pick.length) cls += ' dj-click';
      const g = elS('g', { class: cls }, gN);
      if (v === st.source) elS('circle', { cx: x, cy: y, r: R + 5, class: 'dj-srcring' }, g);
      elS('circle', { cx: x, cy: y, r: R, class: 'dj-disc' }, g);
      elS('text', { x, y: y + 6, class: 'dj-name' }, g).textContent = v;
      const dy = G.lab[v] === 'n' ? -R - 12 : R + 22;
      const lab = elS('text', { x, y: y + dy, class: 'dj-dl' + (changed.has('dist:' + v) ? ' dj-on' : '') }, g);
      lab.textContent = st.init ? num(st.dist[v]) : '';
      if (op.pick.length) {
        elS('title', {}, g).textContent = op.pick.includes('target') ? `Make ${v} the target` : `Start from ${v}`;
        g.addEventListener('click', () => pickVertex(v));
      }
    }
    // header: counters
    const E = edges(G).length, V = verts(G).length;
    elS('text', { x: 10, y: 280, class: 'dj-count dj-start' }, layer).textContent = `V = ${V} · E = ${E}`;
    if (op.code === DIJ_CODE && st.init) {
      const s = st.stats;
      elS('text', { x: 470, y: 280, class: 'dj-count' }, layer).textContent = `pushes ${s.pushes} · pops ${s.pops} · stale ${s.stale}`;
    }
    const desc = verts(G).map((v) => `${v}${st.init ? ' dist ' + num(st.dist[v]) : ''}, ${STATE_WORD[nodeState(st, v)]}`).join('; ');
    svg.setAttribute('aria-label', `Directed weighted graph. Edges: ${edges(G).map(([u, v, w]) => `${u} to ${v} weight ${w}`).join(', ')}. Vertices: ${desc}.` +
      (st.rel ? ` Relaxing edge ${st.rel[0]} to ${st.rel[1]}.` : ''));
  }

  function renderTable(st) {
    const G = GRAPHS[op.graph], box = $('dj-table');
    box.innerHTML = '';
    const tb = elH('table', 'dj-dtab', null, box);
    const hr = elH('tr', '', null, elH('thead', '', null, tb));
    ['v', 'dist[v]', 'prev[v]'].forEach((h) => elH('th', '', h, hr).setAttribute('scope', 'col'));
    const body = elH('tbody', '', null, tb), changed = new Set(st.changed);
    for (const v of verts(G)) {
      const state = nodeState(st, v);
      const tr = elH('tr', 'dj-r-' + state + (st.cur === v ? ' dj-r-cur' : ''), null, body);
      const th = elH('th', '', null, tr); th.setAttribute('scope', 'row');
      elH('i', 'dj-dot dj-' + state, null, th).setAttribute('aria-hidden', 'true');
      th.append(v);
      th.title = STATE_WORD[state];
      const dc = elH('td', changed.has('dist:' + v) ? 'dj-chg' : '', st.init ? num(st.dist[v]) : '–', tr);
      const pc = elH('td', changed.has('prev:' + v) ? 'dj-chg' : '', st.init ? q(st.prev[v]) : '–', tr);
      if (st.init && st.dist[v] === Infinity) dc.classList.add('dj-inf');
      if (st.init && st.prev[v] === null) pc.classList.add('dj-none');
    }
  }

  function renderAux(st) {
    const box = $('dj-aux'); box.innerHTML = '';
    if (op.code === PATH_CODE) {
      $('dj-aux-label').textContent = 'path';
      const p = st.path;
      if (!p) { elH('p', 'dj-empty', 'not created yet', box); return; }
      const row = elH('div', 'dj-pathrow', null, box);
      row.append('[');
      p.forEach((v, i) => { if (i) row.append(', '); elH('span', 'dj-pv' + (v === st.walk && i === p.length - 1 ? ' dj-new' : ''), q(v), row); });
      row.append(']');
      if (st.walk !== null) elH('p', 'dj-pqnote', 'walking backwards along prev', box);
      return;
    }
    $('dj-aux-label').innerHTML = 'pq <span>shown sorted · pq[0] is the smallest</span>';
    if (st.popped) {
      const pp = elH('div', 'dj-popped' + (st.poppedStale ? ' dj-stalepop' : ''), null, box);
      elH('span', 'dj-k', 'heappop →', pp);
      elH('span', 'dj-e', tup(st.popped), pp);
      elH('span', 'dj-tag', st.poppedStale ? 'stale: skipped' : 'popped', pp);
    }
    if (!st.init) { elH('p', 'dj-empty', 'not created yet', box); return; }
    if (!st.pq.length) { elH('p', 'dj-empty', '[]  empty', box); return; }
    const ol = elH('ol', 'dj-pq', null, box);
    ol.setAttribute('aria-label', 'Priority queue entries, smallest first');
    st.pq.forEach((e) => {
      const stale = e[0] > st.dist[e[1]];
      const isNew = st.pushed && e[0] === st.pushed[0] && e[1] === st.pushed[1];
      const li = elH('li', 'dj-pqi' + (stale ? ' dj-stale' : '') + (isNew ? ' dj-new' : ''), null, ol);
      elH('span', 'dj-e', tup(e), li);
      if (stale) elH('span', 'dj-tag', `stale: dist is ${num(st.dist[e[1]])}`, li);
      else if (isNew) elH('span', 'dj-tag', 'pushed', li);
    });
  }

  function show() {
    const st = steps[idx];
    lastIdx = idx;
    renderDrawing(st); renderTable(st); renderAux(st);
    const code = $('dj-code'); code.innerHTML = '';
    op.code.forEach((ln, i) => {
      const dv = elH('div', st.line.includes(i) ? 'dj-on' : '', null, code);
      elH('span', 'dj-ln', String(i + 1), dv); elH('span', '', ln || ' ', dv);
    });
    const onLine = code.querySelector('.dj-on');
    if (onLine && code.scrollHeight > code.clientHeight) onLine.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    const lines = st.line[0] < 0 ? '' : ' · line' + (st.line.length > 1 ? 's ' : ' ') + st.line.map((x) => x + 1).join(', ');
    const last = steps.length - 1;
    $('dj-stepno').textContent = idx === 0 ? 'Before the call' : idx === last ? 'After the call' : `Step ${idx} of ${last - 1}${lines}`;
    $('dj-narr').textContent = st.text;
    const V = $('dj-vars'); V.innerHTML = '';
    for (const k in st.vars) elH('span', '', `${k} = ${st.vars[k]}`, V);
    if (st.ret) elH('span', 'dj-ret', 'returned ' + st.ret, V);
    $('dj-prev').disabled = idx === 0;
    $('dj-next').disabled = idx === last;
    const dots = $('dj-dots'); dots.innerHTML = '';
    steps.forEach((_, i) => {
      const b = elH('button', 'dj-dot-btn' + (i === idx ? ' dj-on' : ''), null, dots);
      b.type = 'button'; b.setAttribute('aria-label', 'Go to step ' + i);
      if (i === idx) b.setAttribute('aria-current', 'step');
      b.onclick = () => { stop(); idx = i; show(); };
    });
  }

  function renderPickers() {
    const G = GRAPHS[op.graph];
    const rows = { source: $('dj-src-row'), target: $('dj-tgt-row') };
    for (const k of ['source', 'target']) {
      const on = op.pick.includes(k);
      rows[k].hidden = !on;
      if (!on) continue;
      const box = $(k === 'source' ? 'dj-src' : 'dj-tgt'); box.innerHTML = '';
      for (const v of verts(G)) {
        const b = elH('button', '', v, box);
        b.type = 'button';
        b.setAttribute('aria-pressed', cfg[k] === v ? 'true' : 'false');
        b.onclick = () => { cfg[k] = v; loadOp(); };
      }
    }
    $('dj-vpick').hidden = !op.pick.length;
    const hint = $('dj-tryhint');
    hint.hidden = !op.pick.length;
    hint.textContent = op.pick.includes('target') ? 'Click a vertex to rebuild the path to it.' : 'Click a vertex to start from it.';
  }
  function pickVertex(v) {
    const k = op.pick.includes('target') ? 'target' : 'source';
    cfg[k] = v; loadOp();
  }

  function loadOp(step) {
    stop();
    op = OPS[opIdx];
    steps = buildSteps(opIdx, cfg).steps;
    idx = Math.max(0, Math.min(steps.length - 1, step || 0)); lastIdx = -1;
    $('dj-call').textContent = op.call(cfg);
    $('dj-big').textContent = op.big;
    $('dj-sum').textContent = op.sum;
    document.querySelectorAll('#dj-ops .dj-op').forEach((b, i) => b.setAttribute('aria-pressed', i === opIdx ? 'true' : 'false'));
    renderPickers();
    show();
  }
  function renderOps() {
    const box = $('dj-ops'); box.innerHTML = '';
    OPS.forEach((o, i) => {
      const b = elH('button', 'dj-op', null, box);
      b.type = 'button';
      elH('span', '', o.name, b); elH('small', '', o.big, b);
      b.onclick = () => { opIdx = i; loadOp(); };
    });
  }
  function stop() { clearInterval(timer); timer = 0; $('dj-play').textContent = '▶ Play'; $('dj-play').setAttribute('aria-pressed', 'false'); }
  $('dj-play').onclick = () => {
    if (timer) { stop(); return; }
    if (idx === steps.length - 1) { idx = 0; show(); }
    $('dj-play').textContent = '❚❚ Pause'; $('dj-play').setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { if (idx < steps.length - 1) { idx++; show(); } if (idx === steps.length - 1) stop(); }, 2600);
  };
  $('dj-next').onclick = () => { stop(); if (idx < steps.length - 1) { idx++; show(); } };
  $('dj-prev').onclick = () => { stop(); if (idx > 0) { idx--; show(); } };
  $('dj-reset').onclick = () => { stop(); idx = 0; show(); };
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight') $('dj-next').click();
    if (e.key === 'ArrowLeft') $('dj-prev').click();
  });

  // ?op=K&step=N (&src=B&to=E) deep-links to a step (handy for sharing and screenshots).
  const qs = new URLSearchParams(location.search);
  const qo = parseInt(qs.get('op'), 10);
  if (qo >= 0 && qo < OPS.length) opIdx = qo;
  const V0 = verts(GRAPHS.main);
  if (V0.includes(qs.get('src'))) cfg.source = qs.get('src');
  if (V0.includes(qs.get('to'))) cfg.target = qs.get('to');
  renderOps(); loadOp(parseInt(qs.get('step'), 10) || 0);
}
