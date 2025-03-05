// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use m3u8_rs::{MediaPlaylist, MediaSegment};
use reqwest::{
    blocking::{Client as BlockingClient, Response as BlockingResponse},
    header::{HeaderMap, HeaderName, HeaderValue},
    Client, Error, Response as ReqwestResponse,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{
    http::{self, Response as TauriResponse},
    State,
};

use std::{
    collections::HashMap,
    fs::{self, File},
    path::{Path, PathBuf},
};

use bytes::Bytes;
use percent_encoding::percent_decode_str;

fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    let exe_path: PathBuf = std::env::current_exe()?;
    let exe_dir: &Path = exe_path
        .parent()
        .ok_or("실행 파일의 부모 디렉토리를 찾을 수 없습니다.")?;

    let data_dir: PathBuf = exe_dir.join("data");
    let config_path: PathBuf = data_dir.join("config.json");
    let crc_log_path: PathBuf = data_dir.join("crc.log");

    if !data_dir.exists() {
        println!("데이터 폴더가 존재하지 않으므로 새로 생성합니다.");
        println!("데이터 폴더 위치: {:?}", data_dir);
        fs::create_dir_all(&data_dir)?;
    } else {
        println!("데이터 폴더가 이미 존재합니다.");
    }

    if !config_path.exists() {
        println!("config.json 파일이 존재하지 않으므로 새로 생성합니다.");
        File::create(&config_path)?;
    } else {
        println!("config.json 파일이 이미 존재합니다.");
    }

    if !crc_log_path.exists() {
        println!("crc.log 파일이 존재하지 않으므로 새로 생성합니다.");
        File::create(&crc_log_path)?;
    } else {
        println!("crc.log 파일이 이미 존재합니다.");
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

fn create_blocking_client() -> BlockingClient {
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

    BlockingClient::builder()
        .default_headers(headers)
        .build()
        .expect("BlockingClient 생성에 실패했습니다.")
}

#[derive(Deserialize, Debug, Serialize)]
pub struct Body {
    bid: String,
}

#[tauri::command]
async fn check_live(client: State<'_, Client>, bid: String) -> Result<Value, String> {
    // let body = Body { bid: bid };

    println!("Checking live status for bid: {}", bid);
    let mut body = HashMap::new();
    body.insert("bid", &bid);

    let response = client
        .post("https://live.sooplive.co.kr/afreeca/player_live_api.php")
        .form(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let res: Value;
    match response.status() {
        reqwest::StatusCode::OK => {
            let json_response = response.json::<Value>().await.map_err(|e| {
                format!("Fetch was successful, but error occured: {}", e.to_string())
            })?;

            res = json_response.get("CHANNEL").unwrap().clone();
        }
        reqwest::StatusCode::NOT_FOUND => {
            println!("Received response status: 404 Not Found");
            return Err("404 Not Found".to_string());
        }
        other => {
            println!("Received response status: {:?}", other);
            return Err("Unknown error".to_string());
        }
    }

    return Ok(res);
}

#[tauri::command]
async fn get_stream_url(
    client: State<'_, Client>,
    bno: String,
    cdn: &str,
    quality: String,
) -> Result<String, String> {
    let broad_key: String = format!("{}-common-{}-hls", bno, quality);

    let mut stream_url_body = HashMap::new();

    let cdn_val = match cdn {
        "gs_cdn" => "gs_cdn_pc_web",
        "gcp_cdn" => "gcp_cdn",
        _ => "gcp_cdn",
    }
    .to_string();
    // let cdn_val: String = String::from("gcp_cdn");
    // .to_string();

    stream_url_body.insert("return_type", &cdn_val);
    stream_url_body.insert("broad_key", &broad_key);

    let stream_url_response: ReqwestResponse = client
        .get("https://livestream-manager.sooplive.co.kr/broad_stream_assign.html")
        .query(&stream_url_body)
        .send()
        .await
        .map_err(|e: Error| format!("Error from Fetching Stream URL: {}", e))?;
    let stream_body = stream_url_response.json::<Value>().await;
    println!("Stream URL Response: {:?}", stream_body);

    let stream_url: String = stream_body
        .map_err(|e: Error| format!("Error from Decoding Stream URL Body: {}", e))?
        .get("view_url")
        .unwrap()
        .to_string();

    println!("Stream URL: {}", stream_url);
    return Ok(stream_url.trim_matches('"').to_string());
}

#[tauri::command]
async fn post_aid(
    client: State<'_, Client>,
    bno: String,
    quality: String,
    password: String,
) -> Result<String, String> {
    let mut aid_body: HashMap<&str, &str> = HashMap::new();
    aid_body.insert("type", "aid");
    aid_body.insert("bno", &bno);
    aid_body.insert("quality", &quality);
    aid_body.insert("pwd", &password);

    let aid_key_response: ReqwestResponse = client
        .post("https://live.sooplive.co.kr/afreeca/player_live_api.php")
        .form(&aid_body)
        .send()
        .await
        .map_err(|e: Error| format!("Error from Fetching AID Key: {}", e))?;

    let aid_key: String = aid_key_response
        .json::<Value>()
        .await
        .map_err(|e: Error| format!("Error from Decoding AID Key Body: {}", e))?
        .get("CHANNEL")
        .unwrap()
        .get("AID")
        .unwrap()
        .to_string();

    println!("AID Key: {}", aid_key);
    return Ok(aid_key.trim_matches('"').to_string());
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

    if !params.contains_key("method") {
        return Err("Method 파라미터가 없습니다.".to_string());
    }

    Ok(params)
}

fn custom_protocol(request: http::Request<Vec<u8>>) -> TauriResponse<Vec<u8>> {
    // 요청 URI 파싱 및 파라미터 추출
    let params: HashMap<String, String> = match parse_proxy_request(&request.uri().to_string()) {
        Ok(params) => params,
        Err(e) => {
            println!("요청 파싱 오류: {}", e);
            return TauriResponse::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(e.into_bytes())
                .unwrap();
        }
    };
    // 필수 파라미터 확인
    let url = match params.get("url") {
        Some(url) => url,
        None => {
            let error_msg = "URL 파라미터가 없습니다.";
            println!("{}", error_msg);
            return TauriResponse::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(error_msg.as_bytes().to_vec())
                .unwrap();
        }
    };

    let method = match params.get("method") {
        Some(method) => method,
        None => {
            let error_msg = "Method 파라미터가 없습니다.";
            println!("{}", error_msg);
            return TauriResponse::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(error_msg.as_bytes().to_vec())
                .unwrap();
        }
    };

    let headers = match params.get("headers") {
        Some(headers) => {
            let decoded_headers = percent_decode_str(headers).decode_utf8().unwrap();
            let temp_map: Map<String, Value> =
                serde_json::from_str(&decoded_headers).expect("Failed to parse headers");

            let mut header_map = HeaderMap::new();
            for (key, value) in temp_map.iter() {
                if let Ok(header_name) = HeaderName::from_bytes(key.as_bytes()) {
                    if let Ok(header_value) = HeaderValue::from_str(value.as_str().unwrap()) {
                        header_map.insert(header_name, header_value);
                    }
                }
            }
            header_map
        }
        None => HeaderMap::new(),
    };

    let query = match params.get("query") {
        Some(query) => {
            let decoded_query = percent_decode_str(query).decode_utf8().unwrap();
            let query_map: Map<String, Value> =
                serde_json::from_str(&decoded_query).expect("Failed to parse query");
            query_map
        }
        None => Map::new(),
    };

    // HTTP 요청 수행
    let client: BlockingClient = create_blocking_client();

    let response: TauriResponse<Vec<u8>> = match request.uri().path() {
        "/stream" => build_stream_response(client, url, headers, query),
        "/stream/segment" => build_response(client, url, method, headers, query),
        _ => build_response(client, url, method, headers, query),
    };

    return response;
    // let response = match method.as_str() {
    //     "GET" => client.get(url).headers(headers).query(&query).send(),
    //     "POST" => client.post(url).headers(headers).form(&query).send(),
    //     _ => {
    //         let error_msg = format!("지원하지 않는 HTTP 메소드: {}", method);
    //         println!("{}", error_msg);
    //         return TauriResponse::builder()
    //             .status(500)
    //             .header("Content-Type", "text/plain")
    //             .body(error_msg.as_bytes().to_vec())
    //             .unwrap();
    //     }
    // };
    // 응답 처리
}

fn handle_response(resp: Result<BlockingResponse, reqwest::Error>) -> TauriResponse<Vec<u8>> {
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
            let body_bytes = match resp.bytes() {
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

fn build_response(
    client: BlockingClient,
    url: &str,
    method: &str,
    headers: HeaderMap,
    query: Map<String, Value>,
) -> TauriResponse<Vec<u8>> {
    let response: Result<BlockingResponse, Error> = match method {
        "GET" => client.get(url).headers(headers).query(&query).send(),
        "POST" => client.post(url).headers(headers).form(&query).send(),
        _ => {
            return build_error_response(400); // 400 Bad Request for invalid method
        }
    };

    handle_response(response)
}

fn build_stream_response(
    client: BlockingClient,
    url: &str,
    headers: HeaderMap,
    query: Map<String, Value>,
) -> TauriResponse<Vec<u8>> {
    let original_response: Result<BlockingResponse, Error> =
        client.get(url).headers(headers).query(&query).send();
    match original_response {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let content_type = headers
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|ct| ct.to_str().ok())
                .unwrap_or("application/octet-stream");
            let mut body_bytes = resp.bytes().unwrap();

            let original_playlist: MediaPlaylist =
                m3u8_rs::parse_media_playlist_res(&body_bytes).unwrap_or(MediaPlaylist::default());

            let mut new_playlist: MediaPlaylist = original_playlist.clone();
            new_playlist.segments.clear();

            for segment in original_playlist.segments {
                if segment.uri.contains("preloading") {
                    println!("Skipping preloading segment: {}", segment.uri);
                    continue;
                }

                let mut new_segment: MediaSegment = segment.clone();
                let new_uri = format!("segment?url={}/{}&method=GET", url, segment.uri);
                new_segment.uri = new_uri;
                new_playlist.segments.push(new_segment);
            }

            let mut buffer = Vec::new();
            if let Err(e) = new_playlist.write_to(&mut buffer) {
                let error_msg = format!("Error writing playlist: {}", e);
                println!("{}", error_msg);
                return build_error_response(500);
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

fn main() {
    let client = create_client();
    initialize().expect("초기화에 실패했습니다.");
    tauri::Builder::default()
        .register_uri_scheme_protocol("proxy", move |_app_handle, request| {
            custom_protocol(request)
        })
        .manage(client)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            read_streamers,
            check_live,
            get_stream_url,
            post_aid
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
