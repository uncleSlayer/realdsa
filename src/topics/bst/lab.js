// Binary Search Tree Lab: step-by-step simulator (pure, no DOM) and SVG renderer.
// Each operation runs a scripted Sim that snapshots the tree, the call stack and the output
// after every step of Python. The renderer at the bottom only reads those snapshots.

export const EXAMPLE=[50,30,70,20,40,60,80,35];
export const EXAMPLE_PRESETS={
  insert:[{label:'new leaf',v:45},{label:'duplicate',v:40}],
  search:[{label:'hit',v:35},{label:'miss',v:65}],
  delete:[{label:'leaf',v:20},{label:'one child',v:40},{label:'two children',v:30}],
};
export const BUILD_PRESETS=[
  {label:'sorted',vals:[10,20,30,40,50]},
  {label:'middle first',vals:[30,20,40,10,50]},
  {label:'sorted, 7',vals:[10,20,30,40,50,60,70]},
  {label:'middle first, 7',vals:[40,20,60,10,30,50,70]},
];
export const LIMITS={minVal:-99,maxVal:999,maxLen:15};

// ---------- plain tree helpers (also used by the tests) ----------
// A tree is {N:{id:{v,l,r}}, root, seq}. l and r are node ids or null.
export function newTree(){return {N:{},root:null,seq:0};}
function newNode(t,v){const id='n'+(t.seq++);t.N[id]={v,l:null,r:null};return id;}
export function treeInsert(t,v){
  if(t.root===null){t.root=newNode(t,v);return t.root;}
  let id=t.root;
  for(;;){const n=t.N[id];if(v===n.v)return null;const k=v<n.v?'l':'r';
    if(n[k]===null){n[k]=newNode(t,v);return n[k];}id=n[k];}
}
export function buildTree(vals){const t=newTree();for(const v of vals)treeInsert(t,v);return t;}
export function inorderIds(t,id=t.root,acc=[]){if(id===null)return acc;const n=t.N[id];inorderIds(t,n.l,acc);acc.push(id);inorderIds(t,n.r,acc);return acc;}
export function orderVals(t,kind,id=t.root,acc=[]){
  if(id===null)return acc;const n=t.N[id];
  if(kind==='pre')acc.push(n.v);orderVals(t,kind,n.l,acc);
  if(kind==='in')acc.push(n.v);orderVals(t,kind,n.r,acc);
  if(kind==='post')acc.push(n.v);return acc;
}
export function heightOf(t,id=t.root){if(id===null)return -1;const n=t.N[id];return 1+Math.max(heightOf(t,n.l),heightOf(t,n.r));}
export function depthMap(t){const d={};(function go(id,k){if(id===null)return;d[id]=k;go(t.N[id].l,k+1);go(t.N[id].r,k+1);})(t.root,0);return d;}
export function findId(t,v){let id=t.root;while(id!==null){const n=t.N[id];if(v===n.v)return id;id=v<n.v?n.l:n.r;}return null;}
const fmt=a=>'['+a.join(', ')+']';
const plural=(k,w)=>`${k} ${w}${k===1?'':'s'}`;
const nil=(pid,side)=>pid===null?'root':pid+'.'+side;   // an empty child slot: "n3.L", "n3.R" or "root"
const minHeight=n=>n<1?-1:Math.floor(Math.log2(n));

// Values that show each case on a given tree (the example tree has hand-picked ones).
export function presetsFor(vals){
  if(vals.join()===EXAMPLE.join())return EXAMPLE_PRESETS;
  const t=buildTree(vals),pre=[];(function go(id){if(id===null)return;pre.push(id);go(t.N[id].l);go(t.N[id].r);})(t.root);
  const has=v=>findId(t,v)!==null,N=t.N,d=depthMap(t);
  const kids=id=>(N[id].l!==null)+(N[id].r!==null);
  const free=from=>{for(let k=0;k<400;k++){for(const c of [from+k,from-k])if(c>=LIMITS.minVal&&c<=LIMITS.maxVal&&!has(c))return c;}return null;};
  let deep=t.root;for(const id of pre)if(d[id]>d[deep])deep=id;
  const out={insert:[],search:[],delete:[]};
  if(t.root===null){out.insert.push({label:'first value',v:50});return out;}
  const ins=free(N[deep].v+1);if(ins!==null)out.insert.push({label:'new leaf',v:ins});
  out.insert.push({label:'duplicate',v:N[pre[Math.min(1,pre.length-1)]].v});
  out.search.push({label:'hit',v:N[deep].v});
  const miss=free(N[deep].v+1);if(miss!==null)out.search.push({label:'miss',v:miss});
  const leaf=pre.find(id=>kids(id)===0&&id!==t.root)??(kids(t.root)===0?t.root:undefined);
  if(leaf!==undefined)out.delete.push({label:'leaf',v:N[leaf].v});
  const one=pre.find(id=>kids(id)===1);if(one!==undefined)out.delete.push({label:'one child',v:N[one].v});
  const twos=pre.filter(id=>kids(id)===2);
  const two=twos.find(id=>id!==t.root&&N[N[id].r].l!==null)??twos.find(id=>N[N[id].r].l!==null)??twos[0];
  if(two!==undefined)out.delete.push({label:'two children',v:N[two].v});
  return out;
}

// ---------- code listings ----------
export const CODE={
  insert:["def insert(self, value):",
    "    self.root = self._insert(self.root, value)",
    "",
    "def _insert(self, node, value):",
    "    if node is None:",
    "        return Node(value)        # empty spot: new leaf",
    "    if value < node.value:",
    "        node.left = self._insert(node.left, value)",
    "    elif value > node.value:",
    "        node.right = self._insert(node.right, value)",
    "    # equal: a duplicate, so change nothing",
    "    return node"],
  search:["def search(self, target):",
    "    node = self.root",
    "    while node is not None:",
    "        if target == node.value:",
    "            return node",
    "        if target < node.value:",
    "            node = node.left",
    "        else:",
    "            node = node.right",
    "    return None"],
  delete:["def delete(self, value):",
    "    self.root = self._delete(self.root, value)",
    "",
    "def _delete(self, node, value):",
    "    if node is None:",
    "        return None               # value not in the tree",
    "    if value < node.value:",
    "        node.left = self._delete(node.left, value)",
    "    elif value > node.value:",
    "        node.right = self._delete(node.right, value)",
    "    else:                         # found it",
    "        if node.left is None:     # leaf, or right child only",
    "            return node.right",
    "        if node.right is None:    # left child only",
    "            return node.left",
    "        succ = node.right         # two children: find the",
    "        while succ.left is not None:  # in-order successor,",
    "            succ = succ.left      # min of the right subtree",
    "        node.value = succ.value",
    "        node.right = self._delete(node.right, succ.value)",
    "    return node"],
  pre:["def preorder(self, node, out):",
    "    if node is None:",
    "        return",
    "    out.append(node.value)          # node",
    "    self.preorder(node.left, out)   # left",
    "    self.preorder(node.right, out)  # right"],
  in:["def inorder(self, node, out):",
    "    if node is None:",
    "        return",
    "    self.inorder(node.left, out)    # left",
    "    out.append(node.value)          # node",
    "    self.inorder(node.right, out)   # right"],
  post:["def postorder(self, node, out):",
    "    if node is None:",
    "        return",
    "    self.postorder(node.left, out)  # left",
    "    self.postorder(node.right, out) # right",
    "    out.append(node.value)          # node"],
  walk:["def walk(node):",
    "    if node is None:",
    "        return",
    "    pre_out.append(node.value)   # 1st visit: left side",
    "    walk(node.left)",
    "    in_out.append(node.value)    # 2nd visit: underneath",
    "    walk(node.right)",
    "    post_out.append(node.value)  # 3rd visit: right side"],
  height:["def height(self, node):",
    "    if node is None:",
    "        return -1                 # empty: -1 edges",
    "    left_h = self.height(node.left)",
    "    right_h = self.height(node.right)",
    "    return 1 + max(left_h, right_h)"],
  build:["tree = BST()",
    "for v in values:",
    "    tree.insert(v)",
    "print(tree.height(tree.root))"],
};

// ---------- simulator ----------
export class Sim{
  constructor(vals){
    const t=buildTree(vals);this.N=t.N;this.root=t.root;this.seq=t.seq;
    this.cur=null;        // node id or nil slot in focus
    this.path=[];         // ids visited on the way down (insert/search/delete)
    this.done=[];         // ids already output / finished
    this.stack=[];        // call frames: {label, line, node, loc, ret}
    this.out=null;        // traversal output: array, or {pre,in,post} for the walk
    this.emit=null;       // which output list got a value this step
    this.hts={};          // returned heights: id or nil slot -> number
    this.tags={};         // local variables drawn on the tree: name -> id or nil slot
    this.sc={};           // other variables as chips
    this.float=null;      // {id, slot}: a new node returned but not linked yet
    this.doomed=null;     // id of the node being unlinked
    this.hit=null;        // id found / inserted / overwritten
    this.walk=null;       // {pos}: how far around the tree the walk has got
    this.ret=null;this.checked=0;this.calls=0;this.maxDepth=0;this.pops=[];
    this.meter=()=>'';this.steps=[];
  }
  tree(){return {N:this.N,root:this.root,seq:this.seq};}
  val(id){return this.N[id].v;}
  make(v){const id='n'+(this.seq++);this.N[id]={v,l:null,r:null};return id;}
  push(f){f.loc=f.loc||{};this.stack.push(f);this.calls++;this.maxDepth=Math.max(this.maxDepth,this.stack.length);return f;}
  pop(note){const f=this.stack.pop();if(note)this.pops.push(note);return f;}
  // "inorder(20) returns. " for frames that finished without a step of their own
  takePops(){if(!this.pops.length)return '';const p=this.pops;this.pops=[];
    if(p.length===1)return p[0]+' returns. ';
    if(p.length>3)return `${p[0]}, ${p[1]} and the ${p.length-2} calls below them on the stack return, innermost first, ending with ${p[p.length-1]}. `;
    return p.slice(0,-1).join(', ')+' and '+p[p.length-1]+' return. ';}
  snap(line,text){
    const reach={};(function go(N,id){if(id===null)return;reach[id]=N[id];go(N,N[id].l);go(N,N[id].r);})(this.N,this.root);
    if(this.float)reach[this.float.id]=this.N[this.float.id];
    if(this.doomed&&!reach[this.doomed])this.doomed=null;
    this.steps.push(JSON.parse(JSON.stringify({
      N:reach,root:this.root,cur:this.cur,path:this.path,done:this.done,stack:this.stack,out:this.out,emit:this.emit,
      hts:this.hts,tags:this.tags,sc:this.sc,float:this.float,doomed:this.doomed,hit:this.hit,walk:this.walk,ret:this.ret,
      meter:this.meter(),line:Array.isArray(line)?line:[line],text})));
    this.emit=null;
  }
}

// ---------- insert (recursive) ----------
function runInsert(s,v){
  s.sc.value=v;s.meter=()=>`nodes checked ${s.checked}`;
  const before=s.root===null?0:inorderIds(s.tree()).length;
  s.snap(-1,`Goal: insert ${v}. At each node compare once: smaller goes left, larger goes right. Keep going until there is no node, an empty spot (None). The new node always becomes a leaf; nothing already in the tree moves.`);
  const top=s.push({label:`insert(value=${v})`,line:1,node:null});
  s.snap([0,1],`tree.insert(${v}) hands the work to the recursive helper, self._insert(self.root, ${v}), and stores whatever it returns back in self.root.`);
  let added=null;
  const rec=(id,slot)=>{
    const f=s.push({label:`_insert(node=${id===null?'None':s.val(id)}, value=${v})`,line:4,node:id});
    if(id===null){
      const nid=s.make(v);added=nid;s.float={id:nid,slot};s.cur=nid;s.tags={};f.line=5;f.ret=`Node(${v})`;
      s.snap([4,5],slot==='root'
        ?`node is None: the tree is empty. Create Node(${v}) and return it.`
        :`node is None: we have walked off the tree, and this empty spot is exactly where ${v} belongs. Create Node(${v}) and return it. It is not linked in yet: the caller has to store it.`);
      s.pop();return nid;
    }
    const n=s.N[id];s.checked++;s.path.push(id);s.cur=id;s.tags={node:id};
    if(v===n.v){
      f.line=11;f.ret=`node (${n.v})`;s.hit=id;
      s.snap([4,6,8,10,11],`node.value is ${n.v}. ${v} < ${n.v} is False and ${v} > ${n.v} is False, so ${v} is already in the tree. This BST ignores duplicates: change nothing and return node.`);
      s.pop();return id;
    }
    const side=v<n.v?'l':'r',L=side==='l'?7:9,word=side==='l'?'left':'right';
    f.line=L;
    s.snap(side==='l'?[4,6,7]:[4,6,8,9],side==='l'
      ?`node.value is ${n.v}. ${v} < ${n.v}, so ${v} belongs somewhere in the left subtree. Call self._insert(node.left, ${v}) and wait for it to return.`
      :`node.value is ${n.v}. ${v} < ${n.v} is False, and ${v} > ${n.v}, so ${v} belongs somewhere in the right subtree. Call self._insert(node.right, ${v}) and wait for it to return.`);
    const old=n[side],c=rec(old,nil(id,side==='l'?'L':'R'));
    n[side]=c;s.cur=id;s.tags={node:id};f.line=L;f.ret=`node (${n.v})`;
    let t;
    if(old===null){s.float=null;s.hit=c;t=`Back in _insert(node=${n.v}): the call returned the new Node(${v}), and node.${word} = … links it as the ${word} child of ${n.v}.`;}
    else t=`Back in _insert(node=${n.v}): node.${word} = the node that came back, which is ${s.val(c)}, the same child as before. Reassigning an unchanged link is harmless, and it is what makes the empty-spot case work.`;
    s.snap([L,11],`${t} Then return node: hand ${n.v} back to its caller.`);
    s.pop();return id;
  };
  const r=rec(s.root,'root');
  const was=s.root;s.root=r;s.cur=r;s.tags={};top.line=1;s.float=null;
  if(was===null)s.hit=r;
  s.snap(1,was===null?`Back in insert: self.root = the new node. ${v} is now the root.`
    :`Back in insert: self.root = the node that came back, ${s.val(r)}, the same root as before.`);
  s.pop();s.cur=added??s.hit;if(added!==null)s.path.push(added);
  const t=s.tree(),n=inorderIds(t).length;
  if(added!==null&&n===1)s.snap(-1,`Done. ${v} is the root, and the only node: height 0. Every later insert starts its walk here.`);
  else if(added!==null){
    const d=depthMap(t)[added];
    s.snap(-1,`Done. ${v} is a leaf at depth ${d}, reached after checking ${plural(s.checked,'node')}: one per level, never a whole subtree. The tree now has ${n} nodes and height ${heightOf(t)}. Insert walks one root-to-leaf path, so it is O(h).`);
  }else s.snap(-1,`Done. ${v} was already in the tree, so it still has ${before} nodes. Some BSTs keep a count per node, or send equal values consistently to one side, instead of ignoring them.`);
}

// ---------- search (a loop) ----------
function runSearch(s,v){
  s.sc.target=v;s.meter=()=>`nodes checked ${s.checked}`;
  s.snap(-1,`Goal: find ${v}. One comparison at a node tells us which subtree could hold it, and the other subtree is never looked at. This version is a plain loop: no recursion, so the call stack never grows.`);
  const f=s.push({label:`search(target=${v})`,line:1,node:null});
  let id=s.root,prev=null,side='L';
  s.tags={node:id===null?'root':id};s.cur=id===null?'root':id;
  s.snap(1,id===null?'node = self.root, which is None: the tree is empty.':`node = self.root: start at the root, ${s.val(id)}.`);
  for(;;){
    if(id===null){
      f.line=9;f.ret='None';s.ret='None';
      s.snap([2,9],prev===null?`node is None, so the loop never runs. return None: an empty tree holds nothing.`
        :`node is None: we fell off the tree below ${s.val(prev)}. If ${v} were in the tree it would have to be right here, so it is not. return None after checking ${plural(s.checked,'node')}.`);
      break;
    }
    const n=s.N[id];s.checked++;s.path.push(id);s.cur=id;
    if(v===n.v){
      f.line=4;f.ret=`node (${v})`;s.ret=`Node(${v})`;s.hit=id;
      s.snap([2,3,4],`node.value is ${v}: found it. return node, after checking ${plural(s.checked,'node')}.`);
      break;
    }
    const left=v<n.v,next=left?n.l:n.r;side=left?'L':'R';
    prev=id;id=next;s.tags={node:id===null?nil(prev,side):id};s.cur=s.tags.node;f.line=left?6:8;
    const nx=next===null?'None':String(s.val(next));
    s.snap(left?[2,3,5,6]:[2,3,5,7,8],left
      ?`${v} != ${n.v}, and ${v} < ${n.v}, so it can only be in the left subtree. node = node.left (${nx}). The whole right subtree of ${n.v} is skipped.`
      :`${v} != ${n.v}, and ${v} < ${n.v} is False, so it can only be in the right subtree. node = node.right (${nx}). The whole left subtree of ${n.v} is skipped.`);
  }
  s.pop();s.tags={};
  const h=heightOf(s.tree());
  s.snap(-1,s.hit!==null?`Returned the node holding ${v}, after checking ${plural(s.checked,'node')} in a tree of height ${h}. Search never checks more than h + 1, so it is O(h).`
    :s.root===null?`Returned None: the tree is empty.`:`Returned None: ${v} is not in the tree. A miss costs at most h + 1 checks too (h = ${h}), because it also follows a single path down. The recursive version, return self._search(node.left, target), does the same work but uses O(h) stack frames.`);
}

// ---------- delete (recursive) ----------
function runDelete(s,v){
  s.sc.value=v;s.meter=()=>`nodes checked ${s.checked}`;
  const t0=s.tree(),hasIt=findId(t0,v)!==null;
  s.snap(-1,`Goal: delete ${v}. First find it, exactly like search. Then there are three cases: a leaf just goes, a node with one child is replaced by that child, and a node with two children takes the value of its in-order successor, which is then deleted instead.`);
  const top=s.push({label:`delete(value=${v})`,line:1,node:null});
  s.snap([0,1],`tree.delete(${v}) calls self._delete(self.root, ${v}). Every call returns the root of its subtree after the delete, and each caller stores that in its link.`);
  let gone=null,kind='';
  const assign=(id,side,c,L)=>{
    const n=s.N[id],word=side==='l'?'left':'right',old=n[side];n[side]=c;s.cur=id;s.tags={node:id};
    const f=s.stack[s.stack.length-1];f.line=L;f.ret=`node (${n.v})`;
    let t;
    if(old!==c&&old===gone){
      const gv=s.N[gone].v;
      t=c===null?`node.${word} = None: the link to ${gv} is cut, so ${gv} is gone from the tree.`
        :`node.${word} = ${s.val(c)}: the link now skips ${gv} and points straight at its child. ${gv} is gone, and ${s.val(c)}'s subtree is still in order because all of it was already on this side of ${n.v}.`;
    }else t=`node.${word} = the node that came back, ${c===null?'None':s.val(c)}, the same as before.`;
    s.snap([L,20],`Back in _delete(node=${n.v}): ${t} return node (${n.v}).`);
  };
  const rec=(id,slot,val)=>{
    const f=s.push({label:`_delete(node=${id===null?'None':s.val(id)}, value=${val})`,line:4,node:id});
    if(id===null){
      f.line=5;f.ret='None';s.cur=slot;s.tags={node:slot};
      s.snap([4,5],`node is None: we fell off the tree, so ${val} is not in it. return None, which leaves the caller's empty link empty.`);
      s.pop();return null;
    }
    const n=s.N[id];s.checked++;s.path.push(id);s.cur=id;s.tags={node:id};
    if(val!==n.v){
      const left=val<n.v,side=left?'l':'r',L=left?7:9;f.line=L;
      s.snap(left?[4,6,7]:[4,6,8,9],left
        ?`node.value is ${n.v}. ${val} < ${n.v}: go left. node.left = self._delete(node.left, ${val}).`
        :`node.value is ${n.v}. ${val} > ${n.v}: go right. node.right = self._delete(node.right, ${val}).`);
      const c=rec(n[side],nil(id,left?'L':'R'),val);
      assign(id,side,c,L);s.pop();return id;
    }
    if(n.l===null){
      f.line=12;s.doomed=id;gone=id;f.ret=n.r===null?'None':`node (${s.val(n.r)})`;
      kind=kind||(n.r===null?'leaf':'one child');
      s.snap([4,6,8,10,11,12],n.r===null
        ?`Found ${val}. node.left is None, and node.right is None too: a leaf. return node.right, which is None. The caller stores None in its link, and that removes the leaf.`
        :`Found ${val}. node.left is None, so it has only a right child, ${s.val(n.r)}. return node.right: the caller will link straight to ${s.val(n.r)}, skipping ${val}.`);
      s.pop();return n.r;
    }
    if(n.r===null){
      f.line=14;s.doomed=id;gone=id;f.ret=`node (${s.val(n.l)})`;kind=kind||'one child';
      s.snap([4,6,8,10,11,13,14],`Found ${val}. node.left is not None but node.right is: one child, ${s.val(n.l)}. return node.left: ${s.val(n.l)} moves up into ${val}'s place.`);
      s.pop();return n.l;
    }
    kind='two children';
    let sc=n.r;f.line=15;s.tags={node:id,succ:sc};s.sc.succ=s.val(sc);
    s.snap([4,6,8,10,11,13,15],`Found ${val}, and it has two children, so unlinking it would orphan one subtree. Instead, overwrite its value with its in-order successor: the smallest value in its right subtree. Start with succ = node.right (${s.val(sc)}).`);
    while(s.N[sc].l!==null){
      sc=s.N[sc].l;s.tags={node:id,succ:sc};s.sc.succ=s.val(sc);f.line=17;
      s.snap([16,17],`succ.left is not None, so succ = succ.left (${s.val(sc)}). Smaller values are always further left.`);
    }
    const sv=s.val(sc);f.line=16;
    s.snap(16,`succ.left is None: ${sv} is the smallest value in ${val}'s right subtree. It is larger than everything on ${val}'s left and smaller than everything else on its right, so it can sit where ${val} is.`);
    n.v=sv;s.hit=id;f.line=18;
    s.snap(18,`node.value = succ.value: ${val} is overwritten with ${sv}. ${val} is already gone, but ${sv} is now in the tree twice: here, and in the old successor node below.`);
    s.tags={node:id};delete s.sc.succ;f.line=19;
    s.snap(19,`Delete the old ${sv} from the right subtree: node.right = self._delete(node.right, ${sv}). The successor never has a left child, so this is always the easy leaf or one-child case.`);
    const c=rec(n.r,nil(id,'R'),sv);
    assign(id,'r',c,19);s.pop();return id;
  };
  const r=rec(s.root,'root',v);
  const was=s.root;s.root=r;s.cur=r;s.tags={};top.line=1;
  let t;
  if(was!==r&&was===gone)t=r===null?`Back in delete: self.root = None. The only node is gone; the tree is empty.`
    :`Back in delete: self.root = ${s.val(r)}. The old root ${v} is gone and ${s.val(r)} is the new root.`;
  else t=`Back in delete: self.root = ${r===null?'None':s.val(r)}, the same root as before.`;
  s.snap(1,t);s.pop();s.cur=s.hit;s.path=[];
  const T=s.tree();
  s.snap(-1,hasIt?`Done: ${v} is deleted (${kind} case) after checking ${plural(s.checked,'node')}. Inorder is now ${fmt(orderVals(T,'in'))}, still sorted, so the BST property holds. Every case walks at most one path from the root down to a leaf: O(h).`
    :s.checked===0?`Done: the tree is empty, so there was nothing to delete.`:`Done: ${v} was not in the tree, so nothing changed. The search for it still cost ${plural(s.checked,'check')}, at most one per level: O(h).`);
}

// ---------- the three depth-first traversals (recursive) ----------
const TRAV={
  pre:{fn:'preorder',left:4,right:5,app:3,Name:'Preorder'},
  in:{fn:'inorder',left:3,right:5,app:4,Name:'Inorder'},
  post:{fn:'postorder',left:3,right:4,app:5,Name:'Postorder'},
};
function runTrav(s,kind){
  const T=TRAV[kind],fn=T.fn;s.out=[];
  s.meter=()=>`calls ${s.calls} · stack depth ${s.stack.length} (max ${s.maxDepth})`;
  const goal={
    pre:'Preorder outputs a node first, then its whole left subtree, then its whole right subtree: node, left, right. Watch the call stack: each call waits for its children to finish.',
    in:'Inorder outputs the whole left subtree, then the node, then the whole right subtree: left, node, right. In a BST that is every value in sorted order.',
    post:'Postorder outputs the whole left subtree, then the whole right subtree, then the node: left, right, node. A node comes out only after all of its descendants.',
  }[kind];
  s.snap(-1,`Goal: ${goal}`);
  const rec=(id,slot,why)=>{
    const f=s.push({label:`${fn}(node=${id===null?'None':s.val(id)})`,line:1,node:id});
    if(id===null){
      f.line=2;s.cur=slot;s.tags={node:slot};
      s.snap([1,2],`${s.takePops()}${why}: node is None, so return straight away. This base case is what stops the recursion.`);
      s.pop();return;
    }
    const n=s.N[id],v=n.v;s.cur=id;s.tags={node:id};
    if(kind==='pre'){
      s.out.push(v);s.done.push(id);s.emit='out';f.line=T.left;
      s.snap([1,3],`${s.takePops()}${why}: node is ${v}. Preorder handles the node first: out.append(${v}). Then it will do the left subtree.`);
    }else{
      f.line=T.left;
      s.snap([1,T.left],`${s.takePops()}${why}: node is ${v}, not None. ${T.Name} does not output ${v} yet; first it calls ${fn}(node.left) and waits.`);
    }
    rec(n.l,nil(id,'L'),`${fn}(${v}) calls ${fn}(node.left)`);
    if(kind==='in'){
      s.cur=id;s.tags={node:id};s.out.push(v);s.done.push(id);s.emit='out';f.line=T.right;
      s.snap([3,4],`${s.takePops()}Back in inorder(${v}): its left subtree is finished, so now out.append(${v}). Everything already in out is smaller than ${v}.`);
    }
    f.line=T.right;
    rec(n.r,nil(id,'R'),`${fn}(${v}) calls ${fn}(node.right)`);
    if(kind==='post'){
      s.cur=id;s.tags={node:id};s.out.push(v);s.done.push(id);s.emit='out';f.line=T.app;
      s.snap([4,5],`${s.takePops()}Back in postorder(${v}): both subtrees are finished, so out.append(${v}).`);
    }
    s.pop(`${fn}(${v})`);
  };
  rec(s.root,'root',`tree.${fn}(tree.root, out) starts at the root`);
  s.cur=null;s.tags={};const note=s.takePops();
  const t=s.tree(),n=inorderIds(t).length,h=heightOf(t);
  const tail={
    pre:'Preorder is how you copy a tree: inserting these values into an empty BST in this order rebuilds exactly the same shape.',
    in:'Sorted, without a single comparison during the walk: the BST property did the work. Checking that inorder is strictly increasing is also an easy way to test whether a tree is a valid BST.',
    post:'Postorder is the order for anything that needs the children finished first: freeing or deleting a tree, or computing sizes and heights.',
  }[kind];
  if(n===0){s.snap(-1,'The tree is empty: one call, which hits the base case at once. out = [].');return;}
  s.snap(-1,`${note}Every call has returned. out = ${fmt(s.out)}. ${tail} ${s.calls} calls for ${n} nodes (one per node plus one per empty child); the stack never got deeper than ${s.maxDepth}, which is h + 2 for h = ${h}. Time O(n), extra space O(h).`);
}

// ---------- all three in one walk (Euler tour) ----------
function runWalk(s){
  const all=inorderIds(s.tree());
  s.out={pre:[],in:[],post:[]};s.walk={pos:-1};
  s.meter=()=>`visits ${s.walk.pos+1} of ${3*all.length}`;
  s.snap(-1,`Trace a line around the outside of the tree, starting on the root's left and keeping the tree on your right. You pass every node three times: on its left side going down, underneath it between its children, and on its right side going back up. Preorder outputs at the 1st pass, inorder at the 2nd, postorder at the 3rd. One walk, three orders.`);
  const rec=id=>{
    const n=s.N[id],v=n.v,f=s.push({label:`walk(node=${v})`,line:3,node:id});
    s.walk.pos++;s.cur=id;s.out.pre.push(v);s.emit='pre';
    s.snap([1,3],`1st visit to ${v}, its left side, arriving from above: pre_out.append(${v}).`);
    if(n.l!==null){f.line=4;rec(n.l);}
    s.walk.pos++;s.cur=id;s.out.in.push(v);s.emit='in';f.line=5;
    s.snap([4,5],n.l!==null?`2nd visit to ${v}, underneath it: we are back from its left subtree. in_out.append(${v}).`
      :`${v} has no left child (walk(None) returns at once), so the line goes straight round to underneath ${v}. 2nd visit: in_out.append(${v}).`);
    if(n.r!==null){f.line=6;rec(n.r);}
    s.walk.pos++;s.cur=id;s.out.post.push(v);s.emit='post';f.line=7;
    s.snap([6,7],n.r!==null?`3rd visit to ${v}, its right side, back from its right subtree and leaving for good: post_out.append(${v}).`
      :`${v} has no right child either, so the line rounds ${v} straight to its right side. 3rd visit, leaving for good: post_out.append(${v}).`);
    s.pop();
  };
  if(s.root!==null)rec(s.root);
  s.cur=null;
  if(!all.length){s.snap(-1,'The tree is empty, so there is nothing to walk around.');return;}
  s.snap(-1,`Walk finished: ${3*all.length} visits, 3 per node. pre_out ${fmt(s.out.pre)}, in_out ${fmt(s.out.in)}, post_out ${fmt(s.out.post)}. The walk was the same for all three; only the moment you write the value down changes. Time O(n).`);
}

// ---------- max height (post-order recursion) ----------
function runHeight(s){
  s.meter=()=>`calls ${s.calls} · stack depth ${s.stack.length} (max ${s.maxDepth})`;
  s.snap(-1,`Goal: the height of the tree, the number of edges on the longest path from the root down to a leaf. A node's height is 1 + the taller of its two subtrees, so each call must hear back from both children before it can answer: a postorder recursion.`);
  let firstNone=true;
  const rec=(id,slot,why)=>{
    const f=s.push({label:`height(node=${id===null?'None':s.val(id)})`,line:1,node:id});
    if(id===null){
      f.line=2;f.ret='-1';s.cur=slot;s.tags={node:slot};s.hts[slot]=-1;
      s.snap([1,2],`${s.takePops()}${why}: node is None, an empty subtree. return -1.${firstNone?' That way a single leaf gets 1 + max(-1, -1) = 0: this convention counts edges.':''}`);
      firstNone=false;delete s.hts[slot];s.pop();return -1;
    }
    const n=s.N[id],v=n.v;s.cur=id;s.tags={node:id};f.line=3;
    s.snap([1,3],`${s.takePops()}${why}: node is ${v}. Its height depends on both subtrees, so first ask the left one: left_h = self.height(node.left).`);
    const lh=rec(n.l,nil(id,'L'),`height(${v}) calls height(node.left)`);
    f.loc.left_h=lh;f.line=4;
    const rh=rec(n.r,nil(id,'R'),`left_h = ${lh}. height(${v}) calls height(node.right)`);
    f.loc.right_h=rh;f.line=5;
    const h=1+Math.max(lh,rh);s.hts[id]=h;s.done.push(id);s.cur=id;s.tags={node:id};f.ret=String(h);
    s.snap([4,5],`${s.takePops()}Back in height(${v}): left_h = ${lh}, right_h = ${rh}. return 1 + max(${lh}, ${rh}) = ${h}.`);
    s.pop(`height(${v})`);
    return h;
  };
  const h=rec(s.root,'root','tree.height(tree.root) starts at the root');
  const note=s.takePops();s.cur=s.root;s.tags={};s.ret=h;
  const t=s.tree(),n=inorderIds(t).length;
  const long=[];let id=s.root;while(id!==null){long.push(s.val(id));const a=s.N[id];id=heightOf(t,a.l)>=heightOf(t,a.r)?a.l:a.r;}
  s.snap(-1,n===0?`${note}The tree is empty, so the height is -1 (or 0 if you count nodes).`
    :`${note}height(tree.root) = ${h}: the longest path, ${long.join(' → ')}, has ${plural(h,'edge')}. Counting nodes instead (return 0 for None) gives ${h+1}. ${n} nodes could fit in a tree of height ${minHeight(n)} at best, or stretch to height ${n-1} at worst. Every node is visited once: O(n).`);
}

// ---------- build by inserting, to compare shapes ----------
function runBuild(s,vals){
  s.meter=()=>{const n=inorderIds(s.tree()).length;return n>1?`best possible height ${minHeight(n)} · worst ${n-1}`:'';};
  s.sc.values=fmt(vals);
  s.snap(-1,`Goal: build a tree by inserting ${fmt(vals)} one value at a time, then measure its height. The order of insertion alone decides the shape.`);
  s.snap(0,'tree = BST(): an empty tree; root is None.');
  vals.forEach((v,k)=>{
    s.sc.v=v;s.sc['values left']=fmt(vals.slice(k+1));
    const T=s.tree(),path=[],steps=[];let id=s.root,dup=false;
    while(id!==null){const n=s.N[id];path.push(id);if(v===n.v){dup=true;break;}steps.push(`${v} ${v<n.v?'<':'>'} ${n.v} → ${v<n.v?'left':'right'}`);id=v<n.v?n.l:n.r;}
    let t;
    if(dup)t=`v = ${v}: already in the tree, so insert ignores it.`;
    else{
      const nid=treeInsert(T,v);s.seq=T.seq;s.root=T.root;
      s.cur=nid;s.hit=nid;
      if(path.length===0)t=`v = ${v}: the tree is empty, so ${v} becomes the root.`;
      else{const p=s.val(path[path.length-1]);t=`v = ${v}: ${steps.join(', ')}. It becomes the ${v<p?'left':'right'} child of ${p}, at depth ${path.length}.`;}
    }
    s.path=dup?path:[...path,s.cur];const h=heightOf(s.tree());s.sc.height=h;
    s.snap([1,2],`${t} Height is now ${h}.`);
  });
  delete s.sc.v;delete s.sc['values left'];s.path=[];s.cur=null;s.hit=null;
  const t=s.tree(),n=inorderIds(t).length,h=heightOf(t),best=minHeight(n);
  s.ret=h;
  s.snap(3,`print(tree.height(tree.root)) prints ${h}.`);
  let verdict;
  if(n<=1)verdict='One node or none: there is no shape to speak of yet.';
  else if(h===n-1)verdict=`That is the worst case: height n − 1 = ${n-1}. Every node has at most one child, so the tree is really a linked list and search, insert and delete all cost O(n). Sorted input always does this.`;
  else if(h===best)verdict=`That is the best possible: height ⌊log₂ ${n}⌋ = ${best}. Putting a middle value in first splits the rest evenly, so every operation costs O(log n).`;
  else verdict=`Somewhere between the best possible, ⌊log₂ ${n}⌋ = ${best}, and the worst, n − 1 = ${n-1}.`;
  s.snap(-1,`${n} values, height ${h}. ${verdict}`);
}

// ---------- operations ----------
export const OPS=[
  {key:'insert',name:'Insert',big:'O(h)',input:'value',sum:'Walk down comparing: smaller goes left, larger goes right. At the first empty spot, return a new Node; each caller stores what it gets back.'},
  {key:'search',name:'Search',big:'O(h)',input:'value',sum:'One comparison per node rules out a whole subtree. A loop this time, so no recursion and O(1) extra space.'},
  {key:'delete',name:'Delete',big:'O(h)',input:'value',sum:'Find the node, then: a leaf just goes, one child takes its place, two children borrow the in-order successor\'s value.'},
  {key:'pre',name:'Preorder',big:'O(n)',sum:'node, left, right. Output each node before either of its subtrees.'},
  {key:'in',name:'Inorder',big:'O(n)',sum:'left, node, right. In a BST this gives the values in sorted order.'},
  {key:'post',name:'Postorder',big:'O(n)',sum:'left, right, node. Output each node only after both of its subtrees.'},
  {key:'walk',name:'All three in one walk',big:'O(n)',sum:'Go around the outside of the tree once. Each node is passed three times; pre, in and post just pick which pass writes it down.'},
  {key:'height',name:'Max height',big:'O(n)',sum:'height(None) = -1, height(node) = 1 + max(height(left), height(right)). Answers bubble up from the leaves.'},
  {key:'build',name:'Build from a list',big:'O(n·h)',input:'list',sum:'Insert values one at a time into an empty tree. Same values, different order, very different heights.'},
];

export function callFor(key,v,vals){
  return {insert:`tree.insert(${v})`,search:`tree.search(${v})`,delete:`tree.delete(${v})`,
    pre:'tree.preorder(tree.root, out)',in:'tree.inorder(tree.root, out)',post:'tree.postorder(tree.root, out)',
    walk:'walk(tree.root)',height:'tree.height(tree.root)',build:`values = ${fmt(vals||[])}`}[key];
}

export function runOp(opIdx,{tree=EXAMPLE,value,build=BUILD_PRESETS[0].vals}={}){
  const op=OPS[opIdx],s=new Sim(op.key==='build'?[]:tree);
  if(value===undefined){
    // default: the first preset (insert, search), or the hardest case (delete: two children)
    const p=presetsFor(tree)[op.key]||[];
    value=p.length?(op.key==='delete'?p[p.length-1]:p[0]).v:50;
  }
  ({insert:()=>runInsert(s,value),search:()=>runSearch(s,value),delete:()=>runDelete(s,value),
    pre:()=>runTrav(s,'pre'),in:()=>runTrav(s,'in'),post:()=>runTrav(s,'post'),walk:()=>runWalk(s),
    height:()=>runHeight(s),build:()=>runBuild(s,build)})[op.key]();
  return {op,code:CODE[op.key],call:callFor(op.key,value,build),value,steps:s.steps,sim:s};
}

// Parse "3, 17, 10" style input. Returns {arr} or {error}.
export function parseArray(text,{allowEmpty=false}={}){
  const parts=String(text).split(/[\s,]+/).filter(Boolean);
  if(!parts.length)return allowEmpty?{arr:[]}:{error:'Enter at least one whole number.'};
  if(parts.length>LIMITS.maxLen)return {error:`Use at most ${LIMITS.maxLen} values so the tree fits (you gave ${parts.length}).`};
  const arr=[];
  for(const p of parts){const r=parseValue(p);if(r.error)return r;arr.push(r.value);}
  return {arr};
}
export function parseValue(text){
  const t=String(text).trim();
  if(!/^[-+]?\d+$/.test(t))return {error:t?`"${t.slice(0,12)}" is not a whole number.`:'Enter a whole number.'};
  const v=parseInt(t,10);
  if(v<LIMITS.minVal||v>LIMITS.maxVal)return {error:`Keep values between ${LIMITS.minVal} and ${LIMITS.maxVal} (got ${v}).`};
  return {value:v};
}

// Euler tour: the order the walk passes each node, as [id, 0|1|2] pairs.
export function tourOf(N,root){
  const seq=[];(function go(id){if(id===null)return;seq.push([id,0]);go(N[id].l);seq.push([id,1]);go(N[id].r);seq.push([id,2]);})(root);return seq;
}

// ---------- rendering ----------
if(typeof document!=='undefined'&&document.getElementById('bst-stage'))initUI();

function initUI(){
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const svg=$('bst-stage'),layer=$('bst-layer');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const W=720,R=21,TOP=66,M=34,TAGH=19,WOFF=R+10;
let opIdx=0,steps=[],idx=0,cur={},els=null,anim=0,timer=0,run=null;
let geo={LV:80,H:400};
const st8={tree:EXAMPLE.slice(),values:{},build:BUILD_PRESETS[0].vals.slice()};

function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
function h(t,cls,text){const e=document.createElement(t);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}

// in-order layout: x is the node's rank in sorted order, y its depth
function layout(st){
  const ids=[],dep={};
  (function go(id,d){if(id===null)return;go(st.N[id].l,d+1);ids.push(id);dep[id]=d;go(st.N[id].r,d+1);})(st.root,0);
  const sp=(W-2*M)/Math.max(ids.length,1),pos={};
  ids.forEach((id,k)=>{pos[id]={x:M+(k+.5)*sp,y:TOP+dep[id]*geo.LV};});
  return {pos,sp,dep};
}
function slotXY(L,slot,lv){
  if(slot==='root')return {x:W/2,y:TOP};
  const [pid,side]=slot.split('.'),p=L.pos[pid];if(!p)return null;
  return {x:p.x+(side==='L'?-1:1)*Math.max(L.sp/2,26),y:p.y+geo.LV*lv};
}
const isSlot=k=>typeof k==='string'&&(k==='root'||k.includes('.'));

function build(){
  const st=steps[idx],L=layout(st);
  layer.innerHTML='';els={items:{},edges:[],stubs:[]};
  const stackIds=new Set(st.stack.map(f=>f.node).filter(x=>x!==null&&!isSlot(x)));
  const on=new Set([...st.path,...stackIds]),done=new Set(st.done);
  const n=Object.keys(st.N).length-(st.float?1:0);
  el('text',{x:14,y:26,class:'bst-meta'},layer).textContent=n?`n = ${n} · height ${heightOf({N:st.N,root:st.root})}`:'empty tree';
  el('text',{x:W-14,y:26,class:'bst-meta','text-anchor':'end'},layer).textContent=st.meter;
  // walk contour (positions never change during the walk)
  if(st.walk)drawWalk(st,L);
  // edges
  const gE=el('g',{},layer);
  for(const id in L.pos){const nd=st.N[id];for(const c of [nd.l,nd.r]){if(c===null||!L.pos[c])continue;
    const lit=on.has(id)&&on.has(c);
    els.edges.push({a:id,b:c,e:el('line',{class:'bst-edge'+(lit?' on':'')},gE)});}}
  // the empty slot in focus: draw a None stub (or a returned -1)
  const gS=el('g',{},layer);
  const stubSlots=new Set();if(isSlot(st.cur))stubSlots.add(st.cur);for(const k in st.tags)if(isSlot(st.tags[k]))stubSlots.add(st.tags[k]);
  for(const slot of stubSlots){
    if(st.float&&st.float.slot===slot)continue;
    const g=el('g',{class:'bst-stub'+(slot===st.cur?' focus':'')},gS);
    const line=slot==='root'?null:el('line',{class:'bst-edge bst-nil on'},gS);
    el('rect',{x:-19,y:-11,width:38,height:22,rx:6,class:'bst-stubbox'},g);
    el('text',{y:4,class:'bst-stubtxt'},g).textContent='None';
    if(st.hts[slot]!==undefined)badge(g,String(st.hts[slot]),18,-12);
    tagsFor(g,st,slot,13);
    els.stubs.push({slot,g,line});
  }
  // nodes
  const gN=el('g',{},layer);
  for(const id in st.N){
    const isFloat=st.float&&st.float.id===id;
    const c=['bst-node'];
    if(st.cur===id)c.push('focus');
    if(id===st.doomed)c.push('doomed');
    else if(id===st.hit)c.push('hit');
    else if(done.has(id)&&!st.walk)c.push('done');
    else if(on.has(id))c.push('onpath');
    if(isFloat)c.push('float');
    if(!cur[id])c.push('enter');
    const g=el('g',{class:c.join(' ')},gN);
    el('circle',{r:R,class:'bst-disc'},g);
    el('text',{y:6,class:'bst-val'},g).textContent=st.N[id].v;
    if(isFloat)el('text',{y:-R-8,class:'bst-flab'},g).textContent='new, not linked yet';
    if(st.hts[id]!==undefined)badge(g,'h='+st.hts[id],R-2,-R+2);
    tagsFor(g,st,id,R+6);
    els.items[id]={g};
  }
  if(st.walk)drawWalker(st,L);
}
function badge(g,text,x,y){
  const w=10+text.length*7.2,b=el('g',{class:'bst-badge',transform:`translate(${x} ${y})`},g);
  el('rect',{x:0,y:-9,width:w,height:18,rx:9,class:'bst-badgebox'},b);
  el('text',{x:w/2,y:4,class:'bst-badgetxt'},b).textContent=text;
}
function tagsFor(g,st,target,dy){
  let k=0;
  for(const name in st.tags){if(st.tags[name]!==target)continue;
    const w=12+name.length*7.4,y=dy+6+k*(TAGH+4);
    const t=el('g',{class:'bst-tag'},g);
    el('line',{x1:0,y1:dy,x2:0,y2:y,class:'bst-stem'},t);
    el('rect',{x:-w/2,y,width:w,height:TAGH,rx:5,class:'bst-tbox'},t);
    el('text',{x:0,y:y+13.5,class:'bst-ttxt'},t).textContent=name;k++;}
}
// the Euler tour: a line around the tree through the three visit points of every node
function visitXY(L,id,k){const p=L.pos[id];return k===0?{x:p.x-WOFF,y:p.y}:k===1?{x:p.x,y:p.y+WOFF}:{x:p.x+WOFF,y:p.y};}
function tourPath(L,seq,upto){
  let d='';
  for(let i=0;i<=upto&&i<seq.length;i++){
    const [id,k]=seq[i],q=visitXY(L,id,k);
    if(i===0){d+=`M${q.x} ${q.y}`;continue;}
    const [pid,pk]=seq[i-1];
    if(pid===id&&k===pk+1)d+=` A${WOFF} ${WOFF} 0 0 0 ${q.x} ${q.y}`;   // round the node itself
    else d+=` L${q.x} ${q.y}`;
  }
  return d;
}
function drawWalk(st,L){
  const seq=tourOf(st.N,st.root),g=el('g',{},layer);
  el('path',{d:tourPath(L,seq,seq.length-1),class:'bst-tour'},g);
  if(st.walk.pos>=0)el('path',{d:tourPath(L,seq,st.walk.pos),class:'bst-tour done'},g);
  seq.forEach(([id,k],i)=>{const q=visitXY(L,id,k);
    el('circle',{cx:q.x,cy:q.y,r:4.5,class:'bst-visit v'+k+(i<=st.walk.pos?' done':'')},g);});
}
function drawWalker(st,L){
  if(st.walk.pos<0)return;
  const seq=tourOf(st.N,st.root),[id,k]=seq[st.walk.pos],q=visitXY(L,id,k);
  const g=el('g',{class:'bst-walker'},layer);
  el('circle',{cx:q.x,cy:q.y,r:9,class:'bst-walkdot'},g);
  el('text',{x:q.x,y:q.y+4,class:'bst-walktxt'},g).textContent=String(k+1);
}

function posOf(st,L,id){
  if(L.pos[id])return L.pos[id];
  if(st.float&&st.float.id===id)return slotXY(L,st.float.slot,1)||{x:W/2,y:TOP};
  return {x:W/2,y:TOP};
}
function apply(pos){
  for(const id in els.items){const p=pos[id];els.items[id].g.setAttribute('transform',`translate(${p.x} ${p.y})`);}
  for(const E of els.edges){const a=pos[E.a],b=pos[E.b];if(!a||!b)continue;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
    E.e.setAttribute('x1',a.x+ux*R);E.e.setAttribute('y1',a.y+uy*R);
    E.e.setAttribute('x2',b.x-ux*R);E.e.setAttribute('y2',b.y-uy*R);}
}
function placeStubs(st,L){
  for(const S of els.stubs){const q=slotXY(L,S.slot,.72);if(!q)continue;S.g.setAttribute('transform',`translate(${q.x} ${q.y})`);
    if(S.line){const p=L.pos[S.slot.split('.')[0]],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1;
      S.line.setAttribute('x1',p.x+dx/len*R);S.line.setAttribute('y1',p.y+dy/len*R);S.line.setAttribute('x2',q.x-dx/len*12);S.line.setAttribute('y2',q.y-dy/len*12);}}
}

function show(){
  const st=steps[idx];cancelAnimationFrame(anim);build();
  const L=layout(st),to={};
  for(const id in els.items)to[id]=posOf(st,L,id);
  const from={};for(const id in to)from[id]=cur[id]||to[id];
  placeStubs(st,L);
  const dur=reduce?0:600,t0=performance.now();
  const frame=t=>{const k=dur?Math.min(1,Math.max(0,(t-t0)/dur)):1,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,now={};
    for(const id in to){const a=from[id],b=to[id];now[id]={x:a.x+(b.x-a.x)*e,y:a.y+(b.y-a.y)*e};}
    apply(now);if(k<1)anim=requestAnimationFrame(frame);};
  frame(t0);cur=to;
  // aria label for the drawing
  const vals=orderVals({N:st.N,root:st.root},'in');
  const focus=st.cur===null?'':isSlot(st.cur)?'; looking at an empty child (None)':`; current node ${st.N[st.cur]?st.N[st.cur].v:''}`;
  svg.setAttribute('aria-label',(vals.length?`Binary search tree holding ${vals.join(', ')} (in order)`:'Empty binary search tree')+focus);
  // code
  const code=$('bst-code');code.innerHTML='';
  run.code.forEach((ln,i)=>{const dv=h('div',st.line.includes(i)?'on':'');dv.append(h('span','ln',String(i+1)),h('span','',ln||' '));code.appendChild(dv);});
  const lines=st.line[0]<0?'':' · line'+(st.line.length>1?'s ':' ')+st.line.map(x=>x+1).join(', ');
  $('bst-stepno').textContent=idx===0?'Before the call':(idx===steps.length-1?'After the call':`Step ${idx} of ${steps.length-2}${lines}`);
  $('bst-narr').textContent=st.text;
  // variable chips
  const V=$('bst-vars');V.innerHTML='';
  const chip=(t,c)=>V.appendChild(h('span',c||'',t));
  for(const k in st.sc)chip(`${k} = ${st.sc[k]}`);
  for(const k in st.tags){const t=st.tags[k];chip(isSlot(t)?`${k} = None`:`${k} = Node(${st.N[t]?st.N[t].v:'?'})`,'ix');}
  if(st.ret!==null)chip('returned '+st.ret,'ret');
  // call stack, top first
  const S=$('bst-stack');S.innerHTML='';
  if(!st.stack.length)S.appendChild(h('li','bst-empty',idx===0?'empty: nothing has been called yet':'empty'));
  st.stack.slice().reverse().forEach((f,i)=>{
    const li=h('li','bst-frame'+(i===0?' top':''));
    const head=h('div','bst-fhead');head.append(h('span','bst-fn',f.label),h('span','bst-at','line '+(f.line+1)));li.appendChild(head);
    const loc=Object.keys(f.loc||{}).map(k=>`${k} = ${f.loc[k]}`);
    if(loc.length)li.appendChild(h('div','bst-loc',loc.join(', ')));
    if(i===0&&f.ret!==undefined)li.appendChild(h('div','bst-fret','returns '+f.ret));
    S.appendChild(li);
  });
  document.querySelector('.bst-stagewrap').classList.toggle('bst-noside',run.op.key==='build');
  $('bst-depth').textContent=st.stack.length?`${st.stack.length} frame${st.stack.length===1?'':'s'}`:'';
  // output lists
  const O=$('bst-out');O.innerHTML='';
  $('bst-outbox').hidden=st.out===null;
  if(st.out!==null){
    const row=(name,arr,lit)=>{const r=h('div','bst-orow'+(lit?' lit':''));r.appendChild(h('span','bst-oname',name));
      const list=h('div','bst-olist');
      if(!arr.length)list.appendChild(h('span','bst-onone','[ ]'));
      arr.forEach((v,i)=>list.appendChild(h('span','bst-oval'+(lit&&i===arr.length-1?' new':''),String(v))));
      r.appendChild(list);O.appendChild(r);};
    if(Array.isArray(st.out))row('out',st.out,st.emit==='out');
    else{row('pre_out',st.out.pre,st.emit==='pre');row('in_out',st.out.in,st.emit==='in');row('post_out',st.out.post,st.emit==='post');}
  }
  $('bst-prev').disabled=idx===0;
  $('bst-next').disabled=idx===steps.length-1;
  const dots=$('bst-dots');dots.innerHTML='';
  steps.forEach((_,i)=>{const b=h('button','bst-dot'+(i===idx?' on':''));b.type='button';b.setAttribute('aria-label','Go to step '+i);
    if(i===idx)b.setAttribute('aria-current','step');b.onclick=()=>{stop();idx=i;show();};dots.appendChild(b);});
  $('bst-keep').hidden=!(idx===steps.length-1&&['insert','delete','build'].includes(run.op.key));
}

function loadOp(keepStep){
  stop();
  const op=OPS[opIdx];
  run=runOp(opIdx,{tree:st8.tree,value:st8.values[op.key],build:st8.build});
  steps=run.steps;idx=0;cur={};
  // stage height from the deepest node any step shows (+1 level for None stubs and new nodes)
  let maxD=0;
  for(const s of steps){const d=depthOfAll(s);maxD=Math.max(maxD,d);}
  geo.LV=maxD>6?58:maxD>4?68:80;
  geo.H=Math.round(TOP+(maxD-.28)*geo.LV+48);   // a None stub sits .72 of a level below the deepest node
  svg.setAttribute('viewBox',`0 0 ${W} ${geo.H}`);
  $('bst-call').textContent=run.call;$('bst-big').textContent=op.big;$('bst-sum').textContent=op.sum;
  document.querySelectorAll('#bst-ops .bst-op').forEach((b,i)=>b.setAttribute('aria-pressed',i===opIdx?'true':'false'));
  renderInputs();
  if(keepStep!==undefined)idx=Math.max(0,Math.min(steps.length-1,keepStep));
  show();
}
function depthOfAll(s){
  let m=0;(function go(id,d){if(id===null)return;m=Math.max(m,d);go(s.N[id].l,d+1);go(s.N[id].r,d+1);})(s.root,0);
  return m+1;  // room for a None stub or a new leaf under the deepest node
}
function renderOps(){
  const box=$('bst-ops');box.innerHTML='';
  OPS.forEach((o,i)=>{const b=h('button','bst-op');b.type='button';b.append(h('span','',o.name),h('small','',o.big));
    b.onclick=()=>{opIdx=i;loadOp();};box.appendChild(b);});
}

// inputs: the tree everything runs on, the value for insert/search/delete, the list for build
function renderInputs(){
  const op=OPS[opIdx];
  $('bst-tin').value=st8.tree.join(', ');$('bst-tex').hidden=st8.tree.join()===EXAMPLE.join();
  $('bst-treeform').hidden=op.key==='build';
  const vf=$('bst-valform'),bf=$('bst-buildform');
  vf.hidden=op.input!=='value';bf.hidden=op.input!=='list';
  for(const f of [vf,bf,$('bst-treeform')]){f.querySelector('.bst-err').textContent='';f.querySelector('input').removeAttribute('aria-invalid');}
  const pre=$('bst-presets');pre.innerHTML='';
  if(op.input==='value'){
    $('bst-vlabel').textContent={insert:'Value to insert',search:'Value to find',delete:'Value to delete'}[op.key];
    $('bst-vin').value=String(run.value);
    for(const p of presetsFor(st8.tree)[op.key]||[]){
      const b=h('button','bst-chipbtn',`${p.label}: ${p.v}`);b.type='button';b.setAttribute('aria-pressed',p.v===run.value?'true':'false');
      b.onclick=()=>{st8.values[op.key]=p.v;loadOp();};pre.appendChild(b);}
  }
  if(op.input==='list'){
    $('bst-bin').value=st8.build.join(', ');
    BUILD_PRESETS.forEach(p=>{const b=h('button','bst-chipbtn',`${p.label}: ${p.vals.join(' ')}`);b.type='button';
      b.setAttribute('aria-pressed',p.vals.join()===st8.build.join()?'true':'false');
      b.onclick=()=>{st8.build=p.vals.slice();loadOp();};pre.appendChild(b);});
  }
  pre.hidden=!pre.children.length;
}
function fail(form,msg){form.querySelector('.bst-err').textContent=msg;form.querySelector('input').setAttribute('aria-invalid','true');}
$('bst-valform').addEventListener('submit',e=>{e.preventDefault();
  const r=parseValue($('bst-vin').value);if(r.error)return fail(e.currentTarget,r.error);
  st8.values[OPS[opIdx].key]=r.value;loadOp();});
$('bst-buildform').addEventListener('submit',e=>{e.preventDefault();
  const r=parseArray($('bst-bin').value);if(r.error)return fail(e.currentTarget,r.error);
  st8.build=r.arr;loadOp();});
$('bst-treeform').addEventListener('submit',e=>{e.preventDefault();
  const r=parseArray($('bst-tin').value,{allowEmpty:true});if(r.error)return fail(e.currentTarget,r.error);
  setTree(r.arr);});
$('bst-tex').onclick=()=>setTree(EXAMPLE.slice());
function setTree(arr){st8.tree=arr;st8.values={};loadOp();}
// keep the finished tree: inserting its preorder rebuilds exactly the same shape
$('bst-keep').onclick=()=>{
  const last=steps[steps.length-1],vals=orderVals({N:last.N,root:last.root},'pre');
  st8.tree=vals;st8.values={};
  if(run.op.key==='build'){opIdx=OPS.findIndex(o=>o.key==='height');}
  loadOp();$('bst-tin').focus();
};

function stop(){clearInterval(timer);timer=0;$('bst-play').textContent='▶ Play';$('bst-play').setAttribute('aria-pressed','false');}
$('bst-play').onclick=()=>{
  if(timer){stop();return;}
  if(idx===steps.length-1){idx=0;cur={};show();}
  $('bst-play').textContent='❚❚ Pause';$('bst-play').setAttribute('aria-pressed','true');
  timer=setInterval(()=>{if(idx<steps.length-1){idx++;show();}if(idx===steps.length-1)stop();},2200);
};
$('bst-next').onclick=()=>{stop();if(idx<steps.length-1){idx++;show();}};
$('bst-prev').onclick=()=>{stop();if(idx>0){idx--;show();}};
$('bst-reset').onclick=()=>{stop();idx=0;cur={};show();};
document.addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select'))return;
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='ArrowRight')$('bst-next').click();if(e.key==='ArrowLeft')$('bst-prev').click();});

// ?op=2&v=30&step=5 opens a given step (handy for linking and screenshots)
const q=new URLSearchParams(location.search);
const qo=parseInt(q.get('op'),10);if(qo>=0&&qo<OPS.length)opIdx=qo;
const qv=parseValue(q.get('v')||'');if(!qv.error&&OPS[opIdx].input==='value')st8.values[OPS[opIdx].key]=qv.value;
const qs=parseInt(q.get('step'),10);
renderOps();loadOp(Number.isFinite(qs)?qs:undefined);
}
