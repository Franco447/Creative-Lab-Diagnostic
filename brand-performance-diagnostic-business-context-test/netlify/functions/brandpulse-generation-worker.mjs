// Scheduled processing and recovery for safely stored submissions.
const env=k=>Netlify.env.get(k);
const dbHeaders=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const j=async r=>{const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d?.error||d?.message||`HTTP ${r.status}`);return d;};
export default async()=>{
 const root=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY'),site=env('URL'),workerSecret=env('BRANDPULSE_WORKER_KEY');
 if(!root||!key||!site||!workerSecret){console.error('Generation worker configuration missing');return;}
 const base=`${root.replace(/\/$/,'')}/rest/v1`, headers=dbHeaders(key);
 let row;
 try{
  const items=await j(await fetch(`${base}/rpc/brandpulse_claim_submission`,{method:'POST',headers,body:'{}'}));
  if(!items?.length)return;
  row=items[0];
  const update=async change=>{
   const r=await fetch(`${base}/brandpulse_submissions?id=eq.${row.id}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({...change,claim_until:null,updated_at:new Date().toISOString()})});
   const result=await j(r); if(result?.length!==1)throw Error('Submission update failed');
  };
  const request=async body=>j(await fetch(`${site.replace(/\/$/,'')}/.netlify/functions/generate-report`,{method:'POST',headers:{'Content-Type':'application/json','x-brandpulse-worker-key':workerSecret},body:JSON.stringify({...row.payload,client:{...row.payload.client,_submission_id:row.id},...body})}));
  const fail=async(reason)=>{
   const attempts=(row.attempts||0)+1;
   if(attempts>=2){await update({status:'failed',needs_attention:true,last_error:String(reason).slice(0,500),response_id:null,attempts});}
   else await update({status:'queued',stage:row.stage==='writing'?'writing':'research',response_id:null,attempts,last_error:String(reason).slice(0,500)});
  };
  try{
   if(row.stage==='research'){
    if(!row.response_id){const result=await request({action:'research'});await update({status:'researching',response_id:result.response_id});return;}
    const result=await request({action:'poll',stage:'research',response_id:row.response_id});
    if(result.status==='processing'){await update({status:'researching'});return;}
    if(result.status!=='research_complete'||!result.research)throw Error('Research did not return a briefing');
    await update({status:'writing',stage:'writing',research_briefing:result.research,response_id:null,attempts:0});return;
   }
   if(row.stage==='writing'){
    if(!row.response_id){const result=await request({action:'write',research:row.research_briefing});await update({status:'writing',response_id:result.response_id});return;}
    const result=await request({action:'poll',stage:'writing',response_id:row.response_id});
    if(result.status==='processing'){await update({status:'writing',response_id:result.response_id});return;}
    if(!result.report_id)throw Error('Writing completed without a saved report ID');
    // Keep the original submission-time schedule if it is still in the future.
    // Regenerations can finish after that deadline: never write an expired send time.
    const nextDelivery=async submitted=>j(await fetch(`${base}/rpc/brandpulse_next_delivery`,{method:'POST',headers,body:JSON.stringify({submitted})}));
    const originalSchedule=await nextDelivery(row.created_at);
    const originalTime=Date.parse(originalSchedule);
    const scheduled=Number.isFinite(originalTime)&&originalTime>Date.now()
     ?originalSchedule
     :await nextDelivery(new Date().toISOString());
    const scheduledTime=Date.parse(scheduled);
    if(!Number.isFinite(scheduledTime)||scheduledTime<=Date.now())throw Error('Generated report schedule was not in the future; delivery remains unconfirmed');
    const fix=await j(await fetch(`${base}/diagnostic_reports?id=eq.${result.report_id}&status=eq.draft`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({scheduled_send_at:scheduled,delivery_enabled:true})}));
    if(!fix?.length)throw Error('Generated report schedule could not be aligned; check report before sending');
    await update({status:'completed',report_id:result.report_id,needs_attention:false,last_error:null,response_id:null});return;
   }
  }catch(error){console.error('Generation stage failed',row.id,String(error));await fail(error.message||String(error));}
 }catch(error){console.error('Generation worker error',row?.id||'',String(error));}
};
export const config={schedule:'* * * * *'};
