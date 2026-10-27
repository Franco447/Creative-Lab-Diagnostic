// Scheduled automatic delivery. No public invocation; all database access is server-side.
// Safe by default: only rows explicitly marked delivery_enabled=true can be sent.
import { render, FROM } from './brandpulse-email-render.mjs';

const env = (name) => Netlify.env.get(name);
const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
const api = (root, query) => `${root.replace(/\/$/, '')}/rest/v1/diagnostic_reports${query}`;
const emailValid = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const required = ['score_meaning','stands_out','strategic_headline','strategic_commentary','consumer_headline','consumer_commentary','market_headline','market_commentary','growth_headline','growth_commentary','commercial_headline','commercial_commentary','focus_next_intro','now','next','nurture'];
const reportValid = row => row && row.report_json && required.every(k => typeof row.report_json[k] === 'string' && row.report_json[k].trim().length > 12);

async function jsonOrError(response) {
  const value = await response.json().catch(() => null);
  if (!response.ok) throw Error(`Database HTTP ${response.status}: ${value?.message || value?.error || 'unknown'}`);
  return value;
}
async function patch(root, key, id, filters, update) {
  const where = `?id=eq.${encodeURIComponent(id)}${filters}&select=*`;
  const res = await fetch(api(root, where), {method:'PATCH',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify(update)});
  return jsonOrError(res);
}
async function run() {
  const root = env('SUPABASE_URL'), key=env('SUPABASE_SERVICE_ROLE_KEY'), resend=env('RESEND_API_KEY');
  if (!root || !key || !resend) throw Error('Delivery configuration missing.');
  const cutoff = new Date().toISOString();
  const query = `?select=*&delivery_enabled=eq.true&status=in.(draft,approved)&scheduled_send_at=lte.${encodeURIComponent(cutoff)}&order=scheduled_send_at.asc&limit=5`;
  const due = await jsonOrError(await fetch(api(root,query),{headers:headers(key)}));
  let sent=0, rejected=0;
  for (const report of due || []) {
    const claimed = await patch(root,key,report.id,`&delivery_enabled=eq.true&status=in.(draft,approved)&scheduled_send_at=lte.${encodeURIComponent(cutoff)}`,
      {status:'sending',updated_at:new Date().toISOString()});
    if (!Array.isArray(claimed) || claimed.length !== 1) continue;
    const row = claimed[0];
    const invalid = !emailValid(row.client_email) || !reportValid(row);
    if (invalid) {
      await patch(root,key,row.id,'&status=eq.sending',{status:'delivery_error',delivery_error:'Invalid client email or incomplete report; manual review required.',updated_at:new Date().toISOString()});
      rejected++;continue;
    }
    // A stable idempotency key prevents duplicate Resend acceptance across retries within 24h.
    // The DB claim prevents routine duplicate dispatch beyond that period.
    try {
      const {html, attachment}=render(row);
      const payload = {
        from:FROM,to:[row.client_email.trim()],
        bcc:['michael@thec-lab.co.uk','paul@thec-lab.co.uk'],
        reply_to:'paul@thec-lab.co.uk',
        subject:`Your Brand Pulse report — ${String(row.company_name).slice(0,80)}`,
        html,attachments:[{filename:'brand-pulse-score.png',content:attachment,content_id:'brand-pulse-donut'}]
      };
      const result=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json','Idempotency-Key':`brand-pulse-client-${row.id}`},body:JSON.stringify(payload)
      });
      const data=await result.json().catch(()=>({}));
      if (!result.ok || !data?.id) throw Error(`Resend HTTP ${result.status}: ${String(data?.message||'no email id').slice(0,300)}`);
      await patch(root,key,row.id,'&status=eq.sending',{status:'sent',sent_at:new Date().toISOString(),resend_email_id:data.id,delivery_error:null,updated_at:new Date().toISOString()});
      sent++;
    } catch(error) {
      // Do not blindly retry: acceptance may have succeeded even if the DB acknowledgement failed.
      console.error('Brand Pulse delivery requires reconciliation',row.id,String(error?.message||error));
      try { await patch(root,key,row.id,'&status=eq.sending',{status:'delivery_error',delivery_error:String(error?.message||error).slice(0,500),updated_at:new Date().toISOString()}); }
      catch(e){console.error('Cannot mark delivery error',row.id,String(e?.message||e));}
      rejected++;
    }
  }
  console.log(JSON.stringify({event:'brandpulse_delivery',checked:due?.length||0,sent,rejected}));
}
export default async () => { try { await run(); } catch(e) { console.error('Delivery sweep failed',String(e?.message||e)); } };
export const config={schedule:'* * * * *'}; // UTC every minute; scheduled_send_at is UTC timestamp
