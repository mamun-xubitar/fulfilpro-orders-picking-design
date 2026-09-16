import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY } from '@/components/ModalShell';

/** The New Product wizard's look (gradient body, white content card, gradient footer buttons),
 * shared with the other inventory modals so they read as one family. */
export const WIZARD_BODY_CLASS = 'thin-scroll overflow-x-clip bg-gradient-to-b from-inventory-primary/[8%] via-inventory-surface to-inventory-surface';

export const WIZARD_CARD_CLASS = 'rounded-[10px] border border-inventory-border bg-inventory-surface p-3 shadow-inventory';

export const WIZARD_BTN_SECONDARY = `${MODAL_FOOTER_BTN_SECONDARY} px-[14px] inline-flex items-center justify-center gap-[5px]`;

export const WIZARD_BTN_PRIMARY = `${MODAL_FOOTER_BTN_PRIMARY} px-[14px] inline-flex items-center justify-center gap-[5px] bg-gradient-to-r from-inventory-primary to-inventory-primary-hover hover:from-inventory-primary-hover hover:to-inventory-primary-hover shadow-[0_1px_3px_0_rgb(91_63_214/0.4)]`;

export const WIZARD_BTN_FINISH = `${MODAL_FOOTER_BTN_PRIMARY} px-[14px] inline-flex items-center justify-center gap-[5px] bg-gradient-to-r from-inventory-success to-inventory-success-hover hover:from-inventory-success-hover hover:to-inventory-success-hover shadow-[0_1px_3px_0_rgb(22_163_74/0.4)]`;

export const SPINNER = <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
