import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const API = "https://helldivers.wiki.gg/api.php";
const projectRoot = process.cwd();
const localRoot = join(projectRoot, "reference", "wiki-image-index");
const outputRoot = join(projectRoot, "reference", "wiki-publishable-image-index");
const licenseUrl = "https://creativecommons.org/licenses/by-nc-sa/4.0/";
const redistributableLicenses = new Set(["CC-BY-NC-SA"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const csvCell = (value = "") => `"${String(value).replace(/"/g, '""')}"`;

async function fetchJson(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "HD2-Loadout-Terminal/0.1 license-audit" },
    signal: AbortSignal.timeout(30_000),
  });
  if ((!response.ok || response.status === 429) && attempt < 4) {
    await sleep(500 * attempt);
    return fetchJson(params, attempt + 1);
  }
  if (!response.ok) throw new Error(`Wiki API ${response.status}`);
  return response.json();
}

function extractLicense(wikitext = "") {
  return wikitext.match(/\{\{License\/([^}\r\n]+)\}\}/i)?.[1]?.trim() || "UNMARKED";
}

function extractSource(wikitext = "") {
  const source = wikitext.match(/^\s*\|\s*source\s*=\s*(.+)$/im)?.[1]?.trim();
  if (!source) return "未标明";
  return source
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2 ($1)")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\s\]]+)\s+([^\]]+)\]/g, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function auditFiles(fileTitles) {
  const result = new Map();
  for (let offset = 0; offset < fileTitles.length; offset += 40) {
    const titles = fileTitles.slice(offset, offset + 40);
    const data = await fetchJson({
      action: "query",
      titles: titles.join("|"),
      prop: "categories|revisions|imageinfo",
      rvprop: "content",
      rvslots: "main",
      cllimit: "max",
      iiprop: "user|timestamp",
    });
    for (const page of Object.values(data.query?.pages ?? {})) {
      const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || "";
      result.set(page.title, {
        licenseCode: extractLicense(wikitext),
        filePageSource: extractSource(wikitext),
        wikiUploader: page.imageinfo?.[0]?.user || "未标明",
        wikiUploadTimestamp: page.imageinfo?.[0]?.timestamp || "",
        licenseCategories: (page.categories ?? []).map((category) => category.title),
      });
    }
    process.stdout.write(`\r核验许可 ${Math.min(offset + 40, fileTitles.length)}/${fileTitles.length}`);
    await sleep(100);
  }
  process.stdout.write("\n");
  return result;
}

function renderHtml(records, generatedAt) {
  const groups = [
    ["primary", "主武器"],
    ["secondary", "副武器"],
    ["throwable", "手雷"],
    ["stratagem", "战备"],
    ["booster", "被动"],
  ];
  const sections = groups.map(([id, label]) => {
    const items = records.filter((record) => record.groupId === id);
    const cards = items.map((record) => `
      <article class="card" data-search="${escapeHtml(`${record.nameZh} ${record.nameEn}`.toLowerCase())}">
        <div class="image-box">${record.publishedPath ? `<img src="${escapeHtml(record.publishedPath)}" alt="${escapeHtml(record.nameZh)}" loading="lazy">` : `<div class="restricted">未随仓库分发<br><small>${escapeHtml(record.licenseCode)}</small></div>`}</div>
        <div class="copy"><strong>${escapeHtml(record.nameZh)}</strong><span>${escapeHtml(record.nameEn)}</span></div>
        <footer><span>${escapeHtml(record.licenseCode)}</span>${record.descriptionUrl ? `<a href="${escapeHtml(record.descriptionUrl)}" target="_blank" rel="noreferrer">来源与许可 ↗</a>` : ""}</footer>
      </article>`).join("");
    return `<section id="${id}"><header><h2>${label}</h2><span>${items.filter((item) => item.publishedPath).length}/${items.length} 可分发</span></header><div class="grid">${cards}</div></section>`;
  }).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HD2 Wiki 图片名称与许可对照表</title><style>
  :root{color-scheme:dark;font-family:"Segoe UI Variable Text","Microsoft YaHei UI",sans-serif;background:#07090a;color:#e7ece9}*{box-sizing:border-box}body{margin:0;background:#07090a}main{width:min(1480px,calc(100% - 44px));margin:auto;padding:34px 0 70px}.eyebrow{color:#8c9a96;font:11px Consolas,monospace;letter-spacing:.14em}h1{margin:7px 0;font-size:30px}.intro{color:#a4afab;line-height:1.7;max-width:980px;font-size:13px}.notice{margin:18px 0;padding:13px 15px;border:1px solid #755f2b;background:#17150d;color:#d8c68e;font-size:12px}.toolbar{position:sticky;z-index:5;top:0;padding:12px 0;background:rgba(7,9,10,.94)}input{width:100%;height:44px;border:1px solid #35413e;background:#0d1213;color:#fff;padding:0 14px;font-size:14px}section{scroll-margin-top:76px;margin-top:28px}section>header{display:flex;align-items:end;justify-content:space-between;border-bottom:1px solid #35413e;margin-bottom:12px;padding-bottom:9px}h2{margin:0;font-size:21px}section>header span{color:#8d9995;font:11px Consolas,monospace}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.card{min-width:0;border:1px solid #293432;background:#0d1213}.card[hidden]{display:none}.image-box{height:174px;display:grid;place-items:center;padding:12px;background:repeating-linear-gradient(0deg,transparent 0 27px,rgba(140,160,154,.055) 28px),repeating-linear-gradient(90deg,transparent 0 27px,rgba(140,160,154,.055) 28px)}img{max-width:100%;max-height:100%;object-fit:contain}.restricted{text-align:center;color:#9a8d67;font-size:12px}.restricted small{color:#716a56}.copy{display:grid;gap:4px;padding:12px 13px}.copy strong{font-size:14px}.copy span{color:#abb5b1;font:11px Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card footer{min-height:39px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 12px;border-top:1px solid #293432;color:#91a09b;font-size:9px}.card a{color:#f1c94a;text-decoration:none;font-size:10px}@media(max-width:800px){main{width:calc(100% - 24px)}.grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}.image-box{height:140px}}
  </style></head><body><main><div class="eyebrow">PUBLIC REFERENCE // LICENSE AUDITED</div><h1>装备图片—名称与许可对照表</h1><p class="intro">共 ${records.length} 项，生成于 ${escapeHtml(generatedAt)}。仅将文件页明确标为 CC BY-NC-SA 4.0 的原图放入仓库；Arrowhead/EULA 和未标许可的图片仅保留名称、来源链接与状态。</p><div class="notice">第三方图片不适用本项目 MIT 许可证。已分发图片须遵守 CC BY-NC-SA 4.0，署名详情见 THIRD_PARTY_ASSETS.md。</div><div class="toolbar"><input id="search" type="search" placeholder="搜索中文或英文名称…" aria-label="搜索装备"></div>${sections}</main><script>const input=document.querySelector('#search');input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();document.querySelectorAll('.card').forEach(card=>card.hidden=q&&!card.dataset.search.includes(q));});</script></body></html>`;
}

async function main() {
  const sourceManifest = JSON.parse(await readFile(join(localRoot, "manifest.json"), "utf8"));
  const fileTitles = [...new Set(sourceManifest.records.map((record) => record.fileTitle).filter(Boolean))];
  const auditByFile = await auditFiles(fileTitles);
  const generatedAt = new Date().toISOString();
  const records = [];

  for (const originalRecord of sourceManifest.records) {
    const audit = auditByFile.get(originalRecord.fileTitle) ?? { licenseCode: "UNMARKED", filePageSource: "未标明", wikiUploader: "未标明", wikiUploadTimestamp: "", licenseCategories: [] };
    const redistributable = Boolean(originalRecord.localPath && redistributableLicenses.has(audit.licenseCode));
    const record = {
      ...originalRecord,
      ...audit,
      license: audit.licenseCode === "CC-BY-NC-SA" ? "CC BY-NC-SA 4.0" : audit.licenseCode,
      usageTerms: audit.licenseCode === "CC-BY-NC-SA" ? licenseUrl : originalRecord.usageTerms,
      redistributionStatus: redistributable ? "included-cc-by-nc-sa-4.0" : "metadata-only",
    };
    delete record.localPath;
    if (redistributable) {
      record.publishedPath = originalRecord.localPath.replace(/^images\//, "images/");
      const sourcePath = join(localRoot, originalRecord.localPath);
      const targetPath = join(outputRoot, record.publishedPath);
      const imageBytes = await readFile(sourcePath);
      record.bytes = imageBytes.byteLength;
      record.sha256 = createHash("sha256").update(imageBytes).digest("hex");
      await mkdir(dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
    records.push(record);
  }

  await mkdir(outputRoot, { recursive: true });
  const manifest = {
    generatedAt,
    source: "https://helldivers.wiki.gg/",
    licenseAuditMethod: "Each Wiki file page's License/* template, queried through the MediaWiki API.",
    notice: "Only records marked included-cc-by-nc-sa-4.0 have image files in this directory. Other records are metadata-only.",
    records,
  };
  await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const csvHeaders = ["类别", "中文名称", "英文名称", "Wiki页面", "Wiki文件页", "原图URL", "仓库图片", "文件许可", "文件页来源", "Wiki上传账号", "SHA-256", "分发状态"];
  const csvRows = records.map((record) => [record.groupLabel, record.nameZh, record.nameEn, record.pageUrl, record.descriptionUrl, record.originalUrl, record.publishedPath, record.license, record.filePageSource, record.wikiUploader, record.sha256, record.redistributionStatus].map(csvCell).join(","));
  await writeFile(join(outputRoot, "image-name-index.csv"), `\uFEFF${csvHeaders.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`, "utf8");
  await writeFile(join(outputRoot, "index.html"), renderHtml(records, generatedAt), "utf8");

  const included = records.filter((record) => record.publishedPath);
  const noticeRows = included.map((record) => {
    const attribution = record.filePageSource === "未标明" ? `Wiki 上传账号：${record.wikiUploader}` : `${record.filePageSource}；Wiki 上传账号：${record.wikiUploader}`;
    return `| ${record.nameZh} / ${record.nameEn} | [Wiki 文件页](${record.descriptionUrl}) | ${attribution} | [CC BY-NC-SA 4.0](${licenseUrl}) |`;
  }).join("\n");
  await writeFile(join(outputRoot, "THIRD_PARTY_ASSETS.md"), `# 第三方图片署名与许可\n\n本目录中的图片文件来自 Helldivers Wiki，对应文件页明确标为 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0](${licenseUrl})。图片不适用本项目的 MIT 许可证。\n\n使用条件包括署名、仅限非商业用途，以及以相同许可共享演绎内容。文件仅重命名并按类别整理，未修改画面内容。名称、来源和许可核验时间记录在 \`manifest.json\`。\n\n| 图片 | 来源 | 文件页注明的上传者/来源 | 许可 |\n| --- | --- | --- | --- |\n${noticeRows}\n`, "utf8");
  await writeFile(join(outputRoot, "README.md"), `# Wiki 图片—名称与许可对照表\n\n- 完整索引：\`index.html\`\n- 机器可读清单：\`manifest.json\`\n- CSV 名称表：\`image-name-index.csv\`\n- 第三方图片署名：\`THIRD_PARTY_ASSETS.md\`\n\n清单覆盖 ${records.length} 项；仓库只包含 ${included.length} 张文件页明确标为 CC BY-NC-SA 4.0 的图片。其他项目仅保留元数据和来源链接。\n`, "utf8");

  const counts = new Map();
  for (const record of records) counts.set(record.licenseCode, (counts.get(record.licenseCode) ?? 0) + 1);
  console.log(`完成：${records.length} 项；可发布图片 ${included.length} 张`);
  console.log([...counts.entries()].map(([license, count]) => `${license}: ${count}`).join(" | "));
}

await main();
