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
    slug: 'linked-list',
    title: 'Linked List Lab',
    summary:
      'Step through singly and doubly linked list operations line by line and watch exactly which pointer each line of Python changes.',
    language: 'Python',
    tags: ['Traverse', 'Prepend', 'Append', 'Insert', 'Remove', 'Find', 'Reverse', 'Pop'],
  },
];

export function getTopic(slug: string): Topic {
  const t = topics.find((t) => t.slug === slug);
  if (!t) throw new Error(`No topic "${slug}" in src/data/topics.ts`);
  return t;
}
