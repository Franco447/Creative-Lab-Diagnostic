// Reviewer-only controls. All mutations and immediate sends are checked server-side.
import { render, FROM } from './brandpulse-email-render.mjs';

const INTERNAL = new Set(['franco@thec-lab.co.uk','michael@thec-lab.co.uk','paul@thec-lab.co.uk']);
const env = key => Netlify.env.get(key);
const json = (status, payload) => new Response(JSON.stringify(payload), {status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const headers = key => ({apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'});
const table = root => `${root.replace(/\/$/,'')}/rest/v1/diagnostic_reports`;
const dateUTC = () => new Date().toISOString();
const reportKeys=['score_meaning','stands_out','strategic_headline','strategic_commentary','consumer_headline','consumer_commentary','market_headline','market_commentary','growth_headline','growth_commentary','commercial_headline','commercial_commentary','focus_next_intro','now','next','nurture'];
const validReport = r => r && reportKeys.every(k => typeof r[k]==='string' && r[k].trim().length>12);
const isTest = row => String(row.company_name||'').startsWith('[BP TEST] ') && INTERNAL.has(String(row.client_email||'').trim().toLowerCase());
async function dbResponse(resp){let data=await resp.json().catch(()=>null);if(!resp.ok)throw Error(`Database ${resp.status}: ${data?.message||data?.error||'unknown error'}`);return data;}
async function find(root,key,id){const u=`${table(root)}?id=eq.${encodeURIComponent(id)}&select=*`;const rows=await dbResponse(await fetch(u,{headers:headers(key)}));return rows?.[0]||null;}
async function patch(root,key,id,expected,change){
  const filter=`?id=eq.${encodeURIComponent(id)}&status=eq.${encodeURIComponent(expected.status)}&updated_at=eq.${encodeURIComponent(expected.updated_at)}&select=*`;
  const rows=await dbResponse(await fetch(table(root)+filter,{method:'PATCH',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify(change)}));
  return rows?.length===1?rows[0]:null;
}
async function nextDelivery(root,key){
  const resp=await fetch(`${root.replace(/\/$/,'')}/rest/v1/rpc/brandpulse_next_delivery`,{
    method:'POST',headers:headers(key),body:JSON.stringify({submitted:dateUTC()})
  });
  const value=await dbResponse(resp);
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw Error('Could not calculate UK delivery schedule.');
  return value;
}
async function sendClaimed(root,key,resend,row,mode){
  const r=row.report_json;
  if(!validReport(r)) throw Error('Incomplete report; manual review required.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.client_email||''))) throw Error('Invalid recipient email.');
  if(mode==='test'&&!isTest(row)) throw Error('Test mode permits marked internal reports only.');
  const {html,attachment,logoAttachment,categoryAttachments}=render(row);
  const payload={from:FROM,to:[row.client_email.trim()],reply_to:'paul@thec-lab.co.uk',subject:`${mode==='test'?'[TEST] ':''}Your Brand Pulse report — ${String(row.company_name).slice(0,80)}`,html,attachments:[{filename:'brand-pulse-score.png',content:attachment,content_id:'brand-pulse-donut'},{filename:'creative-lab-logo.png',content:logoAttachment,content_id:'brand-pulse-logo'},...categoryAttachments]};
  const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json','Idempotency-Key':`brand-pulse-${mode}-${row.id}`},body:JSON.stringify(payload)});
  const data=await resp.json().catch(()=>null);
  if(!resp.ok||!data?.id)throw Error(`Resend ${resp.status}: ${data?.message||'no email id'}`);
  return data.id;
}
export default async req => {
  if(req.method!=='POST')return json(405,{error:'Method not allowed.'});
  const mode=String(env('BRANDPULSE_DELIVERY_MODE')||'off').trim().toLowerCase();
  const root=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY'),resend=env('RESEND_API_KEY');
  if(!root||!key)return json(503,{error:'Server configuration unavailable.'});
  try {
    const token=/^Bearer (.+)$/i.exec(req.headers.get('authorization')||'')?.[1];
    if(!token)return json(401,{error:'Please sign in again.'});
    const auth=await fetch(`${root.replace(/\/$/,'')}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
    if(!auth.ok)return json(401,{error:'Your session has expired.'});
    const user=await auth.json();
    if(!INTERNAL.has(String(user?.email||'').trim().toLowerCase()))return json(403,{error:'Reviewer access required.'});
    const body=await req.json();
    const id=String(body?.report_id||'');const action=String(body?.action||'');
    if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)||!['save','pause','resume','approve'].includes(action))return json(400,{error:'Invalid request.'});
    const current=await find(root,key,id);
    if(!current)return json(404,{error:'Report not found.'});
    if(['sent','sending','delivery_error'].includes(current.status))return json(409,{error:'Report is already being sent, was sent, or needs delivery review.'});
    if(!['draft','approved','paused'].includes(current.status))return json(409,{error:'Report cannot be changed in its current state.'});
    let changes={updated_at:dateUTC(),edited_by:user.email};
    if(action==='save'||action==='approve'){
      if(!validReport(body.report_json))return json(422,{error:'Report content is incomplete. Save was not performed.'});
      changes.report_json=body.report_json;
    }
    if(action==='pause'){
      if(current.status==='paused')return json(409,{error:'Report is already paused.'});
      changes.status='paused';
    }
    if(action==='resume'){
      if(current.status!=='paused')return json(409,{error:'Report is not paused.'});
      changes.status='draft';changes.scheduled_send_at=await nextDelivery(root,key);
    }
    if(action==='approve'){
      if(mode==='off')return json(409,{error:'Sending is disabled. Changes have not been saved.'});
      if(mode!=='test'&&mode!=='live')return json(409,{error:'Delivery mode is invalid.'});
      if(mode==='test'&&!isTest(current))return json(403,{error:'Test mode only permits a marked internal report.'});
      if(!current.delivery_enabled)return json(409,{error:'Delivery is disabled for this report.'});
      if(!resend)return json(503,{error:'Resend configuration unavailable.'});
      changes.status='sending';changes.approved_at=dateUTC();
    }
    const updated=await patch(root,key,id,current,changes);
    if(!updated)return json(409,{error:'The report changed since you opened it. Refresh before trying again.'});
    if(action!=='approve')return json(200,{report:updated,message:action==='pause'?'Send paused.':action==='resume'?'Send resumed; a new review window has started.':'Changes saved.'});
    // The compare-and-swap above exclusively claims the report. The scheduler cannot claim it.
    try{
      const messageId=await sendClaimed(root,key,resend,updated,mode);
      const sent=await dbResponse(await fetch(`${table(root)}?id=eq.${encodeURIComponent(id)}&status=eq.sending&select=*`,{method:'PATCH',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify({status:'sent',sent_at:dateUTC(),resend_email_id:messageId,delivery_error:null,updated_at:dateUTC()})}));
      if(sent?.length!==1)throw Error('Email accepted, but its database acknowledgement requires review.');
      return json(200,{report:sent[0],message:'Email accepted by Resend.'});
    }catch(error){
      console.error('Manual Brand Pulse send needs reconciliation',id,String(error?.message||error));
      await fetch(`${table(root)}?id=eq.${encodeURIComponent(id)}&status=eq.sending`,{method:'PATCH',headers:headers(key),body:JSON.stringify({status:'delivery_error',delivery_error:String(error?.message||error).slice(0,500),updated_at:dateUTC()})}).catch(()=>{});
      return json(502,{error:'Delivery could not be confirmed. Check the report status and Resend before retrying. No automatic retry has been scheduled.'});
    }
  }catch(error){console.error('Reviewer action',String(error?.message||error));return json(500,{error:'The action could not be completed. Please refresh and check its status.'});}
};
