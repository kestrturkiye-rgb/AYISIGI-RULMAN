import React from 'react';
export default function Bearing({type='steel', hero=false}) {
 const id=React.useId().replaceAll(':','');
 return <svg viewBox="0 0 400 310" className={hero?'bearing hero-bearing':'bearing'} role="img" aria-label={type==='housing'?'Yataklı rulman çizimi':type==='chain'?'Endüstriyel zincir çizimi':'Rulman çizimi'}>
 <defs><linearGradient id={id+'metal'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6f8fa"/><stop offset=".2" stopColor="#9da8b3"/><stop offset=".4" stopColor="#e5e9ed"/><stop offset=".6" stopColor="#657585"/><stop offset=".8" stopColor="#d7dee4"/><stop offset="1" stopColor="#8894a0"/></linearGradient><radialGradient id={id+'ball'} cx="35%" cy="25%"><stop stopColor="white"/><stop offset=".5" stopColor="#c9d1d9"/><stop offset="1" stopColor="#53616f"/></radialGradient><filter id={id+'shadow'}><feGaussianBlur stdDeviation="8"/></filter></defs>
 <ellipse cx="205" cy="270" rx="120" ry="12" fill="#182338" opacity=".17" filter={'url(#'+id+'shadow)'}/>
 {type==='chain'?<g transform="translate(30 80) rotate(-14 170 60)">{Array.from({length:5},(_,i)=><g key={i} transform={`translate(${i*55} 0)`}><rect x="0" y="20" width="85" height="58" rx="28" fill={'url(#'+id+'metal)'} stroke="#617180" strokeWidth="4"/><circle cx="27" cy="49" r="13" fill="#233346"/><circle cx="60" cy="49" r="13" fill="#233346"/></g>)}</g>:<g transform="translate(200 148) rotate(-22) scale(1 .86)">
 {type==='housing'&&<g fill="#1d746f" stroke="#14534e" strokeWidth="5"><path d="M-145 93 L-128 -12 Q-110 -104 0 -110 Q110 -104 128 -12 L145 93 Z"/><rect x="-165" y="80" width="330" height="38" rx="8"/><ellipse cx="-126" cy="96" rx="13" ry="6" fill="#102039"/><ellipse cx="126" cy="96" rx="13" ry="6" fill="#102039"/></g>}
 <circle cy="11" r="117" fill="#5e6b78" stroke="#4f5d6a" strokeWidth="3"/>
 <circle r="117" fill={'url(#'+id+'metal)'} stroke="#bdc7d0" strokeWidth="2"/>
 <circle r="94" fill={type==='sealed'?'#242f3a':'#667888'} stroke="#4b5c6b" strokeWidth="3"/>
 {type==='sealed'?<><circle r="85" fill="none" stroke="#424e59" strokeWidth="2"/><circle r="64" fill="none" stroke="#111d28" strokeWidth="3"/></>:Array.from({length:type==='roller'?18:10},(_,i)=>{const n=type==='roller'?18:10;const angle=i*Math.PI*2/n;return type==='roller'?<rect key={i} x="-10" y="-92" width="20" height="43" rx="5" fill={'url(#'+id+'metal)'} stroke="#526272" strokeWidth="2" transform={`rotate(${i*360/n})`}/>:<circle key={i} cx={Math.cos(angle)*74} cy={Math.sin(angle)*74} r="18" fill={'url(#'+id+'ball)'} stroke="#5b6a76" strokeWidth="2"/>})}
 <circle r="53" fill={'url(#'+id+'metal)'} stroke="#c9d0d7" strokeWidth="2"/><circle r="34" fill="#233449"/><path d="M-32 12 A34 34 0 0 1 30 -16" fill="none" stroke="#8996a2" strokeWidth="5"/><circle r="108" fill="none" stroke="white" strokeOpacity=".45"/>
 <text x="0" y="-100" textAnchor="middle" fontSize="8" fill="#506171" letterSpacing="3">RULMAN TEKLİF</text></g>}
 </svg>;
}
