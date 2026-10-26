/* Tideglass — original WebGL2 shader toy.
   Spectral ribbon, fluid orbs, and a liquid-glass lens.
   Shipped license: LICENSE.txt */
(function () {
  "use strict";

  var canvas = document.getElementById("stage");
  var hint = document.getElementById("hint");
  var gear = document.getElementById("gear");
  var panel = document.getElementById("panel");
  var btnRibbon = document.getElementById("mode-ribbon");
  var btnOrbs = document.getElementById("mode-orbs");
  var btnHome = document.getElementById("lens-home");

  var VERT = [
    "#version 300 es",
    "layout(location=0) in vec2 a;",
    "out vec2 v;",
    "void main(){",
    "  v=a*0.5+0.5;",
    "  gl_Position=vec4(a,0.0,1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 v;",
    "out vec4 o;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uForm;",
    "uniform vec4 uGlass;",
    "uniform vec3 uNeck;",
    "uniform float uSettle;",
    "uniform vec3 uPulse;",
    "uniform float uPx;",
    "uniform float uLite;",
    "",
    "vec2 world(vec2 uv){",
    "  float a=uRes.y/max(uRes.x,1.0);",
    "  return vec2(uv.x-0.5,(uv.y-0.5)*a);",
    "}",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float smin(float a,float b,float k){",
    "  float h=max(k-abs(a-b),0.0)/max(k,1e-4);",
    "  return min(a,b)-h*h*k*0.25;",
    "}",
    "vec2 sn(vec2 g){float l=length(g);return l>1e-4?g/l:vec2(0.0,1.0);}",
    "float sdCirc(vec2 p,vec2 c,float r){return length(p-c)-r;}",
    "float sdStad(vec2 p,vec2 c,float halfL,float r){",
    "  vec2 q=p-c; q.x-=clamp(q.x,-halfL,halfL); return length(q)-r;",
    "}",
    "vec2 gStad(vec2 p,vec2 c,float halfL){",
    "  vec2 q=p-c; q.x-=clamp(q.x,-halfL,halfL); return q;",
    "}",
    "float sminAware(float a,float b,vec2 ga,vec2 gb,float k){",
    "  float face=clamp(-dot(sn(ga),sn(gb)),0.0,1.0);",
    "  float kk=max(k*mix(0.3,1.0,face),0.001);",
    "  return smin(a,b,kk);",
    "}",
    "float voice(vec2 p,float freq,float phase,float amp,float y0){",
    "  float s=sin(freq*p.x+phase);",
    "  float co=cos(freq*p.x+phase);",
    "  float slope=amp*freq*co;",
    "  return (p.y-(y0+amp*s))/sqrt(1.0+slope*slope);",
    "}",
    "float lor(float d,float h){return h*h/(d*d+h*h);}",
    "vec3 ribbon(vec2 p,float t){",
    "  float breathe=0.86+0.14*sin(t*1.6);",
    "  float y0=0.02;",
    "  float a1=0.062*breathe,a2=0.044*breathe,a3=0.03*breathe;",
    "  float ph=t*1.25;",
    "  float d1=voice(p,8.0,ph+0.5,a1,y0);",
    "  float d2=voice(p,13.0,ph*1.17+2.2,a2,y0+0.01);",
    "  float d3=voice(p,18.5,ph*0.72+4.1,a3,y0-0.008);",
    "  float h1=0.02+uPx*1.4,h2=0.013+uPx,h3=0.008+uPx*0.8;",
    "  vec3 coral=vec3(1.0,0.36,0.27);",
    "  vec3 gold=vec3(1.0,0.74,0.32);",
    "  vec3 aqua=vec3(0.22,0.9,0.76);",
    "  vec3 col=coral*lor(d1,h1)+gold*lor(d2,h2)+aqua*lor(d3,h3);",
    "  col+=vec3(1.0,0.95,0.9)*pow(lor(d1,h1*0.55),2.0)*0.7;",
    "  if(uLite<0.5){",
    "    float dR=voice(p+vec2(0.018,0.0),8.0,ph+0.5,a1,y0);",
    "    float dB=voice(p-vec2(0.016,0.0),13.0,ph*1.17+2.2,a2,y0+0.01);",
    "    col.r+=lor(dR,h1)*0.5;",
    "    col.b+=lor(dB,h2)*0.62;",
    "    float mirr=-0.14;",
    "    vec2 rp=vec2(p.x,2.0*mirr-p.y);",
    "    float rd=voice(rp,8.0,ph+0.5,a1,y0);",
    "    float fade=smoothstep(0.02,-0.55,p.y-mirr);",
    "    col+=(coral*0.55+gold*0.4+aqua*0.25)*lor(rd,h1)*fade*0.55;",
    "  }else{",
    "    col.r+=lor(d1,h1)*0.28;",
    "    col.b+=lor(d3,h3)*0.34;",
    "    float mirr=-0.14;",
    "    vec2 rp=vec2(p.x,2.0*mirr-p.y);",
    "    float rd=voice(rp,8.0,ph+0.5,a1*0.9,y0);",
    "    float fade=smoothstep(0.02,-0.55,p.y-mirr);",
    "    col+=(coral*0.4+gold*0.25)*lor(rd,h1*1.4)*fade*0.4;",
    "  }",
    "  col*=smoothstep(0.52,0.18,abs(p.x));",
    "  return col;",
    "}",
    "vec3 orbTint(float i){",
    "  float k=mod(i,6.0);",
    "  if(k<0.5) return vec3(1.0,0.4,0.3);",
    "  if(k<1.5) return vec3(1.0,0.72,0.3);",
    "  if(k<2.5) return vec3(0.25,0.9,0.74);",
    "  if(k<3.5) return vec3(0.55,0.45,1.0);",
    "  if(k<4.5) return vec3(1.0,0.48,0.68);",
    "  return vec3(0.4,0.78,1.0);",
    "}",
    "vec3 orbs(vec2 p,float t){",
    "  float d=8.0; vec3 acc=vec3(0.0); float wsum=0.0001;",
    "  for(int i=0;i<6;i++){",
    "    float fi=float(i);",
    "    float ang=fi*1.047+t*0.5;",
    "    float swing=0.12+0.04*sin(t*0.65+fi);",
    "    vec2 c=vec2(cos(ang)*swing*1.55,sin(ang*1.2)*swing-0.02);",
    "    float rr=0.05+0.012*sin(t*0.9+fi*1.7);",
    "    float di=length(p-c)-rr;",
    "    d=(i==0)?di:smin(d,di,0.085);",
    "    float w=exp(-max(di,-0.02)*9.0);",
    "    acc+=orbTint(fi)*w; wsum+=w;",
    "  }",
    "  acc/=wsum;",
    "  float glow=exp(-max(d,0.0)*10.0);",
    "  float core=smoothstep(0.028,-0.045,d);",
    "  return acc*(glow*1.2+core)+vec3(1.0,0.96,0.92)*core*0.45;",
    "}",
    "vec3 scene(vec2 p,float t){",
    "  float a=uRes.y/max(uRes.x,1.0);",
    "  vec2 drift=vec2(0.12*sin(t*0.23),0.05*cos(t*0.17));",
    "  float b1=exp(-dot((p-drift)*vec2(1.1,0.55),(p-drift)*vec2(1.1,0.55))*2.4);",
    "  vec2 low=vec2(-0.08,-0.25);",
    "  float b2=exp(-dot(p-low,p-low)*1.5);",
    "  float halo=exp(-dot(p-uGlass.xy,p-uGlass.xy)*36.0);",
    "  vec3 bg=mix(vec3(0.02,0.015,0.04),vec3(0.045,0.02,0.04),smoothstep(-0.3,0.9,p.y/max(a,0.4)));",
    "  bg*=mix(0.45,1.0,smoothstep(a*0.5,a*0.12,p.y));",
    "  bg+=vec3(0.03,0.12,0.11)*b1;",
    "  bg+=vec3(0.14,0.035,0.09)*b2;",
    "  bg+=vec3(0.10,0.045,0.14)*halo*0.32;",
    "  vec3 rib=ribbon(p,t);",
    "  vec3 orb=vec3(0.0);",
    "  if(uForm>0.001) orb=orbs(p,t);",
    "  float m=clamp(uForm,0.0,1.0);",
    "  vec3 col=bg+rib*(1.0-m)+orb*m;",
    "  col+=min(rib,vec3(1.2))*min(orb,vec3(1.2))*sin(m*3.14159)*0.5;",
    "  float age=t-uPulse.z;",
    "  if(uPulse.z>0.0 && age>0.0 && age<1.45){",
    "    float ring=exp(-pow(length(p-uPulse.xy)-age*0.72,2.0)/0.0032);",
    "    col+=vec3(0.72,0.86,1.0)*ring*(1.0-age/1.45);",
    "  }",
    "  return col;",
    "}",
    "float glassSd(vec2 p,float t){",
    "  vec2 c=uGlass.xy; float halfL=uGlass.z; float rad=max(uGlass.w,0.01);",
    "  float sd=sdStad(p,c,halfL,rad);",
    "  if(uNeck.z>0.004){",
    "    vec2 ga=gStad(p,c,halfL);",
    "    vec2 gn=p-uNeck.xy;",
    "    sd=sminAware(sd,sdCirc(p,uNeck.xy,uNeck.z),ga,gn,0.14);",
    "  }",
    "  return sd;",
    "}",
    "void main(){",
    "  vec2 p=world(v);",
    "  float t=uTime;",
    "  vec3 col=scene(p,t);",
    "  float sd=glassSd(p,t);",
    "  float rad=max(uGlass.w,0.02);",
    "  if(sd<0.07){",
    "    vec2 c=uGlass.xy; vec2 q=p-c;",
    "    float bell=clamp(-sd/rad,0.0,1.0);",
    "    float bend=0.48*bell*bell;",
    "    vec3 seen=col;",
    "    if(uLite<0.5){",
    "      vec3 s1=scene(c+q*(1.0-bend),t);",
    "      vec3 s2=scene(c+q*(1.0-bend*1.22),t);",
    "      seen=vec3(s2.r,s1.g,s1.b);",
    "    }",
    "    float inside=smoothstep(0.018,-0.008,sd);",
    "    vec3 frost=mix(seen,vec3(dot(seen,vec3(0.28,0.5,0.22))),0.07);",
    "    frost=mix(frost,vec3(0.72,0.82,0.92),0.035);",
    "    float well=sdStad(p,c,max(uGlass.z-0.02,0.0),max(rad*0.52,0.016));",
    "    float wellM=smoothstep(0.008,-0.018,well)*clamp(uSettle,0.0,1.0);",
    "    frost=mix(frost,frost*vec3(0.05,0.045,0.08),wellM*0.92);",
    "    float blink=smoothstep(0.15,0.85,0.5+0.5*sin(t*3.1));",
    "    float caret=smoothstep(0.0055,0.0014,abs(p.x-(c.x-uGlass.z+0.05)))",
    "      *smoothstep(0.02,0.007,abs(p.y-c.y))*blink*clamp(uSettle,0.0,1.0);",
    "    frost+=vec3(0.86,0.92,1.0)*caret;",
    "    vec2 rawN=gStad(p,c,uGlass.z);",
    "    float glen=length(rawN);",
    "    vec2 n=glen>1e-3?rawN/glen:vec2(0.0,1.0);",
    "    float px=max(uPx,0.0014);",
    "    float edge=exp(-sd*sd/(px*px*2.6));",
    "    float skin=smoothstep(-px*8.0,-px*1.5,sd)*smoothstep(px*2.2,-px*1.2,sd);",
    "    float cap=glen>0.025?pow(clamp(n.y,0.0,1.0),6.0)*skin:0.0;",
    "    float spec=glen>0.04?pow(clamp(dot(n,sn(vec2(-0.32,0.95))),0.0,1.0),18.0)*skin:0.0;",
    "    float flank=exp(-n.y*n.y*18.0)*skin;",
    "    float shade=smoothstep(-rad*0.15,rad*0.9,q.y)*inside;",
    "    frost*=mix(1.0,0.78,shade*0.45);",
    "    frost+=vec3(0.78,0.9,1.0)*edge*0.38;",
    "    frost+=vec3(1.0,0.55,0.38)*edge*0.08;",
    "    frost+=vec3(1.0,0.98,0.94)*cap*0.7;",
    "    frost+=vec3(1.0)*spec*0.45;",
    "    frost+=vec3(0.9,0.95,1.0)*flank*0.28;",
    "    vec2 mp=p-vec2(c.x+uGlass.z-0.065,c.y);",
    "    float marks=smoothstep(0.013,0.005,length(mp-vec2(-0.026,0.0)))",
    "      +smoothstep(0.013,0.005,length(mp))",
    "      +smoothstep(0.013,0.005,length(mp-vec2(0.026,0.0)));",
    "    frost+=vec3(0.82,0.9,1.0)*marks*clamp(uSettle,0.0,1.0)*inside;",
    "    col=mix(col,frost,smoothstep(0.06,-0.008,sd));",
    "  }",
    "  col+=(hash(gl_FragCoord.xy+fract(t)*17.0)-0.5)*0.02;",
    "  float vig=smoothstep(0.92,0.28,length((v-0.5)*vec2(0.82,1.0)));",
    "  col*=mix(0.8,1.0,vig);",
    "  col=1.0-exp(-col*1.28);",
    "  o=vec4(col,1.0);",
    "}"
  ].join("\n");

  function Spring(x, k, c) {
    this.x = x;
    this.v = 0;
    this.target = x;
    this.k = k;
    this.c = c;
  }
  function stepSpring(s, dt) {
    var h = dt;
    var n = 1;
    if (dt > 0.02) { n = 2; h = dt * 0.5; }
    for (var i = 0; i < n; i++) {
      s.v += (-s.k * (s.x - s.target) - s.c * s.v) * h;
      s.x += s.v * h;
    }
  }

  var form = new Spring(0, 22, 6.4);
  var gx = new Spring(0, 78, 12);
  var gy = new Spring(0.4, 78, 12);
  var half = new Spring(0, 52, 10);
  var rad = new Spring(0.12, 52, 10);
  var dragging = false;
  var settled = false;
  var neck = { x: 0, y: 0, r: 0 };
  var pulseAt = -1;
  var pulseP = { x: 0, y: 0 };
  var clock0 = performance.now();
  var readySent = false;
  var gl = null;
  var prog = null;
  var vao = null;
  var lite = 0;
  var locs = {};
  var dprCap = 1;

  function nowSec() { return (performance.now() - clock0) / 1000; }

  function viewSize() {
    var w = canvas.clientWidth || window.innerWidth || 390;
    var h = canvas.clientHeight || window.innerHeight || 700;
    if (w < 2) w = 390;
    if (h < 2) h = 700;
    return { w: w, h: h, a: h / w };
  }

  function layout(a) {
    var top = a * 0.5;
    var homeY = Math.min(0.06, top * 0.18);
    if (homeY < 0.02) homeY = Math.max(0.0, top * 0.1);
    return {
      a: a,
      top: top,
      homeY: homeY,
      homeRad: 0.16,
      settleY: 0.0,
      settleHalf: 0.26,
      settleRad: 0.052
    };
  }

  function displayedGlass(t) {
    var bob = dragging ? 0 : Math.sin(t * 0.85) * (settled ? 0.004 : 0.012);
    return {
      x: gx.x,
      y: gy.x + bob,
      half: Math.max(0, half.x),
      rad: Math.max(0.04, rad.x),
      bob: bob
    };
  }

  function goHome(m) {
    settled = false;
    gx.target = 0;
    gy.target = m.homeY;
    half.target = 0;
    rad.target = m.homeRad;
  }
  function goSettle(m) {
    settled = true;
    gx.target = 0;
    gy.target = m.settleY;
    half.target = m.settleHalf;
    rad.target = m.settleRad;
  }

  function setForm(v) {
    form.target = v > 0.5 ? 1 : 0;
    btnRibbon.className = v < 0.5 ? "on" : "";
    btnOrbs.className = v > 0.5 ? "on" : "";
    btnRibbon.setAttribute("aria-pressed", v < 0.5 ? "true" : "false");
    btnOrbs.setAttribute("aria-pressed", v > 0.5 ? "true" : "false");
  }

  function hideHint() { hint.classList.add("off"); }

  function sdStadJS(px, py, c, halfL, r) {
    var qx = px - c.x;
    if (qx > halfL) qx -= halfL;
    else if (qx < -halfL) qx += halfL;
    else qx = 0;
    var qy = py - c.y;
    return Math.hypot(qx, qy) - r;
  }

  function hitGlass(p, t) {
    var g = displayedGlass(t);
    return sdStadJS(p.x, p.y, g, g.half, g.rad) < 0.03;
  }

  function eventToP(e) {
    var r = canvas.getBoundingClientRect();
    var nx = (e.clientX - r.left) / Math.max(1, r.width);
    var ny = (e.clientY - r.top) / Math.max(1, r.height);
    var a = r.height / Math.max(1, r.width);
    return { x: nx - 0.5, y: (1 - ny - 0.5) * a, ny: ny };
  }

  function updateNeck(m, g) {
    if (!dragging) { neck.r = 0; return; }
    var gap = Math.max(0, m.top - g.y);
    neck.x = g.x * 0.35;
    neck.y = g.y + gap * 0.42;
    neck.r = Math.max(0, 0.05 * (1 - gap / Math.max(0.2, m.a * 0.85)));
  }

  function eat(el) {
    ["pointerdown", "pointermove", "pointerup", "pointercancel", "touchstart", "touchmove", "click", "wheel"].forEach(function (type) {
      el.addEventListener(type, function (e) { e.stopPropagation(); });
    });
  }

  var ptr = null;
  canvas.addEventListener("pointerdown", function (e) {
    if (ptr) return;
    if (e.isPrimary === false) return;
    e.preventDefault();
    var t = nowSec();
    var p = eventToP(e);
    ptr = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      drag: false,
      hit: hitGlass(p, t),
      top: p.ny < 0.22
    };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    if (ptr.hit || ptr.top) ptr.drag = true;
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    var dx = e.clientX - ptr.x;
    var dy = e.clientY - ptr.y;
    if (dx * dx + dy * dy > 64) ptr.moved = true;
    if (!ptr.drag && ptr.moved && dy > 10 && Math.abs(dy) > Math.abs(dx)) ptr.drag = true;
    if (!ptr.drag) return;
    e.preventDefault();
    dragging = true;
    var p = eventToP(e);
    var m = layout(viewSize().a);
    gx.target = Math.max(-0.16, Math.min(0.16, p.x));
    gy.target = Math.max(-m.top + 0.08, Math.min(m.top - 0.06, p.y));
    var pull = Math.max(0, m.homeY - gy.target);
    half.target = Math.min(m.settleHalf, pull * 1.15);
    var span = half.target / m.settleHalf;
    rad.target = m.homeRad + (m.settleRad - m.homeRad) * span;
  });
  function endPtr(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    var wasDrag = ptr.drag && ptr.moved;
    var wasHit = ptr.hit;
    ptr = null;
    dragging = false;
    hideHint();
    var m = layout(viewSize().a);
    if (wasDrag) {
      var mid = (m.homeY + m.settleY) * 0.5;
      if (gy.target < mid - 0.02 || half.target > 0.06) goSettle(m);
      else goHome(m);
      return;
    }
    var t = nowSec();
    var p = eventToP(e);
    if (wasHit || hitGlass(p, t)) {
      pulseAt = t;
      pulseP = p;
      return;
    }
    setForm(form.target > 0.5 ? 0 : 1);
  }
  canvas.addEventListener("pointerup", endPtr);
  canvas.addEventListener("pointercancel", endPtr);

  gear.addEventListener("click", function () {
    var open = document.documentElement.classList.toggle("on");
    gear.setAttribute("aria-expanded", open ? "true" : "false");
    hideHint();
  });
  btnRibbon.addEventListener("click", function () { setForm(0); hideHint(); });
  btnOrbs.addEventListener("click", function () { setForm(1); hideHint(); });
  btnHome.addEventListener("click", function () {
    goHome(layout(viewSize().a));
    hideHint();
  });
  eat(gear);
  eat(panel);

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  function link(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "a");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  function bootGL() {
    gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance"
    });
    if (!gl) {
      gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
    }
    if (!gl) return false;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    prog = link(gl, vs, fs);
    if (!prog) return false;
    var soft = false;
    var ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      var name = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
      soft = /swiftshader|llvmpipe|software/i.test(name);
    }
    lite = soft ? 1 : 0;
    dprCap = soft ? 1 : Math.min(window.devicePixelRatio || 1, 1.15);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    ["uRes", "uTime", "uForm", "uGlass", "uNeck", "uSettle", "uPulse", "uPx", "uLite"].forEach(function (n) {
      locs[n] = gl.getUniformLocation(prog, n);
    });
    gl.disable(gl.DEPTH_TEST);
    return true;
  }

  function fitBuffer() {
    var s = viewSize();
    var cap = lite ? 520 : 960;
    var long = s.w > s.h ? s.w : s.h;
    var dpr = dprCap;
    if (long * dpr > cap) dpr = cap / long;
    var bw = Math.max(2, Math.round(s.w * dpr));
    var bh = Math.max(2, Math.round(s.h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    return s;
  }

  function drawGL(t) {
    var s = fitBuffer();
    var m = layout(s.a);
    if (!dragging && !settled && Math.abs(gy.target - m.homeY) < 0.001) {
      gy.target = m.homeY;
    }
    var g = displayedGlass(t);
    updateNeck(m, g);
    var settle = Math.max(0, Math.min(1, g.half / 0.22));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(locs.uRes, canvas.width, canvas.height);
    gl.uniform1f(locs.uTime, t);
    gl.uniform1f(locs.uForm, Math.max(0, Math.min(1, form.x)));
    gl.uniform4f(locs.uGlass, g.x, g.y, g.half, g.rad);
    gl.uniform3f(locs.uNeck, neck.x, neck.y, neck.r);
    gl.uniform1f(locs.uSettle, settle);
    gl.uniform3f(locs.uPulse, pulseP.x, pulseP.y, pulseAt);
    gl.uniform1f(locs.uPx, 1 / canvas.width);
    gl.uniform1f(locs.uLite, lite);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  var ctx2 = null;
  function draw2D(t) {
    if (!ctx2) ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    var s = fitBuffer();
    var w = canvas.width;
    var h = canvas.height;
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.fillStyle = "#070510";
    ctx2.fillRect(0, 0, w, h);
    var y0 = h * 0.58;
    var amp = h * 0.035;
    var colors = ["#ff6a4a", "#ffc14d", "#3ee0c5"];
    for (var k = 0; k < 3; k++) {
      ctx2.beginPath();
      ctx2.strokeStyle = colors[k];
      ctx2.lineWidth = 2 + k;
      ctx2.globalAlpha = 0.85;
      for (var x = 0; x <= w; x += 3) {
        var u = x / w - 0.5;
        var y = y0 + Math.sin(u * (8 + k * 5) + t * (1.2 + k * 0.3) + k) * amp * (1 - k * 0.2);
        if (x === 0) ctx2.moveTo(x, y);
        else ctx2.lineTo(x, y);
      }
      ctx2.stroke();
    }
    ctx2.globalAlpha = 0.9;
    var m = layout(s.a);
    var g = displayedGlass(t);
    var cx = (g.x + 0.5) * w;
    var cy = h * (0.5 - g.y / m.a);
    var rw = (g.half + g.rad) * w;
    var rh = g.rad * w;
    ctx2.fillStyle = "rgba(190,210,230,0.22)";
    ctx2.beginPath();
    ctx2.ellipse(cx, cy, Math.max(4, rw), Math.max(4, rh), 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.strokeStyle = "rgba(230,240,255,0.7)";
    ctx2.stroke();
    ctx2.globalAlpha = 1;
  }

  var useGL = bootGL();
  var m0 = layout(viewSize().a);
  gy.x = gy.target = m0.homeY;
  rad.x = rad.target = m0.homeRad;

  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    var t = nowSec();
    if (!dragging) {
      var m = layout(viewSize().a);
      if (!settled) gy.target = m.homeY;
    }
    stepSpring(form, dt);
    stepSpring(gx, dt);
    stepSpring(gy, dt);
    stepSpring(half, dt);
    stepSpring(rad, dt);
    if (t > 2.5) hideHint();
    if (useGL) drawGL(t);
    else draw2D(t);
    if (!readySent && window.__gbSandbox && window.__gbSandbox.ready) {
      readySent = true;
      window.__gbSandbox.ready();
    }
  }
  window.addEventListener("resize", function () { fitBuffer(); });
  requestAnimationFrame(frame);
})();
