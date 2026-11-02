// Public intake: persist submission before any AI work. Never accepts a client-supplied report.
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async req=>{
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
  let saved=rows?.[0];
  if(!saved?.id){
    const found=await fetch(`${root.replace(/\/$/,'')}/rest/v1/brandpulse_submissions?submission_token=eq.${encodeURIComponent(token)}&select=id,payload`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    const existing=await found.json().catch(()=>null);
    if(!found.ok||existing?.length!==1||existing[0].payload?.client?.email!==payload.client.email||existing[0].payload?.client?.company!==payload.client.company)return json(409,{error:'Submission could not be reconciled.'});
    saved=existing[0];
  }
  return json(201,{received:true,submission_id:saved.id});
 }catch(e){console.error('Brand Pulse intake',String(e));return json(500,{error:'Could not receive submission.'});}
};
