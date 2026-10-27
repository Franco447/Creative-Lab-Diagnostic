// Exact approved email markup adapted from existing reviewer-only test function.
import { deflateSync } from 'node:zlib';

const IDS = new Set([
  '8b7d2087-3eab-49d6-9fbc-cb9cc8352a34',
  '75337cfb-c2d4-49b8-80cf-e7bf42b2fdb4',
  '787cd460-3b81-4d7b-ae2b-d9a1a303d449'
]);
const EMAILS = new Set(['franco@thec-lab.co.uk','michael@thec-lab.co.uk','paul@thec-lab.co.uk']);
const FROM = 'The Creative Lab | Brand Pulse <brandpulse@mail.thec-lab.co.uk>';
const CREAM='#F5F0E8', SAGE='#A8AEA0', PLUM='#6B4D59', DARK='#343434';
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clean = v => esc(v).replace(/\r?\n/g,'<br>');
const first = name => String(name || '').trim().split(/\s+/)[0] || 'there';
const num = v => Math.round(Math.min(100,Math.max(0,Number(v)||0)));
function answer(status, body) {return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})}
function p(s){return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;margin:0 0 16px;color:${DARK};">${s}</p>`}
function head(s){return `<h3 style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.025em;text-transform:uppercase;margin:25px 0 10px;color:${DARK};">${s}</h3>`}
function rule(){return '<div style="height:1px;border-top:1px solid #aaa;margin:25px 0;"></div>'}
function area(label,score,headline,body){return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #aaa;margin:0;"><tr><td valign="top" width="75" style="padding:18px 12px 18px 0;"><table role="presentation" width="62" height="62" cellpadding="0" cellspacing="0" style="background:#ddd8cf;border-radius:31px;text-align:center;"><tr><td align="center" valign="middle" style="font-family:Arial,sans-serif;font-size:21px;font-weight:bold;color:#333;">${num(score)}<span style="font-weight:normal;font-size:9px;">/100</span></td></tr></table></td><td valign="top" style="padding:18px 0;font-family:Arial,sans-serif;color:#343434;"><div style="font-size:13px;font-weight:bold;margin-bottom:5px;">${label}</div><div style="font-size:13px;font-weight:bold;line-height:1.35;margin-bottom:5px;">${clean(headline)}</div><div style="font-size:12px;line-height:1.5;">${clean(body)}</div></td></tr></table>`}
const hex = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const rgb = (a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
// Lightweight PNG renderer — chart is embedded with CID; Outlook need not support SVG/CSS conic gradients.
function crc32(buf){let c=0xffffffff;for(const byte of buf){c^=byte;for(let j=0;j<8;j++) c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function chunk(type,data){const a=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([a,data])));return Buffer.concat([size,a,data,crc])}
function donutPng(score){
 const w=294,h=294,v=num(score),rows=Buffer.alloc((w*4+1)*h),a=hex('#C7B3BB'),b=hex(PLUM),cream=hex(CREAM);
 for(let y=0;y<h;y++){const row=y*(w*4+1);for(let x=0;x<w;x++){const dx=x+0.5-w/2,dy=y+0.5-h/2,r=Math.hypot(dx,dy),angle=((Math.atan2(dx,-dy)*180/Math.PI)+360)%360;
  let col=[0,0,0],alpha=0;if(r>=90&&r<=135){col=cream;alpha=255;}
  if(v>0&&r>=90&&r<=135&&angle<=v*3.6){const t=v===100?angle/360:angle/(v*3.6);col=rgb(a,b,t);alpha=255;}
  const idx=row+1+x*4; rows[idx]=col[0];rows[idx+1]=col[1];rows[idx+2]=col[2];rows[idx+3]=alpha;
 }}
 const pngsig=Buffer.from([137,80,78,71,13,10,26,10]),ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([pngsig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
function render(row){
 const r=row.report_json||{},score=num(row.overall_score),label=esc(row.company_name);
 const scorePanel=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${SAGE};border-radius:13px;margin:21px 0 27px;"><tr><td valign="middle" style="padding:20px;font-family:Arial,sans-serif;color:#222;"><div style="font-size:26px;line-height:1.1;font-weight:900;">Your Brand Pulse</div><div style="font-size:25px;line-height:1.1;font-weight:400;">Performance Score</div></td><td width="147" valign="middle" style="padding:12px 16px 12px 0;"><table role="presentation" width="147" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:0;"><img src="cid:brand-pulse-donut" width="147" height="147" alt="Brand Pulse performance ${score} out of 100" style="display:block;max-width:147px;width:147px;height:147px;"></td></tr></table></td></tr><tr><td colspan="2" align="right" style="padding:0 27px 12px;color:#222;font-size:12px;">${score} / 100</td></tr></table>`;
 const intro=[`Hi ${esc(first(row.client_name))},`,'Thank you for completing Brand Pulse: our Performance Diagnostic.',"We’ve reviewed your responses and looked at your brand to create the personalised report below. It highlights what’s working, where growth may be getting constrained and where we think your attention should go next.","The report is deliberately high level. The real value comes from looking at the findings in context and deciding what to prioritise. That’s where our <strong>Now, Next and Nurture</strong> growth pathway comes in.","But first, here’s what your diagnostic is telling us."].map(p).join('');
 const copy=intro+scorePanel+head('What Your Score Means')+p(clean(r.score_meaning))+rule()+head('What Stands Out')+p(clean(r.stands_out))+rule()+head('The Five Areas')+
 area('Strategic Fitness',row.strategic_score,r.strategic_headline,r.strategic_commentary)+area('Consumer Intelligence',row.consumer_score,r.consumer_headline,r.consumer_commentary)+area('Market Influence',row.market_score,r.market_headline,r.market_commentary)+area('Growth Engine',row.growth_score,r.growth_headline,r.growth_commentary)+area('Commercial Endurance',row.commercial_score,r.commercial_headline,r.commercial_commentary)+
 head('Where To Focus Next')+p(clean(r.focus_next_intro))+['now','next','nurture'].map(k=>`<div style="padding:15px 0;border-top:1px solid #aaa;">${head(k)}${p(clean(r[k]))}</div>`).join('')+rule()+
 p('We hope this report has given you a clearer picture of where your brand stands today and where the opportunities for growth might lie.')+
 p("Once you've had a chance to look through it, we'd love to spend 30 minutes talking you through the findings and exploring what you'd prioritise to move your business forward.")+
 p('Just click below to find a time that works for you.')+
 `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td align="center" bgcolor="${PLUM}" style="background:${PLUM};border-radius:4px;"><a href="https://calendly.com/paultcl/30min" style="display:block;padding:12px 28px;color:#fff;font:bold 12px Arial,sans-serif;text-decoration:none;">Book a Call</a></td></tr></table>`+
 p('Look forward to speaking soon.')+p('Kind regards,<br><strong>The Creative Lab</strong>')+
 `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#D6D9D1;border-radius:14px;margin-top:24px;"><tr><td width="50%" align="center" valign="top" style="padding:24px 9px;font:11px/1.6 Arial,sans-serif;border-right:1px solid #8f918c;"><strong>Michael Miley, CEO</strong><br><br><a href="mailto:michael@thec-lab.co.uk" style="color:#343434;">michael@thec-lab.co.uk</a><br>+44 (0)7860 441128</td><td width="50%" align="center" valign="top" style="padding:24px 9px;font:11px/1.6 Arial,sans-serif;"><strong>Paul Cope, MD</strong><br><br><a href="mailto:paul@thec-lab.co.uk" style="color:#343434;">paul@thec-lab.co.uk</a><br>+44 (0)7900 900704</td></tr></table>`;
 const html=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#ffffff;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 10px;"><table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:${CREAM};"><tr><td style="padding:30px;"><div style="font:bold 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-bottom:24px;">${label}</div>${copy}</td></tr></table></td></tr></table></body></html>`;
 return {html,attachment:donutPng(score)};
}

export { render, FROM };
