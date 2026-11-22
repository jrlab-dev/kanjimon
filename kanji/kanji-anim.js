(()=>{const box=document.querySelector('.anim');if(!box)return;
const ps=[...box.querySelectorAll('.ink path')],btn=box.querySelector('.play'),num=box.querySelector('.anim-n');let tid=[];
function reset(){tid.forEach(clearTimeout);tid=[];ps.forEach(p=>{p.style.transition='none';p.style.strokeDashoffset='1';p.style.opacity='0';p.classList.remove('cur')});num.textContent='';}
function play(){reset();let t=300;ps.forEach((p,i)=>{const dur=Math.max(400,Math.round(p.getTotalLength()*10));
tid.push(setTimeout(()=>{p.style.opacity='1';p.classList.add('cur');num.textContent=(i+1)+' / '+ps.length+'画';void p.getBoundingClientRect();p.style.transition='stroke-dashoffset '+dur+'ms ease-in-out';p.style.strokeDashoffset='0';},t));
tid.push(setTimeout(()=>p.classList.remove('cur'),t+dur+120));t+=dur+350;});
tid.push(setTimeout(()=>{btn.textContent='▶ もういちど';},t));}
btn.addEventListener('click',()=>{btn.textContent='▶ もういちど';play();});
if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){const io=new IntersectionObserver(e=>{if(e[0].isIntersecting){io.disconnect();play();}},{threshold:.6});io.observe(box.querySelector('svg'));}})();
