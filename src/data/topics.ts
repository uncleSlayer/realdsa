/**
 * Every topic on the site. Add an entry here when you add a page under
 * src/pages/topics/ — the home page and page titles read from this list.
 */
export interface Topic {
  /** URL segment: the page lives at src/pages/topics/<slug>.astro */
  slug: string;
  title: string;
  /** One or two sentences for the home-page card and meta description. */
  summary: string;
  /** Language the code samples use. */
  language: string;
  /** Short labels shown on the card, e.g. the operations covered. */
  tags: string[];
}

export const topics: Topic[] = [
  {
    slug: 'graph-representation',
    title: 'Graph Representation Lab',
    summary:
      'Build the same graph as an edge list, an adjacency matrix and an adjacency list, and see what each one costs to store and to query.',
    language: 'Python',
    tags: ['Edge list', 'Adjacency matrix', 'Adjacency list', 'Directed', 'Undirected'],
  },
  {
    slug: 'heap',
    title: 'Heap Lab',
    summary:
      'Watch a min heap and a max heap live in one array: insert with sift-up, delete the root with sift-down, and see why heapify is O(n).',
    language: 'Python',
    tags: ['Min heap', 'Max heap', 'Insert', 'Delete', 'Heapify'],
  },
  {
    slug: 'linked-list',
    title: 'Linked List Lab',
    summary:
      'Step through singly and doubly linked list operations line by line and watch exactly which pointer each line of Python changes.',
    language: 'Python',
    tags: ['Traverse', 'Prepend', 'Append', 'Insert', 'Remove', 'Find', 'Reverse', 'Pop'],
  },
  {
    slug: 'dijkstra',
    title: "Dijkstra's Algorithm Lab",
    summary:
      'Watch Dijkstra find the shortest path from one vertex to every other: the priority queue, the distance table and each edge relaxation, one step at a time.',
    language: 'Python',
    tags: ['Shortest path', 'heapq', 'Relaxation', 'Path rebuild', 'Negative edges'],
  },
  {
    slug: 'bst',
    title: 'Binary Search Tree Lab',
    summary:
      'Code a BST from scratch: insert, search and delete, the three depth-first traversals, and the max height of the tree.',
    language: 'Python',
    tags: ['Insert', 'Search', 'Delete', 'Preorder', 'Inorder', 'Postorder', 'Max height'],
  },
  {
    slug: 'trie',
    title: 'Trie Lab',
    summary:
      'Store words letter by letter in a prefix tree. Step through insert, search and prefix lookup, then match words with wildcards.',
    language: 'Python',
    tags: ['Insert', 'Search', 'Starts with', 'Word matcher', 'Autocomplete'],
  },
  {
    slug: 'binary',
    title: 'Binary Numbers Lab',
    summary:
      'See how a number becomes binary: divide by two and read the remainders, place values, converting back, and the bit operators that do it fast.',
    language: 'Python',
    tags: ['Decimal to binary', 'Binary to decimal', 'Bit shifts', 'Bitwise AND/OR'],
  },
];

export function getTopic(slug: string): Topic {
  const t = topics.find((t) => t.slug === slug);
  if (!t) throw new Error(`No topic "${slug}" in src/data/topics.ts`);
  return t;
}
