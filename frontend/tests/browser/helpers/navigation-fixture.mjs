/** Deterministic in-browser API: no database, real account or external service is touched. */
export function installNavigationFixture() {
  const originalFetch = window.fetch.bind(window);
  const role = sessionStorage.getItem('navigation-fixture-role') ?? 'anonymous';
  const permissions = ['opportunities.read','opportunities.create','opportunities.update','opportunities.status.update','opportunities.archive','organizations.read','organizations.create','organizations.update','categories.read','categories.create','categories.update','users.read','users.create','users.update','candidates.read','candidates.create','administrators.create','applications.read.any','applications.select','applications.resume.read.any','applications.read.own','applications.create.own','applications.update.own','notifications.read.own','notifications.update.own','saved-opportunities.read.own','saved-opportunities.update.own','profile.read.own','profile.update.own','statistics.read','site-settings.read','site-settings.update'];
  const session = {userId:role==='CANDIDATE'?1:2,roles:[role],permissions,user:{id:role==='CANDIDATE'?1:2,fullName:'Cuenta de prueba '+role,email:role.toLowerCase()+'@example.test',role,status:'ACTIVE',createdAt:'2026-01-01'},sessionExpiresAt:'2099-01-01',accessToken:'fixture-access',tokenType:'Bearer',expiresIn:3600};
  const profile = {email:'candidate@example.test',firstName:'Ana',lastName:'Prueba',phone:'71234567',birthDate:'1998-01-01',sex:'FEMALE',department:'San Salvador',municipality:'San Salvador',profession:'Profesional',educationLevel:'Universidad',professionalSummary:'',workExperiences:[],educations:[],skills:[]};
  const zones=[{name:'Central',departments:[{name:'San Salvador',municipalities:['San Salvador']}]}];
  const catalogs={categories:[{id:1,name:'Administración',slug:'administracion',parentId:null,description:null}],organizations:[{id:1,name:'Organización de prueba'}],employmentTypes:[{id:1,name:'Tiempo completo'}],experienceLevels:[{id:1,name:'Inicial'}],locationZones:zones};
  const opportunity=(key='job-1',kind='EMPLOYMENT')=>({key,id:Number(key.split('-')[1]),kind,title:'Oportunidad '+key,description:'Descripción para verificar navegación y persistencia de rutas.',organizationId:1,organization:{id:1,name:'Organización de prueba'},categoryId:1,category:catalogs.categories[0],department:'San Salvador',municipality:'San Salvador',modality:'ON_SITE',status:'OPEN',salaryMin:500,salaryMax:900,employmentTypeId:1,employmentType:'Tiempo completo',experienceLevelId:1,experienceLevel:'Inicial',slots:100,socialHours:80,duration:'3 meses',contactEmail:'contacto@example.test',contactPhone:null,requirements:[],responsibilities:[],benefits:[],expiresAt:'2099-12-31',archivedAt:null,publishedAt:'2026-01-01',createdAt:'2026-01-01',updatedAt:'2026-01-01'});
  const data={personal:{...profile},experience:{lastRole:'',lastOrg:'',skills:'',motivation:'Deseo contribuir a este proyecto con mi experiencia.'}};
  let draft={id:'00000000-0000-4000-8000-000000000001',opportunityKey:'volunteer-1',opportunity:opportunity('volunteer-1','VOLUNTEER'),data,professionalProfile:profile,currentStep:1,version:1,resume:null,updatedAt:'2026-01-01'};
  const application=id=>({id,userId:1,referenceNumber:'FQA-'+id,attemptNumber:1,version:1,opportunityKey:'volunteer-1',opportunity:opportunity('volunteer-1','VOLUNTEER'),data:draft.data,professionalProfile:profile,candidateName:'Ana Prueba',candidateEmail:profile.email,status:'PENDING',statusLabel:'Pendiente',resume:null,createdAt:'2026-10-01',legacy:false,history:[]});
  const organization={id:1,name:'Organización de prueba',email:'contacto@example.test',description:'Descripción',status:'ACTIVE',createdAt:'2026-01-01',updatedAt:'2026-01-01'};
  window.__navigationFixture={calls:[],failSave:false,failLogout:false,holdCv:false,releaseCv:null,expired:false};
  const state=window.__navigationFixture;
  const json=(value,status=200)=>Response.json(value,{status});
  const paginated=(items,query,total=60)=>({items,page:Number(query.get('page')??1),pageSize:Number(query.get('pageSize')??20),total});
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(!url.pathname.startsWith('/api/'))return originalFetch(input,options);
    const path=url.pathname.slice(4),method=options.method??'GET',query=url.searchParams;
    state.calls.push(method+' '+path+url.search);
    if(path==='/auth/refresh')return role==='anonymous'||state.expired?json({message:'Sesión vencida'},401):json(session);
    if(path==='/auth/me')return state.expired?json({message:'Sesión vencida'},401):json(session);
    if(path==='/auth/login'){sessionStorage.setItem('navigation-fixture-role','CANDIDATE');return json({...session,roles:['CANDIDATE'],userId:1});}
    if(path.startsWith('/auth/logout')){
      if(state.failLogout)return json({message:'Cierre de prueba fallido'},503);
      sessionStorage.setItem('navigation-fixture-role','anonymous');return new Response(null,{status:204});
    }
    if(path==='/site-settings')return json({contacto:{correo:'contacto@example.test',correoSoporte:'soporte@example.test',telefono:'',whatsapp:'',direccion:''},inicio:{titulo:'Bolsa de empleos',subtitulo:'Oportunidades',descripcion:''},institucional:{mision:'Misión',vision:'Visión'},redes:{facebook:'',instagram:'',linkedin:'',youtube:''}});
    if(path.endsWith('/opportunities/catalogs'))return json(catalogs);
    if(path==='/categories')return json(catalogs.categories);
    if(path==='/opportunities/statistics')return json({activeOpportunities:60,organizations:1,candidates:10,impactAxes:4});
    if(/^\/(admin\/)?opportunities\/(job|volunteer)-\d+$/.test(path))return json(opportunity(path.split('/').at(-1),path.includes('volunteer')?'VOLUNTEER':'EMPLOYMENT'));
    if(path==='/opportunities'||path==='/admin/opportunities'){
      const page=Number(query.get('page')??1),kind=query.get('kind')??'EMPLOYMENT';
      const key=kind==='VOLUNTEER'?'volunteer-':'job-';
      return json(paginated(Array.from({length:20},(_,i)=>opportunity(key+((page-1)*20+i+1),kind)),query));
    }
    if(path==='/profile/catalogs')return json({locationZones:zones,educationLevels:['Universidad'],sexes:[{value:'FEMALE',label:'Mujer'},{value:'MALE',label:'Hombre'},{value:'UNDISCLOSED',label:'Prefiero no indicar'}]});
    if(path==='/profile/me/resume'&&method==='PUT'){
      if(state.holdCv)await new Promise(resolve=>{state.releaseCv=resolve;});
      return json({id:9,originalName:'prueba.pdf',mimeType:'application/pdf',sizeBytes:20,createdAt:'2026-01-01'});
    }
    if(path==='/profile/me/resume')return json(null);
    if(path==='/profile/me')return json(profile);
    if(path==='/saved-opportunities/keys')return json({keys:[],total:0});
    if(path==='/saved-opportunities')return json(paginated([],query,40));
    if(path.startsWith('/saved-opportunities/'))return new Response(null,{status:204});
    if(path==='/application-drafts'&&method==='POST'){
      const key=JSON.parse(options.body).opportunityKey;draft={...draft,opportunityKey:key,opportunity:opportunity(key,key.startsWith('volunteer')?'VOLUNTEER':'EMPLOYMENT')};return json(draft);
    }
    if(path.startsWith('/application-drafts/')&&method==='PATCH'){
      if(state.failSave)return json({message:'Guardado de prueba fallido'},503);
      const update=JSON.parse(options.body);draft={...draft,...update,version:draft.version+1};return json(draft);
    }
    if(path==='/application-drafts')return json(paginated([draft],query,40));
    if(path.startsWith('/application-drafts/'))return json(draft);
    if(path==='/applications'&&method==='POST')return json(application(7));
    if(/^\/(admin\/)?applications\/\d+$/.test(path))return json(application(Number(path.split('/').at(-1))));
    if(path==='/applications'||path==='/admin/applications')return json(paginated([application(7)],query));
    if(path==='/notifications')return json({...paginated([{id:1,applicationId:7,title:'Postulación recibida',message:'Tu postulación fue recibida',readAt:null,createdAt:'2026-10-01'}],query),unreadCount:1});
    if(path.startsWith('/notifications/'))return new Response(null,{status:204});
    if(path==='/admin/organizations/1')return json(organization);
    if(path==='/admin/organizations')return json(paginated([organization],query));
    if(path==='/admin/categories')return json(paginated([{...catalogs.categories[0],isActive:true,opportunityCount:3,childCount:0}],query));
    if(path==='/admin/users')return json(paginated([],query));
    // Unrelated aggregate/worker APIs may be unavailable without affecting navigation.
    return json({message:'Recurso de prueba no disponible'},404);
  };
}
