import { deflateRaw, inflateRaw } from "pako";
import { catalog as defaultCatalog } from "../data/catalog";
import type { CatalogBundle, Loadout } from "../types";
import { isCompleteSelection, selectedIds } from "./scoring";

const MAX_CODE_LENGTH = 24_000;
const MAX_DECODED_BYTES = 16 * 1024;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

interface SharedLoadout {
  v: 1;
  d: string;
  t: string;
  s: Loadout["selection"];
  c: Loadout["context"];
}

export const encodeShareCode = (loadout: Loadout) => {
  const payload: SharedLoadout = {
    v: 1,
    d: loadout.dataVersion,
    t: loadout.title.slice(0, 80),
    s: loadout.selection,
    c: loadout.context,
  };
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = deflateRaw(encoded);
  return `HD2T1.${toBase64Url(compressed)}.${crc32(encoded)}`;
};

export const decodeShareCode = (
  code: string,
  bundle: CatalogBundle = defaultCatalog,
): Omit<Loadout, "id" | "createdAt" | "updatedAt"> => {
  const trimmed = code.trim();
  if (trimmed.length > MAX_CODE_LENGTH) throw new Error("分享码超过允许长度。");
  const [prefix, body, expectedCrc, ...extra] = trimmed.split(".");
  if (prefix !== "HD2T1" || !body || !expectedCrc || extra.length) throw new Error("分享码格式无效。");

  let inflated: Uint8Array;
  try {
    inflated = inflateRaw(fromBase64Url(body));
  } catch {
    throw new Error("分享码内容已损坏。");
  }
  if (inflated.byteLength > MAX_DECODED_BYTES) throw new Error("分享码解码内容超过 16KB 限制。");
  if (crc32(inflated) !== expectedCrc.toLowerCase()) throw new Error("分享码校验失败。");

  let payload: SharedLoadout;
  try {
    payload = JSON.parse(new TextDecoder().decode(inflated)) as SharedLoadout;
  } catch {
    throw new Error("分享码不是有效的 JSON 数据。");
  }
  if (payload.v !== 1 || !payload.s || !payload.c) throw new Error("分享码版本不受支持。");
  if (!isCompleteSelection(payload.s)) throw new Error("分享码中的配装槽位不完整或包含重复战略配备。");

  const validIds = new Set(bundle.items.map((item) => item.id));
  const unknown = selectedIds(payload.s).filter((id) => !validIds.has(id));
  if (unknown.length) throw new Error(`当前数据版本无法识别 ${unknown.length} 件装备。`);
  if (!bundle.factions.some((faction) => faction.id === payload.c.factionId)) throw new Error("未知敌方阵营。");
  if (!bundle.missions.some((mission) => mission.id === payload.c.missionId)) throw new Error("未知任务类型。");
  if (!bundle.difficulties.some((difficulty) => difficulty.level === payload.c.difficulty)) throw new Error("未知难度。");

  return {
    schemaVersion: 1,
    dataVersion: payload.d,
    title: String(payload.t ?? "导入配装").slice(0, 80),
    selection: payload.s,
    context: payload.c,
  };
};
