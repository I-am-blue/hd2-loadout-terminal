import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const API = "https://helldivers.wiki.gg/api.php";
const WIKI = "https://helldivers.wiki.gg/wiki/";
const outputRoot = join(process.cwd(), "reference", "wiki-image-index");
const imageRoot = join(outputRoot, "images");

const groups = [
  { id: "primary", label: "主武器", seed: "primarySeeds", category: "Primary Weapons", imagePattern: /Primary (?:Render|Icon)\.(?:png|webp|jpe?g|svg)$/i },
  { id: "secondary", label: "副武器", seed: "secondarySeeds", category: "Secondary Weapons", imagePattern: /Secondary (?:Render|Icon)\.(?:png|webp|jpe?g|svg)$/i },
  { id: "throwable", label: "手雷", seed: "throwableSeeds", category: "Throwables", imagePattern: /(?:Throwable (?:Render|Icon)|Ingame Model)\.(?:png|webp|jpe?g|svg)$/i },
  { id: "stratagem", label: "战备", seed: "stratagemSeeds", category: "Stratagems", imagePattern: /Stratagem Icon\.(?:png|webp|jpe?g|svg)$/i },
  { id: "booster", label: "被动", seed: "boosterSeeds", category: "Boosters", imagePattern: /Booster Icon\.(?:png|webp|jpe?g|svg)$/i },
];

const validProfiles = new Set([
  "ar", "smg", "shotgun", "marksman", "energy", "explosive", "special", "pistol", "melee", "support",
  "grenade_frag", "grenade_he", "grenade_control", "grenade_at", "eagle_horde", "eagle_at", "orbital_horde", "orbital_at",
  "support_horde", "support_medium", "support_at", "backpack", "mobility", "sentry_horde", "sentry_at", "emplacement", "vehicle",
  "booster_survival", "booster_sustain", "booster_mobility", "booster_utility",
]);

const pageAliases = new Map([
  ["CQC-20", "CQC-20 Breaching Hammer"],
  ["GL-28", "GL-28 Belt-Fed Grenade Launcher"],
  ["Guard Dog Rover", "AX/LAS-5 Rover"],
  ["Guard Dog K-9", "AX/ARC-3 K-9"],
  ["Guard Dog Hot Dog", "AX/FLAM-75 Hot Dog"],
  ["Hellbomb Portable", "B-100 Portable Hellbomb"],
  ["Gas Mine", "MD-8 Gas Mines"],
]);

const fileAliases = new Map([
  ["HMG Emplacement", "File:HMG Emplacement Stratagem Icon.svg"],
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanText = (value = "") => value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const normalize = (value = "") => cleanText(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const withoutCode = (value = "") => normalize(value).replace(/^(?:[a-z]{1,5}(?:\s*[0-9]+[a-z]*)?|[a-z0-9]+)\s+/, "");
const fileStem = (value) => value.replace(/^File:/i, "").replace(/\.(?:png|webp|jpe?g|svg)$/i, "").replace(/ (?:Primary|Secondary|Throwable) (?:Render|Icon)$/i, "").replace(/ Ingame Model$/i, "").replace(/ (?:Stratagem|Booster) Icon$/i, "");
const safeName = (value) => normalize(value).replace(/\s+/g, "-").slice(0, 100) || "unknown";
const wikiPageUrl = (title) => `${WIKI}${encodeURIComponent(title.replace(/ /g, "_"))}`;

function matchScore(wanted, candidate) {
  const a = normalize(wanted);
  const b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1000;
  if (b.endsWith(` ${a}`) || a.endsWith(` ${b}`)) return 900 - Math.abs(a.length - b.length);
  const ac = withoutCode(wanted);
  const bc = withoutCode(candidate);
  if (ac && ac === bc) return 880;
  if (ac && bc && (bc.endsWith(` ${ac}`) || ac.endsWith(` ${bc}`))) return 820 - Math.abs(ac.length - bc.length);
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
  return (shared / Math.max(aTokens.size, bTokens.size)) * 500 - Math.abs(aTokens.size - bTokens.size) * 4;
}

async function fetchJson(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const response = await fetch(url, { headers: { "User-Agent": "HD2-Loadout-Terminal/0.1 local-reference-index" }, signal: AbortSignal.timeout(30_000) });
  if ((!response.ok || response.status === 429) && attempt < 4) {
    await sleep(400 * attempt);
    return fetchJson(params, attempt + 1);
  }
  if (!response.ok) throw new Error(`Wiki API ${response.status}: ${url}`);
  return response.json();
}

async function categoryPages(category) {
  const pages = [];
  let cmcontinue;
  do {
    const data = await fetchJson({ action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmnamespace: "0", cmtype: "page", cmlimit: "max", ...(cmcontinue ? { cmcontinue } : {}) });
    pages.push(...(data.query?.categorymembers ?? []).map((entry) => entry.title));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return pages;
}

async function categoryFiles(category) {
  const files = [];
  let cmcontinue;
  do {
    const data = await fetchJson({ action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmnamespace: "6", cmtype: "file", cmlimit: "max", ...(cmcontinue ? { cmcontinue } : {}) });
    files.push(...(data.query?.categorymembers ?? []).map((entry) => entry.title));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return files;
}

function readSeeds(source, seedName) {
  const start = source.indexOf(`const ${seedName}: ItemSeed[] = [`);
  const end = source.indexOf("\n];", start);
  if (start < 0 || end < 0) throw new Error(`Cannot locate ${seedName}`);
  const block = source.slice(start, end);
  const seeds = [];
  let depth = 0;
  let itemStart = -1;
  let quoted = false;
  let escaped = false;
  for (let index = block.indexOf("["); index < block.length; index += 1) {
    const char = block[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === "[") {
      depth += 1;
      if (depth === 2) itemStart = index;
    } else if (char === "]") {
      if (depth === 2 && itemStart >= 0) {
        const itemSource = block.slice(itemStart, index + 1);
        const match = itemSource.match(/^\[\s*"([^"]+)",\s*"([^"]+)",\s*"([a-z_]+)"/);
        if (match && validProfiles.has(match[3])) seeds.push({ nameEn: match[1], nameZh: match[2] });
        itemStart = -1;
      }
      depth -= 1;
    }
  }
  return seeds;
}

function matchPage(item, pageTitles, groupId) {
  const alias = pageAliases.get(item.nameEn);
  if (alias && pageTitles.includes(alias)) return alias;
  const excluded = /^(?:Stratagems|Boosters|Weapons|Helldivers Wiki:|April Fools\/)/i;
  const candidates = pageTitles.filter((title) => !excluded.test(title)).map((title) => ({ title, score: matchScore(item.nameEn, title) })).sort((a, b) => b.score - a.score || a.title.length - b.title.length);
  const threshold = groupId === "stratagem" ? 250 : 300;
  return candidates[0]?.score >= threshold ? candidates[0].title : undefined;
}

async function pageImages(pageTitles) {
  const result = new Map(pageTitles.map((title) => [title, []]));
  for (let offset = 0; offset < pageTitles.length; offset += 10) {
    const titles = pageTitles.slice(offset, offset + 10);
    let continuation = {};
    do {
      const data = await fetchJson({ action: "query", titles: titles.join("|"), prop: "images", imlimit: "max", redirects: "1", ...continuation });
      for (const page of Object.values(data.query?.pages ?? {})) {
        if (page.missing !== undefined) continue;
        const target = result.get(page.title) ?? [];
        target.push(...(page.images ?? []).map((image) => image.title));
        result.set(page.title, [...new Set(target)]);
      }
      continuation = data.continue ? { imcontinue: data.continue.imcontinue, continue: data.continue.continue } : null;
    } while (continuation);
    process.stdout.write(`\r读取页面图片 ${Math.min(offset + 10, pageTitles.length)}/${pageTitles.length}`);
    await sleep(80);
  }
  process.stdout.write("\n");
  return result;
}

function selectImage(item, pageTitle, images, group) {
  const alias = fileAliases.get(item.nameEn);
  if (alias) return alias;
  const filtered = images.filter((title) => group.imagePattern.test(title) && !/(?:Background|Fallback)\./i.test(title));
  const fallback = images.filter((title) => /\.(?:png|webp|jpe?g|svg)$/i.test(title) && !/(Armor AP|Armor AV|Damage |Medal|Requisition|Currency|Arrow|Background|Fallback|Magazine|Muzzle|Optics|Underbarrel)/i.test(title));
  const candidates = filtered.length ? filtered : fallback;
  return candidates.map((title) => ({
    title,
    score: Math.max(matchScore(item.nameEn, fileStem(title)), matchScore(pageTitle, fileStem(title))),
  })).sort((a, b) => b.score - a.score || a.title.length - b.title.length)[0]?.title;
}

async function imageInfo(fileTitles) {
  const result = new Map();
  for (let offset = 0; offset < fileTitles.length; offset += 25) {
    const titles = fileTitles.slice(offset, offset + 25);
    const data = await fetchJson({ action: "query", titles: titles.join("|"), prop: "imageinfo", iiprop: "url|mime|size|extmetadata" });
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const metadata = info.extmetadata ?? {};
      result.set(page.title, {
        url: info.url,
        descriptionUrl: info.descriptionurl,
        mime: info.mime,
        width: info.width,
        height: info.height,
        license: cleanText(metadata.LicenseShortName?.value || metadata.License?.value || "未标明"),
        artist: cleanText(metadata.Artist?.value || "未标明"),
        credit: cleanText(metadata.Credit?.value || ""),
        usageTerms: cleanText(metadata.UsageTerms?.value || ""),
      });
    }
    process.stdout.write(`\r读取文件元数据 ${Math.min(offset + 25, fileTitles.length)}/${fileTitles.length}`);
    await sleep(80);
  }
  process.stdout.write("\n");
  return result;
}

async function downloadImage(record, index, total) {
  if (!record.originalUrl || !record.fileTitle) return record;
  const extension = extname(record.fileTitle.replace(/^File:/, "")).toLowerCase() || ".bin";
  const groupDir = join(imageRoot, record.groupId);
  await mkdir(groupDir, { recursive: true });
  const filename = `${safeName(record.nameEn)}${extension}`;
  const relativePath = `images/${record.groupId}/${filename}`;
  const localFile = join(outputRoot, relativePath);
  try {
    await access(localFile);
    return { ...record, localPath: relativePath };
  } catch {
    // Continue with the download when the local cache does not exist.
  }
  try {
    const response = await fetch(record.originalUrl, { headers: { "User-Agent": "HD2-Loadout-Terminal/0.1 local-reference-index" }, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) return { ...record, error: `图片下载失败：HTTP ${response.status}` };
    await writeFile(localFile, new Uint8Array(await response.arrayBuffer()));
    if (index % 10 === 0 || index === total) process.stdout.write(`\r下载原图 ${index}/${total}`);
    return { ...record, localPath: relativePath };
  } catch (error) {
    return { ...record, error: `图片下载失败：${error instanceof Error ? error.message : String(error)}` };
  }
}

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const csvCell = (value = "") => `"${String(value).replace(/"/g, '""')}"`;

function renderHtml(records, generatedAt) {
  const sections = groups.map((group) => {
    const items = records.filter((record) => record.groupId === group.id);
    const cards = items.map((record) => `<article class="card" data-search="${escapeHtml(`${record.nameZh} ${record.nameEn}`.toLowerCase())}">
      <div class="image-box">${record.localPath ? `<img src="${escapeHtml(record.localPath)}" alt="${escapeHtml(record.nameZh)}" loading="lazy">` : `<div class="missing">缺少匹配原图</div>`}</div>
      <div class="copy"><strong>${escapeHtml(record.nameZh)}</strong><span>${escapeHtml(record.nameEn)}</span><small>${escapeHtml(record.fileTitle || record.error || "Wiki 页面或图片未匹配")}</small></div>
      <footer><span class="license">${escapeHtml(record.license || "未标明")}</span>${record.descriptionUrl ? `<a href="${escapeHtml(record.descriptionUrl)}" target="_blank" rel="noreferrer">文件页 ↗</a>` : record.pageUrl ? `<a href="${escapeHtml(record.pageUrl)}" target="_blank" rel="noreferrer">页面 ↗</a>` : ""}</footer>
    </article>`).join("\n");
    return `<section id="${group.id}"><header><h2>${group.label}</h2><span>${items.filter((item) => item.localPath).length} / ${items.length} 已匹配</span></header><div class="grid">${cards}</div></section>`;
  }).join("\n");
  const totals = groups.map((group) => { const items = records.filter((r) => r.groupId === group.id); return `<a href="#${group.id}"><strong>${group.label}</strong><span>${items.filter((r) => r.localPath).length}/${items.length}</span></a>`; }).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HD2 Wiki 图片名称对照表</title><style>
  :root{color-scheme:dark;font-family:"Segoe UI Variable Text","Microsoft YaHei UI",sans-serif;background:#07090a;color:#e7ece9}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#172421 0,transparent 28%),#07090a}main{width:min(1480px,calc(100% - 44px));margin:auto;padding:34px 0 70px}.eyebrow{color:#8c9a96;font:11px Consolas,monospace;letter-spacing:.14em}h1{margin:7px 0;font-size:30px}.intro{color:#a4afab;line-height:1.7;max-width:900px;font-size:13px}.warning{margin:18px 0;padding:13px 15px;border:1px solid #755f2b;background:#17150d;color:#d8c68e;font-size:12px}.toolbar{position:sticky;z-index:5;top:0;display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:12px;padding:12px 0;background:rgba(7,9,10,.94);backdrop-filter:blur(8px)}input{height:44px;border:1px solid #35413e;background:#0d1213;color:#fff;padding:0 14px;font-size:14px}.summary{display:flex;border:1px solid #35413e}.summary a{min-width:92px;display:grid;place-items:center;padding:5px 12px;border-right:1px solid #35413e;color:#aab4b0;text-decoration:none;font-size:11px}.summary a:last-child{border:0}.summary a strong{color:#f1c94a}.summary a span{font:10px Consolas,monospace}section{scroll-margin-top:76px;margin-top:28px}section>header{display:flex;align-items:end;justify-content:space-between;border-bottom:1px solid #35413e;margin-bottom:12px;padding-bottom:9px}h2{margin:0;font-size:21px}section>header span{color:#8d9995;font:11px Consolas,monospace}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.card{min-width:0;border:1px solid #293432;background:#0d1213}.card[hidden]{display:none}.image-box{height:174px;display:grid;place-items:center;padding:12px;background:linear-gradient(145deg,rgba(241,201,74,.035),transparent),repeating-linear-gradient(0deg,transparent 0 27px,rgba(140,160,154,.055) 28px),repeating-linear-gradient(90deg,transparent 0 27px,rgba(140,160,154,.055) 28px)}img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,.7))}.missing{color:#6e7a76;font-size:12px;border:1px dashed #3b4744;padding:12px}.copy{display:grid;gap:4px;padding:12px 13px}.copy strong{font-size:14px}.copy span{color:#abb5b1;font:11px Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.copy small{color:#65716d;font:9px Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card footer{min-height:39px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 12px;border-top:1px solid #293432}.license{max-width:140px;color:#91a09b;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card a{color:#f1c94a;text-decoration:none;font-size:10px}@media(max-width:800px){main{width:calc(100% - 24px)}.toolbar{grid-template-columns:1fr}.summary{overflow:auto}.grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}.image-box{height:140px}}
  </style></head><body><main><div class="eyebrow">LOCAL REFERENCE // HELLDIVERS WIKI</div><h1>装备图片—名称对照表</h1><p class="intro">按本项目装备目录整理的 Wiki 原图参考。生成时间：${escapeHtml(generatedAt)}。点击“文件页”可查看来源与该文件单独标注的授权信息。</p><div class="warning">仅供本地资料核对。Wiki 页面默认许可不代表其中每张游戏素材均可再分发；本目录已被 Git 忽略，未经逐项权利确认不得放入公开仓库或安装包。</div><div class="toolbar"><input id="search" type="search" placeholder="搜索中文或英文名称…" aria-label="搜索装备"><nav class="summary">${totals}</nav></div>${sections}</main><script>const input=document.querySelector('#search');input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();document.querySelectorAll('.card').forEach(card=>card.hidden=q&&!card.dataset.search.includes(q));});</script></body></html>`;
}

async function main() {
  await mkdir(imageRoot, { recursive: true });
  const catalogSource = await readFile(join(process.cwd(), "src", "data", "catalog.ts"), "utf8");
  const categoryMap = new Map();
  for (const group of groups) {
    const pages = await categoryPages(group.category);
    categoryMap.set(group.id, pages);
    console.log(`${group.label}: Wiki 分类 ${pages.length} 个页面`);
  }

  const pending = [];
  for (const group of groups) {
    const pages = categoryMap.get(group.id);
    for (const item of readSeeds(catalogSource, group.seed)) {
      const pageTitle = matchPage(item, pages, group.id);
      pending.push({ ...item, groupId: group.id, groupLabel: group.label, pageTitle, pageUrl: pageTitle ? wikiPageUrl(pageTitle) : undefined });
    }
  }
  const uniquePages = [...new Set(pending.map((item) => item.pageTitle).filter(Boolean))];
  console.log(`项目目录 ${pending.length} 项，匹配 Wiki 页面 ${uniquePages.length} 项`);
  const imagesByPage = await pageImages(uniquePages);
  const globalIconFiles = [...new Set([
    ...(await categoryFiles("Helldivers 2 - Icons")),
    ...(await categoryFiles("Stratagems")),
    ...(await categoryFiles("Boosters")),
  ])];
  console.log(`全局装备图标 ${globalIconFiles.length} 个文件`);

  for (const record of pending) {
    if (!record.pageTitle) { record.error = "未匹配到 Wiki 页面"; continue; }
    const group = groups.find((candidate) => candidate.id === record.groupId);
    const imageCandidates = record.groupId === "stratagem" || record.groupId === "booster" ? globalIconFiles : imagesByPage.get(record.pageTitle) ?? [];
    record.fileTitle = selectImage(record, record.pageTitle, imageCandidates, group);
    if (!record.fileTitle) record.error = "页面中未匹配到对应原图";
  }

  const uniqueFiles = [...new Set(pending.map((item) => item.fileTitle).filter(Boolean))];
  const infoByFile = await imageInfo(uniqueFiles);
  for (const record of pending) {
    const info = infoByFile.get(record.fileTitle);
    if (info) Object.assign(record, { originalUrl: info.url, descriptionUrl: info.descriptionUrl, mime: info.mime, width: info.width, height: info.height, license: info.license, artist: info.artist, credit: info.credit, usageTerms: info.usageTerms });
    else if (record.fileTitle) record.error = "未读取到文件元数据";
  }

  let downloaded = 0;
  const downloadable = pending.filter((item) => item.originalUrl);
  for (let offset = 0; offset < downloadable.length; offset += 6) {
    const batch = downloadable.slice(offset, offset + 6);
    const results = await Promise.all(batch.map((record, index) => downloadImage(record, offset + index + 1, downloadable.length)));
    for (const result of results) Object.assign(batch.find((item) => item.nameEn === result.nameEn && item.groupId === result.groupId), result);
    downloaded += results.filter((item) => item.localPath).length;
    await sleep(90);
  }
  process.stdout.write("\n");

  const generatedAt = new Date().toISOString();
  const manifest = { generatedAt, source: "https://helldivers.wiki.gg/", notice: "Local reference only. Verify each file's rights before redistribution.", records: pending };
  await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const csvHeaders = ["类别", "中文名称", "英文名称", "Wiki页面", "Wiki文件", "原图URL", "本地路径", "许可标注", "作者/来源", "状态"];
  const csvRows = pending.map((item) => [item.groupLabel, item.nameZh, item.nameEn, item.pageUrl, item.descriptionUrl, item.originalUrl, item.localPath, item.license, item.artist || item.credit, item.error || "已匹配"].map(csvCell).join(","));
  await writeFile(join(outputRoot, "image-name-index.csv"), `\uFEFF${csvHeaders.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`, "utf8");
  await writeFile(join(outputRoot, "index.html"), renderHtml(pending, generatedAt), "utf8");
  await writeFile(join(outputRoot, "README.txt"), `HD2 Wiki 图片—名称本地对照表\n\n打开 index.html 浏览。\n原图与来源元数据见 manifest.json；名称表见 image-name-index.csv。\n\n重要：这些文件仅供本地核对，并非项目可分发素材。各文件权利状态以对应 Wiki 文件页为准。\n`, "utf8");
  const missing = pending.filter((item) => !item.localPath);
  console.log(`完成：${downloaded}/${pending.length} 张原图，缺失 ${missing.length} 项`);
  if (missing.length) console.log(`缺失：${missing.map((item) => `${item.groupLabel}/${item.nameEn}`).join(" | ")}`);
  console.log(join(outputRoot, "index.html"));
}

await main();
