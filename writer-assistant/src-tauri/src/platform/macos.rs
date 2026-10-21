//! Native macOS Accessibility selection. CF object ownership is kept within this call.
use crate::{errors::{AppError,Result},selection::NativeSelection};
use accessibility_sys::{AXIsProcessTrusted,AXUIElementCreateSystemWide,AXUIElementCopyAttributeValue,AXUIElementGetPid};
use core_foundation::{base::{CFRelease,CFTypeRef,TCFType},string::CFString};
use std::{ffi::c_void,ptr};
fn ax_err()->AppError {AppError::new("SELECTION_UNAVAILABLE","The active macOS text control does not expose selected text.","Grant Accessibility permission, then select readable non-password text.")}
unsafe fn attribute(element:*const c_void,name:&str)->Result<CFTypeRef>{
 let key=CFString::new(name);
 let mut value:CFTypeRef=ptr::null();
 let status=AXUIElementCopyAttributeValue(element as _,key.as_concrete_TypeRef(),&mut value);
 if status!=0 || value.is_null(){return Err(ax_err())}Ok(value)
}
pub fn read_selection()->Result<NativeSelection>{
 unsafe {
  if !AXIsProcessTrusted(){return Err(AppError::new("PERMISSION_DENIED","macOS Accessibility permission is required.","Enable Writer Assistant in System Settings → Privacy & Security → Accessibility."))}
  let system=AXUIElementCreateSystemWide();if system.is_null(){return Err(ax_err())}
  let result=(|| -> Result<NativeSelection>{
   let focused=attribute(system as _,"AXFocusedUIElement")?;
   let text_result=(|| -> Result<NativeSelection>{
    let mut pid=0i32;
    if AXUIElementGetPid(focused as _,&mut pid)!=0{return Err(ax_err())}
    for kind in ["AXRole","AXSubrole"] {
     if let Ok(value)=attribute(focused as _,kind){
      let role=CFString::wrap_under_create_rule(value as _).to_string();
      if role.contains("SecureTextField")||role.contains("Password") {
       return Err(AppError::new("SECURE_FIELD","Secure or password fields cannot be captured.","Select non-sensitive text instead."));
      }
     }
    }
    let selected=attribute(focused as _,"AXSelectedText")?;
    // Attribute AXSelectedText is specified to be a CFString.
    let value=CFString::wrap_under_create_rule(selected as _);
    let text=value.to_string();
    Ok(NativeSelection{text,pid:pid as u32,window:format!("pid:{pid};window:unavailable"),editable:false,control:None})
   })();
   CFRelease(focused as _);text_result
  })();
  CFRelease(system as _);result
 }
}
