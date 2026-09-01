import{A as e,G as t,M as n,O as r,R as i,V as a,Y as o,f as s,l as c,p as l,pt as u,t as d,u as f}from"./_plugin-vue_export-helper-DOtHE2vK.js";import{H as p,z as m}from"./app-BhfReqPc.js";var h={key:0,class:`experience-brain__cap-text`},g=d({__name:`experience-brain`,props:{live:{type:Boolean,default:!0}},setup(d){let g=d,{t:_}=m(),v=[`systemization`,`plasticity`,`celerity`,`ingenuity`],y=[[.85,.45,.28],[.35,.1,.9],[-.58,-.3,-.45],[-.9,.25,-.3]],b=t(null),x=t(null),S=t(null),C=t(null),w=t(-1),T=c(()=>v[w.value]??null),E=null,D=[];return e(()=>{let e=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,t=x.value,n=S.value,r=C.value,a=t.getContext(`webgl2`,{alpha:!0,antialias:!1});if(!a){t.style.display=`none`;return}let o=a.getExtension(`WEBGL_debug_renderer_info`),s=o?String(a.getParameter(o.UNMASKED_RENDERER_WEBGL)):``,c=/swiftshader|llvmpipe|softpipe|software/i.test(s),l=Math.min(c?1:1.5,window.devicePixelRatio||1),u=getComputedStyle(document.documentElement),d=(e,t)=>u.getPropertyValue(e).trim()||t,f=document.createElement(`canvas`);f.width=1,f.height=1;let p=f.getContext(`2d`),m=e=>{p.fillStyle=e,p.fillRect(0,0,1,1);let t=p.getImageData(0,0,1,1).data;return[t[0]/255,t[1]/255,t[2]/255]},h=m(d(`--clr-primary-100`,`#f9cd26`));p.fillStyle=d(`--clr-neutral-500`,`#0c0c0c`),p.fillRect(0,0,1,1),p.fillStyle=d(`--clr-border-100`,`rgba(255,255,255,0.2)`),p.fillRect(0,0,1,1);let _=m(d(`--clr-border-100`,`rgba(255,255,255,0.2)`)),v=[[.98,.02,.52],[.94,.3,.55],[.8,.52,.6],[.58,.66,.64],[.3,.74,.66],[0,.76,.68],[-.3,.7,.66],[-.58,.58,.62],[-.8,.38,.56],[-.94,.16,.48],[-.98,-.04,.42],[-.9,-.2,.38],[-.8,-.36,.4],[-.66,-.5,.38],[-.45,-.56,.34],[-.28,-.52,.26],[-.18,-.62,.13],[-.12,-.85,.1],[-.02,-.8,.1],[.02,-.5,.3],[.25,-.46,.42],[.55,-.44,.46],[.78,-.32,.48],[.92,-.16,.5]],T=new Float32Array(256),ee=new Float32Array(256);for(let e=0;e<256;e++){let t=e/256*Math.PI*2-Math.PI,n=Math.cos(t),r=Math.sin(t),i=.4,a=.4;for(let e=0;e<v.length;e++){let t=v[e],o=v[(e+1)%v.length],s=o[0]-t[0],c=o[1]-t[1],l=n*c-r*s;if(Math.abs(l)<1e-9)continue;let u=t[0]-.02,d=t[1]-.04,f=(u*c-d*s)/l,p=(u*r-d*n)/l;f>0&&p>=0&&p<=1&&f>i&&(i=f,a=t[2]+(o[2]-t[2])*p)}T[e]=i,ee[e]=a}let O=e=>{let t=Math.hypot(e[0],e[1]),n=(Math.atan2(e[1],e[0])+Math.PI)/(Math.PI*2)*256|0,r=Math.min(255,n),i=t/T[r],a=e[2]/ee[r];return 1/Math.sqrt(i*i+a*a)},k=[-.88,-.1],te=[-.2,-.5],ne=(e,t)=>{let n=te[0]-k[0],r=te[1]-k[1],i=Math.max(0,Math.min(1,((e-k[0])*n+(t-k[1])*r)/(n*n+r*r)));return Math.hypot(e-(k[0]+n*i),t-(k[1]+r*i))},re=(e,t)=>e<-.18&&t<-.14&&ne(e,t)>.02&&(t-k[1])*(te[0]-k[0])-(e-k[0])*(te[1]-k[1])<0,ie=(e,t,n)=>{if(re(e,t))return .45+.55*Math.abs(Math.sin(30*t+4*e));let r=Math.atan2(t-.15,e);return .55+.45*Math.sin(9*r+2.2*Math.sin(3.1*r+2*n))},A=Math.PI*(3-Math.sqrt(5)),j=[];for(let e=0;e<6500;e++){let t=1-e/6499*2,n=Math.sqrt(Math.max(0,1-t*t)),r=[Math.cos(A*e)*n,t,Math.sin(A*e)*n],i=O(r)*(.985+.03*Math.sin(e*1.7)),a=r[0]*i,o=r[1]*i,s=r[2]*i;if(Math.abs(s)<.035&&o>.3)continue;let c=ie(a,o,s);ne(a,o)<.035&&a<-.1&&o<0&&(c*=.2),j.push([a,o,s,c])}let ae=[];for(let e=0;e<700;e++){let t=1-e/699*2,n=Math.sqrt(Math.max(0,1-t*t)),r=[Math.cos(A*e*7)*n,t,Math.sin(A*e*7)*n*.45],i=O(r)*(.25+.65*(e*.6180339887%1)),a=[r[0]*i,r[1]*i,r[2]*i];a.push(.08+.24*Math.max(0,1-Math.abs(a[2])*3)),ae.push(a)}let M=[];for(let e=0;e<j.length;e+=7)M.push(j[e]);let N=M.length,P=[],oe=Array.from({length:N},()=>[]),se=new Map;for(let e=0;e<N;e++){let t=[];for(let n=0;n<N;n++){if(n===e)continue;let r=M[e][0]-M[n][0],i=M[e][1]-M[n][1],a=M[e][2]-M[n][2],o=r*r+i*i+a*a;o<.055&&t.push([o,n])}t.sort((e,t)=>e[0]-t[0]);for(let n=0;n<Math.min(3,t.length);n++){let r=t[n][1],i=(M[e][0]+M[r][0])/2,a=(M[e][1]+M[r][1])/2;if(ne(i,a)<.03&&i<-.1&&a<0||Math.abs((M[e][2]+M[r][2])/2)<.1&&a>.3)continue;let o=e<r?e*N+r:r*N+e;se.has(o)||(se.set(o,P.length),P.push([e,r]),oe[e].push(r),oe[r].push(e))}}let ce=new Float32Array(P.length),le=e=>{let t=0,n=1/0;for(let r=0;r<N;r++){let i=M[r][0]-e[0],a=M[r][1]-e[1],o=M[r][2]-e[2],s=i*i+a*a+o*o;s<n&&(n=s,t=r)}return t},ue=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},F=y.map(e=>{let t=ue(e),n=O(t);return{p:[t[0]*n,t[1]*n,t[2]*n],pop:0}}),I=()=>Math.random()*N|0,L=[];for(let e=0;e<6;e++)L.push({at:I(),to:-1,prev:-1,t:-(e*.35),speed:2.6+e%3*.5,wp:null});let R=[],de=M[le([.1,.55,0])],fe=1.15,pe=(e,t)=>{let n=e[0]-t[0],r=e[1]-t[1],i=e[2]-t[2];return n*n+r*r+i*i},me=(e,t)=>{let n=e||M[I()];R.push({c:n,t0:t,life:1.5+Math.random()*.9,env:0})};for(let e of F){let t=[];for(let n=0;n<N;n++)pe(M[n],e.p)<.0064&&t.push(n);e.sub=t.length?M[t[Math.random()*t.length|0]]:e.p}let he=(e,t)=>{let n=new Float32Array(9);for(let r=0;r<3;r++)for(let i=0;i<3;i++)n[r*3+i]=e[i]*t[r*3]+e[3+i]*t[r*3+1]+e[6+i]*t[r*3+2];return n},z={ready:!1},ge=(e,t,n,r,i)=>{let a=new Float32Array(e.length*7);for(let o=0;o<e.length;o++){let s=o*7;a[s]=e[o][0],a[s+1]=e[o][1],a[s+2]=e[o][2],a[s+3]=t,a[s+4]=n(e[o],o),a[s+5]=r,a[s+6]=i(o)}return a},_e=ge(j,1.7,e=>1*e[3],0,e=>e/j.length),ve=ge(ae,1.3,e=>2.2*e[3],.5,()=>0),ye=ge(M,2.6,e=>.55*(.4+.6*e[3]),.35,e=>e/N*.3),B=P.length,be=B*2+140,V=new Float32Array(be*4),H=new Float32Array(be);for(let e=0;e<B;e++)for(let t=0;t<2;t++){let n=M[P[e][t]],r=(e*2+t)*4;V[r]=n[0],V[r+1]=n[1],V[r+2]=n[2],V[r+3]=.18}let xe=[],Se=(e,t)=>{let n=M[I()],r=M[I()],i=(e,t)=>{let n=pe(e,t);if(n<.5||n>1.6)return!1;for(let n=1;n<4;n++){let r=n/4,i=e[0]+(t[0]-e[0])*r,a=e[1]+(t[1]-e[1])*r,o=e[2]+(t[2]-e[2])*r;if(i*i+a*a+o*o<.16)return!1}return!0},o=0;for(;!i(n,r)&&o<24;)r=M[I()],o++;let s=B*2+e*14*2;for(let e=0;e<14;e++)for(let t=0;t<2;t++){let i=(e+t)/14,a=[n[0]+(r[0]-n[0])*i,n[1]+(r[1]-n[1])*i,n[2]+(r[2]-n[2])*i],o=Math.hypot(a[0],a[1],a[2])||1,c=[a[0]/o,a[1]/o,a[2]/o],l=O(c)*(.995+.03*Math.sin(Math.PI*i)),u=(s+e*2+t)*4;V[u]=c[0]*l,V[u+1]=c[1]*l,V[u+2]=c[2]*l,V[u+3]=.1}xe[e]={t0:t,dur:1.6+Math.random()*.8},z.ready&&(a.bindBuffer(a.ARRAY_BUFFER,z.buf_edge_pos),a.bufferSubData(a.ARRAY_BUFFER,s*16,V,s*4,112))};for(let e=0;e<5;e++)Se(e,1.6+e*.5);let U=new Float32Array(168),Ce=(e,t,n,r,i)=>{let a=e*7;U[a]=t[0],U[a+1]=t[1],U[a+2]=t[2],U[a+3]=n,U[a+4]=r,U[a+5]=i,U[a+6]=0},W=new Float32Array(2304),we=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]],G=0,K=(e,t,n,r,i,a)=>{if(G>=32)return;let o=a/3;for(let a=0;a<6;a++){let s=G*72+a*12;W[s]=e[0],W[s+1]=e[1],W[s+2]=e[2],W[s+3]=o+(we[a][0]+1)/2/3,W[s+4]=(we[a][1]+1)/2,W[s+5]=t,W[s+6]=r,W[s+7]=i,W[s+8]=0,W[s+9]=n[0],W[s+10]=n[1],W[s+11]=n[2]}G++},Te=()=>{let e=document.createElement(`canvas`);e.width=384,e.height=128;let t=e.getContext(`2d`),n=t.createRadialGradient(64,64,0,64,64,64);return n.addColorStop(0,`rgba(255,255,255,1)`),n.addColorStop(.25,`rgba(255,255,255,0.55)`),n.addColorStop(.6,`rgba(255,255,255,0.14)`),n.addColorStop(1,`rgba(255,255,255,0)`),t.fillStyle=n,t.fillRect(0,0,128,128),t.save(),t.translate(192,64),t.strokeStyle=`rgba(255,255,255,0.95)`,t.lineWidth=1.5,t.strokeRect(-46,-46,92,92),t.fillStyle=`rgba(255,255,255,0.95)`,t.fillRect(-46.75,-46.75,9,9),t.restore(),t.save(),t.translate(320,64),t.strokeStyle=`rgba(255,255,255,0.95)`,t.lineWidth=4,t.strokeRect(-40,-40,80,80),t.restore(),e},Ee=(e,t)=>{let n=a.createShader(e);return a.shaderSource(n,t),a.compileShader(n),a.getShaderParameter(n,a.COMPILE_STATUS)?n:null},De=(e,t)=>{let n=Ee(a.VERTEX_SHADER,e),r=Ee(a.FRAGMENT_SHADER,t);if(!n||!r)return null;let i=a.createProgram();return a.attachShader(i,n),a.attachShader(i,r),a.linkProgram(i),a.getProgramParameter(i,a.LINK_STATUS)?i:null},Oe=(e,t)=>{let n={};for(let r of t)n[r]=a.getUniformLocation(e,r===`u_regions`?`u_regions[0]`:r);return n},ke=()=>{let e=De(`#version 300 es
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
}`,`#version 300 es
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
}`),t=De(`#version 300 es
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
}`,`#version 300 es
precision highp float;
in vec3 v_col;
in float v_alpha;
out vec4 out_col;
void main() {
  out_col = vec4(v_col, v_alpha);
}`),n=De(`#version 300 es
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
}`,`#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_col;
in float v_alpha;
uniform sampler2D u_tex;
out vec4 out_col;
void main() {
  out_col = vec4(v_col, v_alpha * texture(u_tex, v_uv).a);
}`);if(!e||!t||!n)return!1;z.pts_prog=e,z.lns_prog=t,z.quad_prog=n,z.u={pts:Oe(e,[`u_rot`,`u_res`,`u_rf`,`u_camd`,`u_dpr`,`u_reveal`,`u_sweep`,`u_base`,`u_gold`,`u_regions`]),lns:Oe(t,[`u_rot`,`u_res`,`u_rf`,`u_camd`,`u_reveal`,`u_fg`,`u_gold`,`u_regions`]),quad:Oe(n,[`u_rot`,`u_res`,`u_rf`,`u_camd`,`u_tex`])};let r=(e,t)=>{let n=a.createVertexArray(),r=a.createBuffer();return a.bindVertexArray(n),a.bindBuffer(a.ARRAY_BUFFER,r),a.bufferData(a.ARRAY_BUFFER,e,t),a.enableVertexAttribArray(0),a.vertexAttribPointer(0,3,a.FLOAT,!1,28,0),a.enableVertexAttribArray(1),a.vertexAttribPointer(1,4,a.FLOAT,!1,28,12),a.bindVertexArray(null),{vao:n,buf:r}};z.vao_surf=r(_e,a.STATIC_DRAW).vao,z.vao_dust=r(ve,a.STATIC_DRAW).vao,z.vao_nodes=r(ye,a.STATIC_DRAW).vao;let i=r(U,a.DYNAMIC_DRAW);z.vao_actors=i.vao,z.buf_actors=i.buf,z.buf_edge_pos=a.createBuffer(),a.bindBuffer(a.ARRAY_BUFFER,z.buf_edge_pos),a.bufferData(a.ARRAY_BUFFER,V,a.DYNAMIC_DRAW),z.buf_heat=a.createBuffer(),a.bindBuffer(a.ARRAY_BUFFER,z.buf_heat),a.bufferData(a.ARRAY_BUFFER,H,a.DYNAMIC_DRAW);let o=a.createVertexArray();a.bindVertexArray(o),a.bindBuffer(a.ARRAY_BUFFER,z.buf_edge_pos),a.enableVertexAttribArray(0),a.vertexAttribPointer(0,3,a.FLOAT,!1,16,0),a.enableVertexAttribArray(2),a.vertexAttribPointer(2,1,a.FLOAT,!1,16,12),a.bindBuffer(a.ARRAY_BUFFER,z.buf_heat),a.enableVertexAttribArray(1),a.vertexAttribPointer(1,1,a.FLOAT,!1,4,0),a.bindVertexArray(null),z.vao_edges=o,z.buf_quad=a.createBuffer();let s=a.createVertexArray();return a.bindVertexArray(s),a.bindBuffer(a.ARRAY_BUFFER,z.buf_quad),a.bufferData(a.ARRAY_BUFFER,W,a.DYNAMIC_DRAW),a.enableVertexAttribArray(0),a.vertexAttribPointer(0,3,a.FLOAT,!1,48,0),a.enableVertexAttribArray(1),a.vertexAttribPointer(1,2,a.FLOAT,!1,48,12),a.enableVertexAttribArray(2),a.vertexAttribPointer(2,4,a.FLOAT,!1,48,20),a.enableVertexAttribArray(3),a.vertexAttribPointer(3,3,a.FLOAT,!1,48,36),a.bindVertexArray(null),z.vao_quad=s,z.tex=a.createTexture(),a.bindTexture(a.TEXTURE_2D,z.tex),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,Te()),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.disable(a.DEPTH_TEST),a.enable(a.BLEND),a.blendFunc(a.SRC_ALPHA,a.ONE),a.clearColor(0,0,0,0),z.ready=!0,!0},q=-.05,Ae=.14,je=0,J=null,Me=-1,Ne=0,Pe=0,Y=0,X=0,Fe=0,Z=new Float32Array(16),Q=2.9,Ie=1.55,Le=()=>{let n=t.getBoundingClientRect();Y=Math.max(1,Math.round(n.width*l)),X=Math.max(1,Math.round(n.height*l)),t.width=Y,t.height=X;let r=b.value;Fe=Math.min(r.clientWidth,r.clientHeight)*l*.86,e&&Ne&&requestAnimationFrame(e=>Ve(e,0))},Re=e=>{let t=Math.cos(q),n=Math.sin(q),r=Math.cos(Ae),i=Math.sin(Ae),a=e[0]*t-e[2]*n,o=e[0]*n+e[2]*t;return[a,e[1]*r-o*i,e[1]*i+o*r]},ze=e=>{let t=Fe*Ie/(Q-e[2]);return[Y/2+e[0]*t,X/2-e[1]*t,e[2],t]},Be=(e,t,i,a,o,s)=>{n.style.transform=`scaleX(${a.toFixed(3)})`;let c=Math.max(0,(a-.35)/.65).toFixed(3);n.style.opacity=c;let u=b.value.clientWidth,d=n.offsetWidth,f=e/l-40,p=t/l-40,m=b.value.getBoundingClientRect(),h=Math.max(0,-m.left+4),g=Math.min(u,window.innerWidth-m.left-4),_=f+14+d>g&&f-14-d>=h,v=Math.max(h,Math.min(_?f-14-d:f+14,g-d)),y=p-16+i;n.style.left=`${v}px`,n.style.top=`${y}px`,n.style.transformOrigin=_?`right center`:`left center`;let x=o/l-40,S=s/l-40,C=n.offsetHeight,w=Math.abs(v+d-x)<Math.abs(v-x)?v+d:v,T=Math.abs(y+C-S)<Math.abs(y-S)?y+C:y,E=w-x,D=T-S;r.style.left=`${x}px`,r.style.top=`${S}px`,r.style.width=`${Math.hypot(E,D).toFixed(1)}px`,r.style.transform=`rotate(${Math.atan2(D,E).toFixed(4)}rad)`,r.style.opacity=c},Ve=(t,r)=>{let i=(t-Ne)/1e3,o=1-(1-(e?1:Math.min(1,i/.9)))**3,s=e?1:Math.min(1,Math.max(0,(i-.6)/.8)),c=e?1:Math.min(1,Math.max(0,(i-1.15)/.6)),u=e?3:i*1.25;if(!e)for(let e of L){for(e.t+=r*e.speed;e.t>=1;){if(--e.t,e.to>=0){let t=e.at<e.to?e.at*N+e.to:e.to*N+e.at,n=se.get(t);n!==void 0&&(ce[n]=1),e.prev=e.at,e.at=e.to}let t=oe[e.at];if(!t.length){e.at=I(),e.to=-1;continue}let n=t[Math.random()*t.length|0];n===e.prev&&t.length>1&&(n=t[Math.random()*t.length|0]),e.to=n}if(e.to>=0&&e.t>=0){let t=M[e.at],n=M[e.to],r=e.t;e.wp=[t[0]+(n[0]-t[0])*r,t[1]+(n[1]-t[1])*r,t[2]+(n[2]-t[2])*r]}else e.wp=null}!e&&i>fe&&R.length<3&&(me(R.length===0&&i<3?de:null,i),fe=i+.8+Math.random()*1);for(let e=R.length-1;e>=0;e--)(i-R[e].t0)/R[e].life>=1&&R.splice(e,1);Z.fill(0);for(let e=0;e<R.length&&e<4;e++){let t=R[e],n=Math.min(1,Math.max(0,(i-t.t0)/t.life));t.env=Math.sin(Math.PI*n)**2,Z[e*4]=t.c[0],Z[e*4+1]=t.c[1],Z[e*4+2]=t.c[2],Z[e*4+3]=t.env}let d=e?1:.35**r;for(let e=0;e<B;e++)ce[e]*=d,H[e*2]=ce[e],H[e*2+1]=ce[e];for(let t=0;t<5;t++){let n=xe[t],r=e?.35+t*.16:(i-n.t0)/n.dur;!e&&r>1.3&&Se(t,i+.6+Math.random()*1.6);let a=B*2+t*14*2;for(let e=0;e<14;e++){let t=((e+.5)/14-r)*7,n=Math.exp(-t*t)*.95;H[a+e*2]=n,H[a+e*2+1]=n}}let f=null,p=null;for(let t=0;t<F.length;t++){let n=F[t],r=Re(n.p),i=r[2]>.22;if(n.pop+=(+!!i-n.pop)*(e?1:.09),n.pop<.02)continue;let a=ze(r),o=ze(Re(n.sub));i&&(!f||r[2]>f.z)&&(f={i:t,s:a,ss:o,z:r[2],pop:n.pop}),i&&t===Me&&(p={i:t,s:a,ss:o,z:r[2],pop:n.pop})}p&&f&&f.i!==Me&&f.z-p.z<.1&&(f=p),Me=f?f.i:-1;let m=0;if(!e)for(let e of L)e.wp&&(Ce(m,e.wp,4,.95,1),m++);for(let e of F)e.pop<.02||(Ce(m,e.sub,3*e.pop,.95*e.pop,.9),m++);G=0;for(let e=0;e<R.length&&e<4;e++){let t=R[e];t.env<.01||K(t.c,.3*(.7+.3*t.env),h,.12*t.env*o,0,0)}if(!e)for(let e of L)e.wp&&K(e.wp,.085,h,.26*o,0,0);for(let e=0;e<F.length;e++){let t=F[e];t.pop<.02||(K(t.p,.175,h,.75*t.pop*o,0,1),K(t.sub,.05,h,.9*t.pop*o,0,2),K(t.sub,.07,h,.3*t.pop*o,0,0))}if(!z.ready)return;let g=Math.cos(q),v=Math.sin(q),y=Math.cos(Ae),b=Math.sin(Ae),x=he([1,0,0,0,y,b,0,-b,y],[g,0,v,0,1,0,-v,0,g]),S=Fe*Ie;if(a.viewport(0,0,Y,X),a.clear(a.COLOR_BUFFER_BIT),a.useProgram(z.quad_prog),a.uniformMatrix3fv(z.u.quad.u_rot,!1,x),a.uniform2f(z.u.quad.u_res,Y,X),a.uniform1f(z.u.quad.u_rf,S),a.uniform1f(z.u.quad.u_camd,Q),a.uniform1i(z.u.quad.u_tex,0),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,z.tex),a.bindBuffer(a.ARRAY_BUFFER,z.buf_quad),a.bufferSubData(a.ARRAY_BUFFER,0,W,0,G*72),a.bindVertexArray(z.vao_quad),a.drawArrays(a.TRIANGLES,0,G*6),a.useProgram(z.lns_prog),a.uniformMatrix3fv(z.u.lns.u_rot,!1,x),a.uniform2f(z.u.lns.u_res,Y,X),a.uniform1f(z.u.lns.u_rf,S),a.uniform1f(z.u.lns.u_camd,Q),a.uniform3f(z.u.lns.u_fg,_[0],_[1],_[2]),a.uniform3f(z.u.lns.u_gold,h[0],h[1],h[2]),a.uniform4fv(z.u.lns.u_regions,Z),a.uniform1f(z.u.lns.u_reveal,o*s),a.bindBuffer(a.ARRAY_BUFFER,z.buf_heat),a.bufferSubData(a.ARRAY_BUFFER,0,H),a.bindVertexArray(z.vao_edges),a.drawArrays(a.LINES,0,be),a.useProgram(z.pts_prog),a.uniformMatrix3fv(z.u.pts.u_rot,!1,x),a.uniform2f(z.u.pts.u_res,Y,X),a.uniform1f(z.u.pts.u_rf,S),a.uniform1f(z.u.pts.u_camd,Q),a.uniform1f(z.u.pts.u_dpr,l),a.uniform1f(z.u.pts.u_sweep,u),a.uniform3f(z.u.pts.u_gold,h[0],h[1],h[2]),a.uniform4fv(z.u.pts.u_regions,Z),a.uniform1f(z.u.pts.u_reveal,o),a.uniform3f(z.u.pts.u_base,h[0],h[1],h[2]),a.bindVertexArray(z.vao_dust),a.drawArrays(a.POINTS,0,ae.length),a.uniform3f(z.u.pts.u_base,_[0],_[1],_[2]),a.bindVertexArray(z.vao_surf),a.drawArrays(a.POINTS,0,j.length),a.uniform1f(z.u.pts.u_reveal,o*s),a.bindVertexArray(z.vao_nodes),a.drawArrays(a.POINTS,0,N),a.uniform1f(z.u.pts.u_reveal,o*c),a.uniform3f(z.u.pts.u_base,h[0],h[1],h[2]),a.bindBuffer(a.ARRAY_BUFFER,z.buf_actors),a.bufferSubData(a.ARRAY_BUFFER,0,U,0,m*7),a.bindVertexArray(z.vao_actors),a.drawArrays(a.POINTS,0,m),a.bindVertexArray(null),f){w.value=f.i;let t=e?0:Math.sin(i/10.5*6.283)*6;n&&Be(f.s[0],f.s[1],t,f.pop,f.ss[0],f.ss[1])}else w.value=-1},He=e=>{let t=Math.min(.05,(e-(Pe||e))/1e3);Pe=e,J||(q+=.0314/60,q+=je,je*=.9),Ve(e,t),E=requestAnimationFrame(He)},Ue=()=>{E===null&&g.live&&!document.hidden&&!e&&(Ne||=performance.now(),Pe=0,E=requestAnimationFrame(He))},We=()=>{E!==null&&(cancelAnimationFrame(E),E=null)},$=(e,t,n,r)=>{e.addEventListener(t,n,r),D.push(()=>e.removeEventListener(t,n,r))};if(!ke()){t.style.display=`none`;return}if(Le(),$(window,`resize`,Le),$(t,`webglcontextlost`,e=>{e.preventDefault(),We()}),$(t,`webglcontextrestored`,()=>{ke()&&(Le(),e?requestAnimationFrame(e=>Ve(e,0)):Ue())}),e){Ne=performance.now()-1e4,me(de,9.25),requestAnimationFrame(e=>Ve(e,0));return}$(t,`pointerdown`,e=>{J={x:e.clientX};try{t.setPointerCapture(e.pointerId)}catch{}}),$(t,`pointermove`,e=>{if(!J)return;let t=e.clientX-J.x;J.x=e.clientX,q-=t*.006,je=-t*.006});let Ge=()=>{J=null};$(t,`pointerup`,Ge),$(t,`pointercancel`,Ge),$(document,`visibilitychange`,()=>{document.hidden?We():Ue()}),i(()=>g.live,e=>{e?Ue():We()}),D.push(We),Ue()}),r(()=>{for(let e of D)e();D=[]}),(e,t)=>(n(),l(`div`,{ref_key:`host_ref`,ref:b,class:`experience-brain`,"aria-hidden":`true`,"data-nosnippet":``},[f(`canvas`,{ref_key:`canvas_ref`,ref:x,class:`experience-brain__canvas`},null,512),a(f(`span`,{ref_key:`link_ref`,ref:C,class:`experience-brain__link`},null,512),[[p,T.value]]),a(f(`div`,{ref_key:`cap_ref`,ref:S,class:`experience-brain__cap`},[T.value?(n(),l(`span`,h,u(o(_)(`kyo-web.landing.experience.brain.${T.value}`)),1)):s(``,!0)],512),[[p,T.value]])],512))}},[[`__scopeId`,`data-v-09070ccb`]]);export{g as default};