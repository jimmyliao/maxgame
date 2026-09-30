import * as THREE from "three";

const canvas = document.querySelector("#world");
const start = document.querySelector("#start");
const objective = document.querySelector("#objective");
const fallback = document.querySelector("#fallback");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch { fallback.hidden = false; start.hidden = true; throw new Error("WebGL unavailable"); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#8eb8be");
scene.fog = new THREE.FogExp2("#9ebfb0", 0.018);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
const hemi = new THREE.HemisphereLight("#d9edff", "#29451f", 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff1c2", 3.6); sun.position.set(-18, 28, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -30; sun.shadow.camera.right = sun.shadow.camera.top = 30; scene.add(sun);

const shade = (hex, rough = 0.8) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
const addMesh = (geo, mat, pos, scale = [1, 1, 1], parent = scene) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
};
const terrain = new THREE.PlaneGeometry(80, 80, 48, 48);
const pos = terrain.attributes.position, cols = [];
for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); const h = Math.sin(x * .21) * .38 + Math.cos(y * .18) * .3 + Math.sin((x + y) * .35) * .12; pos.setZ(i, h); const c = new THREE.Color().setHSL(.25 + h * .015, .32, .25 + Math.max(0, h) * .08); cols.push(c.r, c.g, c.b); }
terrain.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); terrain.computeVertexNormals();
const ground = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const trunk = new THREE.CylinderGeometry(.18, .33, 3.4, 8);
const crown = new THREE.ConeGeometry(1.55, 4.8, 9);
const darkCrown = new THREE.ConeGeometry(1.2, 3.8, 9);
function tree(x, z, s, tint) {
  const g = new THREE.Group(); g.position.set(x, .1, z); g.rotation.y = (x * 7 + z * 3) % 6; g.scale.setScalar(s); scene.add(g);
  addMesh(trunk, shade("#5a3d25"), [0, 1.7, 0], [1, 1, 1], g);
  addMesh(crown, shade(tint), [0, 4.1, 0], [1, 1, 1], g);
  addMesh(darkCrown, shade("#174522"), [.18, 5.45, -.12], [1, 1, 1], g);
}
const treeSpots = [[-14,-11,1.5],[-9,-15,1.1],[-3,-17,1.6],[4,-16,1.4],[11,-15,1.8],[16,-10,1.3],[-18,-2,1.7],[17,1,1.6],[-17,9,1.5],[17,11,1.9],[-13,16,1.4],[-7,18,1.7],[2,18,1.8],[10,17,1.3],[-20,-16,2],[20,-18,2]];
treeSpots.forEach(([x,z,s], i) => tree(x, z, s, i % 3 ? "#286836" : "#377c41"));
for (let i = 0; i < 55; i++) { const a = i * 2.399, r = 4 + (i % 9) * 1.5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < 4 && Math.abs(z) < 6) continue; const fern = addMesh(new THREE.ConeGeometry(.25, .9, 5), shade(i % 2 ? "#397c3b" : "#245f32"), [x, .42, z], [1, 1, 1]); fern.rotation.z = .35; fern.rotation.y = a; }
for (let i = 0; i < 20; i++) { const a = i * 1.71, r = 5 + (i % 5) * 2.4; addMesh(new THREE.DodecahedronGeometry(.45 + (i % 3) * .18, 0), shade("#68746a"), [Math.cos(a) * r, .35, Math.sin(a) * r], [1, .7, 1]); }

function spottedTexture() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#bd8240"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 95; i++) { const x = (i * 73) % 256, y = (i * 131) % 256, r = 3 + i % 7; g.fillStyle = i % 3 ? "#402d1e" : "#d9a95f"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function leopard() {
  const g = new THREE.Group(), fur = new THREE.MeshStandardMaterial({ map: spottedTexture(), roughness: .94 });
  const body = addMesh(new THREE.SphereGeometry(1, 18, 12), fur, [0, 1.05, 0], [1.05, .65, .48], g);
  addMesh(new THREE.SphereGeometry(.48, 16, 10), fur, [0, 1.45, -.72], [.8, .8, .85], g);
  [[-.27,1.84,-.95],[.27,1.84,-.95]].forEach(p => addMesh(new THREE.ConeGeometry(.15,.34,4), fur, p, [1,1,1], g));
  const legs = [[-.62,.52,-.38],[.62,.52,-.38],[-.62,.52,.38],[.62,.52,.38]].map(p => addMesh(new THREE.CylinderGeometry(.14,.17,.95,7), fur, p, [1,1,1], g));
  const tail = addMesh(new THREE.CylinderGeometry(.08,.22,1.8,8), fur, [0,.96,.95], [1,1,1], g); tail.rotation.x = Math.PI / 2.5;
  g.userData = { legs, tail, body }; g.position.set(0, .05, 5); scene.add(g); return g;
}
function iguana() {
  const g = new THREE.Group(), skin = shade("#4e8c43"), pale = shade("#9bb65d");
  addMesh(new THREE.SphereGeometry(1, 14, 9), skin, [0,.72,0], [1.05,.42,.35], g);
  addMesh(new THREE.SphereGeometry(.38,12,8), skin, [0, .95, -.72], [.9,.75,1], g);
  addMesh(new THREE.CylinderGeometry(.04,.2,1.65,7), skin, [0,.66,.98], [1,1,1], g).rotation.x = Math.PI/2.45;
  for(let i=0;i<7;i++) addMesh(new THREE.ConeGeometry(.1,.42,4), pale, [0,1.12,i*.15-.35], [1,1,1], g);
  [[-.53,.38,-.22],[.53,.38,-.22],[-.53,.38,.32],[.53,.38,.32]].forEach(p=>addMesh(new THREE.CylinderGeometry(.06,.1,.64,6),skin,p,[1,1,1],g).rotation.z=p[0]>0?.75:-.75);
  g.position.set(0,.05,-5); scene.add(g); return g;
}
const cat = leopard(), lizard = iguana();
const keys = new Set(); let yaw = 0, pitch = .28, dragging = false, lastX = 0, lastY = 0, playing = false, met = false;
addEventListener("keydown", e => keys.add(e.key.toLowerCase())); addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => { if (!dragging) return; yaw -= (e.clientX - lastX) * .008; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - lastY) * .006, .08, .65); lastX = e.clientX; lastY = e.clientY; });
canvas.addEventListener("pointerup", () => dragging = false);
start.addEventListener("click", () => { playing = true; start.hidden = true; canvas.focus(); });
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } addEventListener("resize", resize); resize();
const clock = new THREE.Clock();
function update(dt, t) {
  if (playing) { const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); const side = new THREE.Vector3(-forward.z, 0, forward.x); const move = new THREE.Vector3(); if(keys.has("w")||keys.has("arrowup")) move.add(forward); if(keys.has("s")||keys.has("arrowdown")) move.sub(forward); if(keys.has("a")||keys.has("arrowleft")) move.sub(side); if(keys.has("d")||keys.has("arrowright")) move.add(side); if(move.lengthSq()){ move.normalize().multiplyScalar(dt*4); cat.position.add(move); cat.rotation.y = Math.atan2(move.x, move.z) + Math.PI; } }
  cat.userData.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*9+i*Math.PI/2)*.45); cat.userData.tail.rotation.z=Math.sin(t*4)*.18;
  const dist = cat.position.distanceTo(lizard.position); if(dist < 7.2 && !met){ met=true; objective.textContent="綠鬣蜥發現石虎了！牠正逃離棲地。"; }
  const escape = met ? .7 : .15; lizard.position.x = Math.sin(t * .35) * (met ? 9 : 3); lizard.position.z = -5 - Math.cos(t*.35) * escape; lizard.rotation.y = Math.atan2(Math.cos(t*.35), -Math.sin(t*.35));
  const behind = new THREE.Vector3(Math.sin(yaw)*7, 3.3+pitch*4, Math.cos(yaw)*7); camera.position.copy(cat.position).add(behind); camera.lookAt(cat.position.x, cat.position.y+1, cat.position.z);
}
function frame(){ const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime; update(dt,t); renderer.render(scene,camera); requestAnimationFrame(frame); } frame();
