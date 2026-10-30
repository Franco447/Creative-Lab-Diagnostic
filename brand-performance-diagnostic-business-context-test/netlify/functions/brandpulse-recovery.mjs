const INTERNAL=new Set(['franco@thec-lab.co.uk','michael@thec-lab.co.uk','paul@thec-lab.co.uk']);
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async req=>{
 const root=Netlify.env.get('SUPABASE_URL'),key=Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!root||!key)return json(503,{error:'Configuration missing'});
 const token=/^Bearer (.+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)return json(401,{error:'Sign in required'});
 const h={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 const auth=await fetch(`${root}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
 if(!auth.ok)return json(401,{error:'Session expired'});
 const user=await auth.json();
 if(!INTERNAL.has(String(user?.email||'').toLowerCase()))return json(403,{error:'Reviewer access required'});
 const table=`${root}/rest/v1/brandpulse_submissions`;
 if(req.method==='GET'){
  const r=await fetch(`${table}?select=id,created_at,status,stage,attempts,last_error,needs_attention,report_id,payload&order=created_at.desc&limit=500`,{headers:h});
  const rows=await r.json().catch(()=>null);return r.ok?json(200,{submissions:rows}):json(502,{error:'Cannot load submissions'});
 }
 if(req.method!=='POST')return json(405,{error:'Method not allowed'});
 const body=await req.json().catch(()=>({}));
 const id=String(body.id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id)||body.action!=='retry')return json(400,{error:'Invalid request'});
 // Only failed submissions can be retried manually; atomically update status.
 const res=await fetch(`${table}?id=eq.${id}&status=eq.failed&report_id=is.null&select=id`,{method:'PATCH',headers:{...h,Prefer:'return=representation'},body:JSON.stringify({status:'queued',stage:'research',response_id:null,research_briefing:null,attempts:0,last_error:null,needs_attention:false,claim_until:null,updated_at:new Date().toISOString()})});
 const result=await res.json().catch(()=>null);
 if(!res.ok)return json(502,{error:'Could not queue recovery'});
 if(result?.length!==1)return json(409,{error:'This submission is no longer awaiting recovery. Refresh the list.'});
 return json(200,{queued:true});
};
