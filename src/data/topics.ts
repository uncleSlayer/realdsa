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
}

export const topics: Topic[] = [
  {
    slug: 'graph-representation',
    title: 'Graph Representation Lab',
    summary:
      'Build the same graph as an edge list, an adjacency matrix and an adjacency list, and see what each one costs to store and to query.',
  },
  {
    slug: 'heap',
    title: 'Heap Lab',
    summary:
      'Watch a min heap and a max heap live in one array: insert with sift-up, delete the root with sift-down, and see why heapify is O(n).',
  },
  {
    slug: 'linked-list',
    title: 'Linked List Lab',
    summary:
      'Step through singly and doubly linked list operations line by line and watch exactly which pointer each line of Python changes.',
  },
  {
    slug: 'dijkstra',
    title: "Dijkstra's Algorithm Lab",
    summary:
      'Watch Dijkstra find the shortest path from one vertex to every other: the priority queue, the distance table and each edge relaxation, one step at a time.',
  },
  {
    slug: 'bst',
    title: 'Binary Search Tree Lab',
    summary:
      'Code a BST from scratch: insert, search and delete, the three depth-first traversals, and the max height of the tree.',
  },
  {
    slug: 'trie',
    title: 'Trie Lab',
    summary:
      'Store words letter by letter in a prefix tree. Step through insert, search and prefix lookup, then match words with wildcards.',
  },
  {
    slug: 'binary',
    title: 'Binary Numbers Lab',
    summary:
      'See how a number becomes binary: divide by two and read the remainders, place values, converting back, and the bit operators that do it fast.',
  },
];

export function getTopic(slug: string): Topic {
  const t = topics.find((t) => t.slug === slug);
  if (!t) throw new Error(`No topic "${slug}" in src/data/topics.ts`);
  return t;
}
