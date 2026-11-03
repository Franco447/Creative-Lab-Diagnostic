// Public intake: persist submission before any AI work. Never accepts a client-supplied report.
import { FROM } from './brandpulse-email-render.mjs';

const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const DIRECTORS=['franco@thec-lab.co.uk','michael@thec-lab.co.uk','paul@thec-lab.co.uk'];
const DASHBOARD_URL='https://brand-pulse-staging.netlify.app/review.html';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// Internal-only notification. Errors are logged, but never change a saved
// client's successful submission into a failure or affect report generation.
async function notifyDirectors(id,client){
  const resend=Netlify.env.get('RESEND_API_KEY');
  if(!resend){console.error('Brand Pulse submission notification: RESEND_API_KEY missing',id);return;}
  const submittedAt=new Date().toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'});
  const company=String(client.company||'Unnamed company').slice(0,180);
  const name=String(client.contact_name||'Not supplied').slice(0,180);
  const body={
    from:FROM,
    to:DIRECTORS,
    reply_to:'paul@thec-lab.co.uk',
    subject:`New Brand Pulse submission — ${company.slice(0,80).replace(/[\r\n]/g,' ')}`,
    html:`<!doctype html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;color:#343434;line-height:1.6;padding:24px"><h2 style="margin:0 0 18px">New Brand Pulse diagnostic submitted</h2><p>A new diagnostic has been received. The report is being generated.</p><p><strong>Company:</strong> ${escapeHtml(company)}<br><strong>Contact:</strong> ${escapeHtml(name)}<br><strong>Submitted:</strong> ${escapeHtml(submittedAt)} (UK time)</p><p><a href="${DASHBOARD_URL}">Open private Brand Pulse dashboard</a></p><p style="font-size:12px;color:#777">Internal notification only. Client report delivery follows the existing schedule.</p></body></html>`
  };
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json','Idempotency-Key':`brand-pulse-submission-${id}`},
      body:JSON.stringify(body)
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result?.id){
      console.error('Brand Pulse submission notification failed',id,response.status,String(result?.message||'No email ID').slice(0,200));
      return;
    }
    console.log('Brand Pulse submission notification accepted',id,result.id);
  }catch(error){console.error('Brand Pulse submission notification error',id,String(error?.message||error));}
}

export default async (req,context)=>{
  if(req.method!=='POST') return json(405,{error:'Method not allowed'});
  try{
    const body=await req.json(); const c=body?.client,d=body?.diagnostic;
    const token=String(body?.submission_token||'');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return json(422,{error:'Invalid submission token.'});
    if(!c || !d || typeof c.company!=='string' || c.company.length>180 || !c.company.trim() ||
       typeof c.email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ||
       typeof c.website!=='string' || c.website.length>500 || !/^https?:\/\//i.test(c.website) ||
       !Array.isArray(d.answers) || d.answers.length!==20 ||
       !d.answers.every(a=>typeof a.question==='string' && typeof a.dimension==='string' && Number.isInteger(a.score) && a.score>=0 && a.score<=9) ||
       !Number.isInteger(d.overall_score) || d.overall_score<0 || d.overall_score>100)
       return json(422,{error:'Submission is incomplete.'});
    const root=Netlify.env.get('SUPABASE_URL'),key=Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!root||!key)return json(503,{error:'Submission service unavailable.'});
    // Restrict stored payload to relevant fields; server sets status and timestamps.
    const payload={client:{contact_name:String(c.contact_name||'').slice(0,180),position:String(c.position||'').slice(0,180),company:c.company.trim(),website:c.website.trim(),email:c.email.trim(),mobile:String(c.mobile||'').slice(0,80)},diagnostic:d};
    const res=await fetch(`${root.replace(/\/$/,'')}/rest/v1/brandpulse_submissions?on_conflict=submission_token&select=id`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({payload,submission_token:token})});
    const rows=await res.json().catch(()=>null);
    if(!res.ok){console.error('Brand Pulse intake save failed',res.status);return json(503,{error:'We could not confirm your submission was saved. Please try again.'});}
    const newlySaved=Array.isArray(rows)&&rows.length===1&&Boolean(rows[0]?.id);
    let saved=rows?.[0];
    if(!saved?.id){
      const found=await fetch(`${root.replace(/\/$/,'')}/rest/v1/brandpulse_submissions?submission_token=eq.${encodeURIComponent(token)}&select=id,payload`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      const existing=await found.json().catch(()=>null);
      if(!found.ok||existing?.length!==1||existing[0].payload?.client?.email!==payload.client.email||existing[0].payload?.client?.company!==payload.client.company)return json(409,{error:'Submission could not be reconciled.'});
      saved=existing[0];
    }
    // Notify only on first insert, not when a browser retries the same submission.
    // waitUntil keeps the client thank-you response independent of Resend latency.
    if(newlySaved){
      const notification=notifyDirectors(saved.id,payload.client);
      if(typeof context?.waitUntil==='function')context.waitUntil(notification);
      else await notification; // Compatible fallback for older runtimes.
    }
    return json(201,{received:true,submission_id:saved.id});
  }catch(e){console.error('Brand Pulse intake',String(e));return json(500,{error:'Could not receive submission.'});}
};
