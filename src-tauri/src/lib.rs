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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_printers, print_raw, print_label])
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

                        if url.contains("/print") {
                            let _ = handle.emit("collector-status", true);
                            let code = url
                                .split("code=")
                                .nth(1)
                                .unwrap_or("")
                                .split('&')
                                .next()
                                .unwrap_or("");
                            if !code.is_empty() {
                                let _ = handle.emit("remote-print", code);
                                let response = Response::from_string(format!("OK: Printing code {}", code));
                                let _ = request.respond(response);
                                continue;
                            }
                        }
                        let response = Response::from_string("DonlyX Online");
                        let _ = request.respond(response);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
