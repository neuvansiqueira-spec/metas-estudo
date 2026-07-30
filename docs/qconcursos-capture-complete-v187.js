(() => {
  "use strict";

  const VERSION = "20260730-importacao-completa-captura-v187";
  const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js";
  const TOKEN_STOPWORDS = new Set(["a","as","ao","aos","com","como","da","das","de","do","dos","e","em","entre","é","foi","na","nas","no","nos","o","os","ou","para","por","que","se","sem","sob","sobre","um","uma"]);
  const BOARD_PATTERNS = [
    ["CEBRASPE", /\b(cebraspe|cespe)\b/i], ["FGV", /\bfgv\b|funda[cç][aã]o getulio vargas/i],
    ["FCC", /\bfcc\b|funda[cç][aã]o carlos chagas/i], ["VUNESP", /\bvunesp\b/i],
    ["IBFC", /\bibfc\b/i], ["Instituto AOCP", /\baocp\b/i], ["FUNDATEC", /\bfundatec\b/i],
    ["IADES", /\biades\b/i], ["IDECAN", /\bidecan\b/i], ["Quadrix", /\bquadrix\b/i],
    ["CESGRANRIO", /\bcesgranrio\b/i], ["NC-UFPR", /\bnc\s*[-/]?\s*ufpr\b/i]
  ];
  const UI_NOISE = /^(responder|coment[aá]rios?|estat[ií]sticas?|reportar erro|salvar|pr[oó]xima|anterior|ver resposta|gabarito comentado|quest[oõ]es relacionadas|resumo relacionado)$/i;

  function canonical(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function cleanLines(text) { return String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean); }
  function tokenSet(value) { return new Set(canonical(value).split(" ").filter((token) => token.length >= 3 && !TOKEN_STOPWORDS.has(token))); }
  function questionMatchScore(segment, question) {
    const source = tokenSet(segment);
    const target = tokenSet([question?.enunciado,question?.disciplina,question?.assunto,question?.banca,question?.ano,question?.cargo,question?.orgao,question?.referencia].filter(Boolean).join(" "));
    if (!source.size || !target.size) return 0;
    let common = 0; target.forEach((token) => { if (source.has(token)) common += 1; });
    return common / Math.max(1, Math.min(target.size, 55));
  }
  function groupRows(rows, maxGap) { const groups=[]; rows.forEach((row)=>{ const current=groups.at(-1); if(!current||row-current.at(-1)>maxGap) groups.push([row]); else current.push(row); }); return groups; }
  function analyzeImageData(imageData, sourceWidth, sourceHeight) {
    const {data,width,height}=imageData; const scale=Math.max(.5,sourceWidth/1896); const rowCounts=new Uint32Array(height);
    const xStart=Math.max(0,Math.floor(sourceWidth*.085)); const xEnd=Math.min(sourceWidth,Math.ceil(sourceWidth*.135)); const yFloor=Math.floor(sourceHeight*.18);
    const localXStart=Math.max(0,xStart-Math.floor(sourceWidth*.075)); const localXEnd=Math.min(width,xEnd-Math.floor(sourceWidth*.075));
    for(let y=Math.max(0,yFloor-Math.floor(sourceHeight*.18));y<height;y+=1){let count=0;for(let x=localXStart;x<localXEnd;x+=1){const o=(y*width+x)*4;const r=data[o],g=data[o+1],b=data[o+2];if(r>220&&g>70&&g<190&&b<120&&r-g>60)count+=1;}rowCounts[y]=count;}
    const active=[]; const min=Math.max(2,Math.round(2*scale)); rowCounts.forEach((count,row)=>{if(count>=min)active.push(row);});
    const circles=groupRows(active,Math.max(2,Math.round(3*scale))).map((rows)=>{const first=rows[0],last=rows.at(-1);let total=0,maximum=0;rows.forEach((row)=>{total+=rowCounts[row];maximum=Math.max(maximum,rowCounts[row]);});return{y:Math.round((first+last)/2+yFloor),height:last-first+1,total,maximum,filled:total>=420*scale*scale||maximum>=20*scale};}).filter((row)=>row.height>=18*scale&&row.height<=55*scale&&row.total>=35*scale*scale);
    const optionGroups=[]; circles.forEach((row)=>{const current=optionGroups.at(-1);if(!current||row.y-current.at(-1).y>210*scale)optionGroups.push([row]);else current.push(row);});
    return optionGroups.filter((group)=>group.length===2||(group.length>=4&&group.length<=5)).map((group,index)=>{const selectedIndex=group.findIndex((row)=>row.filled);const keys=group.length===2?["C","E"]:["A","B","C","D","E"];return{index,optionCount:group.length,marked:selectedIndex>=0?keys[selectedIndex]:"",selectedIndex,yStart:group[0].y,yEnd:group.at(-1).y,confidence:selectedIndex>=0?"alta":"revisar"};});
  }
  async function imageAnalysis(file) { const bitmap=await createImageBitmap(file);const sourceWidth=bitmap.width,sourceHeight=bitmap.height,x=Math.floor(sourceWidth*.075),y=Math.floor(sourceHeight*.18),width=Math.max(1,Math.ceil(sourceWidth*.085)),height=Math.max(1,sourceHeight-y);const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d",{willReadFrequently:true});context.drawImage(bitmap,x,y,width,height,0,0,width,height);bitmap.close?.();return{width:sourceWidth,height:sourceHeight,answers:analyzeImageData(context.getImageData(0,0,width,height),sourceWidth,sourceHeight)}; }

  function statusLine(line) { const c=canonical(line); return (c.includes("parabens")&&c.includes("acertou"))||(c.includes("incorreta")&&c.includes("gabarito"))||(c.includes("voce errou"))||(c.includes("resposta correta")); }
  function labelValue(line, labels) { for (const label of labels) { const match=line.match(new RegExp(`^${label}\\s*[:\\-]\\s*(.+)$`,`i`)); if(match)return match[1].trim(); } return ""; }
  function detectBoard(line) { for (const [name,pattern] of BOARD_PATTERNS) if(pattern.test(line)) return name; return ""; }
  function metadataLine(line) { return /^(ano|banca|[oó]rg[aã]o|cargo|prova|disciplina|assunto|tema|subassunto|quest[aã]o|c[oó]digo|refer[eê]ncia)\s*[:\-]/i.test(line); }
  function optionLine(line) { return line.match(/^\s*[\(\[]?([A-E])[\)\].:\-]\s*(.*)$/i); }
  function questionStartIndex(lines) {
    let questionMarker = -1;
    let headerMarker = -1;
    lines.forEach((line,index)=>{
      if (/^(quest[aã]o\s*(?:q\s*)?\d+|q\s*\d{4,})/i.test(line)) questionMarker = index;
      else if (metadataLine(line) && /^(ano|banca|c[oó]digo|refer)/i.test(line)) headerMarker = Math.max(headerMarker,index);
      else if (detectBoard(line) && /\b(19|20)\d{2}\b/.test(line)) headerMarker = Math.max(headerMarker,index);
    });
    return questionMarker >= 0 ? questionMarker : Math.max(0, headerMarker);
  }
  function parseMetadata(lines) {
    const meta={banca:"",ano:"",orgao:"",cargo:"",prova:"",disciplina:"",assunto:"",tema:"",referencia:"",qcCodigo:""};
    for(const line of lines){
      meta.banca ||= labelValue(line,["banca"]); meta.ano ||= labelValue(line,["ano"]); meta.orgao ||= labelValue(line,["[oó]rg[aã]o","institui[cç][aã]o"]); meta.cargo ||= labelValue(line,["cargo"]); meta.prova ||= labelValue(line,["prova"]); meta.disciplina ||= labelValue(line,["disciplina","mat[eé]ria"]); meta.assunto ||= labelValue(line,["assunto"]); meta.tema ||= labelValue(line,["tema","subassunto"]); meta.referencia ||= labelValue(line,["refer[eê]ncia","quest[aã]o","c[oó]digo"]);
      meta.banca ||= detectBoard(line);
      const year=line.match(/\b(19|20)\d{2}\b/)?.[0]; if(year&&!meta.ano)meta.ano=year;
      if(!meta.referencia){const ref=line.match(/\bQ\s*(\d{4,})\b/i);if(ref)meta.referencia=`Q${ref[1]}`;}
      if(detectBoard(line)&&line.includes(" - ")){const parts=line.split(/\s+-\s+/).map((part)=>part.trim()).filter(Boolean);const yearIndex=parts.findIndex((part)=>/^(19|20)\d{2}$/.test(part));if(yearIndex>=0){meta.orgao ||= parts[yearIndex+1]||"";meta.cargo ||= parts[yearIndex+2]||"";meta.prova ||= parts.slice(yearIndex+3).join(" - ");}}
    }
    meta.qcCodigo=meta.referencia; return meta;
  }
  function parseAlternatives(lines) {
    const alternatives={}; let current="";
    for(const line of lines){const match=optionLine(line);if(match){current=match[1].toUpperCase();alternatives[current]=(match[2]||"").trim();continue;}if(current&&!metadataLine(line)&&!statusLine(line)&&!UI_NOISE.test(line)){alternatives[current]=`${alternatives[current]} ${line}`.trim();}}
    return alternatives;
  }
  function parseComment(lines) {
    const marker=lines.findIndex((line)=>/^(coment[aá]rio|resumo relacionado|explica[cç][aã]o|justificativa|fundamento|solu[cç][aã]o)/i.test(line));
    if(marker<0)return ""; const out=[];
    for(const line of lines.slice(marker+1)){if(metadataLine(line)||/^(quest[aã]o\s*(?:q\s*)?\d+|q\s*\d{4,})/i.test(line))break;if(!UI_NOISE.test(line))out.push(line);if(out.join(" ").length>1800)break;}
    return out.join(" ").slice(0,1800);
  }
  function parseDetailedQuestions(text) {
    const lines=cleanLines(text); const statuses=[]; lines.forEach((line,index)=>{if(statusLine(line))statuses.push(index);});
    return statuses.map((statusIndex,resultIndex)=>{
      const previous=statuses[resultIndex-1]??-1; const next=statuses[resultIndex+1]??lines.length; let before=lines.slice(previous+1,statusIndex); const start=questionStartIndex(before); before=before.slice(start);
      const after=lines.slice(statusIndex+1,next);
      const nextQuestionIndex=after.findIndex((line,index)=>index>0&&(/^(quest[aã]o\s*(?:q\s*)?\d+|q\s*\d{4,})/i.test(line)||(detectBoard(line)&&/\b(19|20)\d{2}\b/.test(line))));
      const afterMetadata=parseMetadata(nextQuestionIndex>=0?after.slice(0,nextQuestionIndex):after);
      const beforeMetadata=parseMetadata(before);
      const meta={...beforeMetadata};
      Object.entries(afterMetadata).forEach(([key,value])=>{if(!meta[key]&&value)meta[key]=value;});
      const alternatives=parseAlternatives(before); const optionIndexes=before.map((line,index)=>optionLine(line)?index:-1).filter((index)=>index>=0); const firstOption=optionIndexes.length?Math.min(...optionIndexes):before.length;
      const statementLines=before.slice(0,firstOption).filter((line)=>!metadataLine(line)&&!UI_NOISE.test(line)&&!detectBoard(line)&&!/^(quest[aã]o\s*(?:q\s*)?\d+|q\s*\d{4,})/i.test(line));
      const enunciado=statementLines.join(" ").trim(); const comment=parseComment(after); const statusText=lines[statusIndex]; const officialKey=statusText.match(/gabarito[^:]*:\s*([A-E])/i)?.[1]?.toUpperCase()||after.join(" ").match(/gabarito[^:]*:\s*([A-E])/i)?.[1]?.toUpperCase()||"";
      const correct=canonical(statusText).includes("acertou")||canonical(statusText).includes("resposta correta"); const type=Object.keys(alternatives).length>=4?"multipla":Object.keys(alternatives).length===2&&alternatives.C&&alternatives.E?"ce":"";
      const fields=[enunciado,meta.disciplina,meta.assunto,meta.banca,meta.ano,meta.cargo,meta.orgao,meta.referencia]; const confidence=Math.round(fields.filter(Boolean).length/fields.length*100);
      return{index:resultIndex,...meta,enunciado,alternativas:alternatives,comentarioQc:comment,justificativa:comment,fundamento:comment,tipo:type,officialKey,correct,status:canonical(statusText).includes("incorreta")||canonical(statusText).includes("errou")?"errado":correct?"certo":"revisar",segment:before.join(" "),confidence,reviewRequired:!enunciado||!meta.disciplina||!meta.assunto};
    });
  }
  function parseOcrText(text) { return parseDetailedQuestions(text).map((item)=>({index:item.index,correct:item.correct,status:item.status,officialKey:item.officialKey,segment:item.segment,comment:item.comentarioQc,questionDraft:item})); }
  function matchResults(ocrResults,visualResults,questions,detailedQuestions=[]) {
    const sourceResults=ocrResults.length?ocrResults:visualResults.map((_,index)=>({index,status:"",correct:false,officialKey:"",segment:"",comment:"",questionDraft:detailedQuestions[index]||{}})); const used=new Set();
    return sourceResults.map((result,index)=>{const visual=visualResults[index]||{};const draft=result.questionDraft||detailedQuestions[index]||{};const matchText=[result.segment,draft.enunciado,draft.disciplina,draft.assunto,draft.banca,draft.cargo,draft.orgao].filter(Boolean).join(" ");const ranked=(questions||[]).filter((q)=>!used.has(q.id)).map((question)=>({question,score:questionMatchScore(matchText,question)})).sort((a,b)=>b.score-a.score);const best=ranked[0]?.score>=.28?ranked[0]:null;if(best?.question?.id)used.add(best.question.id);const questionKey=String(best?.question?.gabarito||"").toUpperCase();const marked=visual.marked||(result.correct?(result.officialKey||questionKey):"");return{index,questionId:best?.question?.id||"",matchScore:best?.score||0,matchMethod:best?"texto":"novo",optionCount:Number(visual.optionCount)||Object.keys(draft.alternativas||{}).length,detectedType:Number(visual.optionCount)>=4?"multipla":Number(visual.optionCount)===2?"ce":draft.tipo||"",marked,officialKey:result.officialKey||draft.officialKey||questionKey,status:result.status||(marked&&questionKey?(marked===questionKey?"certo":"errado"):"revisar"),comment:result.comment||draft.comentarioQc||"",visualConfidence:visual.confidence||"revisar",segment:result.segment||"",questionDraft:draft};});
  }
  function loadOcrScript(){if(globalThis.Tesseract?.createWorker)return Promise.resolve(globalThis.Tesseract);if(globalThis.__ALDUS_TESSERACT_LOADING__)return globalThis.__ALDUS_TESSERACT_LOADING__;globalThis.__ALDUS_TESSERACT_LOADING__=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=OCR_SCRIPT_URL;script.async=true;script.crossOrigin="anonymous";script.addEventListener("load",()=>resolve(globalThis.Tesseract));script.addEventListener("error",()=>reject(new Error("Não foi possível carregar o leitor de texto. A prévia visual continuará disponível.")));document.head.append(script);});return globalThis.__ALDUS_TESSERACT_LOADING__;}
  async function recognizeText(file,onProgress){const Tesseract=await loadOcrScript();if(!Tesseract?.createWorker)throw new Error("O leitor de texto não ficou disponível.");const worker=await Tesseract.createWorker("por",1,{logger(message){if(message?.status&&typeof onProgress==="function")onProgress(message);}});try{await worker.setParameters({tessedit_pageseg_mode:Tesseract.PSM?.AUTO||"3",preserve_interword_spaces:"1"});const result=await worker.recognize(file);return result?.data?.text||"";}finally{await worker.terminate();}}
  async function fileFingerprint(file){if(!globalThis.crypto?.subtle)return`${file.name}|${file.size}|${file.lastModified}`;const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return[...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join("");}
  async function readFile(file,options={}){if(!file||!/png|jpe?g|webp/i.test(file.type||file.name||""))throw new Error("Selecione uma captura em PNG, JPG ou WEBP.");const fingerprint=await fileFingerprint(file);if(options.existingFingerprints?.has?.(fingerprint))throw new Error("Esta captura já foi registrada anteriormente.");options.onProgress?.({status:"analisando marcações",progress:.05});const visual=await imageAnalysis(file);let text="",ocrError="";try{text=await recognizeText(file,options.onProgress);}catch(error){ocrError=error.message;}const structuredQuestions=parseDetailedQuestions(text);const ocrResults=parseOcrText(text);const matches=matchResults(ocrResults,visual.answers,options.questions||[],structuredQuestions);if(!matches.length)throw new Error("Não foi possível identificar questões ou resultados na captura.");return{version:VERSION,fileName:file.name,fingerprint,width:visual.width,height:visual.height,visualAnswers:visual.answers,ocrResults,structuredQuestions,matches,rawText:text,ocrError};}

  globalThis.AldusQconcursosCaptureImport=Object.freeze({version:VERSION,analyzeImageData,parseOcrText,parseDetailedQuestions,questionMatchScore,matchResults,fileFingerprint,readFile});
})();
