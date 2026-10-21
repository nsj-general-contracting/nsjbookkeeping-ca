const { createHash } = require('node:crypto');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({success:false}); }
  if (!['https://www.nsjbookkeeping.ca','https://nsjbookkeeping.ca','https://nsjbookkeeping-ca.vercel.app'].includes(req.headers.origin)) return res.status(403).json({success:false});
  if (!String(req.headers['content-type']||'').includes('application/json')) return res.status(415).json({success:false});
  if (Number(req.headers['content-length']||0)>12000) return res.status(413).json({success:false});
  let input;
  try { input=typeof req.body==='string'?JSON.parse(req.body):req.body; } catch { return res.status(400).json({success:false}); }
  if (!input || typeof input!=='object' || Array.isArray(input)) return res.status(400).json({success:false});
  if (input._honey) return res.status(200).json({success:true});
  const fields={}; const limits={name:120,email:200,business:150,city:100,service:100,message:3000};
  for (const [key,max] of Object.entries(limits)) { const value=input[key]??''; if(typeof value!=='string'||value.length>max)return res.status(400).json({success:false});fields[key]=value.trim(); }
  if(!fields.name||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)||/[\r\n]/.test(fields.email))return res.status(400).json({success:false});
  const services=['Monthly bookkeeping','Catch-up or clean-up bookkeeping','Financial reporting','Business setup and systems','Business advisory support','Not sure yet'];
  if(!services.includes(fields.service))return res.status(400).json({success:false});
  if(!process.env.RESEND_API_KEY||!process.env.RESEND_FROM)return res.status(503).json({success:false});
  const text=['New website bookkeeping inquiry','',`Name: ${fields.name}`,`Email: ${fields.email}`,`Business: ${fields.business||'Not provided'}`,`City / town: ${fields.city||'Not provided'}`,`Service: ${fields.service}`,'',fields.message||'No additional message.','','Source: https://www.nsjbookkeeping.ca/'].join('\n');
  const id=createHash('sha256').update(JSON.stringify(fields)+Math.floor(Date.now()/300000)).digest('hex');
  try {
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`nsj-inquiry-${id}`},body:JSON.stringify({from:process.env.RESEND_FROM,to:['nsjfinancialservices@gmail.com'],reply_to:fields.email,subject:`New bookkeeping inquiry: ${fields.service}`,text}),signal:AbortSignal.timeout(12000)});
    const result=await response.json();
    if(!response.ok||!result.id)return res.status(502).json({success:false});
    return res.status(200).json({success:true});
  }catch{return res.status(502).json({success:false});}
};
