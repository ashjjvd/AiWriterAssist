import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import type {ReactNode} from 'react';
/** Accessible shadcn-style dialog composed from Radix primitives. */
export function ConfirmDialog({open,onOpenChange,title,description,confirmLabel,onConfirm}:{open:boolean;onOpenChange:(value:boolean)=>void;title:string;description:ReactNode;confirmLabel:string;onConfirm:()=>void}){
 return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50"/>
  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl">
   <div className="flex items-center justify-between"><Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title><Dialog.Close aria-label="Close" className="rounded-lg p-2 hover:bg-muted"><X size={16}/></Dialog.Close></div>
   <Dialog.Description className="mt-2 text-sm leading-relaxed text-foreground/75">{description}</Dialog.Description>
   <div className="mt-6 flex justify-end gap-2"><Dialog.Close className="rounded-lg border border-border px-4 py-2">Cancel</Dialog.Close><button className="rounded-lg bg-primary px-4 py-2 font-semibold text-white" onClick={onConfirm}>{confirmLabel}</button></div>
  </Dialog.Content>
 </Dialog.Portal></Dialog.Root>
}
