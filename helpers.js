function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function initials(name){
  return (name||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || 'P';
}

/* ============================================================
   YEARS-OF-EXPERIENCE CALCULATOR
   ============================================================ */
const MONTH_MAP = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function parseDateToken(str){
  if(!str) return null;
  const s = str.trim().toLowerCase();
  if(s === 'present' || s === 'current') return new Date();
  let m = s.match(/^([a-z]{3,9})\.?\s+(\d{4})$/);
  if(m && MONTH_MAP[m[1].slice(0,3)] !== undefined) return new Date(parseInt(m[2],10), MONTH_MAP[m[1].slice(0,3)], 1);
  m = s.match(/^(\d{4})$/);
  if(m) return new Date(parseInt(m[1],10), 0, 1);
  return null;
}
function computeYearsOfExperience(experience){
  let totalMonths = 0;
  (experience||[]).forEach(e=>{
    const raw = (e.dates||'').trim();
    const m = raw.match(/^(.*?)\s*(?:–|-|—|to)\s*(.*)$/i);
    if(!m) return;
    const start = parseDateToken(m[1]);
    const end = parseDateToken(m[2]);
    if(start && end){
      const months = (end.getFullYear()-start.getFullYear())*12 + (end.getMonth()-start.getMonth());
      if(months > 0) totalMonths += months;
    }
  });
  return Math.round((totalMonths/12) * 10) / 10;
}
function animateCounterTo(el, target, suffix){
  const duration = 1100;
  let start = null;
  function tick(now){
    if(!start) start = now;
    const progress = Math.min((now-start)/duration, 1);
    const eased = 1 - Math.pow(1-progress, 3);
    el.textContent = Math.round(target*eased) + (suffix||'');
    if(progress < 1) requestAnimationFrame(tick);
    else el.textContent = target + (suffix||'');
  }
  requestAnimationFrame(tick);
}

const SECTION_KEYWORDS = {
  summary: ['summary','objective','profile','about me','career objective','about'],
  experience: ['experience','work experience','employment history','professional experience','work history'],
  education: ['education','academic background','academic qualifications'],
  projects: ['projects','project experience','selected projects','key projects'],
  skills: ['skills','technical skills','core competencies','key skills','specialties','specialities'],
  certifications: ['certifications','certificates','licenses']
};
function detectSection(line){
  const clean = line.toLowerCase().replace(/[^a-z& ]/g,'').trim();
  if(!clean || clean.length > 40) return null;
  for(const key in SECTION_KEYWORDS){
    if(SECTION_KEYWORDS[key].some(w => clean === w || clean.startsWith(w))) return key;
  }
  return null;
}
function parseResume(lines){
  const data = {name:'', headline:'', location:'', email:'', linkedin:'', summary:'',
    education:[], experience:[], skills:[], projects:[], certifications:[]};
  const fullText = lines.join('\n');
  const emailMatch = fullText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if(emailMatch) data.email = emailMatch[0];
  const linkedinMatch = fullText.match(/linkedin\.com\/[^\s,)]+/i);
  if(linkedinMatch) data.linkedin = 'https://' + linkedinMatch[0].replace(/^https?:\/\//i,'');
  for(const line of lines.slice(0,6)){
    if(!line.includes('@') && !/\d{3,}/.test(line) && line.length < 60 && !detectSection(line)){
      data.name = line; break;
    }
  }
  const locLine = lines.slice(1,8).find(l => /^[A-Za-z .]+,\s*[A-Za-z .]+$/.test(l) && l.length < 40 && l !== data.name);
  if(locLine) data.location = locLine;
  const nameIdx = lines.indexOf(data.name);
  if(nameIdx > -1){
    for(let i=nameIdx+1; i<Math.min(lines.length, nameIdx+4); i++){
      const l = lines[i];
      if(!l || detectSection(l)) break;
      if(l.includes('@') || /\d{3,}/.test(l) || l === data.location) continue;
      if(l.length < 80){ data.headline = l; break; }
    }
  }
  let currentSection = null;
  const buckets = {summary:[], experience:[], education:[], projects:[], skills:[], certifications:[]};
  lines.forEach(line=>{
    const sec = detectSection(line);
    if(sec){ currentSection = sec; return; }
    if(currentSection) buckets[currentSection].push(line);
  });
  data.summary = buckets.summary.join(' ').slice(0, 400);
  data.skills = buckets.skills.join(', ').split(/[,•·|;]/).map(s=>s.trim()).filter(s=>s.length>1 && s.length<48).slice(0,10);
  data.certifications = buckets.certifications.map(l=>l.replace(/^[•·\-]\s*/,'').trim()).filter(Boolean);

  const dateRegex = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})\s*(?:–|-|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(present|\d{4})/i;
  /* Resumes put the date either on the line before the title or on the line after it.
     Work out which one this block uses, then group lines into entries. */
  function groupByDates(blockLines){
    const entries = []; let current = null;
    const dateFirst = dateRegex.test(blockLines[0] || '');
    blockLines.forEach(line=>{
      const dm = line.match(dateRegex);
      if(!dm){
        if(current) current.lines.push(line); else current = {dates:'', lines:[line]};
        return;
      }
      const rest = line.replace(dateRegex,'').replace(/[|,\u00b7\u2013-]\s*$/,'').trim();
      if(rest || dateFirst){
        if(current) entries.push(current);
        current = {dates: dm[0], lines: rest ? [rest] : []};
      } else if(current && !current.dates){
        current.dates = dm[0];                       // title line came first, date follows it
      } else {
        /* the heading is the line just above this date; a short plain line above that is its company or school */
        const heading = [];
        const looksLikeHeading = l => l && l.length < 60 && !/^[\u2022\u00b7\u25cf\u25aa*\-]/.test(l) && !/[.;:]$/.test(l);
        if(current && current.lines.length) heading.unshift(current.lines.pop());
        if(current && current.lines.length > 1 && looksLikeHeading(heading[0]) && looksLikeHeading(current.lines[current.lines.length - 1])) heading.unshift(current.lines.pop());
        if(current) entries.push(current);
        current = {dates: dm[0], lines: heading};
      }
    });
    if(current) entries.push(current);
    return entries;
  }
  const BULLET = /^[\u2022\u00b7\u25cf\u25aa*\-]\s*/;
  data.experience = groupByDates(buckets.experience).map(e=>{
    const first = e.lines[0] || '';
    const parts = first.split(/,| at |\u2014|\||\s-\s/);
    let title = (parts[0]||first).trim();
    let company = parts.slice(1).join(', ').trim();
    let rest = e.lines.slice(1);
    /* company can sit on its own line under the title */
    if(!company && rest.length && !BULLET.test(rest[0]) && rest[0].length < 50){ company = rest[0].trim(); rest = rest.slice(1); }
    const points = rest.map(l=>l.replace(BULLET,'').trim()).filter(l=>l.length > 3);
    return { title, company, dates:e.dates, points: points.slice(0,3) };
  }).filter(e=>e.title);
  data.education = groupByDates(buckets.education).map(e=>{
    const first = e.lines[0] || '';
    const rest = e.lines.slice(1);
    if(!rest.length){                         // "Master of Economics, Riverside University" on one line
      const bits = first.split(/,|\|| - /);
      return { degree:bits[0].trim(), school:bits.slice(1).join(', ').trim(), dates:e.dates };
    }
    return { degree:first.trim(), school:(rest[0]||'').trim(), dates:e.dates };
  }).filter(e=>e.degree);

  const projLines = buckets.projects;
  const projects = []; let cur = null;
  projLines.forEach(line=>{
    if(line.length < 70 && (!cur || cur.description)){
      if(cur) projects.push(cur);
      cur = {title:line, description:''};
    } else if(cur){ cur.description += (cur.description?' ':'') + line; }
    else { cur = {title:line, description:''}; }
  });
  if(cur) projects.push(cur);
  data.projects = projects.slice(0,8);

  if(!data.headline && data.experience.length) data.headline = data.experience[0].title;
  if(!data.summary){
    const who = data.name || 'This candidate';
    data.summary = data.headline ? `${who} works as ${data.headline}, bringing a careful, numbers-first approach to every brief.` : `${who} brings a careful, numbers-first approach to every brief.`;
  }
  return data;
}

