// Heap Lab: step-by-step simulator (pure, no DOM) and SVG renderer.
// Each operation runs a scripted Sim that snapshots the heap after every step of Python.
// The renderer at the bottom only reads those snapshots.

// ---------- heap kinds: min and max differ by one comparison ----------
export const KINDS = {
  max: {key:'max', name:'max heap', op:'>', better:(a,b)=>a>b, pick:'largest', del:'delete_max',
        more:'larger', rel:'≥', top:'maximum', notOp:'≤'},
  min: {key:'min', name:'min heap', op:'<', better:(a,b)=>a<b, pick:'smallest', del:'delete_min',
        more:'smaller', rel:'≤', top:'minimum', notOp:'≥'},
};

// Inputs. The min heap examples are the max heap examples mirrored (value v becomes C - v),
// so both heap types take exactly the same steps.
export const EXAMPLES = {
  max: {insertHeap:[7,5,6,1,3,4], insertValue:8, deleteHeap:[10,7,9,3,5,4],
        build:[3,17,10,1,2,8,9,4,5,7,6]},
  min: {insertHeap:[1,3,2,7,5,4], insertValue:0, deleteHeap:[1,4,2,8,6,7],
        build:[15,1,8,17,16,10,9,14,13,11,12]},
};
export const LIMITS = {minVal:-99, maxVal:999, maxLen:15};

// ---------- code listings ----------
export function siftCode(K){
  const P=K.pick;
  return ["def sift_down(arr, i):",
    "    n = len(arr)",
    "    while True:",
    "        left, right = 2 * i + 1, 2 * i + 2",
    `        ${P} = i`,
    `        if left < n and arr[left] ${K.op} arr[${P}]:`,
    `            ${P} = left`,
    `        if right < n and arr[right] ${K.op} arr[${P}]:`,
    `            ${P} = right`,
    `        if ${P} == i:`,
    "            break",
    `        arr[i], arr[${P}] = arr[${P}], arr[i]`,
    `        i = ${P}`];
}
export function insertCode(K){
  return ["def insert(arr, value):",
    "    arr.append(value)",
    "    i = len(arr) - 1",
    "    while i > 0:",
    "        parent = (i - 1) // 2",
    `        if arr[i] ${K.op} arr[parent]:`,
    "            arr[i], arr[parent] = arr[parent], arr[i]",
    "            i = parent",
    "        else:",
    "            break"];
}

// ---------- simulator ----------
export class Sim{
  constructor(K,vals){
    this.K=K;this.seq=0;this.val={};this.arr=[];
    for(const v of vals)this.arr.push(this.make(v));
    this.float={};   // id -> 'root' | 'last' : values held in a variable, not in arr
    this.ix={};      // index variables drawn as tags under the array: name -> index
    this.sc={};      // other variables shown as chips: name -> text
    this.cmp=0;this.swp=0;this.ret=null;this.err=null;
    this.moving=null;           // index of the value currently being sifted
    this.settle=()=>this.arr.map((_,k)=>k).filter(k=>k!==this.moving);
    this.steps=[];
  }
  make(v){const id='v'+(this.seq++);this.val[id]=v;return id;}
  v(i){return this.val[this.arr[i]];}
  better(i,j){this.cmp++;return this.K.better(this.v(i),this.v(j));}
  swap(i,j){const a=this.arr;[a[i],a[j]]=[a[j],a[i]];this.swp++;}
  snap(line,text,hl){
    const val={};for(const id of this.arr)val[id]=this.val[id];for(const id in this.float)val[id]=this.val[id];
    this.steps.push(JSON.parse(JSON.stringify({
      arr:this.arr,val,float:this.float,ix:this.ix,sc:this.sc,cmp:this.cmp,swp:this.swp,ret:this.ret,err:this.err,
      moving:this.moving,settled:this.settle(),line:Array.isArray(line)?line:[line],text,hl:hl||[]})));
  }
  values(){return this.arr.map(id=>this.val[id]);}
}

const fmt=a=>'['+a.join(', ')+']';

// sift_down(arr, start). L = line of "def sift_down" in the listing.
function siftDown(s,L,start){
  const K=s.K,P=K.pick,n=s.arr.length;let i=start,first=true;
  s.moving=i;s.ix.i=i;
  for(;;){
    const left=2*i+1,right=2*i+2,vi=s.v(i);
    s.ix.left=left;s.ix.right=right;delete s.ix[P];
    const head=first?[L+1,L+2]:[L+2];
    const pre=first?`n = len(arr) = ${n}. `:'';
    first=false;
    if(left>=n){
      s.ix[P]=i;
      s.snap([...head,L+3,L+4,L+5,L+7,L+9,L+10],
        `${pre}left = ${left} is past the end (n = ${n}), so index ${i} is a leaf. ${P} stays i, so break: ${vi} has nowhere to go.`,[i]);
      break;
    }
    let p=i;const lines=[...head,L+3,L+4,L+5];let t=`${pre}left = ${left}, right = ${right}, and ${P} starts as i (${vi}). `;
    if(s.better(left,p)){p=left;lines.push(L+6);t+=`${s.v(left)} ${K.op} ${vi}, so ${P} = left. `;}
    else t+=`${s.v(left)} ${K.op} ${vi} is False, so the left child does not win. `;
    lines.push(L+7);
    if(right<n){
      const vp=s.v(p);
      if(s.better(right,p)){t+=`${s.v(right)} ${K.op} ${vp}, so ${P} = right.`;p=right;lines.push(L+8);}
      else t+=`${s.v(right)} ${K.op} ${vp} is False, so ${P} stays index ${p}.`;
    }else t+=`right = ${right} is past the end: no right child.`;
    s.ix[P]=p;
    s.snap(lines,t.trim(),right<n?[i,left,right]:[i,left]);
    if(p===i){
      s.snap([L+9,L+10],`${P} == i: ${vi} is ${K.rel} its children, so the heap property holds here. break.`,[i]);
      break;
    }
    const up=s.v(p);s.swap(i,p);
    s.ix={...s.ix,i:p};delete s.ix.left;delete s.ix.right;delete s.ix[P];s.moving=p;
    s.snap([L+9,L+11,L+12],`${P} != i, so swap: ${up} moves up to index ${i} and ${vi} moves down to index ${p}. Then i = ${P}: i follows ${vi} down to ${p}.`,[i,p]);
    i=p;
  }
  delete s.ix.i;delete s.ix.left;delete s.ix.right;delete s.ix[P];s.moving=null;
}

// insert(arr, value). L = line of "def insert". quick merges compare + swap into one step.
function siftUpInsert(s,L,value,quick){
  const K=s.K;
  const id=s.make(value);s.arr.push(id);let i=s.arr.length-1;s.moving=i;s.ix.i=i;
  s.snap([L+1,L+2],`append(${value}) puts it at the end, index ${i}, the next free slot of the bottom level. i = ${i}.`,[i]);
  for(;;){
    if(i===0){
      s.snap(L+3,s.arr.length===1?'i is 0: the heap was empty, so the value is the root. Nothing to compare.':`i is 0: ${value} reached the root, so the loop ends.`,[0]);break;
    }
    const parent=(i-1)>>1;s.ix.parent=parent;
    const vp=s.v(parent);
    if(s.better(i,parent)){
      if(quick){
        s.swap(i,parent);s.ix={...s.ix,i:parent};delete s.ix.parent;s.moving=parent;
        s.snap([L+3,L+4,L+5,L+6,L+7],`parent = ${parent}. ${value} ${K.op} ${vp}, so swap: ${value} moves up to index ${parent}.`,[i,parent]);
      }else{
        s.snap([L+3,L+4,L+5],`i > 0, so look at the parent: parent = (${i} - 1) // 2 = ${parent}, holding ${vp}. Is ${value} ${K.op} ${vp}? Yes: the child is ${K.more}, so it must move up.`,[i,parent]);
        s.swap(i,parent);s.ix={...s.ix,i:parent};delete s.ix.parent;s.moving=parent;
        s.snap([L+6,L+7],`Swap arr[${i}] and arr[${parent}]: ${value} moves up, ${vp} moves down. i = parent = ${parent}.`,[i,parent]);
      }
      i=parent;
    }else{
      s.snap(quick?[L+3,L+4,L+5,L+8,L+9]:[L+3,L+4,L+5,L+8,L+9],
        `parent = ${parent}, holding ${vp}. ${value} ${K.op} ${vp} is False: the parent is already ${K.rel} ${value}, so break. Without this else: break the loop would never end.`,[i,parent]);
      break;
    }
  }
  delete s.ix.i;delete s.ix.parent;s.moving=null;
}

// ---------- operations ----------
export function makeOps(K,custom={}){
  const E=EXAMPLES[K.key];
  const insVal=custom.value!==undefined?custom.value:E.insertValue;
  const buildArr=custom.arr||E.build;
  const P=K.pick, sift=siftCode(K), ins=insertCode(K);
  return [
  {name:'Insert',big:'O(log n)',call:`insert(arr, ${insVal})`,vals:E.insertHeap,input:'value',
   sum:`Append the value at the end, then sift it up: swap with its parent while it is ${K.more} than the parent. At most one swap per level.`,
   code:ins,
   run(s){
     s.sc.value=insVal;
     s.snap(-1,`Goal: add ${insVal} to the ${K.name} ${fmt(s.values())}. The array must stay a complete tree, so the only free slot is the end. After that, the new value climbs until its parent is ${K.rel} it.`);
     siftUpInsert(s,0,insVal,false);
     s.snap(-1,`Result: ${fmt(s.values())}. ${insVal} rose ${s.swp} level${s.swp===1?'':'s'} with ${s.cmp} comparison${s.cmp===1?'':'s'}. The tree is ${Math.floor(Math.log2(s.arr.length))} levels tall, so insert is O(log n).`);
   }},
  {name:'Delete root',big:'O(log n)',call:`${K.del}(arr)`,vals:E.deleteHeap,
   sum:`Save the root, move the last value into its place, then sift it down: swap with the ${K.more} child while that child is ${K.more}. Return the saved root.`,
   code:[`def ${K.del}(arr):`,"    if not arr:",'        raise IndexError("delete from empty heap")',"    root = arr[0]","    last = arr.pop()","    if arr:","        arr[0] = last","        sift_down(arr, 0)","    return root",""].concat(sift),
   run(s){
     s.snap(-1,`Goal: remove and return the ${K.top}, which is always arr[0]. We cannot just delete index 0: everything would shift and the parent/child indices would break.`);
     if(!s.arr.length){s.err='IndexError';s.snap([1,2],'arr is empty: there is no root to remove, so raise IndexError.');s.snap(-1,'Raised IndexError("delete from empty heap").');return;}
     s.snap(1,`arr has ${s.arr.length} values, so it is not empty.`);
     const rid=s.make(s.v(0));s.float[rid]='root';s.sc.root=s.v(0);
     s.snap(3,`root = arr[0] = ${s.v(0)}. Save it now: the next lines overwrite index 0.`,[0]);
     const lid=s.arr.pop();s.float[lid]='last';s.sc.last=s.val[lid];
     s.snap(4,`last = arr.pop() takes ${s.val[lid]} off the end. Removing the last slot keeps the tree complete.`);
     if(s.arr.length){
       const old=s.v(0);s.arr[0]=lid;delete s.float[lid];s.moving=0;
       s.snap([5,6],`arr still has values, so arr[0] = last: ${s.val[lid]} overwrites ${old} at the root. It is probably too ${K.key==='max'?'small':'big'} for the root, so it must sink.`,[0]);
       s.snap(7,'Call sift_down(arr, 0).',[0]);
       siftDown(s,10,0);
     }else{
       delete s.float[lid];
       s.snap(5,'arr is now empty, so skip the if: there is nothing to move to the root. Without this check, arr[0] = last would raise IndexError on a one-value heap.');
     }
     s.ret=s.sc.root;delete s.float[rid];
     s.snap(8,`return root: hand back ${s.ret}. Forgetting this line is a classic bug: the heap is fixed but the caller never gets the ${K.top}.`);
     s.snap(-1,`Returned ${s.ret}. Heap is now ${fmt(s.values())}: ${s.swp} swap${s.swp===1?'':'s'}, ${s.cmp} comparison${s.cmp===1?'':'s'}, at most one swap per level, so O(log n).`);
   }},
  {name:'Heapify',big:'O(n)',call:`heapify(arr)`,vals:buildArr,input:'array',
   sum:`Turn any list into a ${K.name} in place: sift_down every parent, starting at the last parent and walking back to the root.`,
   code:["def heapify(arr):","    for i in range(len(arr) // 2 - 1, -1, -1):","        sift_down(arr, i)",""].concat(sift),
   run(s){
     const n=s.arr.length,lastParent=Math.floor(n/2)-1;let loop=null;
     s.settle=()=>s.arr.map((_,k)=>k).filter(k=>(loop===null?k>lastParent:k>loop)&&k!==s.moving);
     s.snap(-1,`Goal: make ${fmt(s.values())} a ${K.name}. n = ${n}, so indices ${lastParent+1}..${n-1} are leaves. A leaf on its own is already a heap, so they are settled before we start.`);
     if(lastParent<0){s.snap(1,`len(arr) // 2 - 1 = ${lastParent}, so the range is empty: a list of ${n} value${n===1?' is':'s is'} already a heap.`);}
     for(let i=lastParent;i>=0;i--){
       loop=i;s.ix['heapify i']=i;
       s.snap([1,2],i===lastParent?`i starts at len(arr) // 2 - 1 = ${i}, the last node with a child. Call sift_down(arr, ${i}).`:`i = ${i}. Both subtrees below index ${i} are already heaps, so one sift_down fixes this subtree. Call sift_down(arr, ${i}).`,[i]);
       siftDown(s,4,i);
       loop=i-1;
     }
     delete s.ix['heapify i'];loop=-1;
     s.snap(-1,`Result: ${fmt(s.values())} is a ${K.name}. Total work: ${s.cmp} comparisons and ${s.swp} swaps for n = ${n}. Most parents are near the bottom and can only sink a level or two, which is why this is O(n).`);
   }},
  {name:'Build by inserting',big:'O(n log n)',call:`build_by_insert(values)`,vals:[],input:'array',
   sum:'For contrast: build the same heap by calling insert once per value. Each new value lands at the bottom and may climb the full height.',
   code:["def build_by_insert(values):","    arr = []","    for v in values:","        insert(arr, v)","    return arr",""].concat(ins),
   run(s){
     const vals=buildArr.slice();
     s.settle=()=>s.arr.map((_,k)=>k).filter(k=>k!==s.moving);
     s.sc.values=fmt(vals);
     s.snap(-1,`Goal: build a ${K.name} from ${fmt(vals)} using insert only, and compare the work with heapify.`);
     s.snap(1,'arr = []: start with an empty heap.');
     vals.forEach((v,k)=>{
       s.sc.v=v;s.sc['values left']=fmt(vals.slice(k+1));
       s.snap([2,3],`v = ${v}: call insert(arr, ${v}).`);
       siftUpInsert(s,6,v,true);
     });
     delete s.sc.v;delete s.sc['values left'];
     s.ret=fmt(s.values());
     s.snap(4,`return arr. ${vals.length} inserts took ${s.cmp} comparisons and ${s.swp} swaps.`);
     s.snap(-1,`Result: ${fmt(s.values())}. Each insert costs up to the current height, so n inserts are O(n log n). Heapify on the same input is O(n). The two methods can even produce different (both valid) heaps.`);
   }},
  {name:'Peek',big:'O(1)',call:'peek(arr)',vals:E.deleteHeap,
   sum:`The ${K.top} is always at index 0. Reading it changes nothing.`,
   code:["def peek(arr):","    if not arr:",'        raise IndexError("peek from empty heap")',"    return arr[0]"],
   run(s){
     s.snap(-1,`Goal: look at the ${K.top} without removing it.`);
     s.snap(1,'arr is not empty.');
     s.ret=s.v(0);
     s.snap(3,`return arr[0]: ${s.ret}. The heap property puts the ${K.top} at the root, so this is one list access: O(1).`,[0]);
     s.snap(-1,`Returned ${s.ret}. Only the root is guaranteed: the second ${K.key==='max'?'largest':'smallest'} value is one of its two children, but nothing else is ordered.`);
   }},
  ];
}

export function runOp(kind,opIdx,custom){
  const K=KINDS[kind],op=makeOps(K,custom)[opIdx],s=new Sim(K,op.vals);op.run(s);
  return {op,steps:s.steps,sim:s};
}

// Parse "3, 17, 10" style input. Returns {arr} or {error}.
export function parseArray(text){
  const parts=String(text).split(/[\s,]+/).filter(Boolean);
  if(!parts.length)return {error:'Enter at least one whole number.'};
  if(parts.length>LIMITS.maxLen)return {error:`Use at most ${LIMITS.maxLen} values so the tree fits (you gave ${parts.length}).`};
  const arr=[];
  for(const p of parts){
    const r=parseValue(p);if(r.error)return r;arr.push(r.value);
  }
  return {arr};
}
export function parseValue(text){
  const t=String(text).trim();
  if(!/^[-+]?\d+$/.test(t))return {error:`"${t.slice(0,12)}" is not a whole number.`};
  const v=parseInt(t,10);
  if(v<LIMITS.minVal||v>LIMITS.maxVal)return {error:`Keep values between ${LIMITS.minVal} and ${LIMITS.maxVal} (got ${v}).`};
  return {value:v};
}

// ---------- rendering ----------
if(typeof document!=='undefined'&&document.getElementById('h-stage'))initUI();

function initUI(){
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const svg=$('h-stage'),layer=$('h-layer');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const W=800,R=22,LV=74,TOP=78,CW=48,CH=44,TAGH=20,TAGGAP=6;
const ROWS={i:0,parent:1,left:1,right:2,largest:3,smallest:3,'heapify i':4};
let kind='max',opIdx=0,steps=[],idx=0,cur={},els=null,anim=0,timer=0,op=null;
let geo={depth:3,maxN:15,arrY:380,tagRows:1,H:500};
const custom={};  // {value, arr}

function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
function treeXY(i){
  const d=Math.floor(Math.log2(i+1)),p=i-(2**d-1),slots=2**d,M=40;
  return {x:M+(p+.5)*(W-2*M)/slots,y:TOP+d*LV};
}
function cellX(i){return (W-geo.maxN*CW)/2+i*CW;}
const FLOAT={root:{x:W-96,y:TOP,label:'root'},last:{x:96,y:TOP,label:'last'}};

function build(){
  const st=steps[idx];
  layer.innerHTML='';els={items:{}};
  const n=st.arr.length,hl=new Set(st.hl),settled=new Set(st.settled);
  // header text
  el('text',{x:16,y:26,class:'h-meta'},layer).textContent=`n = ${n}`;
  el('text',{x:W-16,y:26,class:'h-meta',  'text-anchor':'end'},layer).textContent=`comparisons ${st.cmp} · swaps ${st.swp}`;
  // edges (by index, static)
  const gE=el('g',{},layer);
  for(let c=1;c<n;c++){
    const p=(c-1)>>1,a=treeXY(p),b=treeXY(c),on=hl.has(c)&&hl.has(p);
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
    el('line',{x1:a.x+ux*R,y1:a.y+uy*R,x2:b.x-ux*R,y2:b.y-uy*R,class:'h-edge'+(on?' on':'')},gE);
  }
  // static index labels: under tree slots and under array cells
  const gI=el('g',{},layer);
  for(let i=0;i<n;i++){const t=treeXY(i);el('text',{x:t.x,y:t.y+R+14,class:'h-idx'},gI).textContent=i;}
  // array frame
  el('text',{x:cellX(0)-10,y:geo.arrY+CH/2+5,class:'h-meta','text-anchor':'end'},layer).textContent='arr';
  for(let i=0;i<n;i++)el('text',{x:cellX(i)+CW/2,y:geo.arrY+CH+15,class:'h-idx'},gI).textContent=i;
  if(!n)el('rect',{x:cellX(0),y:geo.arrY,width:CW,height:CH,class:'h-empty'},layer);
  // items: one tree node + one array cell per value id, positioned by apply()
  const gN=el('g',{},layer),gC=el('g',{},layer),gF=el('g',{},layer);
  const decorate=(id,i)=>{
    const c=[];if(i!==null){if(hl.has(i))c.push('focus');if(st.moving===i)c.push('mover');else if(settled.has(i))c.push('settled');}
    if(!cur[id])c.push('enter');return c.join(' ');
  };
  st.arr.forEach((id,i)=>{
    const cls=decorate(id,i);
    const g=el('g',{class:'h-node '+cls},gN);el('circle',{r:R,class:'h-disc'},g);el('text',{y:6,class:'h-val'},g).textContent=st.val[id];
    const a=el('g',{class:'h-cell '+cls},gC);el('rect',{width:CW,height:CH,class:'h-box'},a);el('text',{x:CW/2,y:CH/2+6,class:'h-val'},a).textContent=st.val[id];
    els.items[id]={g,a};
  });
  for(const id in st.float){
    const f=FLOAT[st.float[id]];
    const g=el('g',{class:'h-node h-float '+(cur[id]?'':'enter')},gF);
    el('circle',{r:R,class:'h-disc'},g);el('text',{y:6,class:'h-val'},g).textContent=st.val[id];
    const lab=el('text',{y:-R-8,class:'h-flab'},g);lab.textContent=f.label;
    els.items[id]={g,a:null,float:f};
  }
  // index-variable tags under the array
  const gT=el('g',{},layer);
  for(const name in st.ix){
    const i=st.ix[name];if(i>=n||i<0)continue;
    const row=ROWS[name]??0,x=cellX(i)+CW/2,y=geo.arrY+CH+24+row*(TAGH+TAGGAP),w=14+name.length*7.4;
    const g=el('g',{class:'h-tag'+(name==='heapify i'?' outer':'')},gT);
    el('line',{x1:x,y1:geo.arrY+CH+20,x2:x,y2:y,class:'h-stem'},g);
    el('rect',{x:x-w/2,y,width:w,height:TAGH,rx:5,class:'h-tbox'},g);
    el('text',{x,y:y+14,class:'h-ttxt'},g).textContent=name;
  }
}

function posOf(st,id){
  const i=st.arr.indexOf(id);
  if(i>=0){const t=treeXY(i);return {tx:t.x,ty:t.y,ax:cellX(i),ay:geo.arrY};}
  const f=FLOAT[st.float[id]];
  // a value that just left the array starts from its old cell
  return {tx:f.x,ty:f.y,ax:f.x,ay:f.y};
}
function apply(pos){
  for(const id in els.items){const p=pos[id],E=els.items[id];
    E.g.setAttribute('transform',`translate(${p.tx} ${p.ty})`);
    if(E.a)E.a.setAttribute('transform',`translate(${p.ax} ${p.ay})`);}
}

function show(){
  const st=steps[idx];cancelAnimationFrame(anim);build();
  const to={};for(const id in els.items)to[id]=posOf(st,id);
  const from={};for(const id in to)from[id]=cur[id]||to[id];
  const dur=reduce?0:650,t0=performance.now();
  const frame=t=>{const k=dur?Math.min(1,Math.max(0,(t-t0)/dur)):1,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,now={};
    for(const id in to){const a=from[id],b=to[id];now[id]={tx:a.tx+(b.tx-a.tx)*e,ty:a.ty+(b.ty-a.ty)*e,ax:a.ax+(b.ax-a.ax)*e,ay:a.ay+(b.ay-a.ay)*e};}
    apply(now);if(k<1)anim=requestAnimationFrame(frame);};
  frame(t0);cur=to;
  const vals=st.arr.map(id=>st.val[id]);
  svg.setAttribute('aria-label',`${KINDS[kind].name} as a tree and as the list [${vals.join(', ')}]`+(st.hl.length?`; comparing indices ${st.hl.join(' and ')}`:''));
  const code=$('h-code');code.innerHTML='';
  op.code.forEach((ln,i)=>{const dv=document.createElement('div');if(st.line.includes(i))dv.className='on';
    const n=document.createElement('span');n.className='ln';n.textContent=i+1;const c=document.createElement('span');c.textContent=ln||' ';dv.append(n,c);code.appendChild(dv);});
  const lines=st.line[0]<0?'':' · line'+(st.line.length>1?'s ':' ')+st.line.map(x=>x+1).join(', ');
  $('h-stepno').textContent=idx===0?'Before the call':(idx===steps.length-1?'After the call':`Step ${idx} of ${steps.length-2}${lines}`);
  $('h-narr').textContent=st.text;
  const V=$('h-vars');V.innerHTML='';
  const chip=(t,c)=>{const s=document.createElement('span');s.textContent=t;if(c)s.className=c;V.appendChild(s);};
  for(const k in st.sc)chip(`${k} = ${st.sc[k]}`);
  for(const k in st.ix){const i=st.ix[k];chip(i<vals.length?`${k} = ${i} (arr[${i}] = ${vals[i]})`:`${k} = ${i} (≥ n, no child)`,'ix');}
  if(st.ret!==null)chip('returned '+st.ret,'ret');
  if(st.err)chip('raised '+st.err,'ret');
  $('h-prev').disabled=idx===0;
  $('h-next').disabled=idx===steps.length-1;
  const dots=$('h-dots');dots.innerHTML='';
  steps.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className='h-dot'+(i===idx?' on':'');b.setAttribute('aria-label','Go to step '+i);if(i===idx)b.setAttribute('aria-current','step');b.onclick=()=>{stop();idx=i;show();};dots.appendChild(b);});
}

function loadOp(keepStep){
  stop();
  const r=runOp(kind,opIdx,custom);op=r.op;steps=r.steps;idx=0;cur={};
  let maxN=1,rows=0;
  for(const st of steps){maxN=Math.max(maxN,st.arr.length);for(const k in st.ix)rows=Math.max(rows,(ROWS[k]??0)+1);}
  const depth=Math.floor(Math.log2(maxN));
  const arrY=TOP+depth*LV+R+44;
  geo={depth,maxN:Math.max(maxN,6),arrY,H:arrY+CH+30+Math.max(rows,1)*(TAGH+TAGGAP)};
  svg.setAttribute('viewBox',`0 0 ${W} ${geo.H}`);
  $('h-call').textContent=op.call;$('h-big').textContent=op.big;$('h-sum').textContent=op.sum;
  document.querySelectorAll('#h-ops .op').forEach((b,i)=>b.setAttribute('aria-pressed',i===opIdx?'true':'false'));
  renderCustom();
  if(keepStep!==undefined)idx=Math.max(0,Math.min(steps.length-1,keepStep));
  show();
}
function renderOps(){
  const box=$('h-ops');box.innerHTML='';
  makeOps(KINDS[kind],custom).forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='op';
    const a=document.createElement('span');a.textContent=o.name;const sm=document.createElement('small');sm.textContent=o.big;b.append(a,sm);
    b.onclick=()=>{opIdx=i;loadOp();};box.appendChild(b);});
}
function renderCustom(){
  const form=$('h-custom'),inp=$('h-in'),lab=$('h-in-label'),err=$('h-err');
  err.textContent='';inp.removeAttribute('aria-invalid');
  if(op.input==='value'){
    form.hidden=false;lab.textContent='Value to insert';
    inp.value=String(custom.value!==undefined?custom.value:EXAMPLES[kind].insertValue);inp.setAttribute('inputmode','numeric');
  }else if(op.input==='array'){
    form.hidden=false;lab.textContent='List to build from';
    inp.value=(custom.arr||EXAMPLES[kind].build).join(', ');inp.removeAttribute('inputmode');
  }else form.hidden=true;
  $('h-ex').hidden=!(op.input==='value'?custom.value!==undefined:custom.arr);
}
$('h-custom').addEventListener('submit',e=>{
  e.preventDefault();
  const inp=$('h-in'),err=$('h-err');
  const r=op.input==='value'?parseValue(inp.value):parseArray(inp.value);
  if(r.error){err.textContent=r.error;inp.setAttribute('aria-invalid','true');return;}
  if(op.input==='value')custom.value=r.value;else custom.arr=r.arr;
  renderOps();loadOp();
});
$('h-ex').onclick=()=>{if(op.input==='value')delete custom.value;else delete custom.arr;renderOps();loadOp();};

function stop(){clearInterval(timer);timer=0;$('h-play').textContent='▶ Play';$('h-play').setAttribute('aria-pressed','false');}
$('h-play').onclick=()=>{
  if(timer){stop();return;}
  if(idx===steps.length-1){idx=0;cur={};show();}
  $('h-play').textContent='❚❚ Pause';$('h-play').setAttribute('aria-pressed','true');
  timer=setInterval(()=>{if(idx<steps.length-1){idx++;show();}if(idx===steps.length-1)stop();},2400);
};
$('h-next').onclick=()=>{stop();if(idx<steps.length-1){idx++;show();}};
$('h-prev').onclick=()=>{stop();if(idx>0){idx--;show();}};
$('h-reset').onclick=()=>{stop();idx=0;cur={};show();};
const kindBtns=document.querySelectorAll('#h-kind button');
function setKind(k){kind=k;kindBtns.forEach(x=>x.setAttribute('aria-pressed',x.dataset.kind===k?'true':'false'));}
kindBtns.forEach(b=>b.onclick=()=>{setKind(b.dataset.kind);renderOps();loadOp();});
document.addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select'))return;
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='ArrowRight')$('h-next').click();if(e.key==='ArrowLeft')$('h-prev').click();});

// ?heap=min&op=2&step=5 opens a given step (handy for linking and screenshots)
const q=new URLSearchParams(location.search);
if(q.get('heap')==='min')setKind('min');
const qo=parseInt(q.get('op'),10);if(qo>=0&&qo<5)opIdx=qo;
const qs=parseInt(q.get('step'),10);
renderOps();loadOp(Number.isFinite(qs)?qs:undefined);
}
