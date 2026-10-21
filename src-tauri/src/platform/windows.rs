//! Windows UI Automation: reads actual focused selection; never guesses using clipboard.
use crate::{errors::{AppError,Result},selection::NativeSelection};
use windows::{core::Interface,Win32::{System::Com::{CoInitializeEx,CoUninitialize,CoCreateInstance,COINIT_APARTMENTTHREADED,CLSCTX_INPROC_SERVER},UI::{Accessibility::{CUIAutomation,IUIAutomation,IUIAutomationTextPattern,UIA_TextPatternId},WindowsAndMessaging::GetForegroundWindow}}};
pub fn read_selection()->Result<NativeSelection>{
 unsafe {
  CoInitializeEx(None,COINIT_APARTMENTTHREADED).ok().map_err(|_|AppError::new("ACCESSIBILITY_UNAVAILABLE","Windows UI Automation could not initialize.","Retry with an accessible text control."))?;
  let result=(|| -> Result<NativeSelection>{
   let automation:IUIAutomation=CoCreateInstance(&CUIAutomation,None,CLSCTX_INPROC_SERVER).map_err(|_|native_error())?;
   let focused=automation.GetFocusedElement().map_err(|_|native_error())?;
   if focused.CurrentIsPassword().map_err(|_|native_error())?.as_bool() {
    return Err(AppError::new("SECURE_FIELD","Password and secure fields are never captured.","Select non-sensitive text instead."));
   }
   let pid=focused.CurrentProcessId().map_err(|_|native_error())? as u32;
   let pattern=focused.GetCurrentPattern(UIA_TextPatternId).map_err(|_|native_error())?;
   let pattern:IUIAutomationTextPattern=pattern.cast().map_err(|_|native_error())?;
   let ranges=pattern.GetSelection().map_err(|_|native_error())?;
   let count=ranges.Length().map_err(|_|native_error())?;
   if count!=1 {return Err(AppError::new("NO_SELECTION","A single accessible text selection is required.","Select one text range in an editable or readable text control."))}
   let range=ranges.GetElement(0).map_err(|_|native_error())?;
   let text=range.GetText(-1).map_err(|_|native_error())?.to_string();
   let hwnd=GetForegroundWindow();
   Ok(NativeSelection{text,pid,window:format!("{:?}",hwnd),editable:false,control:focused.CurrentAutomationId().ok().map(|value|value.to_string())})
  })();
  CoUninitialize();result
 }
}
fn native_error()->AppError {AppError::new("SELECTION_UNAVAILABLE","The focused application does not expose an accessible selected text range.","Try another text editor. Secure/password fields cannot be captured.")}
