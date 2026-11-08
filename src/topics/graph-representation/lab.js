// Graph Representation Lab: step-by-step simulator and renderer.
// The top half is pure (no DOM): each OPS entry runs a scripted Sim that snapshots
// { n, E, M, A, vars, line, text, hl } after every line of Python. The bottom half draws
// a snapshot three ways (drawing, matrix, adjacency list) plus the edge list chips.
//
// Data model, matching the Python on the page:
//   E: edge list, array of [u, v]
//   M: adjacency matrix, array of rows (or null when it doesn't exist yet)
//   A: adjacency list as an array indexed by vertex; A[u] === null means
//      "no key yet" (defaultdict only creates adj[u] on first touch); A itself null = not built.
// hl (highlights) uses kind 'hl' (touched by the current line) or 'ptr' (checked / in focus):
//   cells [[r,c,k]], mrows [[r,k]], slots [[u,i,k]], arows [[u,k]],
//   edges [[u,v,k]], chips [[i,k]], nodes [[u,k]], mall k (whole matrix)

export const BASE_N = 5;
export const BASE_E = [[0, 1], [0, 2], [0, 3], [1, 3], [2, 4], [3, 4]];

export function matrixFrom(n, E, dir) {
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [u, v] of E) { M[u][v] = 1; if (!dir) M[v][u] = 1; }
  return M;
}
export function adjFrom(n, E, dir) {
  const A = Array(n).fill(null);
  for (const [u, v] of E) { (A[u] ??= []).push(v); if (!dir) (A[v] ??= []).push(u); }
  return A;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const L = (a) => '[' + (a || []).join(', ') + ']';
const P = (a, b) => `(${a}, ${b})`;

export class Sim {
  constructor(dir, { M = false, A = false } = {}) {
    this.dir = dir; this.n = BASE_N; this.E = BASE_E.map((e) => e.slice());
    this.M = M ? matrixFrom(this.n, this.E, dir) : null;
    this.A = A ? adjFrom(this.n, this.E, dir) : null;
    this.vars = {}; this.notes = []; this.steps = [];
  }
  snap(line, text, hl) {
    this.steps.push(clone({ n: this.n, E: this.E, M: this.M, A: this.A, vars: this.vars, notes: this.notes,
      line: Array.isArray(line) ? line : [line], text, hl: hl || {} }));
  }
  done(text) { this.vars = {}; this.snap(-1, text); }
}

const arrow = (dir, u, v) => (dir ? `${u} → ${v}` : `${u} – ${v}`);

export const OPS = [
  {
    name: 'Edge list lookup', big: 'O(E)', srcs: ['E'],
    call: () => 'has_edge(edge_list, 4, 3)',
    sum: 'The raw input. To answer "is there an edge?" you have to read the pairs one by one.',
    code: ['def has_edge(edge_list, u, v):', '    for a, b in edge_list:', '        if (a, b) == (u, v):', '            return True',
      '        if not is_directed and (a, b) == (v, u):', '            return True', '    return False'],
    run(s) {
      const u = 4, v = 3, d = s.dir;
      s.vars = { u, v };
      s.snap(-1, `An edge list is just the pairs as you read them in. Nothing is indexed by vertex, so to answer "${d ? 'is there an edge 4 → 3?' : 'are 4 and 3 connected?'}" the code has to read pairs one at a time. You can see the answer in the drawing; the code cannot.`,
        { nodes: [[u, 'ptr'], [v, 'ptr']], edges: [[u, v, 'ptr']] });
      const seen = [];
      for (let i = 0; i < s.E.length; i++) {
        const [a, b] = s.E[i];
        s.vars = { u, v, a, b };
        const hl = { chips: [...seen, [i, 'hl']], edges: [[a, b, 'hl']] };
        if (a === u && b === v) { s.notes = ['returned True']; s.snap([1, 2, 3], `${P(a, b)} matches ${P(u, v)}. Return True.`, hl); break; }
        if (a === v && b === u) {
          if (!d) { s.notes = ['returned True']; s.snap([1, 2, 4, 5], `${P(a, b)} is the reverse of ${P(u, v)}. The graph is undirected, so an edge 3 – 4 is the same as 4 – 3. Return True.`, hl); break; }
          s.snap([1, 2, 4], `${P(a, b)} is the reverse pair. In a directed graph it means 3 → 4, a different edge from 4 → 3, so it does not count.`, hl);
        } else {
          s.snap([1, 2, 4], i === 0
            ? `First pair ${P(a, b)}. It is not ${P(u, v)}${d ? '' : ', and not the reverse (3, 4) either'}. Keep going.`
            : `${P(a, b)}: no match. Keep going.`, hl);
        }
        seen.push([i, 'ptr']);
        if (i === s.E.length - 1) { s.vars = { u, v }; s.notes = ['returned False']; s.snap(6, `All ${s.E.length} pairs checked, no match. Return False.`, { chips: seen }); }
      }
      s.done(d
        ? 'Every one of the E pairs was read: O(E). An edge list is compact and easy to sort (Kruskal\'s algorithm uses one), but slow for "is there an edge?". The next two operations build structures you can index by vertex.'
        : 'The match was the last pair, so all E pairs were read: O(E). An edge list is compact and easy to sort (Kruskal\'s algorithm uses one), but slow for "is there an edge?". The next two operations build structures you can index by vertex.');
    },
  },
  {
    name: 'Build matrix', big: 'O(V² + E)', srcs: ['E', 'M'],
    call: () => 'matrix from edge_list',
    sum: 'One cell for every ordered pair of vertices. Allocating the grid costs V², then each edge sets one cell (two if undirected).',
    code: ['matrix = [[0] * n for _ in range(n)]', 'for u, v in edge_list:', '    matrix[u][v] = 1', '    if not is_directed:', '        matrix[v][u] = 1'],
    run(s) {
      const d = s.dir, n = s.n;
      s.snap(-1, `Input: n = ${n} vertices and ${s.E.length} pairs. Dashed edges are in edge_list but not stored in the matrix yet.`);
      s.M = Array.from({ length: n }, () => Array(n).fill(0));
      s.snap(0, `Allocate ${n} rows of ${n} zeros: ${n * n} cells before a single edge is stored. This line alone is O(V²).`, { mall: 'hl' });
      s.E.forEach(([u, v], i) => {
        s.vars = { u, v };
        s.M[u][v] = 1;
        s.snap(d ? [1, 2, 3] : [1, 2], d
          ? `Edge ${P(u, v)}: matrix[${u}][${v}] = 1. Row is "from", column is "to". Directed, so the if is skipped and matrix[${v}][${u}] stays 0.`
          : `Edge ${P(u, v)}: matrix[${u}][${v}] = 1. Row ${u}, column ${v}.`,
          { chips: [[i, 'hl']], cells: [[u, v, 'hl']], edges: [[u, v, 'hl']] });
        if (!d) {
          s.M[v][u] = 1;
          s.snap([3, 4], `Undirected, so mirror it: matrix[${v}][${u}] = 1. Now the edge reads the same from both ends.`,
            { chips: [[i, 'hl']], cells: [[v, u, 'hl'], [u, v, 'ptr']], edges: [[u, v, 'hl']] });
        }
      });
      const ones = s.M.flat().filter(Boolean).length;
      s.done(d
        ? `${ones} ones, one per edge, out of ${n * n} cells. Read row u to see where u points; read column v to see what points at v. O(V²) to allocate plus O(E) to fill.`
        : `${ones} ones for ${s.E.length} edges: every edge is stored twice, so the matrix is symmetric across its diagonal. O(V²) to allocate plus O(E) to fill.`);
    },
  },
  {
    name: 'Build adjacency list', big: 'O(V + E)', srcs: ['E', 'A'],
    call: () => 'adj from edge_list',
    sum: 'Each vertex keeps a Python list of the vertices it connects to. Only edges that exist take up space.',
    code: ['from collections import defaultdict', 'adj = defaultdict(list)', 'for u, v in edge_list:', '    adj[u].append(v)', '    if not is_directed:', '        adj[v].append(u)'],
    run(s) {
      const d = s.dir, n = s.n;
      s.snap(-1, `Same ${s.E.length} pairs. This time we only store what exists: each vertex gets a list of its neighbours.`);
      s.A = Array(n).fill(null);
      s.snap([0, 1], 'adj starts empty. defaultdict(list) means the first time we touch adj[u], it quietly creates an empty list for it.');
      const push = (u, v) => { const fresh = s.A[u] === null; (s.A[u] ??= []).push(v); return fresh; };
      s.E.forEach(([u, v], i) => {
        s.vars = { u, v };
        const fresh = push(u, v);
        const hl = { chips: [[i, 'hl']], slots: [[u, s.A[u].length - 1, 'hl']], arows: [[u, 'hl']], edges: [[u, v, 'hl']] };
        s.snap(d ? [2, 3, 4] : [2, 3], `Edge ${P(u, v)}: ${fresh ? `adj[${u}] did not exist, so defaultdict creates [] and then ` : ''}append ${v}. adj[${u}] is now ${L(s.A[u])}.`, hl);
        if (!d) {
          const f2 = push(v, u);
          s.snap([4, 5], `Undirected, so ${u} is also a neighbour of ${v}: ${f2 ? `create adj[${v}] and ` : ''}append ${u}. adj[${v}] is now ${L(s.A[v])}.`,
            { chips: [[i, 'hl']], slots: [[v, s.A[v].length - 1, 'hl']], arows: [[v, 'hl']], edges: [[u, v, 'hl']] });
        }
      });
      const entries = s.A.reduce((t, a) => t + (a ? a.length : 0), 0);
      const missing = s.A.map((a, i) => (a === null ? i : -1)).filter((i) => i >= 0);
      const miss = missing.length ? ` Vertex ${missing.join(', ')} has no outgoing edges, so it never became a key. adj[${missing[0]}] still returns [] the moment you ask.` : '';
      s.done(d
        ? `${entries} entries, one per edge.${miss} Space O(V + E): a slot per vertex plus one entry per edge.`
        : `${entries} entries for ${s.E.length} edges: each edge sits in both endpoints' lists.${miss} Space O(V + E).`);
    },
  },
  {
    name: 'has_edge', big: 'O(1) vs O(deg u)', srcs: ['E', 'M', 'A'],
    call: (d) => `has_edge(0, 4)  # ${d ? '0 → 4?' : '0 – 4?'}`,
    sum: 'The matrix answers with one index. The list has to scan u\'s neighbours.',
    code: ['def has_edge_matrix(u, v):', '    return matrix[u][v] == 1', '', 'def has_edge_list(u, v):', '    for w in adj[u]:', '        if w == v:', '            return True', '    return False'],
    run(s) {
      const u = 0, v = 4, d = s.dir;
      s.vars = { u, v };
      s.snap(-1, `Both structures hold the same graph. Question: ${d ? 'is there an edge from 0 to 4?' : 'are 0 and 4 connected?'}`, { nodes: [[u, 'ptr'], [v, 'ptr']], edges: [[u, v, 'ptr']] });
      const m = s.M[u][v] === 1;
      s.notes = [`matrix → ${m ? 'True' : 'False'}`];
      s.snap(1, `Matrix: jump straight to row ${u}, column ${v}. It holds ${s.M[u][v]}, so the answer is ${m ? 'True' : 'False'}. One lookup however big the graph: O(1).`,
        { cells: [[u, v, 'hl']], edges: [[u, v, 'hl']] });
      const row = s.A[u] || [];
      s.snap(4, `List: fetch adj[${u}] = ${L(row)}. There is no way to jump to ${v}; we walk the list.`, { arows: [[u, 'ptr']] });
      const seen = [];
      let found = false;
      for (let i = 0; i < row.length; i++) {
        const w = row[i];
        s.vars = { u, v, w };
        if (w === v) { found = true; s.notes.push('list → True'); s.snap([4, 5, 6], `w = ${w}. That is ${v}: return True.`, { slots: [...seen, [u, i, 'hl']], arows: [[u, 'ptr']], edges: [[u, w, 'hl']] }); break; }
        s.snap([4, 5], `w = ${w}. Not ${v}, keep going.`, { slots: [...seen, [u, i, 'hl']], arows: [[u, 'ptr']], edges: [[u, w, 'ptr']] });
        seen.push([u, i, 'ptr']);
      }
      if (!found) {
        s.vars = { u, v }; s.notes.push('list → False');
        s.snap(7, `adj[${u}] ran out without finding ${v}. Return False after ${row.length} checks: O(deg(${u})).`, { slots: seen, arows: [[u, 'ptr']], edges: [[u, v, 'ptr']] });
      }
      s.done(`Same answer, different cost. Matrix O(1); list O(deg(u)), and the worst case is a miss, which reads every neighbour. Degrees are usually small, but a hub with thousands of neighbours is slow to scan. Store each adj[u] as a set and the list gets O(1) on average too.`);
    },
  },
  {
    name: 'Neighbours of u', big: 'O(V) vs O(deg u)', srcs: ['E', 'M', 'A'],
    call: () => 'neighbours(3)',
    sum: 'The operation BFS and DFS do for every vertex. A matrix row has a cell for every vertex, even the ones that are not neighbours.',
    code: ['def neighbours_matrix(u):', '    result = []', '    for v in range(n):', '        if matrix[u][v] == 1:', '            result.append(v)', '    return result', '',
      'def neighbours_list(u):', '    result = []', '    for v in adj[u]:', '        result.append(v)', '    return result'],
    run(s) {
      const u = 3, d = s.dir, n = s.n;
      s.vars = { u };
      s.snap(-1, `Which vertices can you reach from ${u} in one step?${d ? ' In a directed graph these are the out-neighbours: edges leaving 3.' : ''}`, { nodes: [[u, 'ptr']] });
      let result = [];
      s.vars = { u, result };
      s.snap(1, 'Matrix version. Start with an empty result.', { mrows: [[u, 'ptr']] });
      const seen = [];
      for (let v = 0; v < n; v++) {
        s.vars = { u, v, result };
        if (s.M[u][v] === 1) {
          result.push(v);
          s.snap([2, 3, 4], `matrix[${u}][${v}] is 1, so ${v} is a neighbour. Append it.`, { cells: [...seen, [u, v, 'hl']], mrows: [[u, 'ptr']], edges: [[u, v, 'hl']] });
        } else {
          s.snap([2, 3], `matrix[${u}][${v}] is 0. ${v === u ? 'No self-loop.' : `Not a neighbour, but we still had to look.`}`, { cells: [...seen, [u, v, 'hl']], mrows: [[u, 'ptr']] });
        }
        seen.push([u, v, 'ptr']);
      }
      s.vars = { u, result }; s.notes = [`matrix → ${L(result)}`];
      s.snap(5, `Return ${L(result)} after checking all ${n} cells in row ${u}.`, { cells: seen, mrows: [[u, 'ptr']] });
      const row = s.A[u] || [];
      const r2 = [];
      s.vars = { u, result: r2 };
      s.snap(8, `List version. adj[${u}] is ${L(row)}. Start again with an empty result.`, { arows: [[u, 'ptr']] });
      const sl = [];
      row.forEach((v, i) => {
        r2.push(v); s.vars = { u, v, result: r2 };
        s.snap([9, 10], `adj[${u}][${i}] is ${v}. Every item in this list is a real neighbour, so append it.`, { slots: [...sl, [u, i, 'hl']], arows: [[u, 'ptr']], edges: [[u, v, 'hl']] });
        sl.push([u, i, 'ptr']);
      });
      s.vars = { u, result: r2 }; s.notes.push(`list → ${L(r2)}`);
      s.snap(11, `Return ${L(r2)} after ${row.length} step${row.length === 1 ? '' : 's'}, one per neighbour.`, { slots: sl, arows: [[u, 'ptr']] });
      s.done(`Same answer: ${n} checks against ${row.length}. The matrix row is O(V) because it stores zeros too; the list is O(deg(u)). Over a whole BFS or DFS that is O(V²) with a matrix versus O(V + E) with a list.`);
    },
  },
  {
    name: 'Add a vertex', big: 'O(V) vs O(1)', srcs: ['E', 'M', 'A'],
    call: () => 'add_vertex(5)  # n: 5 → 6',
    sum: 'The matrix needs a new column in every row plus a whole new row. The list just gets a new key.',
    code: ['def add_vertex_matrix(x):', '    for row in matrix:', '        row.append(0)', '    matrix.append([0] * (x + 1))', '', 'def add_vertex_list(x):', '    adj[x] = []'],
    run(s) {
      const x = s.n;
      s.vars = { x };
      s.snap(-1, `Add vertex ${x}, with no edges yet. In the matrix, every existing row needs a column for it.`);
      for (let r = 0; r < x; r++) {
        s.vars = { x, row: r };
        s.M[r].push(0);
        s.snap([1, 2], `Row ${r}: append a 0 for column ${x}.`, { cells: [[r, x, 'hl']], mrows: [[r, 'ptr']] });
      }
      s.vars = { x };
      s.M.push(Array(x + 1).fill(0));
      s.snap(3, `Append row ${x}: ${x + 1} more zeros. The matrix grew from ${x * x} to ${(x + 1) * (x + 1)} cells, all ${2 * x + 1} new ones 0. The dashed vertex exists in the matrix but not yet in the list.`, { mrows: [[x, 'hl']], nodes: [[x, 'hl']] });
      s.A.push([]);
      s.n = x + 1;
      s.snap(6, `List: one new key with an empty list. Nothing else is touched.`, { arows: [[x, 'hl']], nodes: [[x, 'hl']] });
      s.done(`Matrix O(V): one append per row. That relies on Python lists growing in place. With a fixed-size grid (a NumPy array, or a C array) you must allocate a new (V+1)² grid and copy: O(V²). List O(1).`);
    },
  },
  {
    name: 'Remove an edge', big: 'O(1) vs O(deg u)', srcs: ['E', 'M', 'A'],
    call: () => 'remove_edge(0, 3)',
    sum: 'Keep all three in sync: clear the matrix cell, remove from the list, remove the pair. Only the matrix can do it without searching.',
    code: ['def remove_edge(u, v):', '    matrix[u][v] = 0', '    if not is_directed:', '        matrix[v][u] = 0', '    adj[u].remove(v)', '    if not is_directed:', '        adj[v].remove(u)', '    edge_list.remove((u, v))'],
    run(s) {
      const u = 0, v = 3, d = s.dir;
      s.vars = { u, v };
      s.snap(-1, `Remove the edge ${arrow(d, u, v)} from every representation. The drawing keeps it dashed until all of them agree it is gone.`, { edges: [[u, v, 'ptr']] });
      s.M[u][v] = 0;
      s.snap(1, `Matrix: matrix[${u}][${v}] = 0. Direct index, O(1).`, { cells: [[u, v, 'hl']], edges: [[u, v, 'hl']] });
      if (d) s.snap(2, 'Directed, so there is no mirror cell to clear.', { cells: [[u, v, 'ptr']] });
      else { s.M[v][u] = 0; s.snap([2, 3], `Undirected: clear the mirror too, matrix[${v}][${u}] = 0.`, { cells: [[v, u, 'hl'], [u, v, 'ptr']], edges: [[u, v, 'hl']] }); }
      const listRemove = (a, b, line) => {
        const row = s.A[a], seen = [];
        let i = 0;
        for (; row[i] !== b; i++) {
          s.snap(line, `adj[${a}].remove(${b}) scans from the front. adj[${a}][${i}] is ${row[i]}, not ${b}.`, { slots: [...seen, [a, i, 'hl']], arows: [[a, 'ptr']] });
          seen.push([a, i, 'ptr']);
        }
        s.snap(line, `adj[${a}][${i}] is ${b}. Found it.`, { slots: [...seen, [a, i, 'hl']], arows: [[a, 'ptr']], edges: [[a, b, 'hl']] });
        const after = row.length - i - 1;
        row.splice(i, 1);
        s.snap(line, after
          ? `Delete it. The ${after} item${after > 1 ? 's' : ''} after it shift one place left to close the gap. The scan and the shift together are O(deg(${a})).`
          : `Delete it. It was the last item, so nothing shifts. adj[${a}] is now ${L(row)}.`,
          { slots: Array.from({ length: after }, (_, k) => [a, i + k, 'hl']), arows: [[a, 'hl']] });
      };
      listRemove(u, v, 4);
      if (d) s.snap(5, 'Directed: adj[3] never listed 0, so nothing to do there.');
      else listRemove(v, u, [5, 6]);
      const seen = [];
      for (let i = 0; i < s.E.length; i++) {
        const [a, b] = s.E[i];
        if (a === u && b === v) {
          s.snap(7, `edge_list[${i}] is ${P(a, b)}. Found it.`, { chips: [...seen, [i, 'hl']] });
          s.E.splice(i, 1);
          s.snap(7, `Delete it; the pairs after it shift left. Finding it was a scan of the pairs: O(E).`, { chips: Array.from({ length: s.E.length - i }, (_, k) => [i + k, 'hl']), edges: [[u, v, 'hl']] });
          break;
        }
        s.snap(7, `edge_list.remove scans the pairs too. edge_list[${i}] is ${P(a, b)}, not ${P(u, v)}.`, { chips: [...seen, [i, 'hl']] });
        seen.push([i, 'ptr']);
      }
      s.done(`Gone from all three. Matrix O(1), list O(deg(u)), edge list O(E). Adding an edge is the opposite story: O(1) for all three, because append does not search.`);
    },
  },
  {
    name: 'Try it: edit the graph', big: 'click a cell', srcs: ['E', 'M', 'A'], interactive: true,
    call: () => 'add_edge(u, v) / remove_edge(u, v)',
    sum: 'Click any matrix cell off the diagonal to add or remove that edge. All three views update, and Back / Next step through your edits.',
    code: ['def add_edge(u, v):', '    matrix[u][v] = 1', '    adj[u].append(v)', '    edge_list.append((u, v))', '    if not is_directed:', '        matrix[v][u] = 1', '        adj[v].append(u)', '',
      'def remove_edge(u, v):', '    matrix[u][v] = 0', '    adj[u].remove(v)', '    edge_list.remove((u, v))', '    if not is_directed:', '        matrix[v][u] = 0', '        adj[v].remove(u)'],
    run(s) {
      s.snap(-1, `Click a cell in the matrix: a 0 adds the edge row → column, a 1 removes it.${s.dir ? '' : ' The graph is undirected, so the mirror cell changes with it.'} The diagonal (self-loops) is left out of this lab.`);
    },
  },
];

// One edit in the "Try it" op. Pure: returns a new snapshot built from `prev`.
export function toggleStep(prev, u, v, dir) {
  const s = clone(prev);
  const on = s.M[u][v] === 1;
  const hl = { cells: [[u, v, 'hl']], edges: [[u, v, 'hl']], slots: [], arows: [[u, 'hl']], chips: [] };
  let text, line;
  if (!on) {
    s.M[u][v] = 1; (s.A[u] ??= []).push(v); s.E.push([u, v]);
    hl.slots.push([u, s.A[u].length - 1, 'hl']); hl.chips.push([s.E.length - 1, 'hl']);
    line = [1, 2, 3];
    text = `add_edge(${u}, ${v}): matrix[${u}][${v}] = 1, adj[${u}] gets ${v} appended, edge_list gets ${P(u, v)}. All O(1).`;
    if (!dir) {
      s.M[v][u] = 1; (s.A[v] ??= []).push(u);
      hl.cells.push([v, u, 'hl']); hl.slots.push([v, s.A[v].length - 1, 'hl']); hl.arows.push([v, 'hl']);
      line.push(4, 5, 6);
      text += ` Undirected, so matrix[${v}][${u}] = 1 and adj[${v}] gets ${u} as well.`;
    }
  } else {
    s.M[u][v] = 0;
    const i = s.A[u].indexOf(v); s.A[u].splice(i, 1);
    const ei = s.E.findIndex(([a, b]) => (a === u && b === v) || (!dir && a === v && b === u));
    const stored = s.E[ei]; s.E.splice(ei, 1);
    line = [9, 10, 11];
    text = `remove_edge(${u}, ${v}): matrix[${u}][${v}] = 0 in one step. adj[${u}].remove(${v}) scanned ${i + 1} item${i ? 's' : ''}, and edge_list.remove scanned ${ei + 1} pair${ei ? 's' : ''}.`;
    if (!dir) {
      s.M[v][u] = 0;
      const j = s.A[v].indexOf(u); s.A[v].splice(j, 1);
      hl.cells.push([v, u, 'hl']); hl.arows.push([v, 'hl']);
      line.push(12, 13, 14);
      text += ` Undirected, so matrix[${v}][${u}] and adj[${v}] lose it too.`;
      if (stored[0] !== u) text += ` (The pair was stored as ${P(stored[0], stored[1])}; in an undirected graph either order is the same edge.)`;
    }
  }
  s.vars = { u, v }; s.notes = []; s.line = line; s.text = text; s.hl = hl;
  return s;
}

export function buildSteps(opIdx, dir) {
  const op = OPS[opIdx];
  const needM = op.srcs.includes('M') && op.name !== 'Build matrix';
  const needA = op.srcs.includes('A') && op.name !== 'Build adjacency list';
  const s = new Sim(dir, { M: needM, A: needA });
  op.run(s);
  return s.steps;
}

// What the drawing should show: an edge is 'on' when every structure the op uses
// fully holds it, 'pend' (dashed) when only some do (half-built or half-removed).
export function graphView(st, srcs, dir) {
  const key = (u, v) => (dir ? u + '>' + v : Math.min(u, v) + '-' + Math.max(u, v));
  const cand = new Map();
  const add = (u, v) => { if (u === v) return; const k = key(u, v); if (!cand.has(k)) cand.set(k, dir ? [u, v] : [Math.min(u, v), Math.max(u, v)]); };
  st.E.forEach(([u, v]) => add(u, v));
  if (st.M) st.M.forEach((row, u) => row.forEach((x, v) => { if (x) add(u, v); }));
  if (st.A) st.A.forEach((row, u) => (row || []).forEach((v) => add(u, v)));
  const one = {
    E: (u, v) => (st.E.some(([a, b]) => (a === u && b === v) || (!dir && a === v && b === u)) ? 1 : 0),
    M: (u, v) => (!st.M ? 0 : dir ? (st.M[u]?.[v] ? 1 : 0) : ((st.M[u]?.[v] ? 1 : 0) + (st.M[v]?.[u] ? 1 : 0)) / 2),
    A: (u, v) => (!st.A ? 0 : dir ? ((st.A[u] || []).includes(v) ? 1 : 0) : (((st.A[u] || []).includes(v) ? 1 : 0) + ((st.A[v] || []).includes(u) ? 1 : 0)) / 2),
  };
  const edges = [];
  for (const [k, [u, v]] of cand) {
    const lv = srcs.map((x) => one[x](u, v));
    if (lv.every((x) => x === 1)) edges.push({ k, u, v, st: 'on' });
    else if (lv.some((x) => x > 0)) edges.push({ k, u, v, st: 'pend' });
  }
  const structs = srcs.filter((x) => x !== 'E' && st[x]);
  const n = Math.max(st.n, st.M ? st.M.length : 0, st.A ? st.A.length : 0);
  const nodes = [];
  for (let v = 0; v < n; v++) {
    if (!structs.length) { if (v < st.n) nodes.push({ v, st: 'on' }); continue; }
    const has = structs.filter((x) => v < st[x].length).length;
    if (has === structs.length) nodes.push({ v, st: 'on' });
    else if (has) nodes.push({ v, st: 'pend' });
  }
  return { nodes, edges, key };
}

// ---------- rendering (browser only) ----------
if (typeof document !== 'undefined' && document.getElementById('g-stage')) {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('g-svg'), layer = $('g-layer');
  const POS = [[60, 130], [175, 48], [175, 212], [290, 130], [400, 212], [400, 48]];
  const R = 19;
  let dir = true, opIdx = 0, steps = [], idx = 0, timer = 0, lastIdx = -1;

  const elS = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const elH = (t, cls, text, p) => { const e = document.createElement(t); if (cls) e.className = cls; if (text != null) e.textContent = text; if (p) p.appendChild(e); return e; };
  const kmap = (list, f) => { const m = new Map(); (list || []).forEach((x) => m.set(f(x), x[x.length - 1])); return m; };

  function edgePath(u, v, curve, visible) {
    const [x1, y1] = POS[u], [x2, y2] = POS[v];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    let off = curve;
    if (!off) {
      for (const w of visible) {
        if (w === u || w === v) continue;
        const [px, py] = POS[w];
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
        if (Math.hypot(x1 + t * dx - px, y1 + t * dy - py) < R + 10) { off = ((px - x1) * nx + (py - y1) * ny) > 0 ? -46 : 46; break; }
      }
    }
    const tip = dir ? R + 3 : R;
    if (!off) {
      const ux = dx / len, uy = dy / len;
      return `M${x1 + ux * R} ${y1 + uy * R}L${x2 - ux * tip} ${y2 - uy * tip}`;
    }
    const cx = (x1 + x2) / 2 + nx * off, cy = (y1 + y2) / 2 + ny * off;
    const a = Math.hypot(cx - x1, cy - y1), b = Math.hypot(cx - x2, cy - y2);
    return `M${x1 + (cx - x1) / a * R} ${y1 + (cy - y1) / a * R}Q${cx} ${cy} ${x2 + (cx - x2) / b * tip} ${y2 + (cy - y2) / b * tip}`;
  }

  function renderDrawing(st, op) {
    const g = graphView(st, op.srcs, dir), hl = st.hl;
    const hE = new Map(); (hl.edges || []).forEach(([u, v, k]) => hE.set(g.key(u, v), k));
    const hN = kmap(hl.nodes, (x) => x[0]);
    layer.innerHTML = '';
    const visible = g.nodes.map((x) => x.v);
    const keys = new Set(g.edges.map((e) => e.k));
    const gE = elS('g', {}, layer), gN = elS('g', {}, layer);
    const drawEdge = (u, v, cls, k, ghost) => {
      const both = dir && keys.has(g.key(v, u));
      const d = edgePath(u, v, both ? (ghost ? 30 : 16) : 0, visible);
      const mk = k === 'hl' ? 'g-mk-hl' : k === 'ptr' ? 'g-mk-ptr' : 'g-mk';
      elS('path', { d, class: cls, ...(dir ? { 'marker-end': `url(#${mk})` } : {}) }, gE);
    };
    for (const e of g.edges) {
      const k = hE.get(e.k);
      drawEdge(e.u, e.v, 'g-edge' + (e.st === 'pend' ? ' g-pend' : '') + (k ? ' g-' + k : ''), k);
    }
    // highlighted edges that do not exist: the edge being asked about, or one just removed
    for (const [u, v, k] of hl.edges || []) {
      if (keys.has(g.key(u, v)) || !visible.includes(u) || !visible.includes(v) || u === v) continue;
      drawEdge(u, v, 'g-edge g-ghost g-' + k, k, true);
    }
    for (const nd of g.nodes) {
      const [x, y] = POS[nd.v], k = hN.get(nd.v);
      const grp = elS('g', { class: 'g-node' + (nd.st === 'pend' ? ' g-pend' : '') + (k ? ' g-' + k : '') }, gN);
      elS('circle', { cx: x, cy: y, r: R }, grp);
      elS('text', { x, y: y + 6 }, grp).textContent = nd.v;
    }
    const nOn = g.nodes.filter((x) => x.st === 'on').length, eOn = g.edges.filter((x) => x.st === 'on');
    elS('text', { x: 450, y: 18, class: 'g-count' }, layer).textContent = `V = ${nOn} · E = ${eOn.length}`;
    svg.setAttribute('aria-label', `${dir ? 'Directed' : 'Undirected'} graph with ${nOn} vertices and ${eOn.length} edges: ${eOn.map((e) => arrow(dir, e.u, e.v)).join(', ') || 'none'}.`);
  }

  function renderEdgeList(st, prev) {
    const box = $('g-elist'); box.innerHTML = '';
    const hc = kmap(st.hl.chips, (x) => x[0]);
    st.E.forEach(([u, v], i) => {
      const k = hc.get(i);
      const c = elH('span', 'g-chip' + (k ? ' g-' + k : '') + (prev && i >= prev.E.length ? ' g-enter' : ''), P(u, v), box);
      c.title = `edge_list[${i}]`;
    });
    if (!st.E.length) elH('span', 'g-empty', 'empty', box);
  }

  function renderMatrix(st, prev, op) {
    const box = $('g-matrix'); box.innerHTML = '';
    if (!st.M) { elH('p', 'g-empty', op.srcs.includes('M') ? 'Not built yet.' : 'Not used in this operation.', box); return; }
    const n = st.M.length, cols = Math.max(...st.M.map((r) => r.length)), hl = st.hl;
    const hc = kmap(hl.cells, (x) => x[0] + ',' + x[1]), hr = kmap(hl.mrows, (x) => x[0]);
    const rowH = new Set(), colH = new Set();
    (hl.cells || []).forEach(([r, c, k]) => { if (k === 'hl') { rowH.add(r); colH.add(c); } });
    const grid = elH('div', 'g-mgrid', null, box);
    grid.style.gridTemplateColumns = `auto repeat(${cols}, var(--g-cell))`;
    grid.setAttribute('role', 'table'); grid.setAttribute('aria-label', 'Adjacency matrix, rows are u, columns are v');
    elH('span', 'g-mh g-corner', 'u\\v', grid);
    for (let c = 0; c < cols; c++) elH('span', 'g-mh' + (colH.has(c) ? ' g-on' : ''), String(c), grid);
    for (let r = 0; r < n; r++) {
      const rk = hr.get(r);
      elH('span', 'g-mh' + (rowH.has(r) || rk ? ' g-on' : ''), String(r), grid);
      for (let c = 0; c < cols; c++) {
        if (c >= st.M[r].length) { elH('span', 'g-mc g-gap', '', grid); continue; }
        const val = st.M[r][c], k = hc.get(r + ',' + c);
        const isNew = prev && (!prev.M || r >= prev.M.length || c >= prev.M[r].length);
        let cls = 'g-mc' + (val ? ' g-one' : '') + (r === c ? ' g-diag' : '') + (k ? ' g-' + k : '') + (rk && !k ? ' g-row-' + rk : '') + (hl.mall ? ' g-all' : '') + (isNew ? ' g-enter' : '');
        let cell;
        if (op.interactive && r !== c) {
          cell = elH('button', cls, String(val), grid);
          cell.type = 'button';
          cell.setAttribute('aria-label', `matrix[${r}][${c}] = ${val}. ${val ? 'Remove' : 'Add'} edge ${arrow(dir, r, c)}`);
          cell.onclick = () => edit(r, c);
        } else {
          cell = elH('span', cls, String(val), grid);
        }
      }
    }
    elH('p', 'g-mnote', dir ? 'row = from, column = to' : 'symmetric across the diagonal', box);
  }

  function renderAdj(st, prev, op) {
    const box = $('g-adj'); box.innerHTML = '';
    if (!st.A) { elH('p', 'g-empty', op.srcs.includes('A') ? 'Not built yet.' : 'Not used in this operation.', box); return; }
    const hs = kmap(st.hl.slots, (x) => x[0] + ',' + x[1]), ha = kmap(st.hl.arows, (x) => x[0]);
    st.A.forEach((row, u) => {
      const rk = ha.get(u);
      const isNew = prev && prev.A && u >= prev.A.length;
      const line = elH('div', 'g-arow' + (rk ? ' g-' + rk : '') + (isNew ? ' g-enter' : ''), null, box);
      elH('span', 'g-key', String(u), line);
      elH('span', 'g-arr', '→', line);
      if (row === null) {
        elH('span', 'g-nokey', '[]', line);
        elH('small', 'g-tag', 'no key yet', line).title = 'defaultdict creates this key the first time adj[' + u + '] is used';
        return;
      }
      const lst = elH('span', 'g-list', null, line);
      lst.append('[');
      row.forEach((v, i) => {
        if (i) lst.append(', ');
        const k = hs.get(u + ',' + i);
        const fresh = prev && prev.A && (!prev.A[u] || i >= prev.A[u].length);
        elH('span', 'g-slot' + (k ? ' g-' + k : '') + (fresh ? ' g-enter' : ''), String(v), lst);
      });
      lst.append(']');
    });
  }

  function show() {
    const st = steps[idx], op = OPS[opIdx];
    const prev = idx === lastIdx + 1 && idx > 0 ? steps[idx - 1] : null;
    lastIdx = idx;
    renderDrawing(st, op); renderEdgeList(st, prev); renderMatrix(st, prev, op); renderAdj(st, prev, op);
    const code = $('g-code'); code.innerHTML = '';
    op.code.forEach((ln, i) => {
      const dv = elH('div', st.line.includes(i) ? 'g-on' : '', null, code);
      elH('span', 'g-ln', String(i + 1), dv); elH('span', '', ln || ' ', dv);
    });
    const lines = st.line[0] < 0 ? '' : ' · line' + (st.line.length > 1 ? 's ' : ' ') + st.line.map((x) => x + 1).join(', ');
    const last = steps.length - 1;
    $('g-stepno').textContent = op.interactive
      ? (idx === 0 ? 'Starting graph' : `Edit ${idx} of ${last}${lines}`)
      : idx === 0 ? 'Before the call' : idx === last ? 'After the call' : `Step ${idx} of ${last - 1}${lines}`;
    $('g-narr').textContent = st.text;
    const V = $('g-vars'); V.innerHTML = '';
    for (const k in st.vars) elH('span', '', `${k} = ${Array.isArray(st.vars[k]) ? L(st.vars[k]) : st.vars[k]}`, V);
    for (const t of st.notes) elH('span', 'g-note', t, V);
    $('g-prev').disabled = idx === 0;
    $('g-next').disabled = idx === last;
    $('g-play').disabled = last === 0;
    const dots = $('g-dots'); dots.innerHTML = '';
    steps.forEach((_, i) => {
      const b = elH('button', 'g-dot' + (i === idx ? ' g-on' : ''), null, dots);
      b.type = 'button'; b.setAttribute('aria-label', 'Go to step ' + i);
      if (i === idx) b.setAttribute('aria-current', 'step');
      b.onclick = () => { stop(); idx = i; show(); };
    });
  }

  function edit(u, v) {
    stop();
    steps = steps.slice(0, idx + 1);
    steps.push(toggleStep(steps[idx], u, v, dir));
    idx = steps.length - 1;
    show();
    const btn = $('g-matrix').querySelectorAll('.g-mgrid > *')[(u + 1) * (steps[idx].M.length + 1) + v + 1];
    if (btn && btn.focus) btn.focus();
  }

  function loadOp(step) {
    stop();
    const op = OPS[opIdx];
    steps = buildSteps(opIdx, dir);
    idx = Math.max(0, Math.min(steps.length - 1, step || 0)); lastIdx = -1;
    $('g-call').textContent = op.call(dir);
    $('g-big').textContent = op.big;
    $('g-sum').textContent = op.sum;
    $('g-tryhint').hidden = !op.interactive;
    document.querySelectorAll('.g-op').forEach((b, i) => b.setAttribute('aria-pressed', i === opIdx ? 'true' : 'false'));
    show();
  }
  function renderOps() {
    const box = $('g-ops'); box.innerHTML = '';
    OPS.forEach((op, i) => {
      const b = elH('button', 'g-op' + (op.interactive ? ' g-try' : ''), null, box);
      b.type = 'button';
      elH('span', '', op.name, b); elH('small', '', op.big, b);
      b.onclick = () => { opIdx = i; loadOp(); };
    });
  }
  function stop() { clearInterval(timer); timer = 0; $('g-play').textContent = '▶ Play'; }
  $('g-play').onclick = () => {
    if (timer) { stop(); return; }
    if (idx === steps.length - 1) { idx = 0; show(); }
    $('g-play').textContent = '❚❚ Pause';
    timer = setInterval(() => { if (idx < steps.length - 1) { idx++; show(); } if (idx === steps.length - 1) stop(); }, 2400);
  };
  $('g-next').onclick = () => { stop(); if (idx < steps.length - 1) { idx++; show(); } };
  $('g-prev').onclick = () => { stop(); if (idx > 0) { idx--; show(); } };
  $('g-reset').onclick = () => {
    stop();
    if (OPS[opIdx].interactive) { loadOp(); return; }
    idx = 0; show();
  };
  document.querySelectorAll('.g-seg button').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.g-seg button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    dir = b.dataset.kind === 'directed'; loadOp();
  }));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight') $('g-next').click();
    if (e.key === 'ArrowLeft') $('g-prev').click();
  });

  // ?op=K&step=N&dir=undirected deep-links to a step (handy for sharing and screenshots).
  const q = new URLSearchParams(location.search);
  const qo = parseInt(q.get('op'), 10);
  if (qo >= 0 && qo < OPS.length) opIdx = qo;
  if (q.get('dir') === 'undirected') {
    dir = false;
    document.querySelectorAll('.g-seg button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.kind === 'undirected' ? 'true' : 'false'));
  }
  renderOps(); loadOp(parseInt(q.get('step'), 10) || 0);
}
