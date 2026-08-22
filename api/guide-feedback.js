// POST /api/guide-feedback
// Records an explicit helpful/not-helpful choice without adding analytics or
// exposing the private Supabase key to the browser.

const SUPABASE_URL=process.env.SUPABASE_URL||'https://fdubcelrwfpzjjnqipku.supabase.co';
const hits=new Map();
const WINDOW=10*60*1000;
const MAX=30;

function allowed(ip){
  const now=Date.now(),entry=hits.get(ip);
  if(!entry||now>entry.reset){hits.set(ip,{count:1,reset:now+WINDOW});return true}
  if(entry.count>=MAX)return false;
  entry.count+=1;return true;
}

const clean=(value,max)=>String(value||'').replace(/\0/g,'').trim().slice(0,max);

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  if(!allowed(ip))return res.status(429).json({error:'Too many feedback requests'});

  const body=req.body&&typeof req.body==='object'?req.body:{};
  const id=clean(body.id,80);
  const reaction=body.reaction;
  if(!/^[a-zA-Z0-9-]+$/.test(id)||!['helpful','not-helpful'].includes(reaction)){
    return res.status(400).json({error:'Invalid feedback'});
  }

  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!secret)return res.status(503).json({error:'Feedback is unavailable'});
  const value={
    reaction,
    question:clean(body.question,800),
    response:clean(body.response,1600),
    page:clean(body.page,160),
    message_at:Number.isFinite(Number(body.createdAt))?new Date(Number(body.createdAt)).toISOString():null,
    reported_at:new Date().toISOString()
  };

  try{
    const upstream=await fetch(`${SUPABASE_URL}/rest/v1/settings?on_conflict=key`,{
      method:'POST',
      headers:{
        apikey:secret,
        Authorization:`Bearer ${secret}`,
        'Content-Type':'application/json',
        Prefer:'resolution=merge-duplicates,return=minimal'
      },
      body:JSON.stringify([{key:`guide.feedback.${id}`,value,is_public:false}]),
      signal:AbortSignal.timeout(8000)
    });
    if(!upstream.ok)throw new Error(`Supabase ${upstream.status}`);
    return res.status(204).end();
  }catch(error){
    console.error('guide feedback failed',error?.message||error);
    return res.status(502).json({error:'Feedback was not stored'});
  }
}
