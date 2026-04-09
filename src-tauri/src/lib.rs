use serde::Serialize;
use tauri::Emitter;
use tauri::Manager;
use windows::core::{PCSTR, PSTR};
use windows::Win32::Graphics::Printing::{
    ClosePrinter, EnumPrintersA, OpenPrinterA, StartDocPrinterA, StartPagePrinter, WritePrinter,
    EndDocPrinter, EndPagePrinter, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_INFO_4A,
    DOC_INFO_1A,
};
use windows::Win32::Foundation::HANDLE;

#[derive(Serialize)]
pub struct PrinterInfo {
    name: String,
}

#[tauri::command]
fn get_printers() -> Vec<String> {
    unsafe {
        let mut pcb_needed: u32 = 0;
        let mut pc_returned: u32 = 0;

        let _ = EnumPrintersA(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            PCSTR::null(),
            4,
            None,
            &mut pcb_needed,
            &mut pc_returned,
        );

        if pcb_needed == 0 {
            return Vec::new();
        }

        let mut buffer: Vec<u8> = vec![0; pcb_needed as usize];
        if EnumPrintersA(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            PCSTR::null(),
            4,
            Some(buffer.as_mut_slice()),
            &mut pcb_needed,
            &mut pc_returned,
        )
        .is_ok()
        {
            let info: *const PRINTER_INFO_4A = buffer.as_ptr() as *const PRINTER_INFO_4A;
            let mut printer_names = Vec::new();

            for i in 0..pc_returned {
                let printer_info = *info.add(i as usize);
                if !printer_info.pPrinterName.is_null() {
                    let name = printer_info.pPrinterName.to_string().unwrap_or_default();
                    printer_names.push(name);
                }
            }
            return printer_names;
        }
    }
    Vec::new()
}

#[tauri::command]
fn print_raw(printer_name: String, data: Vec<u8>) -> Result<String, String> {
    unsafe {
        let mut h_printer = HANDLE::default();
        let name_string = format!("{}\0", printer_name);
        let name_pcstr = PCSTR::from_raw(name_string.as_ptr());
        
        if OpenPrinterA(name_pcstr, &mut h_printer, None).is_err() {
            return Err("Não foi possível abrir a impressora".into());
        }

        let doc_name_str = "Etiqueta Donly\0";
        let datatype_str = "RAW\0";
        
        let doc_info = DOC_INFO_1A {
            pDocName: PSTR(doc_name_str.as_ptr() as *mut u8),
            pOutputFile: PSTR::null(),
            pDatatype: PSTR(datatype_str.as_ptr() as *mut u8),
        };

        let res_doc = StartDocPrinterA(h_printer, 1, &doc_info);
        if res_doc == 0 {
            let _ = ClosePrinter(h_printer);
            return Err("Erro no StartDocPrinter".into());
        }

        if !StartPagePrinter(h_printer).as_bool() {
            let _ = EndDocPrinter(h_printer);
            let _ = ClosePrinter(h_printer);
            return Err("Erro no StartPagePrinter".into());
        }

        let mut bytes_written: u32 = 0;
        if !WritePrinter(h_printer, data.as_ptr() as *const _, data.len() as u32, &mut bytes_written).as_bool() {
            let _ = EndPagePrinter(h_printer);
            let _ = EndDocPrinter(h_printer);
            let _ = ClosePrinter(h_printer);
            return Err("Erro ao gravar na impressora".into());
        }

        let _ = EndPagePrinter(h_printer);
        let _ = EndDocPrinter(h_printer);
        let _ = ClosePrinter(h_printer);
    }
    Ok("Impressão enviada com sucesso".into())
}

#[tauri::command]
fn print_label(printer_name: String, tspl_content: Vec<u8>) -> Result<String, String> {
    print_raw(printer_name, tspl_content)
}

use tiny_http::{Response, Server};

use std::sync::{Arc, Mutex};
lazy_static::lazy_static! {
    static ref SHARED_TEMPLATES: Arc<Mutex<String>> = Arc::new(Mutex::new("[]".to_string()));
}

#[tauri::command]
fn update_templates(json: String) {
    if let Ok(mut shared) = SHARED_TEMPLATES.lock() {
        *shared = json;
    }
}

#[tauri::command]
fn get_local_ip() -> String {
    use std::net::UdpSocket;
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(_) => return "127.0.0.1".to_string(),
    };

    if socket.connect("8.8.8.8:80").is_ok() {
        if let Ok(addr) = socket.local_addr() {
            return addr.ip().to_string();
        }
    }
    "127.0.0.1".to_string()
}

#[tauri::command]
fn save_template_to_source(template_id: String, template_json: String) -> Result<String, String> {
    use std::fs;

    // Caminho para o arquivo App.tsx
    let app_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_default();

    // Tenta encontrar o diretório do projeto (procura por src/App.tsx)
    let mut project_dir = app_path.clone();
    for _ in 0..10 {
        let test_path = project_dir.join("src").join("App.tsx");
        if test_path.exists() {
            break;
        }
        if let Some(parent) = project_dir.parent() {
            project_dir = parent.to_path_buf();
        } else {
            return Err("Não foi possível encontrar o diretório do projeto".into());
        }
    }

    let app_tsx_path = project_dir.join("src").join("App.tsx");

    if !app_tsx_path.exists() {
        return Err("Arquivo App.tsx não encontrado".into());
    }

    // Lê o conteúdo do arquivo
    let content = fs::read_to_string(&app_tsx_path)
        .map_err(|e| format!("Erro ao ler arquivo: {}", e))?;

    // Encontra o bloco do template no DEFAULT_TEMPLATES
    let search_id = format!("id: \"{}\"", template_id);
    if let Some(start_pos) = content.find(&search_id) {
        // Encontra o início do bloco (procura o '{' antes do id)
        let before = &content[..start_pos];
        let brace_start = before.rfind('{')
            .ok_or("Não foi possível encontrar o início do template")?;

        // Encontra o final do bloco (conta chaves)
        let after_start = &content[brace_start..];
        let mut brace_count = 0;
        let mut end_pos = 0;
        let mut in_string = false;
        let mut escape_next = false;

        for (i, ch) in after_start.char_indices() {
            if escape_next {
                escape_next = false;
                continue;
            }

            match ch {
                '\\' if in_string => escape_next = true,
                '"' => in_string = !in_string,
                '{' if !in_string => brace_count += 1,
                '}' if !in_string => {
                    brace_count -= 1;
                    if brace_count == 0 {
                        end_pos = i + 1;
                        break;
                    }
                }
                _ => {}
            }
        }

        if end_pos == 0 {
            return Err("Não foi possível encontrar o final do template".into());
        }

        // Converte template_json para o formato usado no código Rust
        let template_obj: serde_json::Value = serde_json::from_str(&template_json)
            .map_err(|e| format!("Erro ao parsear template JSON: {}", e))?;

        // Gera o código Rust formatado
        let id = template_obj["id"].as_str().unwrap_or("");
        let label = template_obj["label"].as_str().unwrap_or("");
        let size = template_obj["size"].as_str().unwrap_or("");
        let w = template_obj["w"].as_f64().unwrap_or(100.0);
        let h = template_obj["h"].as_f64().unwrap_or(50.0);
        let columns = template_obj["columns"].as_u64().unwrap_or(1);
        let elements = &template_obj["elements"];

        // Formata os elementos como código Rust
        let elements_code = format_elements_rust(elements);

        let new_template = format!(
            r#"  {{
    id: "{}",
    label: "{}",
    size: "{}",
    w: {},
    h: {},
    columns: {},
    elements: [
{}
    ],
  }}"#,
            id, label, size, w, h, columns, elements_code
        );

        // Substitui o template antigo pelo novo
        let new_content = format!(
            "{}{}{}",
            &content[..brace_start],
            new_template,
            &content[brace_start + end_pos..]
        );

        // Escreve o conteúdo atualizado no arquivo
        fs::write(&app_tsx_path, new_content)
            .map_err(|e| format!("Erro ao escrever no arquivo: {}", e))?;

        Ok("Template salvo com sucesso".into())
    } else {
        Err(format!("Template com id '{}' não encontrado", template_id))
    }
}

fn format_elements_rust(elements: &serde_json::Value) -> String {
    if let Some(arr) = elements.as_array() {
        arr.iter()
            .map(|el| {
                let id = el["id"].as_str().unwrap_or("");
                let el_type = el["type"].as_str().unwrap_or("text");
                let x = el["x"].as_f64().unwrap_or(0.0);
                let y = el["y"].as_f64().unwrap_or(0.0);
                let content = el["content"].as_str().unwrap_or("");

                let mut fields = vec![
                    format!(r#"        id: "{}","#, id),
                    format!(r#"        type: "{}","#, el_type),
                    format!(r#"        x: {},"#, x),
                    format!(r#"        y: {},"#, y),
                    format!(r#"        content: "{}","#, content),
                ];

                if let Some(w) = el["w"].as_f64() {
                    fields.push(format!(r#"        w: {},"#, w));
                }
                if let Some(h) = el["h"].as_f64() {
                    fields.push(format!(r#"        h: {},"#, h));
                }
                if let Some(font_size) = el["fontSize"].as_f64() {
                    fields.push(format!(r#"        fontSize: {},"#, font_size));
                }
                if let Some(bold) = el["bold"].as_bool() {
                    fields.push(format!(r#"        bold: {},"#, bold));
                }
                if let Some(italic) = el["italic"].as_bool() {
                    fields.push(format!(r#"        italic: {},"#, italic));
                }
                if let Some(align) = el["align"].as_str() {
                    fields.push(format!(r#"        align: "{}","#, align));
                }
                if let Some(font_family) = el["fontFamily"].as_str() {
                    fields.push(format!(r#"        fontFamily: "{}","#, font_family));
                }
                if let Some(field_binding) = el["fieldBinding"].as_str() {
                    fields.push(format!(r#"        fieldBinding: "{}","#, field_binding));
                }
                if let Some(bc_format) = el["bcFormat"].as_str() {
                    fields.push(format!(r#"        bcFormat: "{}","#, bc_format));
                }
                if let Some(bc_font_size) = el["bcFontSize"].as_f64() {
                    fields.push(format!(r#"        bcFontSize: {},"#, bc_font_size));
                }
                if let Some(bc_label_dist) = el["bcLabelDist"].as_f64() {
                    fields.push(format!(r#"        bcLabelDist: {},"#, bc_label_dist));
                }
                if let Some(line_height) = el["lineHeight"].as_f64() {
                    fields.push(format!(r#"        lineHeight: {},"#, line_height));
                }
                if let Some(rotation) = el["rotation"].as_f64() {
                    fields.push(format!(r#"        rotation: {},"#, rotation));
                }
                if let Some(stroke_width) = el["strokeWidth"].as_f64() {
                    fields.push(format!(r#"        strokeWidth: {},"#, stroke_width));
                }
                if let Some(fill) = el["fill"].as_bool() {
                    fields.push(format!(r#"        fill: {},"#, fill));
                }
                if let Some(color) = el["color"].as_str() {
                    fields.push(format!(r#"        color: "{}","#, color));
                }

                // Remove trailing comma from last field
                if let Some(last) = fields.last_mut() {
                    if last.ends_with(',') {
                        last.pop();
                    }
                }

                format!(
                    "      {{\n{}\n      }}",
                    fields.join("\n")
                )
            })
            .collect::<Vec<_>>()
            .join(",\n")
    } else {
        String::new()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_printers,
            print_raw,
            print_label,
            update_templates,
            get_local_ip,
            save_template_to_source
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_blur;
                let _ = apply_blur(&window, Some((0, 0, 0, 0)));
                let _ = window.set_shadow(false);
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                if let Ok(server) = Server::http("0.0.0.0:3003") {
                    for request in server.incoming_requests() {
                        let url = request.url();

                        // Rota para o Coletor baixar os modelos do DonlyX
                        if url.contains("/templates") {
                            let json_data = if let Ok(shared) = SHARED_TEMPLATES.lock() {
                                shared.clone()
                            } else {
                                "[]".to_string()
                            };
                            let response = Response::from_string(json_data)
                                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                            let _ = request.respond(response);
                            continue;
                        }

                        // Rota para o Coletor verificar conexão e listar impressoras
                        if url.contains("/impressoras") {
                            let _ = handle.emit("collector-status", true);
                            let printers = get_printers();
                            let data: Vec<serde_json::Value> = printers.into_iter()
                                .map(|name| serde_json::json!({ "name": name, "default": false }))
                                .collect();
                            
                            let response_body = serde_json::json!({
                                "success": true,
                                "data": data
                            }).to_string();
                            
                            let response = Response::from_string(response_body)
                                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                            let _ = request.respond(response);
                            continue;
                        }

                        // Rota para disparar fisicamente a impressão da fila
                        if url.contains("/trigger-print") {
                            let _ = handle.emit("collector-status", true);
                            let _ = handle.emit("remote-trigger-print", true);
                            let response = Response::from_string(serde_json::json!({ "success": true, "message": "Print triggered" }).to_string())
                                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                            let _ = request.respond(response);
                            continue;
                        }

                        if url.contains("/print") {
                            let _ = handle.emit("collector-status", true);
                            
                            // Se houver parâmetro de template, avisa o frontend para trocar
                            if url.contains("template=") {
                                let template_id = url
                                    .split("template=")
                                    .nth(1)
                                    .unwrap_or("")
                                    .split('&')
                                    .next()
                                    .unwrap_or("");
                                if !template_id.is_empty() {
                                    let _ = handle.emit("remote-template", template_id);
                                    let response = Response::from_string(serde_json::json!({ "success": true, "message": "Template switched" }).to_string())
                                        .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                                    let _ = request.respond(response);
                                    continue;
                                }
                            }

                            let code = url
                                .split("code=")
                                .nth(1)
                                .unwrap_or("")
                                .split('&')
                                .next()
                                .unwrap_or("");
                            if !code.is_empty() {
                                let _ = handle.emit("remote-print", code);
                                let response_body = serde_json::json!({ "success": true, "message": format!("Printing code {}", code) }).to_string();
                                let response = Response::from_string(response_body)
                                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                                let _ = request.respond(response);
                                continue;
                            }
                        }
                        let response_body = serde_json::json!({ "success": true, "message": "DonlyX Online" }).to_string();
                        let response = Response::from_string(response_body)
                            .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                        let _ = request.respond(response);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
