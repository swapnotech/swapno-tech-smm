const API_URL=process.env.RESELLERSMM_API_URL||"https://resellersmm.com/api/v2";
/** Server-only provider adapter. Never import from client code. Node HTTPS certificate validation stays enabled. */
export async function resellerRequest(action,fields={}){
  const key=process.env.RESELLERSMM_API_KEY;
  if(!key) throw new Error("Provider is not configured; set RESELLERSMM_API_KEY on the backend");
  const body=new URLSearchParams({key,action,...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,String(v)]))});
  const response=await fetch(API_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error("Provider HTTP "+response.status);
  const data=await response.json();
  if(data?.error) throw new Error(String(data.error));
  return data;
}
export const listProviderServices=()=>resellerRequest("services");
export const getProviderBalance=()=>resellerRequest("balance");
