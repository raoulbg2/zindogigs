import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

const SUPABASE_URL = "https://ljvdughgioarewuxrcdt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdmR1Z2hnaW9hcmV3dXhyY2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzQ1NTksImV4cCI6MjA5NjUxMDU1OX0.V0qmNqCRw7BBx5r-gNmG33DNt3OrG9_Nx9iK0Pe1EbQ";

const sb = {
  _h: (token) => ({ "Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token||SUPABASE_ANON_KEY}` }),
  auth: {
    async signUp({email,password,options}){
      const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:"POST",headers:sb._h(),body:JSON.stringify({email,password,data:options?.data})});
      return r.json();
    },
    async signIn({email,password}){
      const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:sb._h(),body:JSON.stringify({email,password})});
      return r.json();
    },
    async signOut(token){await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:sb._h(token)});},
    async getUser(token){const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:sb._h(token)});return r.json();},
  },
  from:(table)=>({
    async select(cols="*",{token,filter,order,limit}={}){
      let url=`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`;
      if(filter)url+=`&${filter}`;if(order)url+=`&order=${order}`;if(limit)url+=`&limit=${limit}`;
      const r=await fetch(url,{headers:sb._h(token)});return r.json();
    },
    async insert(data,{token}={}){
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{...sb._h(token),"Prefer":"return=representation"},body:JSON.stringify(data)});
      return r.json();
    },
    async update(data,{token,filter}={}){
      let url=`${SUPABASE_URL}/rest/v1/${table}`;if(filter)url+=`?${filter}`;
      const r=await fetch(url,{method:"PATCH",headers:{...sb._h(token),"Prefer":"return=representation"},body:JSON.stringify(data)});
      return r.json();
    },
  }),
};

const T={
  bg:"#06060a",bg2:"#0c0c14",surface:"#111119",surface2:"#18181f",surface3:"#1e1e28",
  border:"rgba(255,255,255,0.06)",border2:"rgba(255,255,255,0.11)",
  violet:"#7c3aed",violet2:"#9d5cf5",neon:"#c084fc",neon2:"#e879f9",
  cyan:"#22d3ee",green:"#4ade80",amber:"#fbbf24",red:"#f87171",
  text:"#f0eefa",text2:"#9b97b4",text3:"#504c68",
  display:"'Syne',sans-serif",body:"'DM Sans',sans-serif",mono:"'JetBrains Mono',monospace",
};

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:'DM Sans',sans-serif;background:#06060a;color:#f0eefa;overflow-x:hidden;}
::selection{background:rgba(124,58,237,.35);color:#fff;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#06060a;}::-webkit-scrollbar-thumb{background:#7c3aed;border-radius:9px;}
input,select,textarea,button{font-family:'DM Sans',sans-serif;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-15px) scale(1.04)}}
@keyframes gradFlow{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes toastPop{from{opacity:0;transform:translateY(16px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
`;

const AuthCtx=createContext(null);
const useAuth=()=>useContext(AuthCtx);

const AuthProvider=({children})=>{
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [token,setToken]=useState(()=>localStorage.getItem("zg_token"));
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const init=async()=>{
      if(token){
        try{
          const u=await sb.auth.getUser(token);
          if(u.id){
            setUser(u);
            const p=await sb.from("profiles").select("*",{token,filter:`id=eq.${u.id}`});
            if(Array.isArray(p)&&p[0])setProfile(p[0]);
          }else{localStorage.removeItem("zg_token");setToken(null);}
        }catch(e){}
      }
      setLoading(false);
    };init();
  },[token]);
  const signIn=async(email,password)=>{
    const d=await sb.auth.signIn({email,password});
    if(d.access_token){
      localStorage.setItem("zg_token",d.access_token);setToken(d.access_token);setUser(d.user);
      const p=await sb.from("profiles").select("*",{token:d.access_token,filter:`id=eq.${d.user.id}`});
      if(Array.isArray(p)&&p[0])setProfile(p[0]);
      return{ok:true,profile:p?.[0]};
    }
    return{ok:false,error:d.error_description||"Erreur de connexion"};
  };
  const signUp=async({email,password,fullName,role,country,phone})=>{
    const d=await sb.auth.signUp({email,password,options:{data:{full_name:fullName,role,country,phone}}});
    if(d.user){if(d.access_token){localStorage.setItem("zg_token",d.access_token);setToken(d.access_token);setUser(d.user);}return{ok:true};}
    return{ok:false,error:d.error_description||"Erreur d'inscription"};
  };
  const signOut=async()=>{
    await sb.auth.signOut(token);localStorage.removeItem("zg_token");
    setToken(null);setUser(null);setProfile(null);
  };
  return <AuthCtx.Provider value={{user,profile,token,loading,signIn,signUp,signOut}}>{children}</AuthCtx.Provider>;
};

const Btn=({children,variant="primary",size="md",full,onClick,disabled,style={}})=>{
  const [h,setH]=useState(false);
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:".4rem",border:"none",
    cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,
    transition:"all .2s cubic-bezier(.16,1,.3,1)",width:full?"100%":"auto",opacity:disabled?.5:1,
    borderRadius:size==="sm"?"8px":size==="lg"?"14px":"10px",
    padding:size==="sm"?".4rem 1rem":size==="lg"?"1rem 2rem":".65rem 1.35rem",
    fontSize:size==="sm"?".78rem":size==="lg"?"1rem":".875rem",
    transform:h&&!disabled?"translateY(-1px)":"none"};
  const v={
    primary:{background:`linear-gradient(135deg,${T.violet},${T.violet2})`,color:"#fff",boxShadow:h?`0 0 32px rgba(124,58,237,.55)`:`0 0 20px rgba(124,58,237,.3)`},
    neon:{background:`linear-gradient(135deg,${T.neon2},${T.violet})`,color:"#fff",boxShadow:h?`0 0 32px rgba(232,121,249,.5)`:`0 0 20px rgba(232,121,249,.25)`},
    ghost:{background:"transparent",color:h?T.text:T.text2,border:`1px solid ${T.border2}`},
    outline:{background:h?"rgba(124,58,237,.1)":"transparent",color:T.violet2,border:`1px solid ${T.violet}`},
    danger:{background:"rgba(248,113,113,.1)",color:T.red,border:`1px solid rgba(248,113,113,.25)`},
    success:{background:"rgba(74,222,128,.1)",color:T.green,border:`1px solid rgba(74,222,128,.25)`},
  };
  return <button onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={disabled?undefined:onClick} style={{...base,...v[variant],...style}}>{children}</button>;
};

const Inp=({label,error,...props})=>(
  <div style={{marginBottom:"1rem"}}>
    {label&&<label style={{display:"block",fontSize:".78rem",fontWeight:600,color:T.text2,marginBottom:".4rem",textTransform:"uppercase",letterSpacing:".07em"}}>{label}</label>}
    <input style={{width:"100%",padding:".75rem 1rem",background:T.surface2,border:`1px solid ${error?T.red:T.border2}`,borderRadius:"10px",color:T.text,fontSize:".9rem",outline:"none"}} {...props}/>
    {error&&<p style={{color:T.red,fontSize:".75rem",marginTop:".3rem"}}>{error}</p>}
  </div>
);

const Spinner=()=><div style={{width:"16px",height:"16px",border:"2px solid rgba(255,255,255,.2)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>;

const Toast=({msg,type,visible})=>(
  <div style={{position:"fixed",bottom:"2rem",right:"2rem",zIndex:9999,background:T.surface2,
    border:`1px solid ${type==="error"?T.red:T.green}`,borderRadius:"14px",padding:".9rem 1.4rem",
    display:"flex",alignItems:"center",gap:".75rem",boxShadow:"0 12px 50px rgba(0,0,0,.5)",
    opacity:visible?1:0,transform:visible?"none":"translateY(12px)",
    transition:"all .4s cubic-bezier(.16,1,.3,1)",pointerEvents:visible?"auto":"none"}}>
    <span style={{fontSize:"1.1rem"}}>{type==="error"?"❌":"✅"}</span>
    <span style={{fontSize:".875rem",fontWeight:500}}>{msg}</span>
  </div>
);

const Card=({children,style={},glow})=>{
  const [h,setH]=useState(false);
  return <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:T.surface,border:`1px solid ${h?"rgba(124,58,237,.35)":T.border}`,borderRadius:"18px",
      transition:"all .3s cubic-bezier(.16,1,.3,1)",transform:h?"translateY(-4px)":"none",
      boxShadow:h?`0 20px 60px rgba(0,0,0,.45)${glow?`,0 0 40px rgba(124,58,237,.15)`:""}`:none,
      position:"relative",...style}}>{children}</div>;
};

const H2=({children,style={}})=><h2 style={{fontFamily:T.display,fontSize:"clamp(1.8rem,4vw,2.8rem)",fontWeight:800,letterSpacing:"-.04em",lineHeight:1.05,...style}}>{children}</h2>;
const Tag=({children,color=T.neon})=><span style={{display:"inline-block",fontSize:".72rem",fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color,marginBottom:".6rem"}}>{children}</span>;

const KPI=({label,value,sub,color=T.text,accent})=>(
  <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"1.25rem",position:"relative",overflow:"hidden"}}>
    {accent&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:accent}}/>}
    <div style={{fontSize:".72rem",color:T.text3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:".5rem"}}>{label}</div>
    <div style={{fontFamily:T.display,fontSize:"1.8rem",fontWeight:800,color}}>{value}</div>
    {sub&&<div style={{fontSize:".75rem",marginTop:".3rem",color:T.text3}}>{sub}</div>}
  </div>
);

const Nav=({page,setPage})=>{
  const {user,profile,signOut}=useAuth();
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>20);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  const links=[{id:"home",label:"Accueil"},{id:"services",label:"Services"},{id:"abonnements",label:"Abonnements"},{id:"ai",label:"🤖 IA Team"},{id:"pricing",label:"Tarifs"}];
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"space-between",padding:".9rem 2.5rem",
      background:scrolled?"rgba(6,6,10,.95)":"transparent",backdropFilter:scrolled?"blur(20px)":"none",
      borderBottom:scrolled?`1px solid ${T.border}`:"1px solid transparent",transition:"all .3s"}}>
      <div onClick={()=>setPage("home")} style={{fontFamily:T.display,fontWeight:800,fontSize:"1.35rem",letterSpacing:"-.04em",cursor:"pointer",display:"flex",alignItems:"center",gap:".45rem"}}>
        <div style={{width:"30px",height:"30px",borderRadius:"8px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem",color:"#fff",fontWeight:900}}>Z</div>
        Zindo<span style={{color:T.neon}}>Gigs</span>
      </div>
      <div style={{display:"flex",gap:".2rem"}}>
        {links.map(l=>(
          <button key={l.id} onClick={()=>setPage(l.id)} style={{background:page===l.id?"rgba(124,58,237,.12)":"none",border:"none",cursor:"pointer",padding:".45rem .95rem",borderRadius:"8px",color:page===l.id?T.neon:T.text2,fontSize:".875rem",fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>{l.label}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:".6rem",alignItems:"center"}}>
        {[["📘","https://facebook.com/zindogigs"],["📸","https://instagram.com/zindogigs"],["♪","https://tiktok.com/@zindogigs"],["▶","https://youtube.com/@zindogigs"]].map(([icon,url])=>(
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{width:"28px",height:"28px",borderRadius:"7px",background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".8rem",color:T.text3,textDecoration:"none"}}>{icon}</a>
        ))}
        {user?(
          <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
            <Btn variant="ghost" size="sm" onClick={()=>setPage(profile?.role==="admin"?"dashboard-admin":profile?.role==="seller"?"dashboard-seller":"dashboard-client")}>
              👤 {profile?.full_name?.split(" ")[0]||"Mon compte"}
            </Btn>
            <Btn variant="danger" size="sm" onClick={signOut}>Quitter</Btn>
          </div>
        ):(
          <>
            <Btn variant="ghost" size="sm" onClick={()=>setPage("login")}>Connexion</Btn>
            <Btn variant="primary" size="sm" onClick={()=>setPage("captcha")}>S'inscrire</Btn>
          </>
        )}
      </div>
    </nav>
  );
};

const GRID=["⭐","🌙","🔥","⭐","🎵","⭐","🌺","💫","⭐","🎨","⭐","🔥","🌙","⭐","🎵","🌺"];
const CORRECT=GRID.map(e=>e==="⭐");
const CaptchaPage=({setPage,showToast})=>{
  const [sel,setSel]=useState(new Set());
  const [shake,setShake]=useState(false);
  const toggle=i=>{const s=new Set(sel);s.has(i)?s.delete(i):s.add(i);setSel(s);};
  const verify=()=>{
    if(CORRECT.every((c,i)=>c===sel.has(i))){showToast("Vérification réussie !","success");setTimeout(()=>setPage("register"),700);}
    else{setShake(true);setSel(new Set());setTimeout(()=>setShake(false),500);showToast("Sélection incorrecte — réessaie","error");}
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse at center,rgba(124,58,237,.09) 0%,${T.bg} 70%)`,padding:"2rem"}}>
      <div style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:"24px",padding:"2.5rem",width:"100%",maxWidth:"440px",textAlign:"center",position:"relative",overflow:"hidden",animation:"fadeUp .4s ease",transform:shake?"translateX(-5px)":"none",transition:"transform .1s"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"3px",background:`linear-gradient(90deg,${T.violet},${T.neon},${T.neon2})`}}/>
        <div style={{fontFamily:T.display,fontWeight:800,fontSize:"1.3rem",marginBottom:"1.5rem"}}>Zindo<span style={{color:T.neon}}>Gigs</span></div>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🛡️</div>
        <h2 style={{fontFamily:T.display,fontSize:"1.4rem",fontWeight:800,marginBottom:".5rem"}}>Vérification sécurité</h2>
        <p style={{color:T.text2,fontSize:".875rem",lineHeight:1.7,marginBottom:"1.5rem"}}>Sélectionne toutes les cases avec une <strong style={{color:T.neon}}>étoile ⭐</strong> pour continuer.</p>
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"1.25rem",marginBottom:"1.25rem"}}>
          <p style={{fontSize:".75rem",color:T.text3,marginBottom:".75rem",textTransform:"uppercase",letterSpacing:".08em"}}>Clique sur toutes les ⭐</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:".45rem"}}>
            {GRID.map((e,i)=>(
              <div key={i} onClick={()=>toggle(i)} style={{aspectRatio:"1",borderRadius:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",background:sel.has(i)?"rgba(124,58,237,.2)":T.surface2,border:`2px solid ${sel.has(i)?T.violet:T.border}`,transform:sel.has(i)?"scale(.94)":"scale(1)",transition:"all .2s"}}>{e}</div>
            ))}
          </div>
        </div>
        <Btn variant="primary" size="lg" full onClick={verify}>Vérifier et continuer →</Btn>
        <p style={{marginTop:"1rem",fontSize:".72rem",color:T.text3}}>Protégé par <strong style={{color:T.violet2}}>ZindoShield™</strong></p>
      </div>
    </div>
  );
};

const AuthPage=({mode,setPage,showToast})=>{
  const {signIn,signUp}=useAuth();
  const [role,setRole]=useState("client");
  const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({email:"",password:"",fullName:"",country:"Cameroun",phone:"",prefix:"+237"});
  const [errors,setErrors]=useState({});
  const isLogin=mode==="login";
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const countries=[["🇨🇲","Cameroun","+237"],["🇸🇳","Sénégal","+221"],["🇨🇮","Côte d'Ivoire","+225"],["🇲🇱","Mali","+223"],["🇧🇫","Burkina Faso","+226"],["🇬🇳","Guinée","+224"],["🇹🇬","Togo","+228"],["🇧🇯","Bénin","+229"],["🇨🇬","Congo","+242"],["🇬🇦","Gabon","+241"],["🇲🇦","Maroc","+212"],["🇩🇿","Algérie","+213"],["🇳🇬","Nigeria","+234"],["🇬🇭","Ghana","+233"],["🇰🇪","Kenya","+254"],["🇹🇿","Tanzanie","+255"]];
  const validate=()=>{const e={};if(!form.email)e.email="Email requis";if(!form.password||form.password.length<6)e.password="Min. 6 caractères";if(!isLogin&&!form.fullName)e.fullName="Nom requis";setErrors(e);return Object.keys(e).length===0;};
  const handleSubmit=async()=>{
    if(!validate())return;setLoading(true);
    if(isLogin){
      const r=await signIn(form.email,form.password);
      if(r.ok){showToast("Connexion réussie ! Bienvenue 👋","success");setTimeout(()=>setPage(r.profile?.role==="admin"?"dashboard-admin":r.profile?.role==="seller"?"dashboard-seller":"dashboard-client"),700);}
      else showToast(r.error,"error");
    }else{
      const r=await signUp({email:form.email,password:form.password,fullName:form.fullName,role,country:form.country,phone:`${form.prefix}${form.phone}`});
      if(r.ok){showToast("Compte créé ! Vérifie ton email 📧","success");setTimeout(()=>setPage("login"),1200);}
      else showToast(r.error,"error");
    }
    setLoading(false);
  };
  return (
    <div style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"1fr 1fr"}}>
      <div style={{background:`linear-gradient(135deg,rgba(124,58,237,.14),rgba(232,121,249,.07))`,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:"450px",height:"450px",borderRadius:"50%",background:"rgba(124,58,237,.13)",filter:"blur(80px)",animation:"drift 10s ease-in-out infinite",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
        <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:"360px"}}>
          <div style={{fontFamily:T.display,fontWeight:800,fontSize:"1.4rem",marginBottom:"2rem"}}>Zindo<span style={{color:T.neon}}>Gigs</span></div>
          <div style={{fontSize:"3.5rem",marginBottom:"1.25rem"}}>{isLogin?"👋":"🚀"}</div>
          <h2 style={{fontFamily:T.display,fontSize:"1.8rem",fontWeight:800,letterSpacing:"-.03em",marginBottom:"1rem",lineHeight:1.1}}>{isLogin?"Bon retour parmi nous":"Rejoins 50 000+ utilisateurs africains"}</h2>
          <p style={{color:T.text2,lineHeight:1.7,fontSize:".9rem",marginBottom:"2rem"}}>La marketplace digitale africaine la plus intelligente. Services créatifs + IA + abonnements.</p>
          {!isLogin&&["Paiement Mobile Money & Visa","Argent sécurisé par Escrow","IA Équipe Instantanée","30+ pays africains couverts"].map(f=>(
            <div key={f} style={{display:"flex",gap:".6rem",alignItems:"center",fontSize:".85rem",color:T.text2,textAlign:"left",marginBottom:".45rem"}}><span style={{color:T.green,fontWeight:800}}>✓</span>{f}</div>
          ))}
          <div style={{display:"flex",gap:".5rem",justifyContent:"center",marginTop:"2rem",flexWrap:"wrap"}}>
            {[["📘 Facebook","https://facebook.com/zindogigs"],["📸 Instagram","https://instagram.com/zindogigs"],["♪ TikTok","https://tiktok.com/@zindogigs"],["▶ YouTube","https://youtube.com/@zindogigs"]].map(([label,url])=>(
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{fontSize:".72rem",color:T.text3,padding:".3rem .6rem",borderRadius:"6px",background:T.surface2,border:`1px solid ${T.border}`,textDecoration:"none"}}>{label}</a>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem",background:T.bg2,overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:"400px",animation:"fadeUp .4s ease"}}>
          <h3 style={{fontFamily:T.display,fontSize:"1.7rem",fontWeight:800,letterSpacing:"-.03em",marginBottom:".3rem"}}>{isLogin?"Connexion":"Créer mon compte"}</h3>
          <p style={{color:T.text2,fontSize:".875rem",marginBottom:"2rem"}}>{isLogin?"Accède à ton espace ZindoGigs":"Inscription gratuite — 2 minutes"}</p>
          {!isLogin&&(
            <>
              <p style={{fontSize:".78rem",fontWeight:600,color:T.text2,textTransform:"uppercase",letterSpacing:".07em",marginBottom:".6rem"}}>Tu es...</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1.25rem"}}>
                {[["client","🛒","Client","Je cherche des services"],["seller","🎨","Prestataire","Je vends mes services"]].map(([r,icon,name,sub])=>(
                  <div key={r} onClick={()=>setRole(r)} style={{padding:"1rem",borderRadius:"12px",cursor:"pointer",textAlign:"center",border:`2px solid ${role===r?T.violet:T.border}`,background:role===r?"rgba(124,58,237,.08)":T.surface,transition:"all .2s"}}>
                    <div style={{fontSize:"1.5rem",marginBottom:".3rem"}}>{icon}</div>
                    <div style={{fontWeight:700,fontSize:".9rem"}}>{name}</div>
                    <div style={{fontSize:".72rem",color:T.text3}}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
                <Inp label="Prénom & Nom" placeholder="Jean Dupont" error={errors.fullName} value={form.fullName} onChange={e=>set("fullName",e.target.value)}/>
                <div style={{marginBottom:"1rem"}}>
                  <label style={{display:"block",fontSize:".78rem",fontWeight:600,color:T.text2,marginBottom:".4rem",textTransform:"uppercase",letterSpacing:".07em"}}>Pays</label>
                  <select value={form.country} onChange={e=>{set("country",e.target.value);const c=countries.find(c=>c[1]===e.target.value);if(c)set("prefix",c[2]);}} style={{width:"100%",padding:".75rem 1rem",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:"10px",color:T.text,fontSize:".875rem",outline:"none"}}>
                    {countries.map(([flag,name])=><option key={name} value={name}>{flag} {name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:"1rem"}}>
                <label style={{display:"block",fontSize:".78rem",fontWeight:600,color:T.text2,marginBottom:".4rem",textTransform:"uppercase",letterSpacing:".07em"}}>Téléphone</label>
                <div style={{display:"flex",gap:".5rem"}}>
                  <select value={form.prefix} onChange={e=>set("prefix",e.target.value)} style={{padding:".75rem",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:"10px",color:T.text,fontSize:".875rem",outline:"none",minWidth:"85px"}}>
                    {countries.map(([flag,,code])=><option key={code} value={code}>{flag} {code}</option>)}
                  </select>
                  <input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="6XX XXX XXX" type="tel" style={{flex:1,padding:".75rem 1rem",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:"10px",color:T.text,fontSize:".875rem",outline:"none"}}/>
                </div>
                <div style={{marginTop:".5rem",background:"rgba(124,58,237,.08)",border:`1px solid rgba(124,58,237,.2)`,borderRadius:"8px",padding:".5rem .9rem",fontSize:".78rem",color:T.neon}}>📱 SMS de vérification envoyé à ce numéro</div>
              </div>
            </>
          )}
          <Inp label="Email" type="email" placeholder="email@exemple.com" value={form.email} onChange={e=>set("email",e.target.value)} error={errors.email}/>
          <Inp label="Mot de passe" type="password" placeholder="••••••••" value={form.password} onChange={e=>set("password",e.target.value)} error={errors.password}/>
          {isLogin&&<div style={{textAlign:"right",marginBottom:"1.25rem",marginTop:"-.5rem"}}><span style={{fontSize:".8rem",color:T.neon,cursor:"pointer"}}>Mot de passe oublié ?</span></div>}
          <div style={{background:"rgba(124,58,237,.07)",border:`1px solid rgba(124,58,237,.2)`,borderRadius:"8px",padding:".65rem 1rem",fontSize:".78rem",color:T.neon,display:"flex",gap:".5rem",marginBottom:"1.25rem"}}>🛡️ ZindoShield™ Anti-Fraude activé</div>
          <Btn variant="primary" size="lg" full onClick={handleSubmit} disabled={loading}>{loading?<><Spinner/> {isLogin?"Connexion...":"Création..."}</>:isLogin?"Se connecter →":"Créer mon compte →"}</Btn>
          {isLogin&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:"1rem",margin:"1.25rem 0",color:T.text3,fontSize:".8rem"}}><div style={{flex:1,height:"1px",background:T.border}}/>accès démo<div style={{flex:1,height:"1px",background:T.border}}/></div>
              <div style={{display:"flex",gap:".6rem"}}>
                <Btn variant="ghost" full onClick={()=>setPage("dashboard-admin")}>⚙️ Admin</Btn>
                <Btn variant="ghost" full onClick={()=>setPage("dashboard-seller")}>🎨 Vendeur</Btn>
              </div>
            </>
          )}
          <p style={{textAlign:"center",marginTop:"1.25rem",fontSize:".85rem",color:T.text2}}>
            {isLogin?"Pas encore inscrit ? ":"Déjà inscrit ? "}
            <span onClick={()=>setPage(isLogin?"captcha":"login")} style={{color:T.neon,cursor:"pointer",fontWeight:700}}>{isLogin?"Créer un compte":"Se connecter"}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const HomePage=({setPage})=>{
  const features=[
    {icon:"🤖",title:"Équipe Instantanée IA",desc:"Décris ton projet une fois. ZindoAI sélectionne les meilleurs experts et génère un devis complet en 10 secondes.",isNew:true},
    {icon:"🌍",title:"Paiement Pan-Africain",desc:"MTN Money, Orange Money, Wave, Airtel, Visa, Mastercard. 30+ pays africains couverts via CinetPay.",isNew:true},
    {icon:"🔒",title:"Escrow Sécurisé",desc:"Argent bloqué jusqu'à ta validation finale. Si litige, ZindoGigs arbitre. 100% sécurisé.",isNew:false},
    {icon:"⚡",title:"Mode Express 24h",desc:"Besoin urgent ? Active le mode Express. Prestataires disponibles notifiés immédiatement. +30% tarif.",isNew:true},
    {icon:"🌐",title:"Trilingue FR / EN / AR",desc:"Site et profils disponibles en français, anglais et arabe. Traductions automatiques partout.",isNew:false},
    {icon:"🛡️",title:"ZindoShield™ Anti-Fraude",desc:"CAPTCHA avancé, vérification SMS, badge identité vérifiée. Zéro faux compte, zéro arnaque.",isNew:false},
  ];
  const cats=[{icon:"🎨",name:"Graphisme",count:"824"},{icon:"🎬",name:"Vidéo",count:"412"},{icon:"💻",name:"Dev Web",count:"630"},{icon:"📱",name:"Social Media",count:"290"},{icon:"✍️",name:"Rédaction",count:"185"},{icon:"🎬",name:"Abonnements",count:"47"},{icon:"🎵",name:"Audio",count:"98"},{icon:"📊",name:"Marketing",count:"215"}];
  return (
    <div>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"7rem 2rem 4rem",position:"relative",overflow:"hidden"}}>
        {["rgba(124,58,237,.18)","rgba(232,121,249,.1)","rgba(34,211,238,.07)"].map((c,i)=>(
          <div key={i} style={{position:"absolute",borderRadius:"50%",filter:"blur(90px)",pointerEvents:"none",background:c,width:`${[500,380,300][i]}px`,height:`${[500,380,300][i]}px`,top:["-100px","auto","40%"][i],left:["-80px","auto","60%"][i],right:["auto","-60px","auto"][i],bottom:["auto","-40px","auto"][i],animation:`drift ${[8,10,12][i]}s ease-in-out infinite`,animationDelay:`${[0,-3,-5][i]}s`}}/>
        ))}
        <div style={{position:"relative",zIndex:1,animation:"fadeUp .6s ease"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:".5rem",background:"rgba(124,58,237,.1)",border:`1px solid rgba(124,58,237,.3)`,padding:".4rem 1.1rem",borderRadius:"99px",fontSize:".78rem",fontWeight:700,color:T.neon,textTransform:"uppercase",letterSpacing:".1em",marginBottom:"2rem"}}>
            <div style={{width:"6px",height:"6px",background:T.neon,borderRadius:"50%",animation:"pulse 2s infinite"}}/>Marketplace #1 Afrique Francophone
          </div>
          <h1 style={{fontFamily:T.display,fontSize:"clamp(3rem,8vw,6.5rem)",fontWeight:800,lineHeight:1,letterSpacing:"-.05em",marginBottom:"1.5rem"}}>
            <span style={{display:"block"}}>La marketplace</span>
            <span style={{display:"block",background:`linear-gradient(90deg,${T.violet2},${T.neon},${T.neon2})`,backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",animation:"gradFlow 4s ease infinite"}}>digitale africaine</span>
            <span style={{display:"block",color:T.text3}}>la plus intelligente</span>
          </h1>
          <p style={{color:T.text2,fontSize:"1.1rem",maxWidth:"540px",lineHeight:1.75,margin:"0 auto 2.5rem"}}>Achète tes abonnements premium, commande des services créatifs. L'IA ZindoGigs compose ton équipe idéale en 10 secondes.</p>
          <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
            <Btn variant="neon" size="lg" onClick={()=>setPage("ai")}>🤖 Équipe Instantanée IA</Btn>
            <Btn variant="ghost" size="lg" onClick={()=>setPage("services")}>Explorer les services</Btn>
          </div>
        </div>
        <div style={{marginTop:"4rem",maxWidth:"620px",width:"100%",position:"relative",zIndex:1,animation:"fadeUp .8s ease .2s both"}}>
          <Card style={{padding:"1.75rem",boxShadow:`0 0 80px rgba(124,58,237,.2)`}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,${T.violet},${T.neon},${T.neon2})`,borderRadius:"18px 18px 0 0"}}/>
            <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:"1rem"}}>
              <div style={{width:"28px",height:"28px",borderRadius:"8px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".85rem"}}>🤖</div>
              <span style={{fontSize:".75rem",fontWeight:700,color:T.neon,textTransform:"uppercase",letterSpacing:".1em"}}>ZindoAI — Équipe Instantanée</span>
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"10px",padding:".9rem",marginBottom:"1rem",fontSize:".875rem",color:T.text2,fontStyle:"italic",lineHeight:1.6,textAlign:"left"}}>"Je veux lancer ma boutique. J'ai besoin d'un logo, d'un site web et d'une vidéo Instagram."</div>
            {[{i:"K",n:"Kevin_Design",r:"Graphiste • Logo & Identité",s:"98%",c:T.violet},{i:"S",n:"Sandra_Dev",r:"Dev Web • Site e-commerce",s:"94%",c:T.cyan},{i:"M",n:"Marc_Films",r:"Vidéaste • Vidéo & Reels",s:"91%",c:T.amber}].map(m=>(
              <div key={m.n} style={{display:"flex",alignItems:"center",gap:".75rem",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:"10px",padding:".65rem .9rem",marginBottom:".5rem"}}>
                <div style={{width:"30px",height:"30px",borderRadius:"8px",background:m.c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",flexShrink:0}}>{m.i}</div>
                <div style={{flex:1,textAlign:"left"}}><div style={{fontWeight:700,fontSize:".85rem"}}>{m.n}</div><div style={{fontSize:".72rem",color:T.text2}}>{m.r}</div></div>
                <div style={{fontFamily:T.mono,fontSize:".72rem",color:T.green,background:"rgba(74,222,128,.1)",padding:".2rem .5rem",borderRadius:"5px"}}>{m.s}</div>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(124,58,237,.08)",border:`1px solid rgba(124,58,237,.2)`,borderRadius:"10px",padding:".75rem 1rem",marginTop:".5rem"}}>
              <div><div style={{fontSize:".72rem",color:T.text3}}>Devis estimé</div><div style={{fontFamily:T.display,fontSize:"1.1rem",fontWeight:800,color:T.neon}}>87 000 FCFA</div></div>
              <div><div style={{fontSize:".72rem",color:T.text3}}>Délai</div><div style={{fontWeight:600}}>⏱ 7-10 jours</div></div>
              <Btn variant="primary" size="sm" onClick={()=>setPage("ai")}>Essayer →</Btn>
            </div>
          </Card>
        </div>
        <div style={{display:"flex",gap:"3rem",justifyContent:"center",flexWrap:"wrap",marginTop:"4rem",paddingTop:"2.5rem",borderTop:`1px solid ${T.border}`,maxWidth:"900px",width:"100%",position:"relative",zIndex:1}}>
          {[["50K+","Clients actifs"],["3 200+","Prestataires vérifiés"],["30+","Pays africains"],["98%","Satisfaction"]].map(([n,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontFamily:T.display,fontSize:"2.2rem",fontWeight:800,background:`linear-gradient(135deg,${T.text},${T.neon})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{n}</div>
              <div style={{color:T.text3,fontSize:".8rem",marginTop:".2rem"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"5rem 2.5rem",maxWidth:"1200px",margin:"0 auto"}}>
        <Tag>Explorer par catégorie</Tag>
        <H2 style={{marginBottom:"2.5rem"}}>Tous les services dont<br/>tu as besoin</H2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"1rem"}}>
          {cats.map(c=>{
            const[h,setH]=useState(false);
            return <div key={c.name} onClick={()=>setPage("services")} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:T.surface,border:`1px solid ${h?"rgba(124,58,237,.35)":T.border}`,borderRadius:"14px",padding:"1.5rem 1rem",textAlign:"center",cursor:"pointer",transition:"all .25s",transform:h?"translateY(-3px)":"none"}}><div style={{fontSize:"2rem",marginBottom:".6rem"}}>{c.icon}</div><div style={{fontWeight:700,fontSize:".875rem"}}>{c.name}</div><div style={{fontSize:".72rem",color:T.text3,marginTop:".2rem"}}>{c.count} services</div></div>;
          })}
        </div>
      </div>

      <div style={{padding:"5rem 2.5rem",maxWidth:"1200px",margin:"0 auto"}}>
        <Tag>Ce que personne d'autre n'offre</Tag>
        <H2 style={{marginBottom:"2.5rem"}}>Pourquoi ZindoGigs<br/>est différent</H2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1.25rem"}}>
          {features.map(f=>(
            <Card key={f.title} style={{padding:"1.75rem"}}>
              {f.isNew&&<div style={{position:"absolute",top:"1rem",right:"1rem",fontSize:".65rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",padding:".2rem .55rem",borderRadius:"5px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,color:"#fff"}}>UNIQUE</div>}
              <div style={{width:"48px",height:"48px",borderRadius:"12px",background:"rgba(124,58,237,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",marginBottom:"1.25rem"}}>{f.icon}</div>
              <div style={{fontFamily:T.display,fontSize:"1.05rem",fontWeight:700,marginBottom:".5rem"}}>{f.title}</div>
              <div style={{color:T.text2,fontSize:".85rem",lineHeight:1.65}}>{f.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{padding:"5rem 2.5rem",maxWidth:"1200px",margin:"0 auto"}}>
        <Tag>Rejoins la communauté</Tag>
        <H2 style={{marginBottom:"1rem"}}>ZindoGigs sur les réseaux</H2>
        <p style={{color:T.text2,marginBottom:"2rem"}}>Suis-nous pour les dernières offres et actualités</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1rem"}}>
          {[["📘 Facebook","@ZindoGigs","Actualités & offres","https://facebook.com/zindogigs","rgba(24,119,242,.12)","rgba(24,119,242,.3)"],
            ["📸 Instagram","@zindogigs","Inspirations créatives","https://instagram.com/zindogigs","rgba(228,64,95,.12)","rgba(228,64,95,.3)"],
            ["♪ TikTok","@zindogigs","Tutos & coulisses","https://tiktok.com/@zindogigs","rgba(255,255,255,.06)","rgba(255,255,255,.15)"],
            ["▶ YouTube","ZindoGigs","Vidéos & formations","https://youtube.com/@zindogigs","rgba(255,0,0,.12)","rgba(255,0,0,.3)"]].map(([icon,handle,desc,url,bg,border])=>{
            const[h,setH]=useState(false);
            return <a key={handle} href={url} target="_blank" rel="noopener noreferrer" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"block",background:h?bg:T.surface,border:`1px solid ${h?border:T.border}`,borderRadius:"14px",padding:"1.5rem",transition:"all .25s",textDecoration:"none",transform:h?"translateY(-3px)":"none"}}><div style={{fontSize:"1.8rem",marginBottom:".6rem"}}>{icon}</div><div style={{fontWeight:700,fontSize:".95rem",marginBottom:".2rem"}}>{handle}</div><div style={{fontSize:".8rem",color:T.text2}}>{desc}</div></a>;
          })}
        </div>
      </div>
      <Footer setPage={setPage}/>
    </div>
  );
};

const AIPage=({setPage,showToast})=>{
  const [text,setText]=useState("");
  const [budget,setBudget]=useState("");
  const [delay,setDelay]=useState("3-7 jours");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [chatHistory,setChatHistory]=useState([{role:"assistant",content:"Bonjour ! Je suis ZindoAI 🤖 Décris ton projet ou pose-moi une question sur nos services."}]);
  const [chatMsg,setChatMsg]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const [activeTab,setActiveTab]=useState("team");
  const [apiKey,setApiKey]=useState(()=>localStorage.getItem("zg_claude_key")||"");
  const [showKeyInput,setShowKeyInput]=useState(false);
  const chatEnd=useRef(null);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chatHistory]);

  const claude=async(messages,system)=>{
    const key=apiKey;
    if(!key){setShowKeyInput(true);throw new Error("Clé API manquante");}
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages})});
    const d=await res.json();
    if(d.error)throw new Error(d.error.message);
    return d.content.map(b=>b.text||"").join("");
  };

  const generateTeam=async()=>{
    if(!text.trim()){showToast("Décris ton projet d'abord !","error");return;}
    setLoading(true);setResult(null);
    try{
      const raw=await claude([{role:"user",content:`Projet: ${text}\nBudget: ${budget||"non précisé"}\nDélai: ${delay}`}],
        `Tu es ZindoAI de ZindoGigs — marketplace digitale africaine. Génère une équipe de freelances pour ce projet.
Réponds UNIQUEMENT en JSON valide sans texte autour:
{"summary":"résumé 1 phrase","team":[{"name":"Prénom_Pseudo","role":"Rôle précis","skills":"compétences","score":95,"country":"🇨🇲 Cameroun","price":25000}],"total":43000,"delay":"7-10 jours","tips":"conseil court"}
Prix en FCFA. 2-4 membres selon complexité. Prénoms africains authentiques.`);
      setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));
      showToast("Équipe générée avec succès ! 🎉","success");
    }catch(e){showToast("Erreur : "+e.message,"error");}
    setLoading(false);
  };

  const sendChat=async()=>{
    if(!chatMsg.trim())return;
    const msg=chatMsg;setChatMsg("");
    const hist=[...chatHistory,{role:"user",content:msg}];
    setChatHistory(hist);setChatLoading(true);
    try{
      const reply=await claude(hist.map(m=>({role:m.role,content:m.content})),`Tu es ZindoAI, assistant de ZindoGigs — marketplace digitale africaine. Aide sur les services, prix (FCFA), délais. Contact: raouldzoda@gmail.com. Sois chaleureux et concis, réponds en français.`);
      setChatHistory([...hist,{role:"assistant",content:reply}]);
    }catch{setChatHistory([...hist,{role:"assistant",content:"Désolé, une erreur s'est produite. Réessaie 🙏"}]);}
    setChatLoading(false);
  };

  return (
    <div style={{padding:"7rem 2rem 4rem",maxWidth:"860px",margin:"0 auto",animation:"fadeUp .4s ease"}}>
      {showKeyInput&&(
        <div style={{background:T.surface2,border:`1px solid rgba(124,58,237,.3)`,borderRadius:"14px",padding:"1.25rem",marginBottom:"1.5rem"}}>
          <p style={{fontSize:".85rem",color:T.text2,marginBottom:".75rem"}}>🔑 Entre ta clé API Claude pour activer l'IA (stockée localement uniquement) :</p>
          <div style={{display:"flex",gap:".6rem"}}>
            <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e=>setApiKey(e.target.value)} style={{flex:1,padding:".65rem 1rem",background:T.bg2,border:`1px solid ${T.border2}`,borderRadius:"8px",color:T.text,fontSize:".875rem",outline:"none"}}/>
            <Btn variant="primary" onClick={()=>{localStorage.setItem("zg_claude_key",apiKey);setShowKeyInput(false);showToast("Clé enregistrée !","success");}}>Sauvegarder</Btn>
          </div>
        </div>
      )}
      <Tag color={T.neon}>🤖 Fonctionnalité Exclusive ZindoGigs</Tag>
      <h1 style={{fontFamily:T.display,fontSize:"clamp(2rem,5vw,3rem)",fontWeight:800,letterSpacing:"-.04em",marginBottom:".5rem"}}>Équipe Instantanée IA</h1>
      <p style={{color:T.text2,lineHeight:1.75,marginBottom:"2.5rem"}}>Propulsé par Claude d'Anthropic. Décris ton projet — ZindoAI génère ton équipe idéale avec devis en quelques secondes.</p>
      <div style={{display:"flex",gap:".4rem",marginBottom:"2rem",background:T.surface,padding:".35rem",borderRadius:"12px",border:`1px solid ${T.border}`,width:"fit-content"}}>
        {[["team","🤖 Équipe IA"],["chat","💬 Assistant Support"]].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{padding:".5rem 1.25rem",borderRadius:"8px",border:"none",background:activeTab===id?T.violet:"transparent",color:activeTab===id?"#fff":T.text2,fontFamily:"'DM Sans',sans-serif",fontSize:".875rem",fontWeight:600,cursor:"pointer",boxShadow:activeTab===id?`0 0 16px rgba(124,58,237,.4)`:"none",transition:"all .2s"}}>{label}</button>
        ))}
      </div>

      {activeTab==="team"&&(
        <>
          <Card style={{padding:"2rem",marginBottom:"1.5rem"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,${T.violet},${T.neon},${T.neon2})`,borderRadius:"18px 18px 0 0"}}/>
            <label style={{display:"block",fontSize:".875rem",fontWeight:700,color:T.text2,marginBottom:".6rem"}}>📝 Décris ton projet en détail</label>
            <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ex: Je veux créer une identité complète pour mon restaurant. J'ai besoin d'un logo, d'un menu design, d'une vidéo et d'un site vitrine..." style={{width:"100%",minHeight:"120px",padding:"1rem",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"12px",color:T.text,fontSize:".9rem",outline:"none",resize:"vertical",lineHeight:1.65,fontFamily:"'DM Sans',sans-serif",marginBottom:"1.25rem"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.25rem"}}>
              {[["Budget",budget,setBudget,["Non précisé","Moins de 20 000 FCFA","20 000 – 50 000 FCFA","50 000 – 100 000 FCFA","Plus de 100 000 FCFA"]],["Délai souhaité",delay,setDelay,["⚡ Express 24h (+30%)","3-7 jours","2 semaines","1 mois"]]].map(([label,val,setVal,opts])=>(
                <div key={label}>
                  <label style={{display:"block",fontSize:".78rem",fontWeight:600,color:T.text2,marginBottom:".4rem",textTransform:"uppercase",letterSpacing:".07em"}}>{label}</label>
                  <select value={val} onChange={e=>setVal(e.target.value)} style={{width:"100%",padding:".7rem 1rem",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:"10px",color:T.text,fontSize:".875rem",outline:"none"}}>
                    {opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <Btn variant="neon" size="lg" full onClick={generateTeam} disabled={loading}>{loading?<><Spinner/> Analyse en cours...</>:"🤖 Générer mon équipe →"}</Btn>
          </Card>
          {result&&(
            <Card style={{padding:"2rem",animation:"fadeUp .5s ease"}} glow>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,${T.neon2},${T.violet})`,borderRadius:"18px 18px 0 0"}}/>
              <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:"1.5rem",paddingBottom:"1rem",borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:"40px",height:"40px",borderRadius:"10px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>🤖</div>
                <div><div style={{fontFamily:T.display,fontSize:"1.05rem",fontWeight:700}}>Équipe ZindoAI générée</div><div style={{fontSize:".8rem",color:T.text2}}>{result.summary}</div></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:".75rem",marginBottom:"1.5rem"}}>
                {result.team?.map((m,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"1rem",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:"12px",padding:"1rem 1.25rem",animation:`slideIn .4s ease ${i*.1}s both`}}>
                    <div style={{width:"44px",height:"44px",borderRadius:"12px",flexShrink:0,background:`linear-gradient(135deg,${[T.violet,T.cyan,T.amber,T.neon2][i%4]},${[T.neon2,T.violet,T.violet,T.cyan][i%4]})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.1rem",color:"#fff"}}>{m.name?.[0]||"?"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,marginBottom:".15rem"}}>{m.name} <span style={{fontSize:".72rem",color:T.green}}>✓ Vérifié</span></div>
                      <div style={{fontSize:".78rem",color:T.text2}}>{m.role} · {m.country}</div>
                      <div style={{height:"3px",background:T.surface3,borderRadius:"99px",marginTop:".5rem",overflow:"hidden"}}><div style={{height:"100%",width:`${m.score}%`,background:`linear-gradient(90deg,${T.violet},${T.neon})`,borderRadius:"99px"}}/></div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontFamily:T.mono,fontSize:".72rem",color:T.green,background:"rgba(74,222,128,.1)",padding:".2rem .5rem",borderRadius:"5px",marginBottom:".3rem"}}>{m.score}%</div>
                      <div style={{fontFamily:T.display,fontWeight:700,color:T.neon}}>{(m.price||0).toLocaleString()} FCFA</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",background:"rgba(124,58,237,.08)",border:`1px solid rgba(124,58,237,.2)`,borderRadius:"14px",padding:"1.25rem",marginBottom:"1.25rem"}}>
                {[["💰 Total estimé",`${(result.total||0).toLocaleString()} FCFA`,T.neon],["⏱ Délai",result.delay||delay,T.cyan],["🔒 Paiement","Escrow ZindoGigs",T.green]].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{fontFamily:T.display,fontSize:"1.1rem",fontWeight:700,color:c}}>{v}</div><div style={{fontSize:".72rem",color:T.text3,marginTop:".2rem"}}>{l}</div></div>
                ))}
              </div>
              {result.tips&&<div style={{background:"rgba(34,211,238,.06)",border:`1px solid rgba(34,211,238,.2)`,borderRadius:"10px",padding:".75rem 1rem",fontSize:".82rem",color:T.cyan,marginBottom:"1.25rem"}}>💡 <strong>Conseil ZindoAI :</strong> {result.tips}</div>}
              <div style={{display:"flex",gap:".75rem"}}>
                <Btn variant="primary" size="lg" style={{flex:1}} onClick={()=>showToast("Équipe validée ! Les prestataires ont été notifiés. 🚀","success")}>✅ Valider cette équipe</Btn>
                <Btn variant="ghost" onClick={generateTeam}>🔄 Regénérer</Btn>
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab==="chat"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"1rem 1.5rem",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:".75rem"}}>
            <div style={{width:"36px",height:"36px",borderRadius:"10px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>🤖</div>
            <div><div style={{fontFamily:T.display,fontWeight:700,fontSize:".95rem"}}>ZindoAI Support</div><div style={{fontSize:".72rem",color:T.green}}>● En ligne — Propulsé par Claude</div></div>
          </div>
          <div style={{height:"380px",overflowY:"auto",padding:"1.25rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
            {chatHistory.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"75%",padding:".85rem 1.1rem",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?`linear-gradient(135deg,${T.violet},${T.violet2})`:T.surface2,border:m.role!=="user"?`1px solid ${T.border}`:"none",fontSize:".875rem",lineHeight:1.65,color:T.text}}>{m.content}</div>
              </div>
            ))}
            {chatLoading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:".85rem 1.1rem",borderRadius:"16px 16px 16px 4px",background:T.surface2,border:`1px solid ${T.border}`,display:"flex",gap:".4rem"}}>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:T.violet2,animation:`pulse 1.2s ease ${i*.2}s infinite`}}/>)}</div></div>}
            <div ref={chatEnd}/>
          </div>
          <div style={{padding:"1rem 1.25rem",borderTop:`1px solid ${T.border}`,display:"flex",gap:".6rem"}}>
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Pose ta question à ZindoAI..." style={{flex:1,padding:".75rem 1rem",background:T.surface2,border:`1px solid ${T.border2}`,borderRadius:"10px",color:T.text,fontSize:".875rem",outline:"none"}}/>
            <Btn variant="primary" onClick={sendChat} disabled={chatLoading}>{chatLoading?<Spinner/>:"→"}</Btn>
          </div>
        </Card>
      )}
    </div>
  );
};

const ServicesPage=({setPage})=>{
  const DEMO=[
    {id:1,title:"Logo professionnel + Charte graphique",price_fcfa:8000,rating:5,total_reviews:284,init:"K",color:T.violet,flag:"🇨🇲",seller:"Kevin_Design",thumb:"🎨",bg:"#1a0a2e"},
    {id:2,title:"Montage vidéo cinématique & Reels",price_fcfa:12000,rating:5,total_reviews:142,init:"M",color:T.cyan,flag:"🇸🇳",seller:"Marc_Films",thumb:"🎬",bg:"#0a1628"},
    {id:3,title:"Site web React + E-commerce complet",price_fcfa:35000,rating:4,total_reviews:67,init:"S",color:T.green,flag:"🇨🇮",seller:"Sandra_Dev",thumb:"💻",bg:"#0a1f12"},
    {id:4,title:"Affiche événementielle + Flyer",price_fcfa:3500,rating:5,total_reviews:321,init:"F",color:T.neon2,flag:"🇸🇳",seller:"Fatou_Design",thumb:"🖼️",bg:"#200a28"},
    {id:5,title:"Gestion réseaux sociaux 30 posts/mois",price_fcfa:25000,rating:5,total_reviews:193,init:"A",color:T.amber,flag:"🇲🇱",seller:"Alain_Créa",thumb:"📱",bg:"#1f1200"},
    {id:6,title:"Jingle radio, podcast, générique vidéo",price_fcfa:7000,rating:4,total_reviews:44,init:"D",color:"#818cf8",flag:"🇨🇲",seller:"DJ_Prod254",thumb:"🎵",bg:"#0f0a1f"},
  ];
  const [services,setServices]=useState(DEMO);
  const [dbLoading,setDbLoading]=useState(true);
  useEffect(()=>{
    sb.from("services").select("*,profiles(full_name,country,rating)").then(d=>{if(Array.isArray(d)&&d.length)setServices(d);}).catch(()=>{}).finally(()=>setDbLoading(false));
  },[]);
  return (
    <div style={{padding:"7rem 2.5rem 4rem",maxWidth:"1200px",margin:"0 auto",animation:"fadeUp .4s ease"}}>
      <Tag>Marketplace</Tag>
      <H2 style={{marginBottom:".5rem"}}>Services Freelances</H2>
      <p style={{color:T.text2,marginBottom:"2.5rem"}}>3 200+ prestataires vérifiés à travers l'Afrique</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:"1.25rem"}}>
        {services.map((s,i)=>{
          const[h,setH]=useState(false);
          const isDemo=!s.seller_id;
          return (
            <div key={s.id||i} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:T.surface,border:`1px solid ${h?"rgba(124,58,237,.35)":T.border}`,borderRadius:"18px",overflow:"hidden",transition:"all .3s",transform:h?"translateY(-5px)":"none",boxShadow:h?"0 20px 60px rgba(0,0,0,.45)":"none",cursor:"pointer"}}>
              <div style={{height:"150px",background:isDemo?s.bg:T.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3.5rem",position:"relative"}}>
                {isDemo?s.thumb:"🛠️"}
                <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,rgba(124,58,237,.12),transparent)"}}/>
              </div>
              <div style={{padding:"1.25rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".6rem"}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"50%",background:isDemo?s.color:T.violet,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",fontWeight:800,color:"#fff"}}>{isDemo?s.init:(s.profiles?.full_name?.[0]||"?")}</div>
                  <span style={{fontSize:".82rem",fontWeight:600}}>{isDemo?s.seller:(s.profiles?.full_name||"Prestataire")}</span>
                  <span style={{fontSize:".7rem",color:T.green}}>✓ Vérifié</span>
                  <span style={{fontSize:".8rem",marginLeft:"auto"}}>{isDemo?s.flag:"🌍"}</span>
                </div>
                <div style={{fontFamily:T.display,fontSize:".95rem",fontWeight:700,marginBottom:".6rem",lineHeight:1.3}}>{s.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:".3rem",fontSize:".78rem",color:T.amber,marginBottom:"1rem"}}>{"★".repeat(Math.round(s.rating||5))}{"☆".repeat(5-Math.round(s.rating||5))}<span style={{color:T.text3}}>({s.total_reviews||0} avis)</span></div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:".72rem",color:T.text3}}>À partir de</span><span style={{fontFamily:T.display,fontSize:"1.1rem",fontWeight:800,color:T.neon}}>{(s.price_fcfa||0).toLocaleString()} FCFA</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AbosPage=({showToast})=>{
  const DEMO=[
    {id:1,icon:"🎬",name:"Netflix Premium 4K",description:"Ultra HD · 4 écrans · Téléchargements",price_fcfa:4500,original_price_fcfa:7000,badge:"hot"},
    {id:2,icon:"🎵",name:"Spotify Premium",description:"Musique illimitée · HiFi · Hors ligne",price_fcfa:2000,original_price_fcfa:3500,badge:"new"},
    {id:3,icon:"🤖",name:"ChatGPT Plus",description:"GPT-4o · DALL·E · Accès prioritaire",price_fcfa:9500,original_price_fcfa:13000,badge:"hot"},
    {id:4,icon:"🎨",name:"Adobe Creative Cloud",description:"Photoshop · Premiere · +20 apps",price_fcfa:18000,original_price_fcfa:28000,badge:"promo"},
    {id:5,icon:"🖌️",name:"Canva Pro",description:"100M+ assets · Magic AI · Brand Kit",price_fcfa:3500,original_price_fcfa:5500,badge:null},
    {id:6,icon:"✨",name:"Claude Pro",description:"200K contexte · Modèles Anthropic premium",price_fcfa:9000,original_price_fcfa:12000,badge:null},
    {id:7,icon:"📺",name:"Disney+",description:"Marvel · Star Wars · Pixar · Full HD",price_fcfa:3200,original_price_fcfa:5000,badge:null},
    {id:8,icon:"🔐",name:"NordVPN Premium",description:"60+ pays · 6 appareils · Aucun log",price_fcfa:2800,original_price_fcfa:4200,badge:null},
  ];
  const [abos,setAbos]=useState(DEMO);
  const [payModal,setPayModal]=useState(null);
  const [payMethod,setPayMethod]=useState("mtn");
  useEffect(()=>{sb.from("subscriptions_store").select("*").then(d=>{if(Array.isArray(d)&&d.length)setAbos(d);}).catch(()=>{});} ,[]);
  const badgeColors={hot:["rgba(239,68,68,.12)","#f87171","rgba(239,68,68,.3)"],new:["rgba(74,222,128,.12)",T.green,"rgba(74,222,128,.3)"],promo:["rgba(251,191,36,.12)",T.amber,"rgba(251,191,36,.3)"]};
  const payMethods=[["mtn","📱","MTN Mobile Money","Cameroun, Ghana, Rwanda..."],["orange","🟠","Orange Money","Sénégal, Mali, Burkina..."],["wave","🌊","Wave","Sénégal, Côte d'Ivoire"],["visa","💳","Carte Visa / Mastercard","International · SSL"]];
  return (
    <div style={{padding:"7rem 2.5rem 4rem",maxWidth:"1200px",margin:"0 auto",animation:"fadeUp .4s ease"}}>
      <Tag>Boutique Digitale</Tag>
      <H2 style={{marginBottom:".5rem"}}>Abonnements Premium</H2>
      <p style={{color:T.text2,marginBottom:"2.5rem"}}>Netflix, ChatGPT, Spotify et plus — aux meilleurs prix en Afrique</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"1.25rem"}}>
        {abos.map(a=>{
          const[h,setH]=useState(false);
          const bc=badgeColors[a.badge];
          return (
            <div key={a.id} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:T.surface,border:`1px solid ${h?"rgba(124,58,237,.35)":T.border}`,borderRadius:"18px",padding:"1.5rem",transition:"all .3s",transform:h?"translateY(-4px)":"none",position:"relative",boxShadow:h?"0 20px 60px rgba(0,0,0,.4)":"none"}}>
              {a.badge&&bc&&<div style={{position:"absolute",top:".8rem",right:".8rem",fontSize:".65rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",padding:".2rem .55rem",borderRadius:"6px",background:bc[0],color:bc[1],border:`1px solid ${bc[2]}`}}>{a.badge==="hot"?"🔥 Top":a.badge==="new"?"✨ Nouveau":"🏷️ -35%"}</div>}
              <div style={{fontSize:"2.2rem",marginBottom:".85rem"}}>{a.icon}</div>
              <div style={{fontFamily:T.display,fontWeight:700,fontSize:"1rem",marginBottom:".3rem"}}>{a.name}</div>
              <div style={{fontSize:".78rem",color:T.text3,lineHeight:1.5,marginBottom:"1rem"}}>{a.description}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:".4rem",marginBottom:".3rem"}}><span style={{fontFamily:T.display,fontSize:"1.5rem",fontWeight:800,color:T.neon}}>{(a.price_fcfa||0).toLocaleString()}</span><span style={{fontSize:".75rem",color:T.text3}}>FCFA/mois</span></div>
              {a.original_price_fcfa&&<div style={{fontSize:".75rem",color:T.text3,textDecoration:"line-through",marginBottom:"1rem"}}>Valeur réelle : {a.original_price_fcfa.toLocaleString()} FCFA</div>}
              <Btn variant="primary" full size="sm" onClick={()=>setPayModal(a)}>Acheter maintenant</Btn>
            </div>
          );
        })}
      </div>
      {payModal&&(
        <div onClick={e=>e.target===e.currentTarget&&setPayModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(10px)",zIndex:5000,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:"24px",padding:"2rem",width:"100%",maxWidth:"420px",position:"relative",animation:"fadeUp .3s ease"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,${T.violet},${T.neon2})`,borderRadius:"24px 24px 0 0"}}/>
            <button onClick={()=>setPayModal(null)} style={{position:"absolute",top:"1rem",right:"1rem",width:"28px",height:"28px",borderRadius:"50%",background:T.surface2,border:`1px solid ${T.border}`,color:T.text2,cursor:"pointer",fontSize:".9rem"}}>✕</button>
            <h3 style={{fontFamily:T.display,fontSize:"1.2rem",fontWeight:800,marginBottom:"1.25rem"}}>💳 Finaliser l'achat</h3>
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"12px",padding:"1rem",marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:700}}>{payModal.name}</div><div style={{fontSize:".78rem",color:T.text3}}>Accès immédiat après paiement</div></div>
              <div style={{fontFamily:T.display,fontSize:"1.2rem",fontWeight:800,color:T.neon}}>{(payModal.price_fcfa||0).toLocaleString()} FCFA</div>
            </div>
            <div style={{fontSize:".78rem",fontWeight:600,color:T.text2,marginBottom:".75rem",textTransform:"uppercase",letterSpacing:".08em"}}>Mode de paiement</div>
            <div style={{display:"flex",flexDirection:"column",gap:".6rem",marginBottom:"1.25rem"}}>
              {payMethods.map(([id,icon,name,desc])=>(
                <div key={id} onClick={()=>setPayMethod(id)} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".75rem 1rem",background:T.bg2,border:`2px solid ${payMethod===id?T.violet:T.border}`,borderRadius:"10px",cursor:"pointer",transition:"all .2s"}}>
                  <span style={{fontSize:"1.2rem"}}>{icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:".875rem",fontWeight:600}}>{name}</div><div style={{fontSize:".72rem",color:T.text3}}>{desc}</div></div>
                  <div style={{width:"18px",height:"18px",borderRadius:"50%",border:`2px solid ${payMethod===id?T.violet:T.border2}`,background:payMethod===id?T.violet:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem",color:"#fff"}}>{payMethod===id?"✓":""}</div>
                </div>
              ))}
            </div>
            <Inp label="Numéro / Référence" type="tel" placeholder="Ex: 6XX XXX XXX"/>
            <div style={{background:"rgba(74,222,128,.07)",border:`1px solid rgba(74,222,128,.2)`,borderRadius:"8px",padding:".65rem 1rem",fontSize:".78rem",color:T.green,display:"flex",gap:".5rem",marginBottom:"1rem"}}>🔒 Paiement sécurisé · ZindoEscrow™</div>
            <div style={{fontSize:".72rem",color:T.text3,textAlign:"center",marginBottom:"1rem"}}>⚡ Intégration CinetPay en cours — Contact: <a href="mailto:raouldzoda@gmail.com" style={{color:T.neon}}>raouldzoda@gmail.com</a></div>
            <Btn variant="primary" size="lg" full onClick={()=>{setPayModal(null);showToast("✅ Commande enregistrée ! Tu seras contacté sous peu.","success");}}>Confirmer {(payModal.price_fcfa||0).toLocaleString()} FCFA →</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

const PricingPage=({setPage})=>{
  const plans=[
    {name:"Gratuit",price:"0",commission:"20%",color:T.text2,popular:false,features:[["3 services max",true],["Profil basique",true],["Messagerie client",true],["Badge Vérifié",false],["Mise en avant",false],["Analytics",false]]},
    {name:"Standard",price:"2 500",commission:"15%",color:T.violet2,popular:true,features:[["10 services",true],["Badge Vérifié ✓",true],["Profil + portfolio",true],["Analytics basiques",true],["Mode Express 24h",true],["Pub sponsorisée",false]]},
    {name:"Pro",price:"5 000",commission:"10%",color:T.neon,popular:false,features:[["Services illimités",true],["Badge Pro ⭐",true],["Priorité recherche",true],["Analytics avancés",true],["Mode Express 24h",true],["Pub sponsorisée",true]]},
    {name:"Agence",price:"15 000",commission:"8%",color:T.cyan,popular:false,features:[["Services illimités",true],["Badge Agence 🏆",true],["Top position garantie",true],["Multi-membres",true],["Analytics + exports",true],["Account manager",true]]},
  ];
  return (
    <div style={{padding:"7rem 2.5rem 4rem",maxWidth:"1200px",margin:"0 auto",animation:"fadeUp .4s ease"}}>
      <div style={{textAlign:"center",marginBottom:"3.5rem"}}><Tag>Prestataires</Tag><H2 style={{marginBottom:".75rem"}}>Choisis ton plan</H2><p style={{color:T.text2}}>Commence gratuitement. Upgrade quand tu veux.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"1.25rem"}}>
        {plans.map(p=>(
          <div key={p.name} style={{background:T.surface,border:`1px solid ${p.popular?T.violet:T.border}`,borderRadius:"20px",padding:"2rem",position:"relative",overflow:"hidden",boxShadow:p.popular?`0 0 40px rgba(124,58,237,.2)`:"none"}}>
            {p.popular&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(90deg,${T.violet},${T.neon2})`,fontSize:".65rem",fontWeight:700,letterSpacing:".12em",color:"#fff",padding:".3rem 1.2rem",borderRadius:"0 0 8px 8px"}}>POPULAIRE</div>}
            <div style={{fontFamily:T.display,fontSize:"1.1rem",fontWeight:800,marginBottom:".5rem",marginTop:p.popular?".75rem":0}}>{p.name}</div>
            <div style={{fontFamily:T.display,fontSize:"2rem",fontWeight:800,color:p.color,margin:".75rem 0 .25rem"}}>{p.price} <small style={{fontSize:".8rem",color:T.text2,fontFamily:"'DM Sans',sans-serif"}}>FCFA/mois</small></div>
            <div style={{fontSize:".78rem",color:T.text3,background:"rgba(255,255,255,.04)",padding:".3rem .7rem",borderRadius:"6px",display:"inline-block",marginBottom:"1.5rem"}}>Commission : {p.commission} par vente</div>
            <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:".6rem",marginBottom:"1.75rem"}}>
              {p.features.map(([f,ok])=><li key={f} style={{fontSize:".83rem",color:ok?T.text2:T.text3,display:"flex",gap:".5rem"}}><span style={{color:ok?T.green:T.text3,fontWeight:700}}>{ok?"✓":"×"}</span>{f}</li>)}
            </ul>
            <Btn variant={p.popular?"primary":p.name==="Pro"?"neon":"outline"} full onClick={()=>setPage("captcha")}>{p.price==="0"?"Commencer gratuitement":`Choisir ${p.name}`}</Btn>
          </div>
        ))}
      </div>
      <div style={{textAlign:"center",marginTop:"2.5rem",padding:"1.75rem",background:T.surface,border:`1px solid ${T.border}`,borderRadius:"16px",maxWidth:"600px",margin:"2.5rem auto 0"}}>
        <div style={{fontSize:"1.3rem",marginBottom:".5rem"}}>🔒 Argent toujours protégé</div>
        <p style={{color:T.text2,fontSize:".875rem",lineHeight:1.7}}>Tous les paiements passent par <strong style={{color:T.text}}>ZindoEscrow™</strong>. Client paie → sécurisé → tu livres → validé → tu reçois.</p>
        <p style={{color:T.text3,fontSize:".78rem",marginTop:".75rem"}}>Support : <a href="mailto:raouldzoda@gmail.com" style={{color:T.neon}}>raouldzoda@gmail.com</a></p>
      </div>
    </div>
  );
};

const Sidebar=({links,role,setPage})=>{
  const [active,setActive]=useState(links[0]?.items[0]?.label);
  return (
    <div style={{width:"240px",background:T.surface,borderRight:`1px solid ${T.border}`,padding:"1.5rem",position:"sticky",top:0,height:"100vh",overflowY:"auto",flexShrink:0}}>
      <div style={{fontFamily:T.display,fontWeight:800,fontSize:"1.1rem",display:"flex",alignItems:"center",gap:".5rem",marginBottom:"1.5rem",paddingBottom:"1.25rem",borderBottom:`1px solid ${T.border}`}}>
        <div style={{width:"26px",height:"26px",borderRadius:"7px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:".8rem"}}>Z</div>
        Zindo<span style={{color:T.neon}}>Gigs</span>
      </div>
      {role&&<div style={{background:"rgba(124,58,237,.1)",border:`1px solid rgba(124,58,237,.2)`,borderRadius:"8px",padding:".5rem .75rem",fontSize:".72rem",fontWeight:700,color:T.neon,marginBottom:"1.25rem"}}>{role}</div>}
      {links.map(g=>(
        <div key={g.title} style={{marginBottom:"1.5rem"}}>
          <div style={{fontSize:".65rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:T.text3,marginBottom:".5rem",padding:"0 .5rem"}}>{g.title}</div>
          {g.items.map(item=>(
            <button key={item.label} onClick={()=>item.action?item.action():setActive(item.label)} style={{display:"flex",alignItems:"center",gap:".65rem",padding:".6rem .75rem",borderRadius:"8px",border:"none",width:"100%",background:active===item.label?"rgba(124,58,237,.12)":"transparent",color:active===item.label?T.neon:T.text2,fontSize:".875rem",fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",marginBottom:".1rem",textAlign:"left",transition:"all .2s"}}>
              <span>{item.icon}</span><span style={{flex:1}}>{item.label}</span>
              {item.badge&&<span style={{background:T.violet,color:"#fff",fontSize:".65rem",fontWeight:700,padding:".1rem .45rem",borderRadius:"99px"}}>{item.badge}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

const DashboardClient=({setPage})=>{
  const {profile,signOut}=useAuth();
  const orders=[{service:"Logo + Charte graphique",seller:"Kevin_Design",amount:18000,delay:"3j",status:"progress"},{service:"Montage Reels ×5",seller:"Marc_Films",amount:25000,delay:"2j",status:"wait"},{service:"Netflix Premium 4K",seller:"ZindoGigs",amount:4500,delay:"Immédiat",status:"done"}];
  const statusMap={done:["Livré ✓","green"],progress:["En cours","violet"],wait:["En attente","amber"],issue:["Litige","red"]};
  const statusColors={green:T.green,violet:T.violet2,amber:T.amber,red:T.red};
  const statusBg={green:"rgba(74,222,128,.1)",violet:"rgba(124,58,237,.1)",amber:"rgba(251,191,36,.1)",red:"rgba(248,113,113,.1)"};
  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar role="👤 Espace Client" links={[
        {title:"Principal",items:[{icon:"📊",label:"Dashboard"},{icon:"🤖",label:"IA Équipe",badge:"NEW",action:()=>setPage("ai")},{icon:"🔍",label:"Explorer",action:()=>setPage("services")},{icon:"🎬",label:"Abonnements",action:()=>setPage("abonnements")}]},
        {title:"Commandes",items:[{icon:"📦",label:"En cours",badge:"3"},{icon:"✅",label:"Terminées"},{icon:"⚠️",label:"Litiges"}]},
        {title:"Compte",items:[{icon:"👤",label:"Mon profil"},{icon:"💳",label:"Paiements"},{icon:"🔔",label:"Notifications",badge:"5"},{icon:"🚪",label:"Déconnexion",action:signOut}]},
      ]} setPage={setPage}/>
      <div style={{flex:1,background:T.bg2,padding:"2rem",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
          <div style={{fontFamily:T.display,fontSize:"1.5rem",fontWeight:800}}>Bonjour, <span style={{color:T.neon}}>{profile?.full_name?.split(" ")[0]||"Jean"} 👋</span></div>
          <div style={{display:"flex",gap:".75rem"}}><Btn variant="ghost" size="sm">🔔</Btn><Btn variant="neon" size="sm" onClick={()=>setPage("ai")}>🤖 Nouvelle équipe IA</Btn></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem"}}>
          <KPI label="Commandes actives" value="3" sub="↑ 1 cette semaine" color={T.violet2} accent={`linear-gradient(90deg,${T.violet},${T.neon2})`}/>
          <KPI label="Total dépensé (FCFA)" value="127 500" sub="Ce mois" accent={T.cyan}/>
          <KPI label="Commandes terminées" value="18" sub="98% satisfaction" color={T.green} accent={T.green}/>
          <KPI label="Abonnements actifs" value="2" sub="Netflix + ChatGPT" color={T.amber} accent={T.amber}/>
        </div>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"14px",overflow:"hidden"}}>
          <div style={{padding:"1rem 1.5rem",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:T.display,fontWeight:700}}>📦 Commandes récentes</div>
            <Btn variant="ghost" size="sm">Voir tout</Btn>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Service","Prestataire","Montant","Délai","Statut","Action"].map(h=><th key={h} style={{padding:".75rem 1rem",textAlign:"left",fontSize:".72rem",textTransform:"uppercase",letterSpacing:".08em",color:T.text3,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{orders.map((o,i)=>{const[label,color]=statusMap[o.status];return(
              <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:".9rem 1rem",fontSize:".85rem",fontWeight:600}}>{o.service}</td>
                <td style={{padding:".9rem 1rem",fontSize:".85rem",color:T.text2}}>{o.seller}</td>
                <td style={{padding:".9rem 1rem",fontSize:".85rem",fontFamily:T.mono}}>{(o.amount||0).toLocaleString()} FCFA</td>
                <td style={{padding:".9rem 1rem",fontSize:".85rem",color:T.text2}}>{o.delay}</td>
                <td style={{padding:".9rem 1rem"}}><span style={{padding:".25rem .7rem",borderRadius:"6px",fontSize:".72rem",fontWeight:600,background:statusBg[color],color:statusColors[color]}}>{label}</span></td>
                <td style={{padding:".9rem 1rem"}}><Btn variant="ghost" size="sm">Voir</Btn></td>
              </tr>
            );})}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardAdmin=({setPage})=>{
  const {signOut}=useAuth();
  const users=[{init:"J",name:"Jean Dupont",detail:"🇨🇲 Client · il y a 5 min",color:T.violet,status:"active"},{init:"F",name:"Fatou Diallo",detail:"🇸🇳 Prestataire · En attente",color:T.neon2,status:"pending"},{init:"K",name:"Kofi Mensah",detail:"🇨🇮 Client · il y a 1h",color:T.cyan,status:"active"},{init:"A",name:"Amadou Bah",detail:"🇬🇳 Prestataire · En attente",color:T.green,status:"pending"}];
  const bars=[45,60,40,80,65,90,75];
  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <Sidebar role="⚙️ MODE ADMINISTRATEUR" links={[
        {title:"Vue globale",items:[{icon:"📊",label:"Dashboard"},{icon:"👥",label:"Utilisateurs",badge:"12"},{icon:"🎨",label:"Prestataires",badge:"3"},{icon:"📦",label:"Commandes"}]},
        {title:"Finance",items:[{icon:"💰",label:"Revenus & Com."},{icon:"💳",label:"Paiements"},{icon:"📤",label:"Retraits"}]},
        {title:"Plateforme",items:[{icon:"🛒",label:"Abonnements"},{icon:"📢",label:"Publicités"},{icon:"⚠️",label:"Litiges",badge:"2"},{icon:"⚙️",label:"Configuration"},{icon:"🚪",label:"Déconnexion",action:signOut}]},
      ]} setPage={setPage}/>
      <div style={{flex:1,background:T.bg2,padding:"2rem",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem"}}>
          <div style={{fontFamily:T.display,fontSize:"1.5rem",fontWeight:800}}>Admin ZindoGigs — <span style={{color:T.neon}}>Contrôle Total 🛡️</span></div>
          <div style={{display:"flex",gap:".75rem"}}><Btn variant="ghost" size="sm">📊 Exporter</Btn><Btn variant="primary" size="sm">+ Ajouter abonnement</Btn></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"2rem"}}>
          <KPI label="Revenus ce mois (FCFA)" value="847 500" sub="↑ +34%" color={T.violet2} accent={`linear-gradient(90deg,${T.violet},${T.neon2})`}/>
          <KPI label="Commandes ce mois" value="312" sub="↑ +18%" color={T.cyan} accent={T.cyan}/>
          <KPI label="Utilisateurs totaux" value="4 821" sub="↑ +127 cette semaine" color={T.green} accent={T.green}/>
          <KPI label="Prestataires actifs" value="203" sub="3 en attente" color={T.amber} accent={T.amber}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem",marginBottom:"1.25rem"}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"14px",overflow:"hidden"}}>
            <div style={{padding:"1rem 1.25rem",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:T.display,fontWeight:700,fontSize:".9rem"}}>👥 Nouveaux utilisateurs</div>
              <Btn variant="ghost" size="sm">Voir tous</Btn>
            </div>
            <div style={{padding:"1rem 1.25rem"}}>
              {users.map((u,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".65rem 0",borderBottom:i<users.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{width:"36px",height:"36px",borderRadius:"10px",background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:".875rem",color:"#fff",flexShrink:0}}>{u.init}</div>
                  <div style={{flex:1}}><div style={{fontSize:".85rem",fontWeight:600}}>{u.name}</div><div style={{fontSize:".72rem",color:T.text3}}>{u.detail}</div></div>
                  <div style={{display:"flex",gap:".35rem"}}>
                    {u.status==="pending"?<>
                      <button style={{padding:".2rem .55rem",borderRadius:"5px",fontSize:".7rem",fontWeight:600,cursor:"pointer",background:"transparent",fontFamily:"'DM Sans',sans-serif",color:T.green,border:`1px solid rgba(74,222,128,.3)`}}>Approuver</button>
                      <button style={{padding:".2rem .55rem",borderRadius:"5px",fontSize:".7rem",fontWeight:600,cursor:"pointer",background:"transparent",fontFamily:"'DM Sans',sans-serif",color:T.red,border:`1px solid rgba(248,113,113,.3)`}}>Rejeter</button>
                    </>:<>
                      <button style={{padding:".2rem .55rem",borderRadius:"5px",fontSize:".7rem",fontWeight:600,cursor:"pointer",background:"transparent",fontFamily:"'DM Sans',sans-serif",color:T.text2,border:`1px solid ${T.border2}`}}>Voir</button>
                      <button style={{padding:".2rem .55rem",borderRadius:"5px",fontSize:".7rem",fontWeight:600,cursor:"pointer",background:"transparent",fontFamily:"'DM Sans',sans-serif",color:T.amber,border:`1px solid rgba(251,191,36,.3)`}}>Susp.</button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"14px",overflow:"hidden"}}>
            <div style={{padding:"1rem 1.25rem",borderBottom:`1px solid ${T.border}`}}><div style={{fontFamily:T.display,fontWeight:700,fontSize:".9rem"}}>📈 Revenus — 7 derniers jours</div></div>
            <div style={{padding:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"flex-end",gap:".4rem",height:"90px",marginBottom:".5rem"}}>
                {bars.map((h,i)=><div key={i} style={{flex:1,height:`${h}%`,borderRadius:"4px 4px 0 0",background:i===6?`linear-gradient(180deg,${T.neon2},${T.violet})`:`linear-gradient(180deg,${T.violet},rgba(124,58,237,.25))`,cursor:"pointer"}}/>)}
              </div>
              <div style={{display:"flex",gap:".4rem"}}>{["Lun","Mar","Mer","Jeu","Ven","Sam","Auj"].map(d=><div key={d} style={{flex:1,textAlign:"center",fontSize:".65rem",color:T.text3}}>{d}</div>)}</div>
              <div style={{marginTop:"1rem"}}>
                {[["💰 Commissions","127 125 FCFA",T.green],["🛒 Abonnements","342 000 FCFA",T.cyan],["⭐ Plans vendeurs","47 500 FCFA",T.amber]].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:".78rem",padding:".35rem 0",borderBottom:`1px solid ${T.border}`}}><span style={{color:T.text2}}>{l}</span><span style={{fontWeight:700,color:c}}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:"14px",overflow:"hidden"}}>
          <div style={{padding:"1rem 1.5rem",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:T.display,fontWeight:700}}>⚠️ Litiges à arbitrer</div>
            <Btn variant="ghost" size="sm">Voir tous</Btn>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Commande","Client","Prestataire","Montant","Problème","Action"].map(h=><th key={h} style={{padding:".75rem 1rem",textAlign:"left",fontSize:".72rem",textTransform:"uppercase",letterSpacing:".08em",color:T.text3,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
            <tbody>
              {[["#ZG-4821","Marie K. 🇨🇲","AlexDev","45 000","Livraison non conforme"],["#ZG-4756","Paul T. 🇸🇳","DesignPro_CI","12 000","Délai dépassé"]].map(([id,client,seller,amount,issue],i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:".9rem 1rem",fontSize:".85rem",fontFamily:T.mono,color:T.violet2}}>{id}</td>
                  <td style={{padding:".9rem 1rem",fontSize:".85rem"}}>{client}</td>
                  <td style={{padding:".9rem 1rem",fontSize:".85rem"}}>{seller}</td>
                  <td style={{padding:".9rem 1rem",fontSize:".85rem",fontFamily:T.mono}}>{amount} FCFA</td>
                  <td style={{padding:".9rem 1rem"}}><span style={{padding:".25rem .7rem",borderRadius:"6px",fontSize:".72rem",fontWeight:600,background:"rgba(248,113,113,.1)",color:T.red}}>{issue}</span></td>
                  <td style={{padding:".9rem 1rem"}}><Btn variant="primary" size="sm">Arbitrer</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Footer=({setPage})=>(
  <footer style={{background:T.surface,borderTop:`1px solid ${T.border}`,padding:"3rem 2.5rem 2rem"}}>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"2rem",maxWidth:"1200px",margin:"0 auto 2rem"}}>
      <div>
        <div style={{fontFamily:T.display,fontWeight:800,fontSize:"1.3rem",display:"flex",alignItems:"center",gap:".5rem",marginBottom:"1rem"}}>
          <div style={{width:"28px",height:"28px",borderRadius:"7px",background:`linear-gradient(135deg,${T.violet},${T.neon2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>Z</div>
          Zindo<span style={{color:T.neon}}>Gigs</span>
        </div>
        <p style={{color:T.text2,fontSize:".85rem",lineHeight:1.7,maxWidth:"280px",marginBottom:"1rem"}}>La marketplace digitale africaine tout-en-un. Services créatifs, abonnements premium et IA.</p>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",marginBottom:"1rem"}}>
          {["🇨🇲","🇸🇳","🇨🇮","🇲🇱","🇧🇫","🇬🇳","🇨🇬","🇬🇦"].map(f=><div key={f} style={{width:"26px",height:"26px",borderRadius:"50%",background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".85rem"}}>{f}</div>)}
        </div>
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",marginBottom:".75rem"}}>
          {[["📘","Facebook","https://facebook.com/zindogigs"],["📸","Instagram","https://instagram.com/zindogigs"],["♪","TikTok","https://tiktok.com/@zindogigs"],["▶","YouTube","https://youtube.com/@zindogigs"]].map(([icon,name,url])=>(
            <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:".3rem",fontSize:".72rem",color:T.text3,padding:".3rem .6rem",borderRadius:"6px",background:T.surface2,border:`1px solid ${T.border}`,textDecoration:"none"}}>{icon} {name}</a>
          ))}
        </div>
        <p style={{color:T.text3,fontSize:".75rem"}}>📧 <a href="mailto:raouldzoda@gmail.com" style={{color:T.neon}}>raouldzoda@gmail.com</a></p>
      </div>
      {[["Plateforme",[["Services","services"],["Abonnements","abonnements"],["IA Team","ai"],["Tarifs","pricing"]]],
        ["Entreprise",[["À propos","home"],["Blog","home"],["Presse","home"],["Carrières","home"]]],
        ["Support",[["Centre d'aide","home"],["CGU","home"],["Confidentialité","home"],["Contact","home"]]]].map(([title,links])=>(
        <div key={title}>
          <h5 style={{fontFamily:T.display,fontSize:".9rem",fontWeight:700,marginBottom:"1rem"}}>{title}</h5>
          {links.map(([label,page])=><div key={label} onClick={()=>setPage(page)} style={{color:T.text3,fontSize:".83rem",marginBottom:".5rem",cursor:"pointer"}} onMouseEnter={e=>e.target.style.color=T.text} onMouseLeave={e=>e.target.style.color=T.text3}>{label}</div>)}
        </div>
      ))}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"1.5rem",borderTop:`1px solid ${T.border}`,maxWidth:"1200px",margin:"0 auto",fontSize:".8rem",color:T.text3}}>
      <div>© 2026 ZindoGigs. Tous droits réservés. Made in Africa 🌍</div>
      <div style={{display:"flex",gap:".75rem"}}>{["FR","EN","AR"].map((l,i)=><span key={l} style={{cursor:"pointer",color:i===0?T.neon:T.text3}}>{l}</span>)}</div>
    </div>
  </footer>
);

export default function App(){
  const [page,setPage]=useState("home");
  const [toast,setToast]=useState({msg:"",type:"success",visible:false});
  const showNavPages=["home","services","abonnements","ai","pricing"];
  const showToast=useCallback((msg,type="success")=>{
    setToast({msg,type,visible:true});
    setTimeout(()=>setToast(t=>({...t,visible:false})),4000);
  },[]);
  const navigate=useCallback((p)=>{setPage(p);window.scrollTo(0,0);},[]);
  const pages={
    home:<HomePage setPage={navigate}/>,
    captcha:<CaptchaPage setPage={navigate} showToast={showToast}/>,
    register:<AuthPage mode="register" setPage={navigate} showToast={showToast}/>,
    login:<AuthPage mode="login" setPage={navigate} showToast={showToast}/>,
    services:<ServicesPage setPage={navigate}/>,
    abonnements:<AbosPage showToast={showToast}/>,
    ai:<AIPage setPage={navigate} showToast={showToast}/>,
    pricing:<PricingPage setPage={navigate}/>,
    "dashboard-client":<DashboardClient setPage={navigate}/>,
    "dashboard-seller":<div style={{padding:"7rem 2rem",textAlign:"center"}}><div style={{fontFamily:T.display,fontSize:"1.5rem",fontWeight:800,marginBottom:"1rem"}}>🎨 Dashboard Prestataire</div><p style={{color:T.text2,marginBottom:"2rem"}}>Bientôt disponible — en cours de développement</p><Btn variant="primary" onClick={()=>navigate("home")}>← Retour accueil</Btn></div>,
    "dashboard-admin":<DashboardAdmin setPage={navigate}/>,
  };
  return (
    <AuthProvider>
      <style>{CSS}</style>
      {showNavPages.includes(page)&&<Nav page={page} setPage={navigate}/>}
      <div key={page} style={{animation:"fadeIn .35s ease"}}>{pages[page]||<HomePage setPage={navigate}/>}</div>
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible}/>
    </AuthProvider>
  );
}
