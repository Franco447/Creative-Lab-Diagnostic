// Scheduled automatic delivery. No public invocation; all database access is server-side.
// Safe by default: only rows explicitly marked delivery_enabled=true can be sent.
import { render, FROM } from './brandpulse-email-render.mjs';

const env = (name) => Netlify.env.get(name);
const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
const api = (root, query) => `${root.replace(/\/$/, '')}/rest/v1/diagnostic_reports${query}`;
const emailValid = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const required = ['score_meaning','stands_out','strategic_headline','strategic_commentary','consumer_headline','consumer_commentary','market_headline','market_commentary','growth_headline','growth_commentary','commercial_headline','commercial_commentary','focus_next_intro','now','next','nurture'];
const reportValid = row => {
  let r = row?.report_json;
  if (typeof r === 'string') { try { r = JSON.parse(r); } catch { return false; } }
  return r && required.every(k => typeof r[k] === 'string' && r[k].trim().length > 12);
};
const INTERNAL = new Set(['franco@thec-lab.co.uk', 'michael@thec-lab.co.uk', 'paul@thec-lab.co.uk']);
const testRow = row => String(row.company_name || '').startsWith('[BP TEST] ') && INTERNAL.has(String(row.client_email || '').toLowerCase().trim());

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
  const mode = (env('BRANDPULSE_DELIVERY_MODE') || 'off').trim().toLowerCase();
  // Explicit opt-in is required; deploying code alone never enables email sending.
  if (mode !== 'test' && mode !== 'live') {
    console.log(JSON.stringify({event:'brandpulse_delivery',mode:'off',checked:0,sent:0,rejected:0}));
    return;
  }
  if (!root || !key || !resend) throw Error('Delivery configuration missing.');
  const cutoff = new Date().toISOString();
  const query = `?select=*&delivery_enabled=eq.true&status=in.(draft,approved)&scheduled_send_at=lte.${encodeURIComponent(cutoff)}&order=scheduled_send_at.asc&limit=5`;
  const due = await jsonOrError(await fetch(api(root,query),{headers:headers(key)}));
  let sent=0, rejected=0;
  for (const report of due || []) {
    // In test mode, never claim or send a non-test report, regardless of database flags.
    if (mode === 'test' && !testRow(report)) continue;
    const claimed = await patch(root,key,report.id,`&delivery_enabled=eq.true&status=in.(draft,approved)&scheduled_send_at=lte.${encodeURIComponent(cutoff)}`,
      {status:'sending',updated_at:new Date().toISOString()});
    if (!Array.isArray(claimed) || claimed.length !== 1) continue;
    const row = claimed[0];
    const invalid = !emailValid(row.client_email) || !reportValid(row) || (mode === 'test' && !testRow(row));
    if (invalid) {
      await patch(root,key,row.id,'&status=eq.sending',{status:'delivery_error',delivery_error:'Invalid client email or incomplete report; manual review required.',updated_at:new Date().toISOString()});
      rejected++;continue;
    }
    // A stable idempotency key prevents duplicate Resend acceptance across retries within 24h.
    // The DB claim prevents routine duplicate dispatch beyond that period.
    try {
      // Guard again immediately before contacting Resend.
      if (mode === 'test' && !testRow(row)) throw Error('Internal-only test guard refused recipient.');
      const {html, attachment, logoAttachment}=render(row);
      const payload = {
        from:FROM,to:[row.client_email.trim()],
        // No BCC during testing: Michael and Paul must not receive report copies.
        reply_to:'paul@thec-lab.co.uk',
        subject:`${mode === 'test' ? '[TEST] ' : ''}Your Brand Pulse report — ${String(row.company_name).slice(0,80)}`,
        html,attachments:[{filename:'brand-pulse-score.png',content:attachment,content_id:'brand-pulse-donut'},{filename:'creative-lab-logo.png',content:logoAttachment,content_id:'brand-pulse-logo'}]
      };
      const result=await fetch('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json','Idempotency-Key':`brand-pulse-${mode}-${row.id}`},body:JSON.stringify(payload)
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
  console.log(JSON.stringify({event:'brandpulse_delivery',mode,checked:due?.length||0,sent,rejected}));
}
export default async () => { try { await run(); } catch(e) { console.error('Delivery sweep failed',String(e?.message||e)); } };
export const config={schedule:'* * * * *'}; // UTC every minute; scheduled_send_at is UTC timestamp
