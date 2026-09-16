import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY } from '@/components/ModalShell';

/** The New Product wizard's look (gradient body, white content card, gradient footer buttons),
 * shared with the other inventory modals so they read as one family. */
export const WIZARD_BODY_CLASS = 'thin-scroll overflow-x-clip bg-gradient-to-b from-blue-50/50 via-white to-white';

export const WIZARD_CARD_CLASS = 'rounded-[10px] border border-gray-200 bg-white p-3 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]';

export const WIZARD_BTN_SECONDARY = `${MODAL_FOOTER_BTN_SECONDARY} px-[14px] inline-flex items-center justify-center gap-[5px]`;

export const WIZARD_BTN_PRIMARY = `${MODAL_FOOTER_BTN_PRIMARY} px-[14px] inline-flex items-center justify-center gap-[5px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-[0_1px_3px_0_rgb(37_99_235/0.4)]`;

export const WIZARD_BTN_FINISH = `${MODAL_FOOTER_BTN_PRIMARY} px-[14px] inline-flex items-center justify-center gap-[5px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-[0_1px_3px_0_rgb(16_185_129/0.4)]`;

export const SPINNER = <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
