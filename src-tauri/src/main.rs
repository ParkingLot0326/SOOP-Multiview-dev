// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use m3u8_rs::{MasterPlaylist, MediaPlaylist, MediaSegment};
use reqwest::{Client, Error};
use serde::Deserialize;
use serde_json::{Map, Value};
use tauri::{
    http::{self, HeaderMap, HeaderValue, Method as HttpMethod, Response as TauriResponse},
    Manager, UriSchemeResponder,
};
use urlencoding::encode;

use std::{
    collections::HashMap,
    fs::{self, File},
    path::{Path, PathBuf},
};

use bytes::Bytes;

fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    let exe_path: PathBuf = std::env::current_exe()?;
    let exe_dir: &Path = exe_path
        .parent()
        .ok_or("실행 파일의 부모 디렉토리를 찾을 수 없습니다.")?;

    let data_dir: PathBuf = exe_dir.join("data");
    let config_path: PathBuf = data_dir.join("smtv_config.json");
    let crc_log_path: PathBuf = data_dir.join("smtv_log.log");

    if !data_dir.exists() {
        println!("데이터 폴더가 존재하지 않으므로 새로 생성합니다.");
        println!("데이터 폴더 위치: {:?}", data_dir);
        fs::create_dir_all(&data_dir)?;
    } else {
        println!("데이터 폴더가 이미 존재합니다.");
    }

    if !config_path.exists() {
        println!("컨픽 파일이 존재하지 않으므로 새로 생성합니다.");
        File::create(&config_path)?;
    } else {
        println!("컨픽 파일이 이미 존재합니다.");
    }

    if !crc_log_path.exists() {
        println!("로그 파일이 존재하지 않으므로 새로 생성합니다.");
        File::create(&crc_log_path)?;
    } else {
        println!("로그 파일이 이미 존재합니다.");
    }

    println!("초기화가 완료되었습니다.");

    Ok(())
}

fn create_client() -> Client {
    let mut headers: HeaderMap = HeaderMap::new();
    headers.insert(
        "Origin",
        HeaderValue::from_static("https://play.sooplive.co.kr"),
    );
    headers.insert(
        "Referer",
        HeaderValue::from_static("https://play.sooplive.co.kr/"),
    );
    headers.insert(
            "User-Agent",
            HeaderValue::from_static(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            ),
        );
    headers.insert("Accept", HeaderValue::from_static("*/*"));
    headers.insert("Accept-Encoding", HeaderValue::from_static("deflate, br"));
    headers.insert("Connection", HeaderValue::from_static("keep-alive"));

    Client::builder()
        .default_headers(headers)
        .build()
        .expect("Client 생성에 실패했습니다.")
}

#[derive(Deserialize, serde::Serialize)]
struct Streamer {
    bjnick: String,
    do_check_live: bool,
    custom_color: String,
}

#[tauri::command]
fn read_streamers() -> HashMap<String, Streamer> {
    let exe_path = std::env::current_exe().expect("실행 파일의 경로를 찾을 수 없습니다.");
    let exe_dir = exe_path
        .parent()
        .expect("실행 파일의 부모 디렉토리를 찾을 수 없습니다.");
    let config_path = exe_dir.join("data/config.json");

    let config_content: String = fs::read_to_string(&config_path).unwrap();
    let config_value: Value = serde_json::from_str(&config_content).unwrap();
    let streamer_map: HashMap<String, Streamer> = if let Some(v) = config_value.get("bj_dict") {
        serde_json::from_value(v.clone())
            .map_err(|e| e.to_string())
            .unwrap()
    } else {
        println!("bj_dict 키가 존재하지 않습니다.");
        HashMap::new()
    };
    streamer_map
}

fn parse_proxy_request(uri: &str) -> Result<HashMap<String, String>, String> {
    let parsed_uri: url::Url = url::Url::parse(uri)
        .map_err(|e: url::ParseError| e.to_string())
        .map_err(|e| e.to_string())?;

    let mut params: HashMap<String, String> = HashMap::new();

    for (key, value) in parsed_uri.query_pairs() {
        params.insert(key.into_owned(), value.into_owned());
    }

    if !params.contains_key("url") {
        return Err("URL 파라미터가 없습니다.".to_string());
    }

    Ok(params)
}

async fn custom_protocol(mut request: http::Request<Vec<u8>>, responder: UriSchemeResponder) {
    let method: HttpMethod = request.method().to_owned();
    let body = request.body().to_owned();
    // 요청 URI 파싱 및 파라미터 추출
    let params: HashMap<String, String> = match parse_proxy_request(&request.uri().to_string()) {
        Ok(params) => params,
        Err(e) => {
            let response = TauriResponse::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(e.into_bytes())
                .unwrap();
            responder.respond(response);
            return;
        }
    };

    // 필수 파라미터 확인
    let url = match params.get("url") {
        Some(url) => url,
        None => {
            let error_msg = "URL 파라미터가 없습니다.";
            println!("{}", error_msg);
            let response = TauriResponse::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(error_msg.as_bytes().to_vec())
                .unwrap();
            responder.respond(response);
            return;
        }
    };

    let mut headers = request.headers_mut().to_owned();
    headers.remove("Origin");
    headers.append(
        "Origin",
        HeaderValue::from_static("https://play.sooplive.co.kr"),
    );
    headers.remove("Referer");
    headers.append(
        "Referer",
        HeaderValue::from_static("https://play.sooplive.co.kr/"),
    );

    // HTTP 요청 수행
    let client: Client = create_client();

    let response: TauriResponse<Vec<u8>> = match request.uri().path() {
        "/stream" => build_stream_response(client, url, headers).await,
        "/stream/segment" => build_response(client, url, method, headers, Some(body)).await,
        "/auth" => build_response(client, url, method, headers, Some(body)).await,
        "/fetch" => build_response(client, url, method, headers, Some(body)).await,
        _ => build_response(client, url, method, headers, Some(body)).await,
    };

    responder.respond(response);
}

async fn handle_response(
    resp: Result<reqwest::Response, reqwest::Error>,
) -> TauriResponse<Vec<u8>> {
    match resp {
        Ok(resp) => {
            let status: http::StatusCode = resp.status();

            // 응답 헤더 처리
            let headers: HeaderMap = resp.headers().clone();
            let content_type: &str = headers
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|ct| ct.to_str().ok())
                .unwrap_or("application/octet-stream");

            // 응답 본문 처리
            let body_bytes = match resp.bytes().await {
                Ok(bytes) => bytes,
                Err(e) => {
                    let error_msg = format!("본문 읽기 실패: {}", e);
                    println!("{}", error_msg);
                    return build_error_response(500);
                }
            };

            // 성공적인 응답 구성
            let response_builder = TauriResponse::builder()
                .status(status.as_u16())
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", content_type);

            match response_builder.body(body_bytes.to_vec()) {
                Ok(response) => response,
                Err(e) => {
                    let error_msg = format!("응답 구성 실패: {}", e);
                    println!("{}", error_msg);
                    return build_error_response(500);
                }
            }
        }
        Err(e) => {
            let error_msg = format!("외부 URL 요청 오류: {}", e);
            println!("{}", error_msg);
            return build_error_response(500);
        }
    }
}

async fn build_response(
    client: Client,
    url: &str,
    method: HttpMethod,
    headers: HeaderMap,
    body: Option<Vec<u8>>,
) -> TauriResponse<Vec<u8>> {
    let map: Map<String, Value>;
    if let Some(vec) = body {
        map = serde_json::from_slice(&vec).unwrap_or(Map::new());
    } else {
        map = Map::new();
    }

    let response: Result<reqwest::Response, Error> = match method {
        HttpMethod::GET => client.get(url).headers(headers).send().await,
        HttpMethod::POST => client.post(url).headers(headers).form(&map).send().await,
        _ => {
            return build_error_response(400); // 400 Bad Request for invalid method
        }
    };

    handle_response(response).await
}

async fn build_stream_response(
    client: Client,
    url: &str,
    headers: HeaderMap,
) -> TauriResponse<Vec<u8>> {
    let original_response: Result<reqwest::Response, Error> =
        client.get(url).headers(headers).send().await;
    match original_response {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let content_type = headers
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|ct| ct.to_str().ok())
                .unwrap_or("application/octet-stream");

            let mut body_bytes = resp.bytes().await.unwrap();
            let mut buffer = Vec::new();

            if m3u8_rs::is_master_playlist(&body_bytes) {
                println!("Master Playlist detected");

                let original_playlist: MasterPlaylist =
                    m3u8_rs::parse_master_playlist_res(&body_bytes)
                        .unwrap_or(MasterPlaylist::default());

                let mut new_playlist: MasterPlaylist = original_playlist.clone();
                new_playlist.variants.clear();

                let master_uri = url
                    .rsplit_once('/')
                    .map_or(url.to_string(), |(base, _)| base.to_string());

                for variant in original_playlist.variants {
                    let pair = variant
                        .uri
                        .as_str()
                        .trim_end_matches(',')
                        .split('?')
                        .collect::<Vec<&str>>();

                    let mut query_val = HashMap::new();
                    let path = pair[0].to_string();

                    for querypair in pair[1].split('&') {
                        let tmp = querypair.split('=').collect::<Vec<&str>>();
                        if tmp.len() >= 2 {
                            let k = tmp[0];
                            let v = tmp[1];
                            query_val.insert(k.to_string(), v.to_string());
                        }
                    }

                    let tmp_json = serde_json::to_string(&query_val).unwrap();
                    let query_string = encode(&tmp_json);

                    let new_uri = format!("?url={}/{}?{}", master_uri, path, query_string,);
                    let mut new_variant = variant.clone();
                    new_variant.uri = new_uri;
                    new_playlist.variants.push(new_variant);
                }

                if let Err(e) = new_playlist.write_to(&mut buffer) {
                    let error_msg = format!("Error writing playlist: {}", e);
                    println!("{}", error_msg);
                    return build_error_response(500);
                }
            } else {
                let original_playlist: MediaPlaylist =
                    m3u8_rs::parse_media_playlist_res(&body_bytes)
                        .unwrap_or(MediaPlaylist::default());

                let mut new_playlist: MediaPlaylist = original_playlist.clone();
                new_playlist.segments.clear();

                for segment in original_playlist.segments {
                    if segment.uri.contains("preloading") {
                        println!("Skipping preloading segment: {}", segment.uri);
                        continue;
                    }

                    let mut new_segment: MediaSegment = segment.clone();

                    let new_uri = format!(
                        "segment?url={}/{}",
                        url.split("?").collect::<Vec<&str>>()[0],
                        segment.uri
                    );
                    new_segment.uri = new_uri;
                    new_playlist.segments.push(new_segment);
                }

                if let Err(e) = new_playlist.write_to(&mut buffer) {
                    let error_msg = format!("Error writing playlist: {}", e);
                    println!("{}", error_msg);
                    return build_error_response(500);
                }
            }

            body_bytes = Bytes::from(buffer);

            let mod_response: TauriResponse<Vec<u8>> = TauriResponse::builder()
                .status(status.as_u16())
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", content_type)
                .body(body_bytes.to_vec())
                .unwrap();

            mod_response
        }
        Err(e) => {
            let error_msg = format!("Error from external URL request: {}", e);
            println!("{}", error_msg);
            build_error_response(500)
        }
    }
}

fn build_error_response(status: u16) -> TauriResponse<Vec<u8>> {
    let response = TauriResponse::builder()
        .status(status)
        .header("Content-Type", "text/plain")
        .body("Error".as_bytes().to_vec())
        .unwrap();
    response
}

#[tokio::main]
async fn main() {
    let client = create_client();
    initialize().expect("초기화에 실패했습니다.");

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .register_asynchronous_uri_scheme_protocol(
            "smtv",
            move |_app_handle, request, responder| {
                tokio::task::spawn(async move {
                    custom_protocol(request, responder).await;
                });
            },
        )
        .manage(client)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("다른 인스턴스가 시작되었습니다: {:?}, {:?}", argv, cwd);

            let window = app.get_webview_window("main").unwrap();
            window.set_focus().unwrap();
        }))
        .invoke_handler(tauri::generate_handler![read_streamers])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
