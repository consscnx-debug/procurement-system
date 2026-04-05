import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   🔥 FIREBASE CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════
   
   ⚠️ คำแนะนำ: เปลี่ยนค่าด้านล่างให้ตรงกับ Firebase Project ของคุณ
   ดูวิธีได้ที่ไฟล์ "คู่มือ-Firebase-Setup.md"
   
   ═══════════════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyC_mGZIs1D0Qe2XXTI3vKeujiTD8QBN1zk",
  authDomain: "procurement-cmpao.firebaseapp.com",
  databaseURL: "ใhttps://procurement-cmpao-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "procurement-cmpao",
  storageBucket: "procurement-cmpao.firebasestorage.app",
  messagingSenderId: "440316972917",
  appId: "1:440316972917:web:d6cc8d10b0dab310cf8d3c"
};

/* ═══════════════════════════════════════════════════════════════════════
   FIREBASE DATABASE LAYER (CDN-based, no npm needed in artifact)
   ═══════════════════════════════════════════════════════════════════════ */
let db = null;
let firebaseReady = false;
const DB_ROOT = "procurement";

function getFirebaseApp() {
  if (firebaseReady && db) return db;
  try {
    if (typeof window !== "undefined" && window.firebase) {
      if (!window.firebase.apps?.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      db = window.firebase.database();
      firebaseReady = true;
      return db;
    }
  } catch (e) { console.error("Firebase init error:", e); }
  return null;
}

async function fbSet(path, data) {
  try {
    const database = getFirebaseApp();
    if (database) {
      await database.ref(`${DB_ROOT}/${path}`).set(data);
      return true;
    }
  } catch (e) { console.error("Firebase write error:", e); }
  return false;
}

async function fbGet(path) {
  try {
    const database = getFirebaseApp();
    if (database) {
      const snap = await database.ref(`${DB_ROOT}/${path}`).once("value");
      return snap.val();
    }
  } catch (e) { console.error("Firebase read error:", e); }
  return null;
}

function fbListen(path, callback) {
  try {
    const database = getFirebaseApp();
    if (database) {
      const ref = database.ref(`${DB_ROOT}/${path}`);
      ref.on("value", (snap) => callback(snap.val()));
      return () => ref.off("value");
    }
  } catch (e) { console.error("Firebase listen error:", e); }
  return () => {};
}

/* ═══════════════════════════════════════════════════════════════════════
   FALLBACK: window.storage (Claude artifact) / In-memory
   ═══════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = "procurement-app-data";

async function fallbackLoad() {
  try {
    if (window.storage) {
      const r = await window.storage.get(STORAGE_KEY);
      if (r && r.value) return JSON.parse(r.value);
    }
  } catch (e) {}
  return null;
}

async function fallbackSave(data) {
  try {
    if (window.storage) {
      await window.storage.set(STORAGE_KEY, JSON.stringify(data));
      return true;
    }
  } catch (e) {}
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
   UNIFIED DATA LAYER — tries Firebase first, falls back gracefully
   ═══════════════════════════════════════════════════════════════════════ */
async function saveAllData(data) {
  const fbOk = await fbSet("appData", data);
  if (fbOk) return "firebase";
  const localOk = await fallbackSave(data);
  return localOk ? "local" : "error";
}

async function loadAllData() {
  const fbData = await fbGet("appData");
  if (fbData) return { data: fbData, source: "firebase" };
  const localData = await fallbackLoad();
  if (localData) return { data: localData, source: "local" };
  return { data: null, source: "none" };
}

function listenData(callback) {
  return fbListen("appData", (val) => {
    if (val) callback(val);
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */
const CENTERS = [
  "ศูนย์บำรุงโซนเหนือ ต.ม่อนปิน อ.ฝาง จ.เชียงใหม่",
  "ศูนย์ซ่อมบำรุงโซนกลางบน ต.สันผีเสื้อ อ.เมือง จ.เชียงใหม่",
  "ศูนย์ซ่อมบำรุงโซนกลางล่าง ต.ดอนแก้ว อ.แม่ริม จ.เชียงใหม่",
  "ศูนย์ซ่อมบำรุงโซนใต้ ต.บ้านเด่น อ.ฮอด จ.เชียงใหม่",
  "โรงผสมแอสฟัลต์ฯโซนเหนือ ต.ห้วยทราย อ.แม่ริม จ.เชียงใหม่",
  "โรงผสมแอสฟัลต์ฯโซนใต้ ต.บ้านตาล อ.ฮอด จ.เชียงใหม่",
  "ซื้อวัสดุเข้าโครงการฯ","อื่นๆ....."
];
const CREWS = [
  "ชุดซ่อมบำรุงปกติ โซนเหนือ","ชุดซ่อมบำรุงปกติ โซนกลางบน",
  "ชุดซ่อมบำรุงปกติ โซนกลางล่าง","ชุดบำรุงตามกำหนดเวลา โซนเหนือ",
  "ชุดบำรุงตามกำหนดเวลา โซนใต้","ชุดซ่อมบำรุงพิเศษประเภท Recycling โซนเหนือ",
  "ชุดซ่อมบำรุงพิเศษประเภท Recycling โซนใต้",
  "ชุดซ่อมบำรุงพิเศษประเภทงานบดอัด โซนเหนือ",
  "ชุดซ่อมบำรุงพิเศษประเภทงานบดอัด โซนใต้","อื่นๆ..."
];
const MONTHS_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const MATERIALS = [
  {key:"stone_dust",name:"หินฝุ่น",unit:"ลบ.ม.",priceUnit:"บาท/ลบ.ม.",cat:"stone"},
  {key:"stone_3_8",name:"หิน 3/8",unit:"ลบ.ม.",priceUnit:"บาท/ลบ.ม.",cat:"stone"},
  {key:"stone_1_2",name:"หิน 1/2",unit:"ลบ.ม.",priceUnit:"บาท/ลบ.ม.",cat:"stone"},
  {key:"stone_3_4",name:"หิน 3/4",unit:"ลบ.ม.",priceUnit:"บาท/ลบ.ม.",cat:"stone"},
  {key:"crushed_rock",name:"หินคลุก",unit:"ลบ.ม.",priceUnit:"บาท/ลบ.ม.",cat:"stone"},
  {key:"ac60_70",name:"ยาง AC 60/70",unit:"ตัน",priceUnit:"บาท/ตัน",cat:"rubber"},
  {key:"css1",name:"ยาง CSS-1",unit:"ถัง",priceUnit:"บาท/ถัง",cat:"rubber"},
  {key:"css1h",name:"ยาง CSS-1h",unit:"ถัง",priceUnit:"บาท/ถัง",cat:"rubber"},
  {key:"crs2",name:"ยาง CRS-2",unit:"ถัง",priceUnit:"บาท/ถัง",cat:"rubber"},
  {key:"cms2h",name:"ยาง CMS-2H",unit:"ถัง",priceUnit:"บาท/ถัง",cat:"rubber"},
  {key:"hotmix",name:"ยาง HOTMIX",unit:"ตัน",priceUnit:"บาท/ตัน",cat:"rubber"},
  {key:"cement_bag",name:"ปูนซีเมนต์ (ถุง)",unit:"ถุง",priceUnit:"บาท/ถุง",cat:"cement"},
  {key:"cement_ton",name:"ปูนซีเมนต์ (ตัน)",unit:"ตัน",priceUnit:"บาท/ตัน",cat:"cement"},
];
const ROAD_TYPES = ["ถนนถ่ายโอนในความรับผิดชอบ อบจ.ชม.","ถนนในความรับผิดชอบ อปท.(เชื่อมระหว่างตำบล)","อื่นๆ..."];
const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmt = (n)=>n?Number(n).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2}):"0.00";

/* ═══════════════ SVG ICONS ═══════════════ */
const IP={building:"M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M10 11h2M10 15h2M14 11h2M14 15h2M18 11h0M6 7l6-4 6 4",dollar:"M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",clipboard:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z",chart:"M18 20V10M12 20V4M6 20v-6",save:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",trash:"M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6",check:"M20 6L9 17l-5-5",eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",plus:"M12 5v14M5 12h14",x:"M18 6L6 18M6 6l12 12",chevDown:"M6 9l6 6 6-6",db:"M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zM2 11.5c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5",refresh:"M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15",cloud:"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",fire:"M12 2C8 6 4 9.5 4 14a8 8 0 0 0 16 0c0-4.5-4-8-8-12z",wifi:"M5 12.55a11 11 0 0 1 14 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h0"};
const Ic=({d,size=18,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;

/* ═══════════════ UI COMPONENTS ═══════════════ */
function GlassCard({children,style:sx,accent,glow}){return <div style={{background:"rgba(30,41,59,0.65)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:20,border:`1px solid ${accent||"rgba(148,163,184,0.08)"}`,padding:28,marginBottom:24,position:"relative",overflow:"hidden",boxShadow:glow?`0 0 40px ${glow}`:"0 8px 32px rgba(0,0,0,0.25)",...sx}}>{children}</div>}
function SectionLabel({icon,text,color="#94a3b8"}){return <div style={{display:"flex",alignItems:"center",gap:10,margin:"24px 0 14px",paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{width:32,height:32,borderRadius:10,background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{icon}</div><span style={{fontSize:13.5,fontWeight:600,color,letterSpacing:0.4}}>{text}</span></div>}
function FormSelect({label,value,onChange,options,placeholder}){return <div style={{flex:1,minWidth:240}}><label style={cs.label}>{label}</label><div style={{position:"relative"}}><select style={cs.select} value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder||"— กรุณาเลือก —"}</option>{options.map((o,i)=><option key={i} value={o}>{o}</option>)}</select><div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#475569"}}><Ic d={IP.chevDown} size={15}/></div></div></div>}
function FormInput({label,value,onChange,type="text",placeholder,readOnly,highlight,suffix}){return <div style={{flex:1,minWidth:155}}><label style={cs.label}>{label}</label><div style={{position:"relative"}}><input style={{...cs.input,...(readOnly?{background:"rgba(15,23,42,0.8)",color:highlight||"#64748b",fontWeight:700,cursor:"default"}:{}), ...(highlight&&!readOnly?{color:highlight,fontWeight:700}:{})}} type={type} value={value} readOnly={readOnly} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder}/>{suffix&&<span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:11,fontWeight:500}}>{suffix}</span>}</div></div>}
function Btn({children,onClick,variant="primary",small,disabled,icon}){const pal={primary:{bg:"linear-gradient(135deg,#3b82f6,#8b5cf6)",sh:"rgba(59,130,246,0.25)"},success:{bg:"linear-gradient(135deg,#10b981,#06b6d4)",sh:"rgba(16,185,129,0.25)"},danger:{bg:"linear-gradient(135deg,#ef4444,#f97316)",sh:"rgba(239,68,68,0.2)"},warning:{bg:"linear-gradient(135deg,#f59e0b,#ef4444)",sh:"rgba(245,158,11,0.2)"},info:{bg:"linear-gradient(135deg,#06b6d4,#3b82f6)",sh:"rgba(6,182,212,0.2)"},ghost:{bg:"rgba(255,255,255,0.04)",sh:"transparent"},dark:{bg:"linear-gradient(135deg,#334155,#1e293b)",sh:"rgba(0,0,0,0.15)"}};const p=pal[variant]||pal.primary;return <button disabled={disabled} onClick={onClick} className="btn-hover" style={{display:"inline-flex",alignItems:"center",gap:7,padding:small?"7px 14px":"11px 24px",background:p.bg,border:variant==="ghost"?"1px solid rgba(255,255,255,0.08)":"none",borderRadius:12,color:variant==="ghost"?"#94a3b8":"#fff",fontFamily:"'Krub',sans-serif",fontWeight:600,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",transition:"all .25s",boxShadow:`0 4px 14px ${p.sh}`,opacity:disabled?.4:1,whiteSpace:"nowrap",letterSpacing:0.3}}>{icon&&<Ic d={IP[icon]} size={small?14:16}/>}{children}</button>}
function Modal({open,onClose,title,children,wide}){if(!open)return null;return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(8px)"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"linear-gradient(180deg,#1e293b,#0f172a)",borderRadius:24,padding:32,width:"100%",maxWidth:wide?1060:640,maxHeight:"88vh",overflowY:"auto",border:"1px solid rgba(59,130,246,0.12)",boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><h3 style={{margin:0,color:"#f1f5f9",fontSize:19,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{width:36,height:36,borderRadius:12,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic d={IP.x} size={16}/></button></div>{children}</div></div>}
function Badge({text,color="#3b82f6"}){return <span style={{display:"inline-block",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600,background:`${color}18`,color,letterSpacing:0.3}}>{text}</span>}
function Empty({icon,text}){return <div style={{textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:52,marginBottom:16,filter:"grayscale(0.3)"}}>{icon}</div><p style={{color:"#475569",fontSize:15,lineHeight:1.7,whiteSpace:"pre-line"}}>{text}</p></div>}
function Td({children,align,highlight,bold,style:sx}){return <td style={{padding:"14px 16px",color:highlight||"#cbd5e1",borderBottom:"1px solid rgba(255,255,255,0.03)",textAlign:align||"left",fontWeight:bold?700:400,verticalAlign:"middle",...sx}}>{children}</td>}
function StatusChip({label,value,active,color}){return <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 16px",borderRadius:12,background:active?`${color}10`:"rgba(255,255,255,0.02)",border:`1px solid ${active?`${color}25`:"rgba(255,255,255,0.04)"}`}}><div style={{width:7,height:7,borderRadius:"50%",background:active?color:"#475569",boxShadow:active?`0 0 8px ${color}`:"none"}}/><span style={{fontSize:12,color:"#64748b"}}>{label}:</span><span style={{fontSize:12,color:active?color:"#475569",fontWeight:600}}>{value}</span></div>}
function CardHeader({icon,color,title,sub}){return <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}><div style={{width:44,height:44,borderRadius:14,background:`linear-gradient(135deg,${color},${color}bb)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${color}30`}}><Ic d={icon} size={20} color="#fff"/></div><div><h2 style={{fontSize:18,fontWeight:700,color:"#f1f5f9"}}>{title}</h2>{sub&&<p style={{fontSize:12,color:"#64748b",marginTop:2}}>{sub}</p>}</div></div>}

function SaveIndicator({status,source}){
  const configs={saving:{color:"#f59e0b",icon:IP.refresh,text:"กำลังบันทึก..."},saved:{color:"#22c55e",icon:IP.cloud,text:source==="firebase"?"บันทึกบน Firebase แล้ว":"บันทึกแล้ว"},error:{color:"#ef4444",icon:IP.x,text:"บันทึกไม่สำเร็จ"},idle:{color:"#475569",icon:IP.db,text:"พร้อมใช้งาน"}};
  const c=configs[status]||configs.idle;
  return <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",borderRadius:10,background:`${c.color}10`,border:`1px solid ${c.color}20`}}>
    {source==="firebase"&&status!=="saving"&&<Ic d={IP.fire} size={13} color="#f59e0b"/>}
    <Ic d={c.icon} size={14} color={c.color}/><span style={{fontSize:11,color:c.color,fontWeight:600}}>{c.text}</span>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════ */
export default function App(){
  const [tab,setTab]=useState(0);
  const [projects,setProjects]=useState([]);
  const [priceSets,setPriceSets]=useState([]);
  const [projectData,setProjectData]=useState([]);
  const [activeProject,setActiveProject]=useState(null);
  const [activePriceSet,setActivePriceSet]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saveStatus,setSaveStatus]=useState("idle");
  const [dataSource,setDataSource]=useState("none");
  const saveTimer=useRef(null);
  const isFirst=useRef(true);
  const skipNextSync=useRef(false);
  const importRef=useRef();

  // ── LOAD + LISTEN ──
  useEffect(()=>{
    (async()=>{
      const {data,source}=await loadAllData();
      if(data){
        if(data.projects)setProjects(data.projects);
        if(data.priceSets)setPriceSets(data.priceSets);
        if(data.projectData)setProjectData(data.projectData);
        if(data.activeProject)setActiveProject(data.activeProject);
        if(data.activePriceSet)setActivePriceSet(data.activePriceSet);
      }
      setDataSource(source);
      setLoading(false);
    })();

    // Real-time listener for Firebase
    const unsub=listenData((val)=>{
      if(skipNextSync.current){skipNextSync.current=false;return;}
      if(val){
        if(val.projects)setProjects(val.projects);
        if(val.priceSets)setPriceSets(val.priceSets);
        if(val.projectData)setProjectData(val.projectData);
        if(val.activeProject!==undefined)setActiveProject(val.activeProject);
        if(val.activePriceSet!==undefined)setActivePriceSet(val.activePriceSet);
      }
    });
    return unsub;
  },[]);

  // ── AUTO-SAVE (debounced) ──
  useEffect(()=>{
    if(isFirst.current){isFirst.current=false;return;}
    if(loading)return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current=setTimeout(async()=>{
      skipNextSync.current=true;
      const result=await saveAllData({projects,priceSets,projectData,activeProject,activePriceSet,lastUpdated:new Date().toISOString()});
      setDataSource(result==="firebase"?"firebase":result==="local"?"local":"none");
      setSaveStatus(result!=="error"?"saved":"error");
      setTimeout(()=>setSaveStatus("idle"),3000);
    },600);
    return ()=>{if(saveTimer.current)clearTimeout(saveTimer.current)};
  },[projects,priceSets,projectData,activeProject,activePriceSet,loading]);

  const tabs=[{icon:IP.building,label:"เลือกศูนย์ซ่อมบำรุงฯ",color:"#3b82f6"},{icon:IP.dollar,label:"กรอกราคาวัสดุฯประจำเดือน",color:"#10b981"},{icon:IP.clipboard,label:"กรอกข้อมูลโครงการ",color:"#f59e0b"},{icon:IP.chart,label:"ตารางสรุปข้อมูลโครงการ",color:"#8b5cf6"}];

  const exportData=()=>{const d={projects,priceSets,projectData,activeProject,activePriceSet,exportDate:new Date().toISOString()};const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`procurement_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();};
  const importData=(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{try{const d=JSON.parse(ev.target.result);if(d.projects)setProjects(d.projects);if(d.priceSets)setPriceSets(d.priceSets);if(d.projectData)setProjectData(d.projectData);if(d.activeProject)setActiveProject(d.activeProject);if(d.activePriceSet)setActivePriceSet(d.activePriceSet);alert("นำเข้าข้อมูลสำเร็จ!");}catch(err){alert("ไฟล์ไม่ถูกต้อง");}};reader.readAsText(file);};
  const resetData=async()=>{if(!window.confirm("⚠️ ยืนยันลบข้อมูลทั้งหมด?"))return;if(!window.confirm("คุณแน่ใจหรือไม่? ข้อมูลทั้งหมดจะถูกลบถาวร"))return;setProjects([]);setPriceSets([]);setProjectData([]);setActiveProject(null);setActivePriceSet(null);alert("ลบข้อมูลสำเร็จ");};

  if(loading)return(
    <div style={{fontFamily:"'Krub',sans-serif",background:"#0b1120",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Krub:wght@400;600;700&display=swap');@keyframes spin{to{transform:rotate(360deg)}}body{background:#0b1120}`}</style>
      <div style={{width:48,height:48,border:"3px solid rgba(59,130,246,0.2)",borderTopColor:"#3b82f6",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <p style={{color:"#64748b",fontSize:16}}>กำลังเชื่อมต่อฐานข้อมูล...</p>
    </div>
  );

  return(
    <div style={{fontFamily:"'Krub',sans-serif",background:"#0b1120",minHeight:"100vh",color:"#e2e8f0"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Krub:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#0b1120;overflow-x:hidden}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#334155;border-radius:10px}select option{background:#1e293b;color:#e2e8f0}input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.8)}input:focus,select:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,0.15)!important;outline:none}@keyframes pulse-glow{0%,100%{opacity:0.3}50%{opacity:0.7}}@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes gradient-x{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}.row-hover:hover{background:rgba(59,130,246,0.04)!important}.btn-hover:hover{transform:translateY(-1px);filter:brightness(1.12)}.tab-hover:hover{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.12)!important}`}</style>
      <div style={{position:"fixed",top:-150,right:-150,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-120,left:-120,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      {/* HEADER */}
      <header style={{background:"linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.92))",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(59,130,246,0.1)",padding:"0 28px",height:82,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <div style={{position:"relative",width:62,height:62}}><div style={{width:62,height:62,borderRadius:16,background:"linear-gradient(135deg,#ffffff,#f0f4ff)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(59,130,246,0.2),0 4px 16px rgba(0,0,0,0.3)",border:"2px solid rgba(59,130,246,0.25)",overflow:"hidden"}}><img src="https://chiangmaipao.go.th/cmpao/upload/filemanager/logo.png?_t=1710910750" alt="อบจ.เชียงใหม่" style={{width:50,height:50,objectFit:"contain"}} onError={e=>{e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' rx='10' fill='%233b82f6'/%3E%3Ctext x='25' y='33' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3Eอบจ%3C/text%3E%3C/svg%3E"}}/></div><div style={{position:"absolute",inset:-4,borderRadius:20,border:"2px solid rgba(59,130,246,0.15)",animation:"pulse-glow 3s ease-in-out infinite",pointerEvents:"none"}}/></div>
          <div><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><h1 style={{fontSize:20,fontWeight:700,color:"#f8fafc"}}>ระบบแผนการจัดซื้อวัสดุก่อสร้าง</h1><span style={{padding:"3px 12px",borderRadius:8,fontSize:11,fontWeight:700,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",backgroundSize:"200% 200%",animation:"gradient-x 3s ease infinite",color:"#fff"}}>ประจำปี</span></div><p style={{fontSize:12.5,color:"#64748b",marginTop:3}}>องค์การบริหารส่วนจังหวัดเชียงใหม่ ・ กองช่าง ฝ่ายก่อสร้างและซ่อมบำรุง</p></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <SaveIndicator status={saveStatus} source={dataSource}/>
          <input type="file" accept=".json" ref={importRef} style={{display:"none"}} onChange={importData}/>
          <Btn small variant="dark" icon="upload" onClick={()=>importRef.current?.click()}>นำเข้า</Btn>
          <Btn small variant="success" icon="download" onClick={exportData}>ส่งออก</Btn>
        </div>
      </header>

      {/* TABS */}
      <nav style={{display:"flex",gap:8,padding:"14px 28px",background:"rgba(11,17,32,0.85)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.04)",position:"sticky",top:82,zIndex:90,overflowX:"auto"}}>
        {tabs.map((t,i)=>{const active=tab===i;return <button key={i} className={active?"":"tab-hover"} onClick={()=>setTab(i)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 24px",borderRadius:14,background:active?`linear-gradient(135deg,${t.color},${t.color}bb)`:"rgba(255,255,255,0.03)",border:active?"1px solid transparent":"1px solid rgba(255,255,255,0.05)",color:active?"#fff":"#94a3b8",fontFamily:"'Krub',sans-serif",fontWeight:active?600:500,fontSize:14,cursor:"pointer",transition:"all .3s",boxShadow:active?`0 4px 20px ${t.color}35`:"none",whiteSpace:"nowrap"}}><Ic d={t.icon} size={18} color={active?"#fff":"#64748b"}/>{t.label}</button>})}
      </nav>

      {/* STATUS BAR */}
      <div style={{padding:"12px 28px",display:"flex",gap:12,flexWrap:"wrap",borderBottom:"1px solid rgba(255,255,255,0.03)",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <StatusChip label="โครงการ" value={activeProject?projects.find(p=>p.id===activeProject)?.center?.split(" ")[0]:"ยังไม่เลือก"} active={!!activeProject} color="#3b82f6"/>
          <StatusChip label="ราคาวัสดุ" value={activePriceSet?(()=>{const ps=priceSets.find(p=>p.id===activePriceSet);return ps?`${ps.month} ${ps.yearBe}`:"—";})():"ยังไม่เลือก"} active={!!activePriceSet} color="#10b981"/>
          <StatusChip label="ฐานข้อมูล" value={dataSource==="firebase"?"Firebase Cloud":dataSource==="local"?"Local Storage":"ไม่ได้เชื่อมต่อ"} active={dataSource==="firebase"} color={dataSource==="firebase"?"#f59e0b":"#64748b"}/>
        </div>
        <Btn small variant="danger" icon="trash" onClick={resetData}>รีเซ็ตข้อมูล</Btn>
      </div>

      {/* CONTENT */}
      <main style={{padding:28,maxWidth:1360,margin:"0 auto",position:"relative",zIndex:1}}>
        <div style={{animation:"slideIn 0.35s ease-out"}} key={tab}>
          {tab===0&&<Tab1 projects={projects} setProjects={setProjects} activeProject={activeProject} setActiveProject={setActiveProject} setTab={setTab}/>}
          {tab===1&&<Tab2 priceSets={priceSets} setPriceSets={setPriceSets} activePriceSet={activePriceSet} setActivePriceSet={setActivePriceSet}/>}
          {tab===2&&<Tab3 activeProject={activeProject} activePriceSet={activePriceSet} projectData={projectData} setProjectData={setProjectData} priceSets={priceSets} projects={projects}/>}
          {tab===3&&<Tab4 projects={projects} projectData={projectData} priceSets={priceSets} setProjectData={setProjectData}/>}
        </div>
      </main>
      <footer style={{textAlign:"center",padding:"24px 28px",borderTop:"1px solid rgba(255,255,255,0.03)",color:"#334155",fontSize:12}}>ระบบแผนการจัดซื้อวัสดุก่อสร้าง © {new Date().getFullYear()} อบจ.เชียงใหม่ ・ {dataSource==="firebase"?"🔥 Firebase Cloud Database":"💾 Local Storage"}</footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1 — ศูนย์ซ่อมบำรุง
   ═══════════════════════════════════════════════════════════════════════ */
function Tab1({projects,setProjects,activeProject,setActiveProject,setTab}){
  const [year,setYear]=useState("2569");const [center,setCenter]=useState("");const [crew,setCrew]=useState("");const [editId,setEditId]=useState(null);
  const years=Array.from({length:5},(_,i)=>String(2567+i));
  const save=()=>{if(!year||!center||!crew)return alert("กรุณากรอกข้อมูลให้ครบถ้วน");if(editId){setProjects(p=>p.map(x=>x.id===editId?{...x,year,center,crew}:x));setEditId(null);}else{setProjects(p=>[...p,{id:uid(),year,center,crew}]);}setYear("2569");setCenter("");setCrew("");};
  const edit=(p)=>{setEditId(p.id);setYear(p.year);setCenter(p.center);setCrew(p.crew);};
  const del=(id)=>{if(window.confirm("ยืนยันลบโครงการนี้?")){setProjects(p=>p.filter(x=>x.id!==id));if(activeProject===id)setActiveProject(null);}};
  return <><GlassCard accent="rgba(59,130,246,0.12)"><CardHeader icon={editId?IP.edit:IP.plus} color="#3b82f6" title={editId?"แก้ไขข้อมูล":"เพิ่มศูนย์ซ่อมบำรุง / โครงการ"} sub="ข้อมูลจะบันทึกอัตโนมัติบน Cloud"/><div style={cs.row}><FormSelect label="ปีงบประมาณ (พ.ศ.)" value={year} onChange={setYear} options={years}/><FormSelect label="ศูนย์ซ่อมบำรุงฝ่ายก่อสร้าง" value={center} onChange={setCenter} options={CENTERS}/></div><div style={cs.row}><FormSelect label="ชุดซ่อมบำรุงถนนฯ" value={crew} onChange={setCrew} options={CREWS}/></div><div style={{display:"flex",gap:10,marginTop:20}}><Btn onClick={save} icon="save">{editId?"อัปเดต":"บันทึก"}</Btn>{editId&&<Btn variant="ghost" onClick={()=>{setEditId(null);setYear("2569");setCenter("");setCrew("");}}>ยกเลิก</Btn>}</div></GlassCard>
  <GlassCard><h2 style={cs.cardHead}>รายการโครงการ <span style={{color:"#64748b",fontWeight:400,fontSize:14}}>({projects.length})</span></h2>{projects.length===0?<Empty icon="🏗️" text="ยังไม่มีข้อมูล — กรุณาเพิ่มรายการด้านบน"/>:<div style={{overflowX:"auto",borderRadius:14,border:"1px solid rgba(255,255,255,0.05)"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:13}}><thead><tr style={{background:"rgba(15,23,42,0.5)"}}>{["#","ปีงบฯ","ศูนย์ซ่อมบำรุง","ชุดซ่อมบำรุง","สถานะ","จัดการ"].map((h,i)=><th key={i} style={{padding:"14px 16px",textAlign:i===5?"center":"left",color:"#64748b",fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.05)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{projects.map((p,i)=><tr key={p.id} className="row-hover" style={{background:i%2?"rgba(255,255,255,0.015)":"transparent"}}><Td style={{width:50}}>{i+1}</Td><Td bold>{p.year}</Td><Td>{p.center}</Td><Td>{p.crew}</Td><Td>{activeProject===p.id?<Badge text="✓ กำลังใช้งาน" color="#22c55e"/>:<span style={{color:"#475569"}}>—</span>}</Td><Td align="center"><div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}><Btn small variant="success" icon="check" onClick={()=>{setActiveProject(p.id);setTab(2);}}>เลือกใช้</Btn><Btn small variant="dark" icon="edit" onClick={()=>edit(p)}>แก้ไข</Btn><Btn small variant="danger" icon="trash" onClick={()=>del(p.id)}>ลบ</Btn></div></Td></tr>)}</tbody></table></div>}</GlassCard></>;
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 2 — ราคาวัสดุ
   ═══════════════════════════════════════════════════════════════════════ */
function Tab2({priceSets,setPriceSets,activePriceSet,setActivePriceSet}){
  const [month,setMonth]=useState("");const [yearBe,setYearBe]=useState("2569");const [prices,setPrices]=useState({});const [editId,setEditId]=useState(null);const [detailModal,setDetailModal]=useState(null);const [fileMap,setFileMap]=useState({});const fileRef=useRef();const [uploadId,setUploadId]=useState(null);
  const years=Array.from({length:5},(_,i)=>String(2567+i));const setP=(k,v)=>setPrices(p=>({...p,[k]:v}));
  const save=()=>{if(!month||!yearBe)return alert("กรุณาเลือกเดือนและปี");const e={id:editId||uid(),month,yearBe,prices:{...prices}};if(editId){setPriceSets(p=>p.map(x=>x.id===editId?e:x));setEditId(null);}else{setPriceSets(p=>[...p,e]);}setMonth("");setYearBe("2569");setPrices({});};
  const edit=(ps)=>{setEditId(ps.id);setMonth(ps.month);setYearBe(ps.yearBe);setPrices({...ps.prices});};
  const del=(id)=>{if(window.confirm("ยืนยันลบ?")){setPriceSets(p=>p.filter(x=>x.id!==id));if(activePriceSet===id)setActivePriceSet(null);}};
  const onFiles=(e)=>{const f=Array.from(e.target.files);if(!uploadId||!f.length)return;setFileMap(p=>({...p,[uploadId]:[...(p[uploadId]||[]),...f.map(x=>({name:x.name,url:URL.createObjectURL(x)}))]}));setUploadId(null);if(fileRef.current)fileRef.current.value="";};

  return <><GlassCard accent="rgba(16,185,129,0.12)"><CardHeader icon={IP.dollar} color="#10b981" title={`${editId?"แก้ไข":"กรอก"}ราคาวัสดุประจำเดือน`} sub="ระบุราคาวัสดุก่อสร้างแต่ละรายการ"/><div style={cs.row}><FormSelect label="เดือน" value={month} onChange={setMonth} options={MONTHS_TH}/><FormSelect label="พ.ศ." value={yearBe} onChange={setYearBe} options={years}/></div>
  <SectionLabel icon="🪨" text="ประเภทหิน" color="#f59e0b"/><div style={cs.row}>{MATERIALS.filter(m=>m.cat==="stone").map(m=><FormInput key={m.key} label={`${m.name} (${m.priceUnit})`} value={prices[m.key]||""} onChange={v=>setP(m.key,v)} type="number" placeholder="0.00"/>)}</div>
  <SectionLabel icon="🛢️" text="ประเภทยาง" color="#ef4444"/><div style={cs.row}>{MATERIALS.filter(m=>m.cat==="rubber").map(m=><FormInput key={m.key} label={`${m.name} (${m.priceUnit})`} value={prices[m.key]||""} onChange={v=>setP(m.key,v)} type="number" placeholder="0.00"/>)}</div>
  <SectionLabel icon="🧱" text="ปูนซีเมนต์" color="#8b5cf6"/><div style={cs.row}>{MATERIALS.filter(m=>m.cat==="cement").map(m=><FormInput key={m.key} label={`${m.name} (${m.priceUnit})`} value={prices[m.key]||""} onChange={v=>setP(m.key,v)} type="number" placeholder="0.00"/>)}</div>
  <div style={{display:"flex",gap:10,marginTop:24}}><Btn onClick={save} variant="success" icon="save">{editId?"อัปเดต":"บันทึก"}</Btn>{editId&&<Btn variant="ghost" onClick={()=>{setEditId(null);setMonth("");setPrices({});}}>ยกเลิก</Btn>}</div></GlassCard>
  <GlassCard><h2 style={cs.cardHead}>รายการราคาวัสดุ <span style={{color:"#64748b",fontWeight:400,fontSize:14}}>({priceSets.length})</span></h2><input type="file" accept=".pdf" multiple ref={fileRef} style={{display:"none"}} onChange={onFiles}/>{priceSets.length===0?<Empty icon="💰" text="ยังไม่มีข้อมูลราคาวัสดุ"/>:<div style={{overflowX:"auto",borderRadius:14,border:"1px solid rgba(255,255,255,0.05)"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:13}}><thead><tr style={{background:"rgba(15,23,42,0.5)"}}>{["#","เดือน","พ.ศ.","สถานะ","ไฟล์แนบ","จัดการ"].map((h,i)=><th key={i} style={{padding:"14px 16px",textAlign:i===5?"center":"left",color:"#64748b",fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.05)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{priceSets.map((ps,i)=><tr key={ps.id} className="row-hover" style={{background:i%2?"rgba(255,255,255,0.015)":"transparent"}}><Td style={{width:50}}>{i+1}</Td><Td bold>{ps.month}</Td><Td>{ps.yearBe}</Td><Td>{activePriceSet===ps.id?<Badge text="✓ กำลังใช้" color="#22c55e"/>:<span style={{color:"#475569"}}>—</span>}</Td><Td>{(fileMap[ps.id]||[]).length>0?fileMap[ps.id].map((f,fi)=><a key={fi} href={f.url} target="_blank" rel="noreferrer" style={{display:"block",color:"#38bdf8",fontSize:12,textDecoration:"none",marginBottom:3}}>📎 {f.name}</a>):<span style={{color:"#475569",fontSize:12}}>—</span>}</Td><Td align="center"><div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}><Btn small variant="success" icon="check" onClick={()=>setActivePriceSet(ps.id)}>เลือกใช้</Btn><Btn small variant="info" icon="eye" onClick={()=>setDetailModal(ps)}>รายละเอียด</Btn><Btn small variant="dark" icon="edit" onClick={()=>edit(ps)}>แก้ไข</Btn><Btn small variant="danger" icon="trash" onClick={()=>del(ps.id)}>ลบ</Btn><Btn small variant="ghost" icon="upload" onClick={()=>{setUploadId(ps.id);setTimeout(()=>fileRef.current?.click(),50);}}>สแกน PDF</Btn></div></Td></tr>)}</tbody></table></div>}</GlassCard>
  <Modal open={!!detailModal} onClose={()=>setDetailModal(null)} title={`ราคาวัสดุ — ${detailModal?.month} ${detailModal?.yearBe}`} wide>{detailModal&&<div>{["stone","rubber","cement"].map(cat=>{const items=MATERIALS.filter(m=>m.cat===cat);const lbl=cat==="stone"?"🪨 หิน":cat==="rubber"?"🛢️ ยาง":"🧱 ปูนซีเมนต์";const clr=cat==="stone"?"#f59e0b":cat==="rubber"?"#ef4444":"#8b5cf6";return <div key={cat} style={{marginBottom:20}}><SectionLabel icon={lbl.split(" ")[0]} text={lbl.split(" ")[1]} color={clr}/><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>{items.map(m=><div key={m.key} style={{padding:"14px 18px",borderRadius:14,background:"rgba(15,23,42,0.5)",border:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:12,color:"#64748b",marginBottom:6}}>{m.name}</div><div style={{fontSize:20,fontWeight:700,color:"#38bdf8"}}>{fmt(detailModal.prices[m.key])}</div><div style={{fontSize:11,color:"#475569",marginTop:2}}>{m.priceUnit}</div></div>)}</div></div>})}</div>}</Modal></>;
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 3 — กรอกข้อมูลโครงการ
   ═══════════════════════════════════════════════════════════════════════ */
function Tab3({activeProject,activePriceSet,projectData,setProjectData,priceSets,projects}){
  const empty={roadType:"",projectName:"",routeCode:"",routeName:"",width:"",length:"",startDate:"",endDate:"",materials:{}};
  const [form,setForm]=useState({...empty});const [editId,setEditId]=useState(null);const [detailModal,setDetailModal]=useState(null);
  const myData=projectData.filter(d=>d.projectId===activeProject);
  const area=(form.width&&form.length)?(Number(form.width)*Number(form.length)).toFixed(2):"";
  const days=(form.startDate&&form.endDate)?Math.max(0,Math.ceil((new Date(form.endDate)-new Date(form.startDate))/864e5)):"";
  const setMat=(k,v)=>setForm(p=>({...p,materials:{...p.materials,[k]:v}}));const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const save=()=>{if(!activeProject)return alert("กรุณาเลือกโครงการจากแท็บแรก");if(!form.projectName)return alert("กรุณากรอกชื่อโครงการ");const e={...form,id:editId||uid(),projectId:activeProject,priceSetId:activePriceSet,area,days};if(editId){setProjectData(p=>p.map(x=>x.id===editId?e:x));setEditId(null);}else{setProjectData(p=>[...p,e]);}setForm({...empty});};
  const edit=(d)=>{setEditId(d.id);setForm({roadType:d.roadType,projectName:d.projectName,routeCode:d.routeCode,routeName:d.routeName,width:d.width,length:d.length,startDate:d.startDate,endDate:d.endDate,materials:{...d.materials}});};
  const del=(id)=>{if(window.confirm("ยืนยันลบ?"))setProjectData(p=>p.filter(x=>x.id!==id));};
  if(!activeProject)return <GlassCard><Empty icon="📋" text={'กรุณาเลือกโครงการจากแท็บ "เลือกศูนย์ซ่อมบำรุงฯ" ก่อน\nจากนั้นกลับมากรอกข้อมูลที่นี่'}/></GlassCard>;
  const proj=projects.find(p=>p.id===activeProject);
  return <><div style={{marginBottom:20,padding:"16px 24px",borderRadius:16,background:"linear-gradient(135deg,rgba(59,130,246,0.07),rgba(139,92,246,0.04))",border:"1px solid rgba(59,130,246,0.12)",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#3b82f6",boxShadow:"0 0 12px #3b82f6"}}/><div><span style={{fontSize:12,color:"#64748b"}}>โครงการ:</span> <span style={{color:"#e2e8f0",fontWeight:600,marginLeft:4}}>{proj?.center}</span></div><div><span style={{fontSize:12,color:"#64748b"}}>ชุด:</span> <span style={{color:"#e2e8f0",fontWeight:600,marginLeft:4}}>{proj?.crew}</span></div><div><span style={{fontSize:12,color:"#64748b"}}>ปีงบฯ:</span> <span style={{color:"#f59e0b",fontWeight:700,marginLeft:4}}>{proj?.year}</span></div></div>
  <GlassCard accent="rgba(245,158,11,0.12)"><CardHeader icon={editId?IP.edit:IP.clipboard} color="#f59e0b" title={`${editId?"แก้ไข":"กรอก"}ข้อมูลโครงการ`}/>
  <div style={cs.row}><FormSelect label="ประเภทสายทาง" value={form.roadType} onChange={v=>setF("roadType",v)} options={ROAD_TYPES}/><FormInput label="ชื่อโครงการ" value={form.projectName} onChange={v=>setF("projectName",v)} placeholder="ระบุชื่อโครงการ"/></div>
  <div style={cs.row}><FormInput label="รหัสสายทาง" value={form.routeCode} onChange={v=>setF("routeCode",v)} placeholder="เช่น ชม.1234"/><FormInput label="ชื่อสายทาง / สถานที่ตั้ง" value={form.routeName} onChange={v=>setF("routeName",v)}/></div>
  <SectionLabel icon="📐" text="ปริมาณงาน" color="#06b6d4"/><div style={cs.row}><FormInput label="ความกว้าง" value={form.width} onChange={v=>setF("width",v)} type="number" placeholder="0" suffix="เมตร"/><FormInput label="ความยาว" value={form.length} onChange={v=>setF("length",v)} type="number" placeholder="0" suffix="เมตร"/><FormInput label="พื้นที่" value={area?fmt(area):"—"} readOnly highlight="#06b6d4" suffix="ตร.ม."/></div>
  <SectionLabel icon="📅" text="ระยะเวลาดำเนินการ" color="#8b5cf6"/><div style={cs.row}><FormInput label="วันเริ่มโครงการ" value={form.startDate} onChange={v=>setF("startDate",v)} type="date"/><FormInput label="วันสิ้นสุดโครงการ" value={form.endDate} onChange={v=>setF("endDate",v)} type="date"/><FormInput label="รวมวันดำเนินการ" value={days?`${days} วัน`:"—"} readOnly highlight="#f59e0b"/></div>
  <SectionLabel icon="🪨" text="ปริมาณหิน (ลบ.ม.)" color="#f59e0b"/><div style={cs.row}>{MATERIALS.filter(m=>m.cat==="stone").map(m=><FormInput key={m.key} label={m.name} value={form.materials[m.key]||""} onChange={v=>setMat(m.key,v)} type="number" placeholder="0" suffix={m.unit}/>)}</div>
  <SectionLabel icon="🛢️" text="ปริมาณยาง" color="#ef4444"/><div style={cs.row}>{MATERIALS.filter(m=>m.cat==="rubber").map(m=><FormInput key={m.key} label={m.name} value={form.materials[m.key]||""} onChange={v=>setMat(m.key,v)} type="number" placeholder="0" suffix={m.unit}/>)}</div>
  <SectionLabel icon="🧱" text="ปริมาณปูนซีเมนต์" color="#8b5cf6"/><div style={cs.row}>{MATERIALS.filter(m=>m.cat==="cement").map(m=><FormInput key={m.key} label={m.name} value={form.materials[m.key]||""} onChange={v=>setMat(m.key,v)} type="number" placeholder="0" suffix={m.unit}/>)}</div>
  <div style={{display:"flex",gap:10,marginTop:24}}><Btn onClick={save} icon="save">{editId?"อัปเดต":"บันทึก"}</Btn>{editId&&<Btn variant="ghost" onClick={()=>{setEditId(null);setForm({...empty});}}>ยกเลิก</Btn>}</div></GlassCard>
  <GlassCard><h2 style={cs.cardHead}>รายการข้อมูลโครงการ <span style={{color:"#64748b",fontWeight:400,fontSize:14}}>({myData.length})</span></h2>{myData.length===0?<Empty icon="📋" text="ยังไม่มีข้อมูลสำหรับโครงการนี้"/>:<div style={{overflowX:"auto",borderRadius:14,border:"1px solid rgba(255,255,255,0.05)"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:13}}><thead><tr style={{background:"rgba(15,23,42,0.5)"}}>{["#","ชื่อโครงการ","ประเภทสายทาง","พื้นที่","ระยะเวลา","จัดการ"].map((h,i)=><th key={i} style={{padding:"14px 16px",textAlign:[3,4].includes(i)?"right":i===5?"center":"left",color:"#64748b",fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.05)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{myData.map((d,i)=><tr key={d.id} className="row-hover" style={{background:i%2?"rgba(255,255,255,0.015)":"transparent"}}><Td style={{width:50}}>{i+1}</Td><Td bold>{d.projectName}</Td><Td>{d.roadType}</Td><Td align="right" highlight="#06b6d4" bold>{fmt(d.area)} ตร.ม.</Td><Td align="right">{d.days||"—"} วัน</Td><Td align="center"><div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}><Btn small variant="info" icon="eye" onClick={()=>setDetailModal(d)}>รายละเอียด</Btn><Btn small variant="dark" icon="edit" onClick={()=>edit(d)}>แก้ไข</Btn><Btn small variant="danger" icon="trash" onClick={()=>del(d.id)}>ลบ</Btn></div></Td></tr>)}</tbody></table></div>}</GlassCard>
  <Modal open={!!detailModal} onClose={()=>setDetailModal(null)} title={detailModal?.projectName} wide>{detailModal&&<DetailView data={detailModal} priceSets={priceSets}/>}</Modal></>;
}

function DetailView({data,priceSets}){const ps=priceSets.find(p=>p.id===data.priceSetId);const usedMats=MATERIALS.filter(m=>Number(data.materials?.[m.key])>0);let total=0;return <div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:12,marginBottom:24}}>{[["ประเภทสายทาง",data.roadType,"#3b82f6"],["รหัสสายทาง",data.routeCode,"#8b5cf6"],["สายทาง/สถานที่",data.routeName,"#06b6d4"],["กว้าง×ยาว",`${data.width||"—"}×${data.length||"—"} ม.`,"#f59e0b"],["พื้นที่",`${fmt(data.area)} ตร.ม.`,"#10b981"],["ระยะเวลา",`${data.days||"—"} วัน`,"#ef4444"]].map(([l,v,c],i)=><div key={i} style={{padding:"14px 18px",borderRadius:14,background:"rgba(15,23,42,0.5)",border:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:11,color:"#64748b",marginBottom:5}}>{l}</div><div style={{fontSize:14,fontWeight:600,color:c}}>{v||"—"}</div></div>)}</div>{usedMats.length>0&&<div style={{overflowX:"auto",borderRadius:14,border:"1px solid rgba(255,255,255,0.05)"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:13}}><thead><tr style={{background:"rgba(15,23,42,0.5)"}}>{["วัสดุ","ปริมาณ","หน่วย","ราคา/หน่วย","รวม (บาท)"].map((h,i)=><th key={i} style={{padding:"14px 16px",textAlign:[1,3,4].includes(i)?"right":"left",color:"#64748b",fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{h}</th>)}</tr></thead><tbody>{usedMats.map((m,i)=>{const qty=Number(data.materials[m.key])||0;const price=ps?Number(ps.prices[m.key])||0:0;const sub=qty*price;total+=sub;return <tr key={m.key} style={{background:i%2?"rgba(255,255,255,0.015)":"transparent"}}><Td bold>{m.name}</Td><Td align="right" highlight="#38bdf8">{fmt(qty)}</Td><Td>{m.unit}</Td><Td align="right">{fmt(price)}</Td><Td align="right" highlight="#22c55e" bold>{fmt(sub)}</Td></tr>})}</tbody><tfoot><tr style={{background:"rgba(56,189,248,0.05)"}}><td colSpan={4} style={{padding:"14px 16px",textAlign:"right",color:"#94a3b8",fontWeight:700,fontSize:14,borderTop:"1px solid rgba(255,255,255,0.06)"}}>รวมทั้งหมด</td><td style={{padding:"14px 16px",textAlign:"right",color:"#38bdf8",fontWeight:700,fontSize:16,borderTop:"1px solid rgba(255,255,255,0.06)"}}>฿{fmt(total)}</td></tr></tfoot></table></div>}</div>}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 4 — สรุป
   ═══════════════════════════════════════════════════════════════════════ */
function Tab4({projects,projectData,priceSets,setProjectData}){
  const [detailModal,setDetailModal]=useState(null);
  const getPrice=(psId,k)=>{const ps=priceSets.find(p=>p.id===psId);return ps?Number(ps.prices[k])||0:0;};
  const calcBudget=(d)=>MATERIALS.reduce((s,m)=>(s+(Number(d.materials?.[m.key])||0)*getPrice(d.priceSetId,m.key)),0);
  const del=(id)=>{if(window.confirm("ยืนยันลบ?"))setProjectData(p=>p.filter(x=>x.id!==id));};
  const grand=projectData.reduce((s,d)=>s+calcBudget(d),0);
  return <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:20,marginBottom:28}}><GlassCard accent="rgba(56,189,248,0.15)" glow="rgba(56,189,248,0.06)" style={{marginBottom:0,textAlign:"center"}}><div style={{fontSize:12,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>งบประมาณรวม</div><div style={{fontSize:30,fontWeight:700,color:"#38bdf8",textShadow:"0 0 20px rgba(56,189,248,0.3)"}}>฿{fmt(grand)}</div></GlassCard><GlassCard accent="rgba(139,92,246,0.15)" style={{marginBottom:0,textAlign:"center"}}><div style={{fontSize:12,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>โครงการ</div><div style={{fontSize:30,fontWeight:700,color:"#a78bfa"}}>{projects.length}</div></GlassCard><GlassCard accent="rgba(16,185,129,0.15)" style={{marginBottom:0,textAlign:"center"}}><div style={{fontSize:12,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>รายการทั้งหมด</div><div style={{fontSize:30,fontWeight:700,color:"#34d399"}}>{projectData.length}</div></GlassCard></div>
  <GlassCard><h2 style={cs.cardHead}>ตารางสรุปข้อมูลทุกโครงการ</h2>{projectData.length===0?<Empty icon="📊" text="ยังไม่มีข้อมูลโครงการ"/>:<><div style={{overflowX:"auto",borderRadius:14,border:"1px solid rgba(255,255,255,0.05)"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:13}}><thead><tr style={{background:"rgba(15,23,42,0.5)"}}>{["#","ชื่อโครงการ","ศูนย์/ชุดซ่อมบำรุง","ประเภทสายทาง","พื้นที่","งบประมาณ","จัดการ"].map((h,i)=><th key={i} style={{padding:"14px 16px",textAlign:[4,5].includes(i)?"right":i===6?"center":"left",color:"#64748b",fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.05)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{projectData.map((d,i)=>{const proj=projects.find(p=>p.id===d.projectId);const b=calcBudget(d);return <tr key={d.id} className="row-hover" style={{background:i%2?"rgba(255,255,255,0.015)":"transparent"}}><Td style={{width:50}}>{i+1}</Td><Td bold>{d.projectName}</Td><Td><div style={{fontSize:12}}><div style={{color:"#cbd5e1"}}>{proj?.center||"—"}</div><div style={{color:"#475569",marginTop:2}}>{proj?.crew}</div></div></Td><Td>{d.roadType}</Td><Td align="right">{fmt(d.area)} ตร.ม.</Td><Td align="right" highlight="#22c55e" bold style={{fontSize:14}}>฿{fmt(b)}</Td><Td align="center"><div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}><Btn small variant="info" icon="eye" onClick={()=>setDetailModal({...d,budget:b,proj})}>รายละเอียด</Btn><Btn small variant="danger" icon="trash" onClick={()=>del(d.id)}>ลบ</Btn></div></Td></tr>})}</tbody></table></div><div style={{marginTop:16,padding:"18px 24px",borderRadius:16,background:"linear-gradient(135deg,rgba(56,189,248,0.07),rgba(59,130,246,0.04))",border:"1px solid rgba(56,189,248,0.12)",display:"flex",justifyContent:"flex-end",alignItems:"center",gap:20}}><span style={{color:"#94a3b8",fontWeight:600,fontSize:14}}>รวมงบประมาณทั้งหมด</span><span style={{color:"#38bdf8",fontWeight:700,fontSize:24,textShadow:"0 0 16px rgba(56,189,248,0.3)"}}>฿{fmt(grand)}</span></div></>}</GlassCard>
  <Modal open={!!detailModal} onClose={()=>setDetailModal(null)} title={`สรุป — ${detailModal?.projectName}`} wide>{detailModal&&<div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:12,marginBottom:24}}>{[["ศูนย์ซ่อมบำรุง",detailModal.proj?.center,"#3b82f6"],["ชุดซ่อมบำรุง",detailModal.proj?.crew,"#8b5cf6"],["ประเภทสายทาง",detailModal.roadType,"#06b6d4"],["รหัสสายทาง",detailModal.routeCode,"#f59e0b"],["สายทาง",detailModal.routeName,"#10b981"],["พื้นที่",`${fmt(detailModal.area)} ตร.ม.`,"#06b6d4"],["ระยะเวลา",`${detailModal.days||"—"} วัน`,"#ef4444"]].map(([l,v,c],i)=><div key={i} style={{padding:"14px 18px",borderRadius:14,background:"rgba(15,23,42,0.5)",border:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:11,color:"#64748b",marginBottom:5}}>{l}</div><div style={{fontSize:14,fontWeight:600,color:c}}>{v||"—"}</div></div>)}<div style={{padding:"14px 18px",borderRadius:14,background:"linear-gradient(135deg,rgba(34,197,94,0.08),rgba(16,185,129,0.04))",border:"1px solid rgba(34,197,94,0.15)"}}><div style={{fontSize:11,color:"#64748b",marginBottom:5}}>งบประมาณรวม</div><div style={{fontSize:22,fontWeight:700,color:"#22c55e"}}>฿{fmt(detailModal.budget)}</div></div></div><DetailView data={detailModal} priceSets={priceSets}/></div>}</Modal></>;
}

/* ═══════════════ STYLES ═══════════════ */
const cs={row:{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10},label:{display:"block",fontSize:12.5,color:"#94a3b8",marginBottom:7,fontWeight:500,letterSpacing:0.2},input:{width:"100%",padding:"11px 16px",background:"rgba(15,23,42,0.6)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,color:"#e2e8f0",fontSize:14,fontFamily:"'Krub',sans-serif",outline:"none",transition:"all .25s"},select:{width:"100%",padding:"11px 16px",background:"rgba(15,23,42,0.6)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,color:"#e2e8f0",fontSize:14,fontFamily:"'Krub',sans-serif",outline:"none",appearance:"none",cursor:"pointer",transition:"all .25s"},cardHead:{fontSize:17,fontWeight:700,color:"#f1f5f9",marginBottom:20,paddingBottom:14,borderBottom:"1px solid rgba(255,255,255,0.05)"}};
