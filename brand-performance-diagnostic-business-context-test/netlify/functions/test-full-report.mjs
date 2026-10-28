// Brand Pulse: reviewer-only full-report email preview. DOES NOT send to clients
// or alter statuses, schedules, approvals, or the diagnostic dashboard.
// POST { report_id: "..." } with a valid reviewer Supabase Bearer token.
import { render, FROM } from './brandpulse-email-render.mjs';

const IDS = new Set([
  '8b7d2087-3eab-49d6-9fbc-cb9cc8352a34',
  '75337cfb-c2d4-49b8-80cf-e7bf42b2fdb4',
  '787cd460-3b81-4d7b-ae2b-d9a1a303d449'
]);
const EMAILS = new Set(['franco@thec-lab.co.uk','michael@thec-lab.co.uk','paul@thec-lab.co.uk']);
function answer(status, body) {return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})}

export default async function handler(request){
 if(request.method!=='POST')return answer(405,{error:'POST required'});
 const auth=request.headers.get('authorization')||'';const m=/^Bearer\s+(.+)$/i.exec(auth);if(!m)return answer(401,{error:'Sign in first.'});
 const url=Netlify.env.get('SUPABASE_URL'),service=Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY'),resend=Netlify.env.get('RESEND_API_KEY');
 if(!url||!service||!resend)return answer(500,{error:'Server email configuration incomplete.'});
 try{
  const ar=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${m[1]}`}});if(!ar.ok)return answer(401,{error:'Session invalid.'});
  const user=await ar.json(),recipient=String(user.email||'').toLowerCase();if(!IDS.has(user.id)||!EMAILS.has(recipient))return answer(403,{error:'Reviewer not authorised.'});
  const body=await request.json().catch(()=>({}));const reportId=String(body?.report_id||'');if(!/^[0-9a-f-]{36}$/i.test(reportId))return answer(400,{error:'Select a report to preview.'});
  const q=await fetch(`${url}/rest/v1/diagnostic_reports?id=eq.${encodeURIComponent(reportId)}&select=*`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
  if(!q.ok)return answer(502,{error:'Unable to retrieve report.'});const rows=await q.json();if(!Array.isArray(rows)||rows.length!==1)return answer(404,{error:'Report not found.'});
  const row=rows[0];if(!row.report_json||!row.company_name)return answer(422,{error:'Report is incomplete.'});const {html,attachment,logoAttachment}=render(row);
  const send=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from:FROM,to:[recipient],reply_to:'paul@thec-lab.co.uk',subject:`[INTERNAL TEST] Brand Pulse report — ${String(row.company_name).slice(0,80)}`,html,attachments:[{filename:'brand-pulse-score.png',content:attachment,content_id:'brand-pulse-donut'}, {filename:'creative-lab-logo.png',content:logoAttachment,content_id:'brand-pulse-logo'}]})});
  const result=await send.json().catch(()=>({}));if(!send.ok)return answer(502,{error:result.message||'Resend did not accept this test.'});
  return answer(200,{ok:true,message:`Full report test accepted for ${recipient}. No client email sent.`,email_id:result.id||null});
 }catch(e){console.error('Full report test failed',e?.message);return answer(500,{error:'Unable to complete the full report test.'});}
}
