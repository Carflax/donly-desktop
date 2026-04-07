use serde::Serialize;
use tauri::Manager;
use windows::core::{PCSTR, PSTR};
use windows::Win32::Graphics::Printing::{
    ClosePrinter, EnumPrintersA, OpenPrinterA, StartDocPrinterA, StartPagePrinter, WritePrinter,
    EndDocPrinter, EndPagePrinter, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_INFO_2A,
    DOC_INFO_1A,
};
use windows::Win32::Foundation::HANDLE;

#[derive(Serialize)]
pub struct PrinterInfo {
    name: String,
}

#[tauri::command]
fn get_printers() -> Vec<String> {
    let mut printers = Vec::new();
    let mut cb_needed: u32 = 0;
    let mut c_returned: u32 = 0;

    unsafe {
        let _ = EnumPrintersA(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            PCSTR::null(),
            2,
            None,
            &mut cb_needed,
            &mut c_returned,
        );

        if cb_needed > 0 {
            let mut buffer = vec![0u8; cb_needed as usize];
            if EnumPrintersA(
                PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
                PCSTR::null(),
                2,
                Some(buffer.as_mut_slice()),
                &mut cb_needed,
                &mut c_returned,
            ).is_ok() {
                let info_ptr = buffer.as_ptr() as *const PRINTER_INFO_2A;
                for i in 0..c_returned {
                    let info = *info_ptr.add(i as usize);
                    if !info.pPrinterName.is_null() {
                        printers.push(info.pPrinterName.to_string().unwrap_or_default());
                    }
                }
            }
        }
    }

    if printers.is_empty() || (printers.len() == 1 && printers[0].is_empty()) {
        return vec!["Nenhuma impressora encontrada".to_string()];
    }
    printers
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_printers, print_raw])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_blur;
                match apply_blur(&window, Some((0, 0, 0, 1))) {
                    Ok(_) => println!("[Donly] Blur applied successfully"),
                    Err(e) => println!("[Donly] Blur failed: {:?}", e),
                }

                // Remove native window border
                use windows::Win32::UI::WindowsAndMessaging::*;
                use windows::Win32::Foundation::HWND;
                use tauri::raw_window_handle::HasWindowHandle;
                if let Ok(handle) = window.window_handle() {
                    if let raw_window_handle::RawWindowHandle::Win32(win32) = handle.as_raw() {
                        let hwnd = HWND(win32.hwnd.get() as *mut _);
                        unsafe {
                            let style = GetWindowLongW(hwnd, GWL_STYLE) as u32;
                            let new_style = style & !(WS_BORDER.0 | WS_DLGFRAME.0 | WS_THICKFRAME.0);
                            SetWindowLongW(hwnd, GWL_STYLE, new_style as i32);
                            let _ = SetWindowPos(hwnd, None, 0, 0, 0, 0,
                                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_NOACTIVATE);
                        }
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
