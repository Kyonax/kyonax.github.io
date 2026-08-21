import{_ as Oe,u as Ye,l as Ge,M as Xe,n as We,o as _e,f as de,d as Ct,B as pe,C as he,t as He,e as $e,g as je,y as at,h as Qe}from"./app-CqDtSmZR.js";const Ke={key:0,class:"experience-brain__cap-text"},Je={__name:"experience-brain",props:{live:{type:Boolean,default:!0}},setup(ve){const Nt=ve,{t:me}=Ye(),ge=["systemization","plasticity","celerity","ingenuity"],Ae=[[.85,.45,.28],[.35,.1,.9],[-.58,-.3,-.45],[-.9,.25,-.3]],st=at(null),Vt=at(null),zt=at(null),Ot=at(null),yt=at(-1),ct=Qe(()=>ge[yt.value]??null);let G=null,it=[];return Ge(()=>{const m=window.matchMedia("(prefers-reduced-motion: reduce)").matches,R=Vt.value,k=zt.value,tt=Ot.value,t=R.getContext("webgl2",{alpha:!0,antialias:!1});if(!t){R.style.display="none";return}const Yt=t.getExtension("WEBGL_debug_renderer_info"),be=Yt?String(t.getParameter(Yt.UNMASKED_RENDERER_WEBGL)):"",xe=/swiftshader|llvmpipe|softpipe|software/i.test(be),U=Math.min(xe?1:1.5,window.devicePixelRatio||1),ye=getComputedStyle(document.documentElement),lt=(e,o)=>ye.getPropertyValue(e).trim()||o,Rt=document.createElement("canvas");Rt.width=1,Rt.height=1;const N=Rt.getContext("2d"),Gt=e=>{N.fillStyle=e,N.fillRect(0,0,1,1);const o=N.getImageData(0,0,1,1).data;return[o[0]/255,o[1]/255,o[2]/255]},A=Gt(lt("--clr-primary-100","#f9cd26"));N.fillStyle=lt("--clr-neutral-500","#0c0c0c"),N.fillRect(0,0,1,1),N.fillStyle=lt("--clr-border-100","rgba(255,255,255,0.2)"),N.fillRect(0,0,1,1);const X=Gt(lt("--clr-border-100","rgba(255,255,255,0.2)")),ut=[[.98,.02,.52],[.94,.3,.55],[.8,.52,.6],[.58,.66,.64],[.3,.74,.66],[0,.76,.68],[-.3,.7,.66],[-.58,.58,.62],[-.8,.38,.56],[-.94,.16,.48],[-.98,-.04,.42],[-.9,-.2,.38],[-.8,-.36,.4],[-.66,-.5,.38],[-.45,-.56,.34],[-.28,-.52,.26],[-.18,-.62,.13],[-.12,-.85,.1],[-.02,-.8,.1],[.02,-.5,.3],[.25,-.46,.42],[.55,-.44,.46],[.78,-.32,.48],[.92,-.16,.5]],Re=.02,Me=.04,W=256,Xt=new Float32Array(W),Wt=new Float32Array(W);for(let e=0;e<W;e++){const o=e/W*Math.PI*2-Math.PI,n=Math.cos(o),r=Math.sin(o);let s=.4,i=.4;for(let u=0;u<ut.length;u++){const f=ut[u],_=ut[(u+1)%ut.length],d=_[0]-f[0],h=_[1]-f[1],v=n*h-r*d;if(Math.abs(v)<1e-9)continue;const x=f[0]-Re,y=f[1]-Me,b=(x*h-y*d)/v,T=(x*r-y*n)/v;b>0&&T>=0&&T<=1&&b>s&&(s=b,i=f[2]+(_[2]-f[2])*T)}Xt[e]=s,Wt[e]=i}const ft=e=>{const o=Math.hypot(e[0],e[1]),n=(Math.atan2(e[1],e[0])+Math.PI)/(Math.PI*2)*W|0,r=Math.min(W-1,n),s=o/Xt[r],i=e[2]/Wt[r];return 1/Math.sqrt(s*s+i*i)},P=[-.88,-.1],_t=[-.2,-.5],Mt=(e,o)=>{const n=_t[0]-P[0],r=_t[1]-P[1],s=Math.max(0,Math.min(1,((e-P[0])*n+(o-P[1])*r)/(n*n+r*r)));return Math.hypot(e-(P[0]+n*s),o-(P[1]+r*s))},Ee=(e,o)=>e<-.18&&o<-.14&&Mt(e,o)>.02&&(o-P[1])*(_t[0]-P[0])-(e-P[0])*(_t[1]-P[1])<0,Fe=(e,o,n)=>{if(Ee(e,o))return .45+.55*Math.abs(Math.sin(30*o+4*e));const r=Math.atan2(o-.15,e);return .55+.45*Math.sin(9*r+2.2*Math.sin(3.1*r+2*n))},dt=Math.PI*(3-Math.sqrt(5)),H=[],Ht=6500;for(let e=0;e<Ht;e++){const o=1-e/(Ht-1)*2,n=Math.sqrt(Math.max(0,1-o*o)),r=[Math.cos(dt*e)*n,o,Math.sin(dt*e)*n],s=ft(r)*(.985+.03*Math.sin(e*1.7)),i=r[0]*s,u=r[1]*s,f=r[2]*s;if(Math.abs(f)<.035&&u>.3)continue;let _=Fe(i,u,f);Mt(i,u)<.035&&i<-.1&&u<0&&(_*=.2),H.push([i,u,f,_])}const Et=[];for(let e=0;e<700;e++){const o=1-e/699*2,n=Math.sqrt(Math.max(0,1-o*o)),r=[Math.cos(dt*e*7)*n,o,Math.sin(dt*e*7)*n*.45],s=ft(r)*(.25+.65*(e*.6180339887%1)),i=[r[0]*s,r[1]*s,r[2]*s];i.push(.08+.24*Math.max(0,1-Math.abs(i[2])*3)),Et.push(i)}const p=[];for(let e=0;e<H.length;e+=7)p.push(H[e]);const w=p.length,et=[],Ft=Array.from({length:w},()=>[]),wt=new Map;for(let e=0;e<w;e++){const o=[];for(let n=0;n<w;n++){if(n===e)continue;const r=p[e][0]-p[n][0],s=p[e][1]-p[n][1],i=p[e][2]-p[n][2],u=r*r+s*s+i*i;u<.055&&o.push([u,n])}o.sort((n,r)=>n[0]-r[0]);for(let n=0;n<Math.min(3,o.length);n++){const r=o[n][1],s=(p[e][0]+p[r][0])/2,i=(p[e][1]+p[r][1])/2;if(Mt(s,i)<.03&&s<-.1&&i<0||Math.abs((p[e][2]+p[r][2])/2)<.1&&i>.3)continue;const u=e<r?e*w+r:r*w+e;wt.has(u)||(wt.set(u,et.length),et.push([e,r]),Ft[e].push(r),Ft[r].push(e))}}const pt=new Float32Array(et.length),we=e=>{let o=0,n=1/0;for(let r=0;r<w;r++){const s=p[r][0]-e[0],i=p[r][1]-e[1],u=p[r][2]-e[2],f=s*s+i*i+u*u;f<n&&(n=f,o=r)}return o},Te=e=>{const o=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/o,e[1]/o,e[2]/o]},$=Ae.map(e=>{const o=Te(e),n=ft(o);return{p:[o[0]*n,o[1]*n,o[2]*n],pop:0}}),j=()=>Math.random()*w|0,ht=[];for(let e=0;e<6;e++)ht.push({at:j(),to:-1,prev:-1,t:-(e*.35),speed:2.6+e%3*.5,wp:null});const S=[],$t=p[we([.1,.55,0])];let jt=1.15;const Qt=(e,o)=>{const n=e[0]-o[0],r=e[1]-o[1],s=e[2]-o[2];return n*n+r*r+s*s},Kt=(e,o)=>{const n=e||p[j()];S.push({c:n,t0:o,life:1.5+Math.random()*.9,env:0})};for(const e of $){const o=[];for(let n=0;n<w;n++)Qt(p[n],e.p)<.0064&&o.push(n);e.sub=o.length?p[o[Math.random()*o.length|0]]:e.p}const Se=(e,o)=>{const n=new Float32Array(9);for(let r=0;r<3;r++)for(let s=0;s<3;s++)n[r*3+s]=e[s]*o[r*3]+e[3+s]*o[r*3+1]+e[6+s]*o[r*3+2];return n},c={ready:!1},Tt=(e,o,n,r,s)=>{const i=new Float32Array(e.length*7);for(let u=0;u<e.length;u++){const f=u*7;i[f]=e[u][0],i[f+1]=e[u][1],i[f+2]=e[u][2],i[f+3]=o,i[f+4]=n(e[u],u),i[f+5]=r,i[f+6]=s(u)}return i},Pe=Tt(H,1.7,e=>1*e[3],0,e=>e/H.length),De=Tt(Et,1.3,e=>2.2*e[3],.5,()=>0),Be=Tt(p,2.6,e=>.55*(.4+.6*e[3]),.35,e=>.3*(e/w)),ot=et.length,St=5,q=14,Pt=ot*2+St*q*2,D=new Float32Array(Pt*4),Q=new Float32Array(Pt);for(let e=0;e<ot;e++)for(let o=0;o<2;o++){const n=p[et[e][o]],r=(e*2+o)*4;D[r]=n[0],D[r+1]=n[1],D[r+2]=n[2],D[r+3]=.18}const Jt=[],Zt=(e,o)=>{const n=p[j()];let r=p[j()];const s=(f,_)=>{const d=Qt(f,_);if(d<.5||d>1.6)return!1;for(let h=1;h<4;h++){const v=h/4,x=f[0]+(_[0]-f[0])*v,y=f[1]+(_[1]-f[1])*v,b=f[2]+(_[2]-f[2])*v;if(x*x+y*y+b*b<.16)return!1}return!0};let i=0;for(;!s(n,r)&&i<24;)r=p[j()],i++;const u=ot*2+e*q*2;for(let f=0;f<q;f++)for(let _=0;_<2;_++){const d=(f+_)/q,h=[n[0]+(r[0]-n[0])*d,n[1]+(r[1]-n[1])*d,n[2]+(r[2]-n[2])*d],v=Math.hypot(h[0],h[1],h[2])||1,x=[h[0]/v,h[1]/v,h[2]/v],y=ft(x)*(.995+.03*Math.sin(Math.PI*d)),b=(u+f*2+_)*4;D[b]=x[0]*y,D[b+1]=x[1]*y,D[b+2]=x[2]*y,D[b+3]=.1}Jt[e]={t0:o,dur:1.6+Math.random()*.8},c.ready&&(t.bindBuffer(t.ARRAY_BUFFER,c.buf_edge_pos),t.bufferSubData(t.ARRAY_BUFFER,u*16,D,u*4,q*2*4))};for(let e=0;e<St;e++)Zt(e,1.6+e*.5);const Ie=24,B=new Float32Array(Ie*7),te=(e,o,n,r,s)=>{const i=e*7;B[i]=o[0],B[i+1]=o[1],B[i+2]=o[2],B[i+3]=n,B[i+4]=r,B[i+5]=s,B[i+6]=0},ee=32,M=new Float32Array(ee*72),oe=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];let K=0;const nt=(e,o,n,r,s,i)=>{if(K>=ee)return;const u=i/3;for(let f=0;f<6;f++){const _=K*72+f*12;M[_]=e[0],M[_+1]=e[1],M[_+2]=e[2],M[_+3]=u+(oe[f][0]+1)/2/3,M[_+4]=(oe[f][1]+1)/2,M[_+5]=o,M[_+6]=r,M[_+7]=s,M[_+8]=0,M[_+9]=n[0],M[_+10]=n[1],M[_+11]=n[2]}K++},ke=`#version 300 es
precision highp float;
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec4 a_dat;
uniform mat3 u_rot;
uniform vec2 u_res;
uniform float u_rf;
uniform float u_camd;
uniform float u_dpr;
uniform float u_reveal;
uniform float u_sweep;
uniform vec3 u_base;
uniform vec3 u_gold;
uniform vec4 u_regions[4];
out vec3 v_col;
out float v_alpha;
out float v_glow;
void main() {
  float su = clamp((u_sweep - a_dat.w) / 0.45, 0.0, 1.0);
  float grow = 0.4 + 0.6 * (1.0 - pow(1.0 - su, 3.0));
  vec3 q = u_rot * (a_pos * grow);
  float fog = clamp((q.z + 0.30) / 0.80, 0.0, 1.0);
  float cull = smoothstep(-0.45, -0.10, q.z);
  float hot = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 d = a_pos - u_regions[i].xyz;
    hot += u_regions[i].w * exp(-dot(d, d) * 26.0);
  }
  hot = clamp(hot, 0.0, 1.0);
  v_col = mix(u_base, u_gold, hot);
  v_glow = a_dat.z + hot * 0.9;
  v_alpha = u_reveal * su * cull * (a_dat.y * (0.06 + 0.94 * pow(fog, 1.5)) + hot * 0.45 * fog);
  float k = u_rf / (u_camd - q.z);
  vec2 px = vec2(u_res.x * 0.5 + q.x * k, u_res.y * 0.5 - q.y * k);
  vec2 ndc = px / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = max(1.0, a_dat.x * u_dpr * (k * u_camd / u_rf));
}`,Ue=`#version 300 es
precision highp float;
in vec3 v_col;
in float v_alpha;
in float v_glow;
out vec4 out_col;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) {
    discard;
  }
  float body = 1.0 - smoothstep(0.12, 0.5, d);
  float core = (1.0 - smoothstep(0.0, 0.22, d)) * v_glow;
  out_col = vec4(v_col * (1.0 + core * 0.9), v_alpha * (body + core));
}`,qe=`#version 300 es
precision highp float;
layout(location = 0) in vec3 a_pos;
layout(location = 1) in float a_heat;
layout(location = 2) in float a_alpha;
uniform mat3 u_rot;
uniform vec2 u_res;
uniform float u_rf;
uniform float u_camd;
uniform float u_reveal;
uniform vec3 u_fg;
uniform vec3 u_gold;
uniform vec4 u_regions[4];
out vec3 v_col;
out float v_alpha;
void main() {
  vec3 p = a_pos;
  vec3 q = u_rot * p;
  float fog = clamp((q.z + 0.30) / 0.80, 0.0, 1.0);
  float cull = smoothstep(-0.75, -0.25, q.z);
  float hot = a_heat;
  for (int i = 0; i < 4; i++) {
    vec3 d = p - u_regions[i].xyz;
    hot += u_regions[i].w * exp(-dot(d, d) * 26.0);
  }
  hot = clamp(hot, 0.0, 1.0);
  v_col = mix(u_fg, u_gold, hot);
  v_alpha = u_reveal * cull * (a_alpha * (0.05 + 0.95 * fog) + hot * 0.60);
  float k = u_rf / (u_camd - q.z);
  vec2 px = vec2(u_res.x * 0.5 + q.x * k, u_res.y * 0.5 - q.y * k);
  vec2 ndc = px / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`,Le=`#version 300 es
precision highp float;
in vec3 v_col;
in float v_alpha;
out vec4 out_col;
void main() {
  out_col = vec4(v_col, v_alpha);
}`,Ce=`#version 300 es
precision highp float;
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec4 a_dat;
layout(location = 3) in vec3 a_col;
uniform mat3 u_rot;
uniform vec2 u_res;
uniform float u_rf;
uniform float u_camd;
out vec2 v_uv;
out vec3 v_col;
out float v_alpha;
const vec2 C[6] = vec2[6](
  vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0));
void main() {
  vec3 q = u_rot * a_pos;
  float k = u_rf / (u_camd - q.z);
  vec2 px = vec2(u_res.x * 0.5 + q.x * k, u_res.y * 0.5 - q.y * k);
  vec2 c = C[gl_VertexID % 6];
  float cs = cos(a_dat.z);
  float sn = sin(a_dat.z);
  px += vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) * a_dat.x * k;
  v_uv = a_uv;
  v_col = a_col;
  v_alpha = a_dat.y * smoothstep(-0.40, -0.10, q.z);
  vec2 ndc = px / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`,Ne=`#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_col;
in float v_alpha;
uniform sampler2D u_tex;
out vec4 out_col;
void main() {
  out_col = vec4(v_col, v_alpha * texture(u_tex, v_uv).a);
}`,Ve=()=>{const e=document.createElement("canvas");e.width=384,e.height=128;const o=e.getContext("2d"),n=o.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,"rgba(255,255,255,1)"),n.addColorStop(.25,"rgba(255,255,255,0.55)"),n.addColorStop(.6,"rgba(255,255,255,0.14)"),n.addColorStop(1,"rgba(255,255,255,0)"),o.fillStyle=n,o.fillRect(0,0,128,128),o.save(),o.translate(192,64),o.strokeStyle="rgba(255,255,255,0.95)",o.lineWidth=1.5,o.strokeRect(-46,-46,92,92),o.fillStyle="rgba(255,255,255,0.95)",o.fillRect(-46.75,-46.75,9,9),o.restore(),o.save(),o.translate(320,64),o.strokeStyle="rgba(255,255,255,0.95)",o.lineWidth=4,o.strokeRect(-40,-40,80,80),o.restore(),e},ne=(e,o)=>{const n=t.createShader(e);return t.shaderSource(n,o),t.compileShader(n),t.getShaderParameter(n,t.COMPILE_STATUS)?n:null},Dt=(e,o)=>{const n=ne(t.VERTEX_SHADER,e),r=ne(t.FRAGMENT_SHADER,o);if(!n||!r)return null;const s=t.createProgram();return t.attachShader(s,n),t.attachShader(s,r),t.linkProgram(s),t.getProgramParameter(s,t.LINK_STATUS)?s:null},Bt=(e,o)=>{const n={};for(const r of o)n[r]=t.getUniformLocation(e,r==="u_regions"?"u_regions[0]":r);return n},re=()=>{const e=Dt(ke,Ue),o=Dt(qe,Le),n=Dt(Ce,Ne);if(!e||!o||!n)return!1;c.pts_prog=e,c.lns_prog=o,c.quad_prog=n,c.u={pts:Bt(e,["u_rot","u_res","u_rf","u_camd","u_dpr","u_reveal","u_sweep","u_base","u_gold","u_regions"]),lns:Bt(o,["u_rot","u_res","u_rf","u_camd","u_reveal","u_fg","u_gold","u_regions"]),quad:Bt(n,["u_rot","u_res","u_rf","u_camd","u_tex"])};const r=(f,_)=>{const d=t.createVertexArray(),h=t.createBuffer();return t.bindVertexArray(d),t.bindBuffer(t.ARRAY_BUFFER,h),t.bufferData(t.ARRAY_BUFFER,f,_),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,3,t.FLOAT,!1,28,0),t.enableVertexAttribArray(1),t.vertexAttribPointer(1,4,t.FLOAT,!1,28,12),t.bindVertexArray(null),{vao:d,buf:h}};c.vao_surf=r(Pe,t.STATIC_DRAW).vao,c.vao_dust=r(De,t.STATIC_DRAW).vao,c.vao_nodes=r(Be,t.STATIC_DRAW).vao;const s=r(B,t.DYNAMIC_DRAW);c.vao_actors=s.vao,c.buf_actors=s.buf,c.buf_edge_pos=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,c.buf_edge_pos),t.bufferData(t.ARRAY_BUFFER,D,t.DYNAMIC_DRAW),c.buf_heat=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,c.buf_heat),t.bufferData(t.ARRAY_BUFFER,Q,t.DYNAMIC_DRAW);const i=t.createVertexArray();t.bindVertexArray(i),t.bindBuffer(t.ARRAY_BUFFER,c.buf_edge_pos),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,3,t.FLOAT,!1,16,0),t.enableVertexAttribArray(2),t.vertexAttribPointer(2,1,t.FLOAT,!1,16,12),t.bindBuffer(t.ARRAY_BUFFER,c.buf_heat),t.enableVertexAttribArray(1),t.vertexAttribPointer(1,1,t.FLOAT,!1,4,0),t.bindVertexArray(null),c.vao_edges=i,c.buf_quad=t.createBuffer();const u=t.createVertexArray();return t.bindVertexArray(u),t.bindBuffer(t.ARRAY_BUFFER,c.buf_quad),t.bufferData(t.ARRAY_BUFFER,M,t.DYNAMIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,3,t.FLOAT,!1,48,0),t.enableVertexAttribArray(1),t.vertexAttribPointer(1,2,t.FLOAT,!1,48,12),t.enableVertexAttribArray(2),t.vertexAttribPointer(2,4,t.FLOAT,!1,48,20),t.enableVertexAttribArray(3),t.vertexAttribPointer(3,3,t.FLOAT,!1,48,36),t.bindVertexArray(null),c.vao_quad=u,c.tex=t.createTexture(),t.bindTexture(t.TEXTURE_2D,c.tex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,Ve()),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.disable(t.DEPTH_TEST),t.enable(t.BLEND),t.blendFunc(t.SRC_ALPHA,t.ONE),t.clearColor(0,0,0,0),c.ready=!0,!0};let V=-.05;const vt=.14;let It=0,J=null,kt=-1,rt=0,Ut=0,z=0,O=0,qt=0;const Y=new Float32Array(16),mt=2.9,ae=1.55,gt=40,Lt=()=>{const e=R.getBoundingClientRect();z=Math.max(1,Math.round(e.width*U)),O=Math.max(1,Math.round(e.height*U)),R.width=z,R.height=O;const o=st.value;qt=Math.min(o.clientWidth,o.clientHeight)*U*.86,m&&rt&&requestAnimationFrame(n=>At(n,0))},se=e=>{const o=Math.cos(V),n=Math.sin(V),r=Math.cos(vt),s=Math.sin(vt),i=e[0]*o-e[2]*n,u=e[0]*n+e[2]*o;return[i,e[1]*r-u*s,e[1]*s+u*r]},ce=e=>{const o=qt*ae/(mt-e[2]);return[z/2+e[0]*o,O/2-e[1]*o,e[2],o]},ze=(e,o,n,r,s,i)=>{k.style.transform=`scaleX(${r.toFixed(3)})`;const u=Math.max(0,(r-.35)/.65).toFixed(3);k.style.opacity=u;const f=st.value.clientWidth,_=k.offsetWidth,d=e/U-gt,h=o/U-gt,v=st.value.getBoundingClientRect(),x=Math.max(0,-v.left+4),y=Math.min(f,window.innerWidth-v.left-4),b=d+14+_>y&&d-14-_>=x,T=Math.max(x,Math.min(b?d-14-_:d+14,y-_)),I=h-16+n;k.style.left=`${T}px`,k.style.top=`${I}px`,k.style.transformOrigin=b?"right center":"left center";const C=s/U-gt,a=i/U-gt,l=k.offsetHeight,g=Math.abs(T+_-C)<Math.abs(T-C)?T+_:T,E=Math.abs(I+l-a)<Math.abs(I-a)?I+l:I,F=g-C,Z=E-a;tt.style.left=`${C}px`,tt.style.top=`${a}px`,tt.style.width=`${Math.hypot(F,Z).toFixed(1)}px`,tt.style.transform=`rotate(${Math.atan2(Z,F).toFixed(4)}rad)`,tt.style.opacity=u},At=(e,o)=>{const n=(e-rt)/1e3,r=m?1:Math.min(1,n/.9),s=1-Math.pow(1-r,3),i=m?1:Math.min(1,Math.max(0,(n-.6)/.8)),u=m?1:Math.min(1,Math.max(0,(n-1.15)/.6)),f=m?3:n*1.25;if(!m)for(const a of ht){for(a.t+=o*a.speed;a.t>=1;){if(a.t-=1,a.to>=0){const E=a.at<a.to?a.at*w+a.to:a.to*w+a.at,F=wt.get(E);F!==void 0&&(pt[F]=1),a.prev=a.at,a.at=a.to}const l=Ft[a.at];if(!l.length){a.at=j(),a.to=-1;continue}let g=l[Math.random()*l.length|0];g===a.prev&&l.length>1&&(g=l[Math.random()*l.length|0]),a.to=g}if(a.to>=0&&a.t>=0){const l=p[a.at],g=p[a.to],E=a.t;a.wp=[l[0]+(g[0]-l[0])*E,l[1]+(g[1]-l[1])*E,l[2]+(g[2]-l[2])*E]}else a.wp=null}!m&&n>jt&&S.length<3&&(Kt(S.length===0&&n<3?$t:null,n),jt=n+.8+Math.random()*1);for(let a=S.length-1;a>=0;a--)(n-S[a].t0)/S[a].life>=1&&S.splice(a,1);Y.fill(0);for(let a=0;a<S.length&&a<4;a++){const l=S[a],g=Math.min(1,Math.max(0,(n-l.t0)/l.life));l.env=Math.sin(Math.PI*g)**2,Y[a*4]=l.c[0],Y[a*4+1]=l.c[1],Y[a*4+2]=l.c[2],Y[a*4+3]=l.env}const _=m?1:Math.pow(.35,o);for(let a=0;a<ot;a++)pt[a]*=_,Q[a*2]=pt[a],Q[a*2+1]=pt[a];for(let a=0;a<St;a++){const l=Jt[a],g=m?.35+a*.16:(n-l.t0)/l.dur;!m&&g>1.3&&Zt(a,n+.6+Math.random()*1.6);const E=ot*2+a*q*2;for(let F=0;F<q;F++){const ue=((F+.5)/q-g)*7,fe=Math.exp(-ue*ue)*.95;Q[E+F*2]=fe,Q[E+F*2+1]=fe}}let d=null,h=null;for(let a=0;a<$.length;a++){const l=$[a],g=se(l.p),E=g[2]>.22;if(l.pop+=((E?1:0)-l.pop)*(m?1:.09),l.pop<.02)continue;const F=ce(g),Z=ce(se(l.sub));E&&(!d||g[2]>d.z)&&(d={i:a,s:F,ss:Z,z:g[2],pop:l.pop}),E&&a===kt&&(h={i:a,s:F,ss:Z,z:g[2],pop:l.pop})}h&&d&&d.i!==kt&&d.z-h.z<.1&&(d=h),kt=d?d.i:-1;let v=0;if(!m)for(const a of ht)a.wp&&(te(v,a.wp,4,.95,1),v++);for(const a of $)a.pop<.02||(te(v,a.sub,3*a.pop,.95*a.pop,.9),v++);K=0;for(let a=0;a<S.length&&a<4;a++){const l=S[a];l.env<.01||nt(l.c,.3*(.7+.3*l.env),A,.12*l.env*s,0,0)}if(!m)for(const a of ht)a.wp&&nt(a.wp,.085,A,.26*s,0,0);for(let a=0;a<$.length;a++){const l=$[a];l.pop<.02||(nt(l.p,.175,A,.75*l.pop*s,0,1),nt(l.sub,.05,A,.9*l.pop*s,0,2),nt(l.sub,.07,A,.3*l.pop*s,0,0))}if(!c.ready)return;const x=Math.cos(V),y=Math.sin(V),b=Math.cos(vt),T=Math.sin(vt),I=Se([1,0,0,0,b,T,0,-T,b],[x,0,y,0,1,0,-y,0,x]),C=qt*ae;if(t.viewport(0,0,z,O),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(c.quad_prog),t.uniformMatrix3fv(c.u.quad.u_rot,!1,I),t.uniform2f(c.u.quad.u_res,z,O),t.uniform1f(c.u.quad.u_rf,C),t.uniform1f(c.u.quad.u_camd,mt),t.uniform1i(c.u.quad.u_tex,0),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,c.tex),t.bindBuffer(t.ARRAY_BUFFER,c.buf_quad),t.bufferSubData(t.ARRAY_BUFFER,0,M,0,K*72),t.bindVertexArray(c.vao_quad),t.drawArrays(t.TRIANGLES,0,K*6),t.useProgram(c.lns_prog),t.uniformMatrix3fv(c.u.lns.u_rot,!1,I),t.uniform2f(c.u.lns.u_res,z,O),t.uniform1f(c.u.lns.u_rf,C),t.uniform1f(c.u.lns.u_camd,mt),t.uniform3f(c.u.lns.u_fg,X[0],X[1],X[2]),t.uniform3f(c.u.lns.u_gold,A[0],A[1],A[2]),t.uniform4fv(c.u.lns.u_regions,Y),t.uniform1f(c.u.lns.u_reveal,s*i),t.bindBuffer(t.ARRAY_BUFFER,c.buf_heat),t.bufferSubData(t.ARRAY_BUFFER,0,Q),t.bindVertexArray(c.vao_edges),t.drawArrays(t.LINES,0,Pt),t.useProgram(c.pts_prog),t.uniformMatrix3fv(c.u.pts.u_rot,!1,I),t.uniform2f(c.u.pts.u_res,z,O),t.uniform1f(c.u.pts.u_rf,C),t.uniform1f(c.u.pts.u_camd,mt),t.uniform1f(c.u.pts.u_dpr,U),t.uniform1f(c.u.pts.u_sweep,f),t.uniform3f(c.u.pts.u_gold,A[0],A[1],A[2]),t.uniform4fv(c.u.pts.u_regions,Y),t.uniform1f(c.u.pts.u_reveal,s),t.uniform3f(c.u.pts.u_base,A[0],A[1],A[2]),t.bindVertexArray(c.vao_dust),t.drawArrays(t.POINTS,0,Et.length),t.uniform3f(c.u.pts.u_base,X[0],X[1],X[2]),t.bindVertexArray(c.vao_surf),t.drawArrays(t.POINTS,0,H.length),t.uniform1f(c.u.pts.u_reveal,s*i),t.bindVertexArray(c.vao_nodes),t.drawArrays(t.POINTS,0,w),t.uniform1f(c.u.pts.u_reveal,s*u),t.uniform3f(c.u.pts.u_base,A[0],A[1],A[2]),t.bindBuffer(t.ARRAY_BUFFER,c.buf_actors),t.bufferSubData(t.ARRAY_BUFFER,0,B,0,v*7),t.bindVertexArray(c.vao_actors),t.drawArrays(t.POINTS,0,v),t.bindVertexArray(null),d){yt.value=d.i;const a=m?0:Math.sin(n/10.5*6.283)*6;k&&ze(d.s[0],d.s[1],a,d.pop,d.ss[0],d.ss[1])}else yt.value=-1},ie=e=>{const o=Math.min(.05,(e-(Ut||e))/1e3);Ut=e,J||(V+=.0314/60,V+=It,It*=.9),At(e,o),G=requestAnimationFrame(ie)},bt=()=>{G===null&&Nt.live&&!document.hidden&&!m&&(rt=rt||performance.now(),Ut=0,G=requestAnimationFrame(ie))},xt=()=>{G!==null&&(cancelAnimationFrame(G),G=null)},L=(e,o,n,r)=>{e.addEventListener(o,n,r),it.push(()=>e.removeEventListener(o,n,r))};if(!re()){R.style.display="none";return}if(Lt(),L(window,"resize",Lt),L(R,"webglcontextlost",e=>{e.preventDefault(),xt()}),L(R,"webglcontextrestored",()=>{re()&&(Lt(),m?requestAnimationFrame(e=>At(e,0)):bt())}),m){rt=performance.now()-1e4,Kt($t,9.25),requestAnimationFrame(e=>At(e,0));return}L(R,"pointerdown",e=>{J={x:e.clientX};try{R.setPointerCapture(e.pointerId)}catch{}}),L(R,"pointermove",e=>{if(!J)return;const o=e.clientX-J.x;J.x=e.clientX,V-=o*.006,It=-o*.006});const le=()=>{J=null};L(R,"pointerup",le),L(R,"pointercancel",le),L(document,"visibilitychange",()=>{document.hidden?xt():bt()}),Xe(()=>Nt.live,e=>{e?bt():xt()}),it.push(xt),bt()}),We(()=>{for(const m of it)m();it=[]}),(m,R)=>(_e(),de("div",{ref_key:"host_ref",ref:st,class:"experience-brain","aria-hidden":"true","data-nosnippet":""},[Ct("canvas",{ref_key:"canvas_ref",ref:Vt,class:"experience-brain__canvas"},null,512),pe(Ct("span",{ref_key:"link_ref",ref:Ot,class:"experience-brain__link"},null,512),[[he,ct.value]]),pe(Ct("div",{ref_key:"cap_ref",ref:zt,class:"experience-brain__cap"},[ct.value?(_e(),de("span",Ke,He($e(me)(`kyo-web.landing.experience.brain.${ct.value}`)),1)):je("",!0)],512),[[he,ct.value]])],512))}},to=Oe(Je,[["__scopeId","data-v-09070ccb"]]);export{to as default};
