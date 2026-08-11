export const LIQUID_ORB_VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}`;

export const LIQUID_ORB_FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform float u_pal; uniform float u_boost;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}
vec3 ramp(vec3 c1,vec3 c2,vec3 c3,vec3 c4,vec3 c5,float t){t=fract(t);
  if(t<0.25)return mix(c1,c2,t/0.25); if(t<0.50)return mix(c2,c3,(t-0.25)/0.25);
  if(t<0.75)return mix(c3,c4,(t-0.50)/0.25); return mix(c4,c5,(t-0.75)/0.25);}
vec3 gcool(float t){return ramp(vec3(0.20,0.48,0.86),vec3(0.32,0.82,0.88),vec3(0.46,0.92,0.74),vec3(0.62,0.52,0.92),vec3(0.82,0.74,0.97),t);}
vec3 gwarm(float t){return ramp(vec3(0.97,0.72,0.42),vec3(0.97,0.56,0.47),vec3(0.95,0.62,0.70),vec3(0.82,0.60,0.80),vec3(0.99,0.86,0.64),t);}
vec3 gnight(float t){return ramp(vec3(0.15,0.24,0.60),vec3(0.13,0.46,0.47),vec3(0.40,0.29,0.70),vec3(0.60,0.33,0.57),vec3(0.48,0.54,0.82),t);}
vec3 basePal(float t){ if(u_pal<0.5) return gcool(t); else if(u_pal<1.5) return gwarm(t); return gnight(t); }
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time;
  float ang=atan(uv.y,uv.x); float r=length(uv);
  float wob=0.045*sin(ang*3.0+t*0.8)+0.03*sin(ang*5.0-t*0.6)+0.02*sin(ang*2.0+t*0.4);
  float radius=0.60+wob; float mask=smoothstep(radius,radius-0.025,r);
  if(mask<=0.001){gl_FragColor=vec4(0.0);return;}
  vec2 pp=uv*1.7; float tt=t*0.18;
  vec2 q=vec2(fbm(pp+vec2(0.0,tt)),fbm(pp+vec2(5.2,-tt)));
  vec2 rr=vec2(fbm(pp+3.5*q+vec2(1.7,9.2)+tt*1.2),fbm(pp+3.5*q+vec2(8.3,2.8)-tt));
  float f=fbm(pp+3.5*rr); float x=f*1.1+t*0.02;
  vec3 col=basePal(x);
  col=mix(col,col*col*1.18,0.4*u_boost); float gy=dot(col,vec3(0.30,0.59,0.11)); col=mix(col,vec3(gy),0.16); col+=0.06*u_boost;
  if(u_pal>1.5) col*=0.88;
  col*=0.74+0.46*smoothstep(radius,-0.1,r-uv.y*0.5);
  float spec=smoothstep(0.52,0.0,length(uv-vec2(-0.18,0.24))); col+=spec*0.40;
  col+=smoothstep(0.20,0.0,length(uv-vec2(0.15,0.28)))*0.20;
  float band=smoothstep(0.06,0.0,abs(fract((uv.x*0.9+uv.y+t*0.03))-0.5))*0.16; col+=band*(1.0-r);
  float rim=smoothstep(radius-0.07,radius,r);
  vec3 rimc=u_pal<0.5?vec3(0.55,0.72,1.0):(u_pal<1.5?vec3(1.0,0.86,0.70):vec3(0.72,0.66,1.0));
  col=mix(col,col+rimc,rim*0.4); col=clamp(col,0.0,1.0);
  gl_FragColor=vec4(col,mask);
}`;

export const LIQUID_ORB_PAL = { cool: 0, warm: 1, night: 2 };
export const LIQUID_ORB_BASE_SPEED = { cool: 0.6, warm: 0.6, night: 0.42 };
export const LIQUID_ORB_STATE_SPEED = { idle: 1, listening: 1.37, speaking: 1.75 };
export const LIQUID_ORB_STATE_BOOST = { idle: 0.9, listening: 1.0, speaking: 1.12 };

const THEME_TO_PALETTE = { day: "warm", dusk: "cool", night: "night" };

export function readLiquidOrbPalette() {
  const theme = document.documentElement.getAttribute("data-theme");
  return THEME_TO_PALETTE[theme] || "warm";
}

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function createLiquidOrbProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, LIQUID_ORB_VERT);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, LIQUID_ORB_FRAG);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }
  gl.attachShader(prog, vertexShader);
  gl.attachShader(prog, fragmentShader);
  gl.linkProgram(prog);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

let webglSupportCache = null;
export function isLiquidOrbSupported() {
  if (webglSupportCache !== null) return webglSupportCache;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) { webglSupportCache = false; return false; }
    const prog = createLiquidOrbProgram(gl);
    webglSupportCache = Boolean(prog);
    if (prog) gl.deleteProgram(prog);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupportCache = false;
  }
  return webglSupportCache;
}
