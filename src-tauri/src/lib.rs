use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};
use url::Url;

const KEYRING_SERVICE: &str = "hd2-loadout-terminal";
const KEYRING_ACCOUNT: &str = "openai-compatible-api-key";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiRequest {
    base_url: String,
    model: String,
    context: Value,
    loadout: Value,
    evaluation: Value,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogManifest {
    schema_version: u32,
    data_version: String,
    min_app_version: String,
    asset_url: String,
    sha256: String,
    signature: String,
}

fn safe_endpoint(value: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|_| "AI 服务地址无效。".to_string())?;
    let localhost = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"));
    if url.scheme() != "https" && !(localhost && url.scheme() == "http") {
        return Err("仅允许 HTTPS 地址；localhost 可使用 HTTP。".into());
    }
    Ok(url)
}

#[tauri::command]
fn save_ai_key(api_key: String) -> Result<(), String> {
    let trimmed = api_key.trim();
    if trimmed.len() < 8 || trimmed.len() > 4096 {
        return Err("API Key 长度无效。".into());
    }
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|_| "无法访问 Windows 凭据管理器。".to_string())?
        .set_password(trimmed)
        .map_err(|_| "API Key 无法写入 Windows 凭据管理器。".to_string())
}

#[tauri::command]
fn clear_ai_key() -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|_| "无法访问 Windows 凭据管理器。".to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("无法从 Windows 凭据管理器移除 API Key。".into()),
    }
}

#[tauri::command]
async fn generate_ai_report(request: AiRequest) -> Result<Value, String> {
    let mut endpoint = safe_endpoint(&request.base_url)?;
    let path = endpoint.path().trim_end_matches('/').to_string();
    endpoint.set_path(&format!("{path}/chat/completions"));
    let api_key = Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|_| "无法访问 Windows 凭据管理器。".to_string())?
        .get_password()
        .map_err(|_| "未找到已保存的 API Key。".to_string())?;

    let user_payload = json!({
        "context": request.context,
        "loadout": request.loadout,
        "evaluation": request.evaluation,
    });
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "无法初始化 AI 网络客户端。".to_string())?;
    let response = client
        .post(endpoint)
        .bearer_auth(api_key)
        .json(&json!({
            "model": request.model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": "你是 HD2 战术配装解释器。只能解释用户提供的确定性规则结果；不得修改、重算或新增分数，不得发明替换候选。仅输出 JSON 对象，字段为 summary:string、strengths:string[]、risks:string[]、replacements:{itemId:string,explanation:string}[]。使用简体中文。"
                },
                { "role": "user", "content": user_payload.to_string() }
            ]
        }))
        .send()
        .await
        .map_err(|error| if error.is_timeout() { "AI 请求在 30 秒后超时。".to_string() } else { "无法连接 AI 服务。".to_string() })?;

    if !response.status().is_success() {
        return Err(format!("AI 服务返回 HTTP {}。", response.status().as_u16()));
    }
    let body: ChatResponse = response
        .json()
        .await
        .map_err(|_| "AI 服务响应格式无效。".to_string())?;
    let content = body
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_ref())
        .ok_or_else(|| "AI 服务未返回报告内容。".to_string())?;
    let cleaned = content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(cleaned).map_err(|_| "AI 报告不是有效 JSON。".to_string())
}

fn catalog_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|_| "无法定位应用数据目录。".to_string())?
        .join("catalogs");
    fs::create_dir_all(&directory).map_err(|_| "无法创建数据目录。".to_string())?;
    Ok(directory)
}

#[tauri::command]
fn load_catalog_override(app: AppHandle) -> Result<Option<String>, String> {
    let directory = catalog_dir(&app)?;
    let pointer = directory.join("current.txt");
    if !pointer.exists() {
        return Ok(None);
    }
    let version =
        fs::read_to_string(pointer).map_err(|_| "无法读取当前数据版本指针。".to_string())?;
    let safe_version: String = version
        .trim()
        .chars()
        .filter(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_')
        })
        .collect();
    if safe_version.is_empty() {
        return Ok(None);
    }
    let path = directory.join(format!("catalog-{safe_version}.json"));
    let content = fs::read_to_string(path).map_err(|_| "无法读取已下载数据包。".to_string())?;
    Ok(Some(content))
}

fn verify_catalog(data: &[u8], manifest: &CatalogManifest) -> Result<(), String> {
    let digest = Sha256::digest(data);
    let digest_hex = format!("{digest:x}");
    if digest_hex != manifest.sha256.to_lowercase() {
        return Err("数据包 SHA-256 校验失败。".into());
    }

    let public_key_b64 = option_env!("HD2_DATA_PUBLIC_KEY").unwrap_or("");
    if public_key_b64.is_empty() {
        return Err("发行版尚未配置数据签名公钥。".into());
    }
    let public_key_bytes = BASE64
        .decode(public_key_b64)
        .map_err(|_| "数据签名公钥无效。".to_string())?;
    let signature_bytes = BASE64
        .decode(&manifest.signature)
        .map_err(|_| "数据包签名格式无效。".to_string())?;
    let public_key_array: [u8; 32] = public_key_bytes
        .try_into()
        .map_err(|_| "数据签名公钥长度无效。".to_string())?;
    let public_key = VerifyingKey::from_bytes(&public_key_array)
        .map_err(|_| "数据签名公钥无效。".to_string())?;
    let signature =
        Signature::from_slice(&signature_bytes).map_err(|_| "数据包签名无效。".to_string())?;
    public_key
        .verify(&digest, &signature)
        .map_err(|_| "数据包 Ed25519 签名验证失败。".to_string())?;

    let value: Value =
        serde_json::from_slice(data).map_err(|_| "数据包不是有效 JSON。".to_string())?;
    if value.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || value
            .get("items")
            .and_then(Value::as_array)
            .map_or(true, |items| items.is_empty())
    {
        return Err("数据包模式或内容无效。".into());
    }
    Ok(())
}

#[tauri::command]
async fn check_catalog_update(app: AppHandle) -> Result<String, String> {
    let manifest_url = option_env!("HD2_DATA_MANIFEST_URL").unwrap_or("");
    if manifest_url.is_empty() {
        return Ok("当前开发构建未配置公开数据更新源。".into());
    }
    let manifest_endpoint = safe_endpoint(manifest_url)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "无法初始化更新客户端。".to_string())?;
    let manifest: CatalogManifest = client
        .get(manifest_endpoint)
        .send()
        .await
        .map_err(|_| "无法连接数据更新源。".to_string())?
        .error_for_status()
        .map_err(|error| {
            format!(
                "更新源返回 HTTP {}。",
                error
                    .status()
                    .map(|status| status.as_u16().to_string())
                    .unwrap_or_else(|| "未知".into())
            )
        })?
        .json()
        .await
        .map_err(|_| "更新清单格式无效。".to_string())?;
    if manifest.schema_version != 1 {
        return Err("更新数据模式不受支持。".into());
    }
    if manifest.min_app_version.as_str() > APP_VERSION {
        return Err("新数据需要更高版本的应用。".into());
    }

    let directory = catalog_dir(&app)?;
    let target = directory.join(format!(
        "catalog-{}.json",
        manifest
            .data_version
            .chars()
            .filter(|character| character.is_ascii_alphanumeric()
                || matches!(character, '.' | '-' | '_'))
            .collect::<String>()
    ));
    if target.exists() {
        return Ok(format!("已是最新数据版本 {}。", manifest.data_version));
    }
    let asset_url = safe_endpoint(&manifest.asset_url)?;
    let data = client
        .get(asset_url)
        .send()
        .await
        .map_err(|_| "无法下载数据包。".to_string())?
        .error_for_status()
        .map_err(|error| {
            format!(
                "数据源返回 HTTP {}。",
                error
                    .status()
                    .map(|status| status.as_u16().to_string())
                    .unwrap_or_else(|| "未知".into())
            )
        })?
        .bytes()
        .await
        .map_err(|_| "无法读取数据包。".to_string())?;
    verify_catalog(&data, &manifest)?;

    let temporary = directory.join(format!("catalog-{}.tmp", manifest.data_version));
    fs::write(&temporary, &data).map_err(|_| "无法写入临时数据包。".to_string())?;
    fs::rename(&temporary, &target).map_err(|_| "无法提交新数据包。".to_string())?;
    fs::write(directory.join("current.txt"), &manifest.data_version)
        .map_err(|_| "无法更新当前数据版本指针。".to_string())?;
    Ok(format!(
        "数据已更新至 {}，重启应用后生效。",
        manifest.data_version
    ))
}

#[tauri::command]
fn export_diagnostic_log(target_path: String) -> Result<(), String> {
    let target = PathBuf::from(target_path);
    if target
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("txt"))
        != Some(true)
    {
        return Err("诊断日志必须保存为 .txt 文件。".into());
    }
    let content = format!(
        "HD2 Tactical Loadout Terminal diagnostics\napp_version={APP_VERSION}\nos={}\narch={}\ntelemetry=disabled\ncredentials=redacted\n",
        std::env::consts::OS,
        std::env::consts::ARCH,
    );
    fs::write(target, content).map_err(|_| "无法写入诊断日志。".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            save_ai_key,
            clear_ai_key,
            generate_ai_report,
            load_catalog_override,
            check_catalog_update,
            export_diagnostic_log,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run HD2 Tactical Loadout Terminal");
}
