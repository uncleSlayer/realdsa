// Linked List Lab: step-by-step simulator and SVG renderer.
// Each OPS entry runs a scripted Sim that snapshots state after every line of Python.
const H=50, ROW=250, TOP=80, M=40, VH=400;
const DIM={singly:{w:120,dc:30,nc:90,step:170},doubly:{w:150,dc:75,nc:130,pc:20,step:190}};

class Sim{
  constructor(dbl,vals){
    Object.assign(this,{dbl,N:{},row:{},float:{},head:null,tail:null,size:0,vars:{},sc:{},out:[],ret:null,steps:[]});
    let p=null;
    vals.forEach((v,i)=>{const id='n'+v;this.N[id]={val:v,next:null,prev:null};this.row[id]=i;
      if(p){this.N[p].next=id;if(dbl)this.N[id].prev=p;}else this.head=id;p=id;});
    if(dbl)this.tail=p; this.size=vals.length;
  }
  v(id){return id?String(this.N[id].val):'None';}
  add(val,slot){const id='n'+val;this.N[id]={val,next:null,prev:null};this.float[id]=slot;return id;}
  detach(id){this.float[id]=this.row[id];delete this.row[id];}
  snap(line,text,hl){
    this.steps.push(JSON.parse(JSON.stringify({N:this.N,row:this.row,float:this.float,head:this.head,tail:this.tail,size:this.size,
      vars:this.vars,sc:this.sc,out:this.out,ret:this.ret,line:Array.isArray(line)?line:[line],text,hl:hl||[]})));
  }
  done(text){
    this.vars={};this.sc={};
    const row={},seen=new Set();let n=this.head,i=0;
    while(n&&!seen.has(n)){seen.add(n);row[n]=i++;n=this.N[n].next;}
    for(const id in this.N)if(!seen.has(id))delete this.N[id];
    this.row=row;this.float={};
    this.snap(-1,text,[]);
  }
}

const UNLINK=["def _unlink(self, node):","    if node.prev:","        node.prev.next = node.next","    else:","        self.head = node.next","    if node.next:","        node.next.prev = node.prev","    else:","        self.tail = node.prev","    self.size -= 1","    return node.data"];
function unlinkSim(s,u,node){
  const N=s.N[node]; s.vars.node=node;
  if(N.prev){const p=N.prev;s.N[p].next=N.next;s.snap([u+1,u+2],`node.prev exists (${s.v(p)}), so ${s.v(p)}.next = node.next, which is ${s.v(N.next)}. Going forward now skips ${N.val}.`,[p+'.next']);}
  else{s.head=N.next;s.snap([u+1,u+3,u+4],`node.prev is None, so ${N.val} is the head. Move head forward to ${s.v(N.next)}.`,['head']);}
  if(N.next){const x=N.next;s.N[x].prev=N.prev;s.snap([u+5,u+6],`node.next exists (${s.v(x)}), so ${s.v(x)}.prev = node.prev, which is ${s.v(N.prev)}. Going backward now skips ${N.val} too.`,[x+'.prev']);}
  else{s.tail=N.prev;s.snap([u+5,u+7,u+8],`node.next is None, so ${N.val} is the tail. Move tail back to ${s.v(N.prev)}.`,['tail']);}
  s.detach(node);s.size--;
  s.snap(u+9,`size drops to ${s.size}. ${N.val} still has its own arrows, but nothing points at it, so Python will free it.`,['node:'+node]);
  s.ret=N.val;s.snap(u+10,`_unlink returns ${N.val}.`);
}

const OPS={
singly:[
 {name:'Traverse',call:'for x in sll',big:'O(n)',vals:[10,20,30],
  sum:'Follow next pointers from head until you hit None. Almost every other operation is built on this loop.',
  code:["def __iter__(self):","    current = self.head","    while current:","        yield current.data","        current = current.next"],
  run(s){
   s.snap(-1,'A linked list has no indexes to jump to. To see every value you start at head and follow next pointers.');
   s.vars.current=s.head;s.snap(1,'current starts at the head node, 10.',['var:current']);
   while(s.vars.current){const c=s.vars.current;s.out.push(s.N[c].val);
     s.snap([2,3],`current is not None, so the loop body runs and yields ${s.N[c].val}.`,['node:'+c]);
     s.vars.current=s.N[c].next;
     s.snap(4,s.vars.current?`current = current.next moves current to ${s.v(s.vars.current)}.`:`current = current.next. The last node's next is None, so current becomes None.`,['var:current']);}
   s.snap(2,'current is None, so the while loop ends.');
   s.done('Each node was visited once, so traversal is O(n). Printing, counting and searching all use this same loop.');
  }},
 {name:'Prepend',call:'sll.prepend(5)',big:'O(1)',vals:[10,20,30],
  sum:'Add a node at the front. Only head and the new node change, so list length does not matter.',
  code:["def prepend(self, data):","    node = Node(data)","    node.next = self.head","    self.head = node","    self.size += 1"],
  run(s){
   s.snap(-1,'Goal: put 5 in front of 10. Look at what points at 10 right now: only head. No node comes before the first node.');
   const n=s.add(5,-0.5);s.vars.node=n;s.snap(1,'Create a node holding 5. Its next is None and it is not connected to the list yet.',['var:node','node:'+n]);
   s.N[n].next=s.head;s.snap(2,'node.next = self.head: the new node points at the current first node, 10. The list itself has not changed yet.',[n+'.next']);
   s.head=n;s.snap(3,'self.head = node: head now starts at 5. head was the only reference to the old first node, so this is the only other update needed.',['head']);
   s.size++;s.snap(4,'size becomes 4.');
   s.done('Result: 5 → 10 → 20 → 30. Two pointer assignments no matter how long the list is: O(1).');
  }},
 {name:'Append',call:'sll.append(40)',big:'O(n)',vals:[10,20,30],
  sum:'Add a node at the end. A singly list only knows its head, so it must walk to the last node first.',
  code:["def append(self, data):","    node = Node(data)","    if self.head is None:","        self.head = node","    else:","        current = self.head","        while current.next:","            current = current.next","        current.next = node","    self.size += 1"],
  run(s){
   s.snap(-1,'Goal: add 40 after 30. We have a reference to the head, but not to the last node.');
   const n=s.add(40,s.size);s.vars.node=n;s.snap(1,'Create node 40. Its next is None, which is correct for a last node.',['var:node','node:'+n]);
   s.snap(2,'head is not None, so skip the empty-list case and take the else branch.');
   s.vars.current=s.head;s.snap(5,'current starts at head.',['var:current']);
   while(s.N[s.vars.current].next){s.vars.current=s.N[s.vars.current].next;s.snap([6,7],`current.next is not None, so step forward to ${s.v(s.vars.current)}.`,['var:current']);}
   const c=s.vars.current;s.snap(6,`current.next is None, so ${s.v(c)} is the last node. The loop stops.`,['node:'+c]);
   s.N[c].next=n;s.snap(8,`current.next = node: ${s.v(c)} now points at 40.`,[c+'.next']);
   s.size++;s.snap(9,'size becomes 4.');
   s.done('Result: 10 → 20 → 30 → 40. The walk makes this O(n). Store a tail reference and append becomes O(1), as in the doubly linked version.');
  }},
 {name:'Insert',call:'sll.insert(2, 25)',big:'O(n)',vals:[10,20,30],
  sum:'Insert at an index. Walk to the node just before the position, then relink two pointers.',
  code:["def insert(self, index, data):","    if index < 0 or index > self.size:","        raise IndexError(\"index out of range\")","    if index == 0:","        return self.prepend(data)","    prev = self.head","    for _ in range(index - 1):","        prev = prev.next","    node = Node(data)","    node.next = prev.next","    prev.next = node","    self.size += 1"],
  run(s){
   s.sc.index=2;s.sc.data=25;
   s.snap(-1,'Goal: 25 at index 2, between 20 and 30. To link a node in, we need the node before that spot, because its next must change.');
   s.snap(1,'index 2 is between 0 and size (3), so it is valid.');
   s.snap(3,'index is not 0, so this is not a prepend.');
   s.vars.prev=s.head;s.snap(5,'prev starts at head, index 0.',['var:prev']);
   s.vars.prev=s.N[s.vars.prev].next;s.snap([6,7],'The loop runs index - 1 = 1 time. prev moves to 20, the node just before index 2.',['var:prev']);
   const p=s.vars.prev,n=s.add(25,s.row[p]+0.5);s.vars.node=n;s.snap(8,'Create node 25.',['var:node','node:'+n]);
   s.N[n].next=s.N[p].next;s.snap(9,'node.next = prev.next: 25 points at 30. Connect the new node to the rest of the list first.',[n+'.next']);
   s.N[p].next=n;s.snap(10,'prev.next = node: 20 now points at 25. If these two lines were swapped, prev.next would already be 25 and the link to 30 would be lost.',[p+'.next']);
   s.size++;s.snap(11,'size becomes 4.');
   s.done('Result: 10 → 20 → 25 → 30. Walking to prev is O(n); the relinking itself is O(1).');
  }},
 {name:'Remove',call:'sll.remove(20)',big:'O(n)',vals:[10,20,30],
  sum:'Remove a value from the middle. Find the node before it, then make that node skip over it.',
  code:["def remove(self, data):","    if self.head is None:","        raise ValueError(f\"{data} not in list\")","    if self.head.data == data:","        self.head = self.head.next","        self.size -= 1","        return","    prev = self.head","    while prev.next and prev.next.data != data:","        prev = prev.next","    if prev.next is None:","        raise ValueError(f\"{data} not in list\")","    prev.next = prev.next.next","    self.size -= 1"],
  run(s){
   s.sc.data=20;
   s.snap(-1,'Goal: remove 20. A node is removed by changing the next of the node before it, so the search keeps prev one step behind.');
   s.snap([1,3],'The list is not empty, and head holds 10, not 20. So the head is not the target.',['node:'+s.head]);
   s.vars.prev=s.head;s.snap(7,'prev starts at head.',['var:prev']);
   while(s.N[s.vars.prev].next&&s.N[s.N[s.vars.prev].next].val!==20){s.vars.prev=s.N[s.vars.prev].next;s.snap([8,9],`prev.next is not 20, so prev steps to ${s.v(s.vars.prev)}.`,['var:prev']);}
   const p=s.vars.prev,t=s.N[p].next;
   s.snap(8,`prev.next holds 20, so the loop stops. prev (${s.v(p)}) is the node before the target.`,['node:'+t]);
   s.snap(10,'prev.next is not None, so 20 was found and no error is raised.');
   s.N[p].next=s.N[t].next;s.snap(12,'prev.next = prev.next.next: 10 now skips over 20 and points straight at 30.',[p+'.next']);
   s.detach(t);s.size--;s.snap(13,'size drops to 3. 20 still points at 30, but nothing points at 20, so Python will free it.',['node:'+t]);
   s.done('Result: 10 → 30. Finding the node is O(n); unlinking it is O(1).');
  }},
 {name:'Remove head',call:'sll.remove(10)',big:'O(1)',vals:[10,20,30],
  sum:'The edge case: the target is the first node, so there is no node before it. head itself plays that role.',
  code:["def remove(self, data):","    if self.head is None:","        raise ValueError(f\"{data} not in list\")","    if self.head.data == data:","        self.head = self.head.next","        self.size -= 1","        return","    prev = self.head","    while prev.next and prev.next.data != data:","        prev = prev.next","    if prev.next is None:","        raise ValueError(f\"{data} not in list\")","    prev.next = prev.next.next","    self.size -= 1"],
  run(s){
   s.sc.data=10;
   s.snap(-1,'Goal: remove 10, the first node. Normally we change the previous node\'s next, but the first node has no previous node.');
   s.snap([1,3],'The list is not empty, and head holds 10. Match.',['node:'+s.head]);
   const t=s.head;s.head=s.N[t].next;s.snap(4,'self.head = self.head.next: head moves to 20. Here head is the reference that skips over the removed node.',['head']);
   s.detach(t);s.size--;s.snap(5,'size drops to 2. Nothing points at 10 now.',['node:'+t]);
   s.snap(6,'Return early. The rest of the method is not needed.');
   s.done('Result: 20 → 30. Removing the head takes constant time.');
  }},
 {name:'Find',call:'sll.find(30)',big:'O(n)',vals:[10,20,30],
  sum:'Return the index of the first match, or -1. It is a traversal with a counter.',
  code:["def find(self, data):","    for i, value in enumerate(self):","        if value == data:","            return i","    return -1"],
  run(s){
   s.sc.data=30;
   s.snap(-1,'Goal: find the index of 30. enumerate(self) runs __iter__ (see Traverse) and counts as it goes.');
   let i=0,c=s.head;
   while(c){const v=s.N[c].val,hit=v===30;s.sc.i=i;s.sc.value=v;
     s.snap([1,2],`i = ${i}, value = ${v}. ${hit?'It equals 30.':'Not 30, keep going.'}`,['node:'+c]);
     if(hit){s.ret=i;s.snap(3,`Return ${i}. The loop stops as soon as it finds a match.`,['node:'+c]);break;}
     c=s.N[c].next;i++;}
   s.done('Worst case it checks every node: O(n). If 30 were missing, the loop would finish and line 5 would return -1.');
  }},
 {name:'Reverse',call:'sll.reverse()',big:'O(n)',vals:[10,20,30],
  sum:'Flip every next pointer in place with three variables: prev, current and nxt.',
  code:["def reverse(self):","    prev, current = None, self.head","    while current:","        nxt = current.next","        current.next = prev","        prev = current","        current = nxt","    self.head = prev"],
  run(s){
   s.snap(-1,'Goal: 30 → 20 → 10 without creating new nodes. We walk once and turn each next arrow around.');
   s.vars.prev=null;s.vars.current=s.head;s.snap(1,'prev starts as None (the new end of the list), current at the head.',['var:current']);
   while(s.vars.current){const c=s.vars.current;
     s.vars.nxt=s.N[c].next;s.snap(3,`nxt = current.next saves ${s.v(s.vars.nxt)}. The next line overwrites current.next, so without this the rest of the list would be lost.`,['var:nxt']);
     s.N[c].next=s.vars.prev;s.snap(4,`current.next = prev: ${s.v(c)} now points ${s.vars.prev?'back at '+s.v(s.vars.prev):'to None'}.`,[c+'.next']);
     s.vars.prev=c;s.vars.current=s.vars.nxt;delete s.vars.nxt;
     s.snap([5,6],`Step forward: prev = ${s.v(s.vars.prev)}, current = ${s.v(s.vars.current)}.`,['var:prev','var:current']);
     }
   delete s.vars.nxt;
   s.snap(2,'current is None, so the loop ends. prev holds the old last node.');
   s.head=s.vars.prev;s.snap(7,'self.head = prev: 30 is the new first node.',['head']);
   s.done('Result: 30 → 20 → 10. One pass, O(n) time, and only three extra variables: O(1) space.');
  }}
],
doubly:[
 {name:'Traverse backward',call:'dll.reversed_iter()',big:'O(n)',vals:[10,20,30],
  sum:'Start at tail and follow prev pointers. A singly list cannot do this.',
  code:["def reversed_iter(self):","    current = self.tail","    while current:","        yield current.data","        current = current.prev"],
  run(s){
   s.snap(-1,'Each node has a prev pointer (left cell) and a next pointer (right cell). head.prev and tail.next are None.');
   s.vars.current=s.tail;s.snap(1,'current starts at the tail, 30.',['var:current']);
   while(s.vars.current){const c=s.vars.current;s.out.push(s.N[c].val);
     s.snap([2,3],`Yield ${s.N[c].val}.`,['node:'+c]);
     s.vars.current=s.N[c].prev;
     s.snap(4,s.vars.current?`current = current.prev moves back to ${s.v(s.vars.current)}.`:'The head\'s prev is None, so current becomes None.',['var:current']);}
   s.snap(2,'current is None, so the loop ends.');
   s.done('Same shape as forward traversal, mirrored. O(n).');
  }},
 {name:'Prepend',call:'dll.prepend(5)',big:'O(1)',vals:[10,20,30],
  sum:'Same as singly, plus one extra pointer: the old head must point back at the new node.',
  code:["def prepend(self, data):","    node = DNode(data)","    if self.head is None:","        self.head = self.tail = node","    else:","        node.next = self.head","        self.head.prev = node","        self.head = node","    self.size += 1"],
  run(s){
   s.snap(-1,'Goal: put 5 in front. In a doubly list, two things refer to 10 from the front side: head, and soon 5\'s next. 10\'s own prev is None and must change too.');
   const n=s.add(5,-0.5);s.vars.node=n;s.snap(1,'Create node 5. Both prev and next start as None.',['var:node','node:'+n]);
   s.snap([2,4],'head is not None, so take the else branch.');
   s.N[n].next=s.head;s.snap(5,'node.next = self.head: 5 points forward to 10.',[n+'.next']);
   const h=s.head;s.N[h].prev=n;s.snap(6,'self.head.prev = node: 10 points back to 5. This runs before head moves, because self.head is how we reach 10.',[h+'.prev']);
   s.head=n;s.snap(7,'self.head = node: 5 is now first. Its prev stays None.',['head']);
   s.size++;s.snap(8,'size becomes 4.');
   s.done('Result: 5 ⇄ 10 ⇄ 20 ⇄ 30. Three assignments, O(1). tail is untouched.');
  }},
 {name:'Append',call:'dll.append(40)',big:'O(1)',vals:[10,20,30],
  sum:'Mirror image of prepend, using tail. No walk needed.',
  code:["def append(self, data):","    node = DNode(data)","    if self.tail is None:","        self.head = self.tail = node","    else:","        node.prev = self.tail","        self.tail.next = node","        self.tail = node","    self.size += 1"],
  run(s){
   s.snap(-1,'Goal: add 40 at the end. tail already points at the last node, so there is nothing to search for.');
   const n=s.add(40,s.size);s.vars.node=n;s.snap(1,'Create node 40.',['var:node','node:'+n]);
   s.snap([2,4],'tail is not None, so take the else branch.');
   s.N[n].prev=s.tail;s.snap(5,'node.prev = self.tail: 40 points back to 30.',[n+'.prev']);
   const t=s.tail;s.N[t].next=n;s.snap(6,'self.tail.next = node: 30 points forward to 40.',[t+'.next']);
   s.tail=n;s.snap(7,'self.tail = node: 40 is now last.',['tail']);
   s.size++;s.snap(8,'size becomes 4.');
   s.done('Result: 10 ⇄ 20 ⇄ 30 ⇄ 40. O(1), compared with O(n) for a singly list without a tail.');
  }},
 {name:'Insert',call:'dll.insert(1, 15)',big:'O(n)',vals:[10,20,30,40],
  sum:'Find the node currently at the index, then wire the new node in front of it. Four pointers change.',
  code:["def insert(self, index, data):","    if index < 0 or index > self.size:","        raise IndexError(\"index out of range\")","    if index == 0:","        return self.prepend(data)","    if index == self.size:","        return self.append(data)","    current = self._node_at(index)","    node = DNode(data)","    node.prev = current.prev","    node.next = current","    current.prev.next = node","    current.prev = node","    self.size += 1"],
  run(s){
   s.sc.index=1;s.sc.data=15;
   s.snap(-1,'Goal: 15 at index 1, between 10 and 20. Because nodes know their prev, we can find the node at index 1 and insert before it.');
   s.snap(1,'index 1 is between 0 and size (4), so it is valid.');
   s.snap([3,5],'index is neither 0 nor size, so this is a middle insert.');
   s.vars.current='n20';s.snap(7,'_node_at(1) walks from whichever end is closer. Index 1 is in the first half, so it starts at head and takes one step. current is 20.',['var:current']);
   const c='n20',n=s.add(15,0.5);s.vars.node=n;s.snap(8,'Create node 15.',['var:node','node:'+n]);
   s.N[n].prev=s.N[c].prev;s.snap(9,'node.prev = current.prev: 15 points back to 10.',[n+'.prev']);
   s.N[n].next=c;s.snap(10,'node.next = current: 15 points forward to 20. The new node is fully wired, but no list node points at it yet.',[n+'.next']);
   const p=s.N[c].prev;s.N[p].next=n;s.snap(11,'current.prev.next = node: current.prev is still 10, so 10 now points forward to 15.',[p+'.next']);
   s.N[c].prev=n;s.snap(12,'current.prev = node: 20 points back to 15. This comes last because the previous line needed current.prev to reach 10.',[c+'.prev']);
   s.size++;s.snap(13,'size becomes 5.');
   s.done('Result: 10 ⇄ 15 ⇄ 20 ⇄ 30 ⇄ 40. The walk is O(n), at most n/2 steps; the four pointer updates are O(1).');
  }},
 {name:'Remove',call:'dll.remove(20)',big:'O(n)',vals:[10,20,30],
  sum:'Search for the node, then _unlink it. The node knows both neighbours, so no trailing prev variable is needed.',
  code:["def remove(self, data):","    current = self.head","    while current:","        if current.data == data:","            self._unlink(current)","            return","        current = current.next","    raise ValueError(f\"{data} not in list\")",""].concat(UNLINK),
  run(s){
   s.sc.data=20;
   s.snap(-1,'Goal: remove 20. Unlike singly, we can stand on the node itself and fix both neighbours from there.');
   s.vars.current=s.head;s.snap(1,'current starts at head.',['var:current']);
   while(s.vars.current){const c=s.vars.current,v=s.N[c].val;
     if(v===20){s.snap([2,3],'current holds 20. Found it.',['node:'+c]);s.snap(4,'Call _unlink(current). Inside, the same node is called node.',['node:'+c]);unlinkSim(s,9,c);s.snap(5,'Back in remove, return.');break;}
     s.snap([2,3],`current holds ${v}, not 20.`,['node:'+c]);
     s.vars.current=s.N[c].next;s.snap(6,`Move current to ${s.v(s.vars.current)}.`,['var:current']);}
   s.done('Result: 10 ⇄ 30. Search is O(n). _unlink itself is O(1): give it any node and it removes it in constant time.');
  }},
 {name:'Pop',call:'dll.pop()',big:'O(1)',vals:[10,20,30],
  sum:'Remove from the end. _unlink hits the "no next node" branch and moves tail.',
  code:["def pop(self):","    if self.tail is None:","        raise IndexError(\"pop from empty list\")","    return self._unlink(self.tail)",""].concat(UNLINK),
  run(s){
   s.snap(-1,'Goal: remove and return the last value. tail gives us the last node directly.');
   s.snap(1,'tail is not None, so the list is not empty.');
   s.vars.node=s.tail;s.snap(3,'Call _unlink(self.tail).',['var:node']);
   unlinkSim(s,5,s.tail);
   s.done('pop() returned 30 in O(1). A singly list needs O(n) here, because it must find the node before the tail.');
  }},
 {name:'Popleft',call:'dll.popleft()',big:'O(1)',vals:[10,20,30],
  sum:'Remove from the front. _unlink hits the "no prev node" branch and moves head.',
  code:["def popleft(self):","    if self.head is None:","        raise IndexError(\"pop from empty list\")","    return self._unlink(self.head)",""].concat(UNLINK),
  run(s){
   s.snap(-1,'Goal: remove and return the first value.');
   s.snap(1,'head is not None, so the list is not empty.');
   s.vars.node=s.head;s.snap(3,'Call _unlink(self.head).',['var:node']);
   unlinkSim(s,5,s.head);
   s.done('popleft() returned 10 in O(1). This is how a queue built on a doubly linked list removes items.');
  }}
]};

// ---------- rendering ----------
const NS='http://www.w3.org/2000/svg', svg=document.getElementById('stage'), layer=document.getElementById('layer');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let kind='singly', opIdx=0, steps=[], idx=0, cur={}, els=null, anim=0, timer=0, minSlot=0, vbW=800;

function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
const D=()=>DIM[kind], dbl=()=>kind==='doubly';
function posOf(st,id){const d=D();const inRow=id in st.row;const s=inRow?st.row[id]:st.float[id];return {x:M+(s-minSlot)*d.step,y:inRow?ROW:TOP};}
function reach(st){
  const r=new Set(),q=[st.head,st.tail,...Object.values(st.vars)].filter(Boolean);
  while(q.length){const n=q.pop();if(r.has(n)||!st.N[n])continue;r.add(n);const N=st.N[n];if(N.next)q.push(N.next);if(N.prev)q.push(N.prev);}
  return r;
}
function ptrPath(k,a,b){
  const d=D(),off=dbl()?(k==='next'?-9:9):0,same=Math.abs(a.y-b.y)<1,ds=(b.x-a.x)/d.step;
  if(k==='next'){
    const sx=a.x+d.nc,sy=a.y+H/2+off,tx=b.x+d.w*.72;
    if(same&&ds>.9&&ds<1.1){const ex=b.x-3,ey=b.y+H/2+off,q=(ex-sx)*.4;return [sx,sy,`M${sx} ${sy}C${sx+q} ${sy} ${ex-q} ${ey} ${ex} ${ey}`];}
    if(same&&ds>=1.1){const ey=b.y-3;return [sx,sy,`M${sx} ${sy}C${sx+30} ${sy-75} ${tx} ${ey-60} ${tx} ${ey}`];}
    if(same){const ex=b.x+d.w-16,ey=b.y+H+3;return [sx,sy,`M${sx} ${sy}C${sx+8} ${sy+62} ${ex} ${ey+40} ${ex} ${ey}`];}
    if(b.y>a.y){const ey=b.y-3;return [sx,sy,`M${sx} ${sy}C${sx+50} ${sy} ${tx} ${ey-80} ${tx} ${ey}`];}
    const ey=b.y+H+3;return [sx,sy,`M${sx} ${sy}C${sx+50} ${sy} ${tx} ${ey+80} ${tx} ${ey}`];
  }
  const sx=a.x+d.pc,sy=a.y+H/2+off,tx=b.x+d.w-12;
  if(same&&ds<-.9&&ds>-1.1){const ex=b.x+d.w+3,ey=b.y+H/2+off,q=(sx-ex)*.4;return [sx,sy,`M${sx} ${sy}C${sx-q} ${sy} ${ex+q} ${ey} ${ex} ${ey}`];}
  if(same&&ds<=-1.1){const ey=b.y+H+3;return [sx,sy,`M${sx} ${sy}C${sx-30} ${sy+60} ${tx} ${ey+45} ${tx} ${ey}`];}
  if(same){const ex=b.x+16,ey=b.y-3;return [sx,sy,`M${sx} ${sy}C${sx-8} ${sy-62} ${ex} ${ey-40} ${ex} ${ey}`];}
  if(b.y>a.y){const ey=b.y-3;return [sx,sy,`M${sx} ${sy}C${sx-50} ${sy} ${tx} ${ey-80} ${tx} ${ey}`];}
  const ey=b.y+H+3;return [sx,sy,`M${sx} ${sy}C${sx-50} ${sy} ${tx} ${ey+80} ${tx} ${ey}`];
}

function build(){
  const st=steps[idx],d=D(),live=reach(st);
  layer.innerHTML='';els={nodes:{},arrows:[],labels:[]};
  el('text',{x:vbW-16,y:26,class:'size'},layer).textContent='size = '+st.size;
  const gN=el('g',{},layer),gA=el('g',{},layer),gV=el('g',{},layer);
  for(const id in st.N){
    if(!(id in st.row)&&!(id in st.float))continue;
    const N=st.N[id],cls=[];if(!live.has(id))cls.push('lost');if(!cur[id])cls.push('enter');if(st.hl.includes('node:'+id))cls.push('focus');
    const g=el('g',{class:cls.join(' ')},gN);
    const cells=dbl()?[['prev',0,40],['data',40,70],['next',110,40]]:[['data',0,60],['next',60,60]];
    for(const [nm,x,w] of cells){
      el('rect',{x,y:0,width:w,height:H,class:'cell'},g);
      el('text',{x:x+w/2,y:H+14,class:'cap'},g).textContent=nm;
      if((nm==='next'&&!N.next)||(nm==='prev'&&!N.prev))el('line',{x1:x+4,y1:H-4,x2:x+w-4,y2:4,class:'nul'},g);
    }
    el('text',{x:d.dc,y:32,class:'val'},g).textContent=N.val;
    els.nodes[id]=g;
  }
  const shown=id=>id&&(id in st.row||id in st.float);
  for(const id in st.N){if(!shown(id))continue;const N=st.N[id];
    for(const k of dbl()?['next','prev']:['next']){const t=N[k];if(!shown(t))continue;
      const hl=st.hl.includes(id+'.'+k),lost=!live.has(id);
      const p=el('path',{class:'arrow'+(hl?' hl draw':'')+(lost?' lost':''),pathLength:1,'marker-end':`url(#${hl?'mk-hl':'mk-ptr'})`},gA);
      const c=el('circle',{r:3.5,class:'sdot'+(hl?' hl':'')+(lost?' lost':'')},gA);
      els.arrows.push({k,from:id,to:t,p,c});}}
  // labels: head/tail above; locals below for row nodes, above for floating nodes
  const groups={};
  const push=(id,name,loc)=>{if(!shown(id))return;const above=!loc||!(id in st.row);(groups[id+(above?'^':'v')]=groups[id+(above?'^':'v')]||{id,above,items:[]}).items.push({name,loc});};
  push(st.head,'head',false);if(st.tail)push(st.tail,'tail',false);
  for(const k in st.vars)push(st.vars[k],k,true);
  for(const key in groups){const G=groups[key];
    G.items.forEach((it,i)=>{
      const hl=st.hl.includes(it.loc?'var:'+it.name:it.name);
      const g=el('g',{class:'var'+(it.loc?' loc':'')+(hl?' hl':'')},gV);
      const w=16+it.name.length*8.2;
      const r=el('rect',{rx:5,width:w,height:22,class:'vbox'},g),t=el('text',{class:'vtxt'},g);t.textContent=it.name;
      const p=el('path',{class:'arrow'+(hl?' draw':''),pathLength:1,'marker-end':`url(#${hl?'mk-hl':'mk-var'})`},g);
      els.labels.push({G,i,n:G.items.length,w,r,t,p});
    });}
}

function apply(pos){
  const d=D();
  for(const id in els.nodes){const p=pos[id];els.nodes[id].setAttribute('transform',`translate(${p.x} ${p.y})`);}
  for(const a of els.arrows){const [sx,sy,dd]=ptrPath(a.k,pos[a.from],pos[a.to]);a.p.setAttribute('d',dd);a.c.setAttribute('cx',sx);a.c.setAttribute('cy',sy);}
  for(const L of els.labels){
    const p=pos[L.G.id],cx=p.x+d.dc+(L.i-(L.n-1)/2)*84,tip=Math.min(p.x+d.w-8,Math.max(p.x+8,cx));
    const by=L.G.above?p.y-58:p.y+H+46;
    L.r.setAttribute('x',cx-L.w/2);L.r.setAttribute('y',by);L.t.setAttribute('x',cx);L.t.setAttribute('y',by+15);
    L.p.setAttribute('d',L.G.above?`M${cx} ${by+22}L${tip} ${p.y-4}`:`M${cx} ${by}L${tip} ${p.y+H+4}`);
  }
}

function show(){
  const st=steps[idx];cancelAnimationFrame(anim);build();
  const to={};for(const id in els.nodes)to[id]=posOf(st,id);
  const from={};for(const id in to)from[id]=cur[id]||to[id];
  const dur=reduce?0:600,t0=performance.now();
  const frame=t=>{const k=dur?Math.min(1,(t-t0)/dur):1,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,now={};
    for(const id in to)now[id]={x:from[id].x+(to[id].x-from[id].x)*e,y:from[id].y+(to[id].y-from[id].y)*e};
    apply(now);if(k<1)anim=requestAnimationFrame(frame);};
  frame(t0);cur=to;
  const op=OPS[kind][opIdx],code=document.getElementById('code');code.innerHTML='';
  op.code.forEach((ln,i)=>{const dv=document.createElement('div');if(st.line.includes(i))dv.className='on';
    const n=document.createElement('span');n.className='ln';n.textContent=i+1;const c=document.createElement('span');c.textContent=ln||' ';dv.append(n,c);code.appendChild(dv);});
  const lines=st.line[0]<0?'':' · line'+(st.line.length>1?'s ':' ')+st.line.map(x=>x+1).join(', ');
  document.getElementById('stepno').textContent=idx===0?'Before the call':(idx===steps.length-1?'After the call':`Step ${idx} of ${steps.length-2}${lines}`);
  document.getElementById('narr').textContent=st.text;
  const V=document.getElementById('vars');V.innerHTML='';
  const chip=t=>{const s=document.createElement('span');s.textContent=t;V.appendChild(s);};
  for(const k in st.sc)chip(`${k} = ${st.sc[k]}`);
  for(const k in st.vars)chip(st.vars[k]?`${k} → node ${st.N[st.vars[k]].val}`:`${k} = None`);
  if(st.out.length)chip('yielded: '+st.out.join(', '));
  if(st.ret!==null)chip('returned '+st.ret);
  document.getElementById('prev').disabled=idx===0;
  document.getElementById('next').disabled=idx===steps.length-1;
  const dots=document.getElementById('dots');dots.innerHTML='';
  steps.forEach((_,i)=>{const b=document.createElement('button');b.className='dot'+(i===idx?' on':'');b.setAttribute('aria-label','Go to step '+i);b.onclick=()=>{stop();idx=i;show();};dots.appendChild(b);});
}

function loadOp(){
  stop();const op=OPS[kind][opIdx],s=new Sim(dbl(),op.vals);op.run(s);steps=s.steps;idx=0;cur={};
  let lo=0,hi=0;for(const st of steps){for(const k in st.row){lo=Math.min(lo,st.row[k]);hi=Math.max(hi,st.row[k]);}for(const k in st.float){lo=Math.min(lo,st.float[k]);hi=Math.max(hi,st.float[k]);}}
  minSlot=lo;const d=D();vbW=Math.max(640,Math.round(M*2+(hi-lo)*d.step+d.w+20));
  svg.setAttribute('viewBox',`0 0 ${vbW} ${VH}`);svg.style.minWidth=Math.round(vbW*.7)+'px';
  document.getElementById('call').textContent=op.call;
  document.getElementById('big').textContent=op.big;
  document.getElementById('sum').textContent=op.sum;
  document.querySelectorAll('.op').forEach((b,i)=>b.setAttribute('aria-pressed',i===opIdx?'true':'false'));
  show();
}
function renderOps(){
  const box=document.getElementById('ops');box.innerHTML='';
  OPS[kind].forEach((op,i)=>{const b=document.createElement('button');b.className='op';b.innerHTML=`<span></span><small></small>`;
    b.firstChild.textContent=op.name;b.lastChild.textContent=op.big;b.onclick=()=>{opIdx=i;loadOp();};box.appendChild(b);});
}
function stop(){clearInterval(timer);timer=0;document.getElementById('play').textContent='▶ Play';}
document.getElementById('play').onclick=()=>{
  if(timer){stop();return;}
  if(idx===steps.length-1){idx=0;show();}
  document.getElementById('play').textContent='❚❚ Pause';
  timer=setInterval(()=>{if(idx<steps.length-1){idx++;show();}if(idx===steps.length-1)stop();},2800);
};
document.getElementById('next').onclick=()=>{stop();if(idx<steps.length-1){idx++;show();}};
document.getElementById('prev').onclick=()=>{stop();if(idx>0){idx--;show();}};
document.getElementById('reset').onclick=()=>{stop();idx=0;cur={};show();};
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
  kind=b.dataset.kind;opIdx=0;renderOps();loadOp();});
document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,textarea'))return;
  if(e.key==='ArrowRight')document.getElementById('next').click();if(e.key==='ArrowLeft')document.getElementById('prev').click();});
renderOps();loadOp();
