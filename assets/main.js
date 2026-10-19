// CONFIG: replace before launch
const CONFIG = {
  phoneDisplay: "(813) 851-3676",
  phoneTel: "+18138513676",
  // FormSubmit AJAX endpoint: submissions are emailed to US@AmericanFinancialRecovery.com.
  // The first real submission triggers a one-time activation email that must be confirmed.
  formEndpoint: "https://formsubmit.co/ajax/US@AmericanFinancialRecovery.com",
  letterEndpoint: "https://formsubmit.co/ajax/US@AmericanFinancialRecovery.com"
};
const FL_COUNTIES=["Alachua","Baker","Bay","Bradford","Brevard","Broward","Calhoun","Charlotte","Citrus","Clay","Collier","Columbia","DeSoto","Dixie","Duval","Escambia","Flagler","Franklin","Gadsden","Gilchrist","Glades","Gulf","Hamilton","Hardee","Hendry","Hernando","Highlands","Hillsborough","Holmes","Indian River","Jackson","Jefferson","Lafayette","Lake","Lee","Leon","Levy","Liberty","Madison","Manatee","Marion","Martin","Miami-Dade","Monroe","Nassau","Okaloosa","Okeechobee","Orange","Osceola","Palm Beach","Pasco","Pinellas","Polk","Putnam","St. Johns","St. Lucie","Santa Rosa","Sarasota","Seminole","Sumter","Suwannee","Taylor","Union","Volusia","Wakulla","Walton","Washington"];
const I18N={
  en:{county:c=>c+" County",other:"Other / Not in Florida",earlier:"Earlier",notSure:"Not sure",
      required:"Please complete the required fields.",sending:"Sending your request…",badEmail:"Please enter a valid email address, or leave it blank.",
      okStub:"Thank you! We received your request and will contact you shortly.",
      ok:"Thank you! We'll be in touch shortly.",err:"Something went wrong. Please call us at "+CONFIG.phoneDisplay+".",
      letterStub:"Thank you! We've noted your reference code and will call you shortly. For faster help, call "+CONFIG.phoneDisplay+".",
      letterOk:"Thank you! We'll call you shortly about your letter."},
  es:{county:c=>"Condado de "+c,other:"Otro / Fuera de Florida",earlier:"Antes",notSure:"No estoy seguro",
      required:"Por favor, complete los campos obligatorios.",sending:"Enviando su solicitud…",badEmail:"Ingrese un correo electrónico válido o deje el campo vacío.",
      okStub:"¡Gracias! Recibimos su solicitud y nos comunicaremos con usted pronto.",
      ok:"¡Gracias! Nos comunicaremos con usted pronto.",err:"Ocurrió un error. Llámenos al "+CONFIG.phoneDisplay+".",
      letterStub:"¡Gracias! Anotamos su código de referencia y le llamaremos pronto. Para una atención más rápida, llame al "+CONFIG.phoneDisplay+".",
      letterOk:"¡Gracias! Le llamaremos pronto sobre su carta."}
};
const L=I18N[document.documentElement.lang]||I18N.en;

function validate(form){
  let ok=true,msg=L.required;
  form.querySelectorAll("input,select,textarea").forEach(el=>{
    if(el.name==="website")return;
    let bad=false;
    if(el.required&&!el.value.trim())bad=true;
    if(el.type==="email"&&el.value.trim()&&!/^\S+@\S+\.\S+$/.test(el.value)){bad=true;if(ok)msg=L.badEmail;}
    el.classList.toggle("invalid",bad);if(bad)ok=false;
  });
  return ok?null:msg;
}
function wire(form,endpoint,stubMsg,okMsg,kind){
  if(!form)return;
  const status=form.querySelector(".form-status");
  const show=(cls,t)=>{status.className="form-status "+cls;status.textContent=t;};
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const hp=form.querySelector('[name="website"]');
    if(hp&&hp.value){show("ok",okMsg);form.reset();return;} // honeypot: silently drop bots
    const err=validate(form); if(err){show("err",err);return;}
    const data=Object.fromEntries(new FormData(form)); delete data.website;
    const lang=document.documentElement.lang||"en";
    data.page=location.pathname; data.lang=lang; data.submitted_at=new Date().toISOString();
    data._subject=(kind==="letter"?"Letter Lookup":"New Lead: Free Case Review")+" ("+(lang==="es"?"Spanish":"English")+")"+(data.name?" - "+data.name:data.reference_code?" - "+data.reference_code:"");
    data._template="table"; data._captcha="false";
    if(data.email)data._replyto=data.email;
    const btn=form.querySelector('button[type="submit"]'); if(btn)btn.disabled=true;
    if(!endpoint){console.log("[stub] submission:",data);show("ok",stubMsg);form.reset();if(btn)btn.disabled=false;return;}
    show("pending",L.sending);
    const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),30000); // FormSubmit can be slow (10-20s)
    try{const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data),signal:ctrl.signal});
      const j=await r.json().catch(()=>({}));
      const msg=String(j.message||"");
      if(r.ok&&String(j.success)==="true"){show("ok",okMsg);form.reset();}
      else if(/activat/i.test(msg)){
        // FormSubmit returns 200 {success:"false"} until the inbox owner clicks "Activate Form".
        // Submissions made before activation are held and delivered after activation, so treat as received.
        console.warn("[FormSubmit] form awaiting activation; submission queued:",msg);
        show("ok",okMsg);form.reset();}
      else{console.error("[FormSubmit] rejected:",r.status,j);throw new Error(msg||("HTTP "+r.status));}
    }catch(e){console.error("[FormSubmit] error:",e);show("err",L.err);}
    finally{clearTimeout(timer);if(btn)btn.disabled=false;}
  });
}
document.addEventListener("DOMContentLoaded",()=>{
  const sel=document.getElementById("county");
  if(sel){FL_COUNTIES.forEach(c=>sel.add(new Option(L.county(c),c)));sel.add(new Option(L.other,"Other"));}
  const yr=document.getElementById("sale_year");
  if(yr){const now=new Date().getFullYear();for(let y=now;y>=now-15;y--)yr.add(new Option(String(y),String(y)));
    yr.add(new Option(L.earlier,"earlier"));yr.add(new Option(L.notSure,"not-sure"));}
  const y=document.getElementById("year"); if(y)y.textContent=new Date().getFullYear();
  const nav=document.querySelector(".nav"),tog=document.querySelector(".nav-toggle");
  if(nav&&tog){tog.addEventListener("click",()=>{const o=nav.classList.toggle("open");tog.setAttribute("aria-expanded",o)});
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");tog.setAttribute("aria-expanded","false")}));}
  document.querySelectorAll("a[data-phone]").forEach(a=>a.href="tel:"+CONFIG.phoneTel);
  wire(document.getElementById("lead-form"),CONFIG.formEndpoint,L.okStub,L.ok,"lead");
  wire(document.getElementById("letter-form"),CONFIG.letterEndpoint,L.letterStub,L.letterOk,"letter");
});
