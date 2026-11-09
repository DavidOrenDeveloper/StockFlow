// UI language. Modes: 'he' (Hebrew), 'en' (real English), 'tr' (English UI + item names written in Latin letters).
// Only item data (names, categories, units) is transliterated; menus & buttons are always real English in 'tr'.
import { S, setCfg } from './store.js';
import { LS_PREFIX } from './config.js';
const HE = {
  add: 'הוסף', add_item: 'הוספת פריט', all: 'הכל', all_cats: 'כל הקטגוריות', all_counted: 'כל הפריטים נספרו ✓', app: 'האפליקציה', back: 'חזרה', backup_full: 'גיבוי מלא (קובץ)', backup_hint: 'הגיבוי כולל פריטים, תמונות, תרגומים, מילים נרדפות, הגדרות, ספירות, הזמנות והיסטוריה. עדכון גרסה לעולם לא מוחק נתונים.',
  backup_share: 'שלח גיבוי', bad_file: 'הקובץ לא תקין או לא שייך לאפליקציה', below_emergency: 'מתחת למינימום (חרום)', cancel: 'ביטול', catalog: 'קטלוג', categories: 'קטגוריות', category: 'קטגוריה',
  check_update: 'בדוק ועדכן לגרסה האחרונה', checking: 'בודק…', close: 'סגור', confirm: 'אישור פעולה', confirm_delete_doc: 'למחוק את המסמך הזה? אי אפשר לשחזר.', confirm_delete_folder: 'למחוק את התיקייה? המסמכים שבתוכה יישארו ללא תיקייה.',
  confirm_delete_item: 'למחוק את "{n}" מהקטלוג?', confirm_delete_list: 'למחוק את הרשומה? פריטים שמשויכים אליה יועברו לראשונה ברשימה.', confirm_delete_n: 'למחוק {n} פריטים מהקטלוג?', copied: 'הועתק', copy_priority: 'העתק לפריוריטי',
  count: 'ספירת מלאי', counted: 'נספרו', counted_of: 'נספרו {n} מתוך {t}', counts: 'ספירות מלאי', create: 'צור', data: 'נתונים וגיבוי', date: 'תאריך', delete: 'מחק', deleted: 'נמחק', details: 'פרטי המסמך',
  display: 'שפה ותצוגה', downloaded: 'הקובץ הורד', draft_saved: 'הטיוטה נשמרה', dup_sku: 'המק״ט כבר קיים בפריט "{n}". לשמור בכל זאת?', duplicate: 'שכפל', edit: 'עריכה', edit_item: 'עריכת פריט', emergency: 'מינימום (חרום)',
  empty_catalog: 'אין פריטים להצגה', error: 'שגיאה', exact_matches: 'התאמות מדויקות', export: 'ייצוא', export_catalog: 'ייצוא הקטלוג', files: 'קבצים', fill_short: 'השלם חסר: {n}', filter_ph: 'סינון לפי עובד / הערה…',
  finish_count: 'סיום ספירה', folder: 'תיקייה', folder_name: 'שם התיקייה', folders: 'תיקיות', folders_hint: 'תיקיות מאפשרות למיין הזמנות, ספירות וקבצים של עובדים. אפשר להוסיף, לשנות שם ולמחוק בחופשיות.',
  generated: 'הופק', group_by: 'קיבוץ לפי', g_folder: 'תיקייה', g_worker: 'עובד', g_site: 'אתר / מחסן', g_status: 'סטטוס', g_month: 'חודש', g_none: 'ללא קיבוץ', history: 'היסטוריה', image: 'תמונה',
  import_conflict: 'המסמך כבר קיים', import_conflict_msg: 'מסמך של {w} מתאריך {d} כבר קיים באפליקציה. מה לעשות?', import_files: 'ייבוא קבצים', imported: 'יובא', imported_n: 'יובאו {n} מסמכים', in_stock: 'במלאי', items: 'פריטים',
  keep_both: 'שמור את שניהם', lang_hint: 'עברית – הכל בעברית. English – תרגום אמיתי. ABC – התפריטים באנגלית ושמות הפריטים בעברית באותיות לטיניות (למשל SHEKA).', last_backup: 'גיבוי אחרון', list_hint: 'שלושה שמות לכל רשומה: עברית, אנגלית, ואותיות לטיניות. הכל ניתן לעריכה.',
  lists: 'רשימות', manage_synonyms: 'ניהול מילים נרדפות', mark_submitted: 'סמן כהוגשה', me: 'העובד', move_folder: 'העבר לתיקייה', n_items: '{n} פריטים', n_lines: '{n} שורות', n_selected: '{n} נבחרו',
  name_en: 'שם מקצועי באנגלית', name_he: 'שם בעברית', name_tr: 'תעתיק באותיות לטיניות', never: 'עדיין לא', new_count: 'ספירה חדשה', new_order: 'הזמנה חדשה', no_docs: 'אין מסמכים עדיין', no_folder: 'ללא תיקייה',
  no_results: 'לא נמצאו תוצאות', no_shortage: 'אין פריטים מתחת לכמות חרום בספירה הזו', no_sku: 'אין מק״ט', no_worker: 'ללא עובד', none: 'אין', not_found: 'המסמך לא נמצא', note: 'הערה', notice: 'הודעה', offline: 'אין חיבור לאינטרנט',
  ok: 'אישור', open: 'פתח', opt_emergency: 'הוסף עמודות מינימום (חרום) וחוסר', opt_en: 'כולל שם באנגלית', opt_img_pdf: 'כולל תמונות (PDF)', opt_only_counted: 'רק פריטים שנספרו', opt_only_ordered: 'רק פריטים שהוזמנו',
  opt_qty_col: 'עמודת כמות להזמנה (ריקה)', opt_tr: 'כולל תעתיק לטיני', order: 'הזמנה', order_from_count: 'צור הזמנה מהחוסרים בספירה', ordered: 'הוזמנו', ordered_lines: 'הוזמנו {n} פריטים', orders: 'הזמנות',
  pdf_hint: 'PDF נוצר דרך חלון ההדפסה של המכשיר – בחר "שמירה כ־PDF".', photo: 'תמונה', qty_order: 'כמות להזמנה', replace: 'החלף', reset_cache: 'ניקוי מטמון האפליקציה', reset_cache_q: 'לנקות את מטמון האפליקציה ולטעון מחדש? הנתונים שלך לא יימחקו.',
  restore: 'שחזור מגיבוי', restore_merge: 'מזג', restore_msg: 'גיבוי מתאריך {d}: {n} פריטים, {k} מסמכים.', restore_replace: 'החלף הכל', restore_replace_confirm: 'כל הנתונים הקיימים באפליקציה יוחלפו בגיבוי. להמשיך?', restored: 'השחזור הושלם',
  save: 'שמור', save_draft: 'שמור טיוטה', saved: 'נשמר', saved_at: 'נשמר {x}', search_ph: 'חיפוש: שם, מק״ט, תעתיק, מילה נרדפת…', select: 'בחירה', select_all: 'בחר הכל', send_to_manager: 'שלח למנהל', settings: 'הגדרות',
  shortage: 'חוסר', show_uncounted: 'הצג פריטים שטרם נספרו', similar_matches: 'התאמות מקורבות', site: 'אתר / מחסן', sites: 'אתרים ומחסנים', skip: 'דלג', sku: 'מק״ט', sku_ph: 'מק״ט פריוריטי (נשמר כטקסט)', smart_search: 'חיפוש חכם',
  st_draft: 'טיוטה', st_submitted: 'הוגשה', st_partial: 'התקבלה חלקית', st_completed: 'הושלמה', st_cancelled: 'בוטלה', status: 'סטטוס', suggest: 'הצע אוטומטית', syn_hint: 'כל שורה היא קבוצת מילים שוות-ערך (מופרדות בפסיק). חיפוש אחת מהן ימצא גם את האחרות.',
  syn_off: 'מילים נרדפות כבויות', syn_ph: 'הוסף מילה נרדפת ו־Enter', synonym: 'נרדפת', synonyms_item: 'מילים נרדפות לפריט', theme: 'ערכת נושא', theme_auto: 'אוטומטי', theme_light: 'בהיר', theme_dark: 'כהה', type: 'סוג', uncount: 'אפס לא נספר',
  uncounted_warn: 'עדיין לא נספרו {n} פריטים (שדה ריק = לא נבדק). לסיים בכל זאת?', unit: 'יחידה', units: 'יחידות מידה', up_to_date: 'האפליקציה מעודכנת', update_now: 'עדכן עכשיו', update_now_q: 'נמצאה גרסה חדשה. לעדכן עכשיו? הנתונים נשמרים.', update_ready: 'גרסה חדשה מוכנה',
  update_available: 'יש גרסה חדשה', update_safe: 'עדכון לא מוחק נתונים. כל הנתונים נשמרים בבסיס נתונים ייחודי לאפליקציה הזו בלבד.', use_fuzzy: 'חיפוש מקורב (שגיאות כתיב)', use_fuzzy_hint: 'מציג אחרי ההתאמות המדויקות תוצאות דומות',
  use_synonyms: 'חיפוש מילים נרדפות', use_synonyms_hint: 'כולל קבוצות נרדפות גלובליות; נרדפות לפי פריט תמיד נכללות', version: 'גרסה', worker: 'עובד', worker_mode: 'מצב עובד', worker_mode_hint: 'מסתיר עריכת קטלוג וניהול (לא מוגן בסיסמה)',
  worker_name: 'השם שלי (יופיע בקבצים שאני שולח)', worker_ph: 'שם העובד', zoom: 'הגדל תמונה', welcome: 'ברוך הבא', your_name: 'מה השם שלך?', continue: 'המשך', brand: 'ספירת מלאי והזמנות', lang_he: 'עברית', lang_en: 'English', lang_tr: 'ABC', install: 'התקנה', installed: 'האפליקציה הותקנה', skip_now: 'אחר כך', wa_image: 'וואטסאפ – תמונה (עם תמונות פריטים)', wa_text: 'וואטסאפ – הודעת טקסט'
};
const EN = {
  add: 'Add', add_item: 'Add item', all: 'All', all_cats: 'All categories', all_counted: 'Everything is counted ✓', app: 'App', back: 'Back', backup_full: 'Full backup (file)', backup_hint: 'The backup includes items, images, translations, synonyms, settings, counts, orders and history. Updating the app never deletes data.',
  backup_share: 'Send backup', bad_file: 'This file is invalid or does not belong to this app', below_emergency: 'Below minimum (emergency)', cancel: 'Cancel', catalog: 'Catalog', categories: 'Categories', category: 'Category',
  check_update: 'Check & update to latest version', checking: 'Checking…', close: 'Close', confirm: 'Please confirm', confirm_delete_doc: 'Delete this document? This cannot be undone.', confirm_delete_folder: 'Delete this folder? Its documents will remain without a folder.',
  confirm_delete_item: 'Delete "{n}" from the catalog?', confirm_delete_list: 'Delete this entry? Items using it will move to the first entry.', confirm_delete_n: 'Delete {n} items from the catalog?', copied: 'Copied', copy_priority: 'Copy for Priority',
  count: 'Stock count', counted: 'Counted', counted_of: '{n} of {t} counted', counts: 'Stock counts', create: 'Create', data: 'Data & backup', date: 'Date', delete: 'Delete', deleted: 'Deleted', details: 'Document details',
  display: 'Language & display', downloaded: 'File downloaded', draft_saved: 'Draft saved', dup_sku: 'This SKU already exists on "{n}". Save anyway?', duplicate: 'Duplicate', edit: 'Edit', edit_item: 'Edit item', emergency: 'Minimum (emergency)',
  empty_catalog: 'No items to show', error: 'Error', exact_matches: 'Exact matches', export: 'Export', export_catalog: 'Export catalog', files: 'Files', fill_short: 'Fill shortage: {n}', filter_ph: 'Filter by worker / note…',
  finish_count: 'Finish count', folder: 'Folder', folder_name: 'Folder name', folders: 'Folders', folders_hint: 'Folders help you sort orders, counts and files from workers. Add, rename and delete them freely.',
  generated: 'Generated', group_by: 'Group by', g_folder: 'Folder', g_worker: 'Worker', g_site: 'Site / warehouse', g_status: 'Status', g_month: 'Month', g_none: 'No grouping', history: 'History', image: 'Image',
  import_conflict: 'Document already exists', import_conflict_msg: 'A document by {w} from {d} already exists in the app. What now?', import_files: 'Import files', imported: 'Imported', imported_n: '{n} documents imported', in_stock: 'In stock', items: 'Items',
  keep_both: 'Keep both', lang_hint: 'Hebrew – everything in Hebrew. English – real translation. ABC – menus in English and item names in Hebrew written with Latin letters (e.g. SHEKA).', last_backup: 'Last backup', list_hint: 'Three names per entry: Hebrew, English and Latin letters. All editable.',
  lists: 'Lists', manage_synonyms: 'Manage synonyms', mark_submitted: 'Mark as submitted', me: 'Worker', move_folder: 'Move to folder', n_items: '{n} items', n_lines: '{n} lines', n_selected: '{n} selected',
  name_en: 'Professional English name', name_he: 'Hebrew name', name_tr: 'Latin-letter transliteration', never: 'Never', new_count: 'New count', new_order: 'New order', no_docs: 'No documents yet', no_folder: 'No folder',
  no_results: 'No results', no_shortage: 'No items are below emergency qty in this count', no_sku: 'No SKU', no_worker: 'No worker', none: 'None', not_found: 'Document not found', note: 'Note', notice: 'Notice', offline: 'No internet connection',
  ok: 'OK', open: 'Open', opt_emergency: 'Add minimum (emergency) & shortage columns', opt_en: 'Include English name', opt_img_pdf: 'Include images (PDF)', opt_only_counted: 'Only counted items', opt_only_ordered: 'Only ordered items',
  opt_qty_col: 'Blank order-qty column', opt_tr: 'Include transliteration', order: 'Order', order_from_count: 'Create order from shortages in this count', ordered: 'Ordered', ordered_lines: '{n} items ordered', orders: 'Orders',
  pdf_hint: 'The PDF is created through the device print dialog – choose "Save as PDF".', photo: 'Photo', qty_order: 'Order qty', replace: 'Replace', reset_cache: 'Clear app cache', reset_cache_q: 'Clear the app cache and reload? Your data will not be deleted.',
  restore: 'Restore from backup', restore_merge: 'Merge', restore_msg: 'Backup from {d}: {n} items, {k} documents.', restore_replace: 'Replace all', restore_replace_confirm: 'All existing data in the app will be replaced by the backup. Continue?', restored: 'Restore complete',
  save: 'Save', save_draft: 'Save draft', saved: 'Saved', saved_at: 'Saved {x}', search_ph: 'Search: name, SKU, transliteration, synonym…', select: 'Select', select_all: 'Select all', send_to_manager: 'Send to manager', settings: 'Settings',
  shortage: 'Shortage', show_uncounted: 'Show uncounted', similar_matches: 'Similar matches', site: 'Site / warehouse', sites: 'Sites & warehouses', skip: 'Skip', sku: 'SKU', sku_ph: 'Priority SKU (stored as text)', smart_search: 'Smart search',
  st_draft: 'Draft', st_submitted: 'Submitted', st_partial: 'Partially received', st_completed: 'Completed', st_cancelled: 'Cancelled', status: 'Status', suggest: 'Auto-suggest', syn_hint: 'Each line is a group of equivalent words (comma-separated). Searching any of them also finds the others.',
  syn_off: 'synonyms off', syn_ph: 'Add synonym, press Enter', synonym: 'synonym', synonyms_item: 'Synonyms for this item', theme: 'Theme', theme_auto: 'Automatic', theme_light: 'Light', theme_dark: 'Dark', type: 'Type', uncount: 'Reset to not counted',
  uncounted_warn: '{n} items are still not counted (empty = not checked). Finish anyway?', unit: 'Unit', units: 'Units of measure', up_to_date: 'The app is up to date', update_now: 'Update now', update_now_q: 'A new version is available. Update now? Your data is kept.', update_ready: 'New version ready',
  update_available: 'Update available', update_safe: 'Updating never deletes data. All data lives in a database used only by this app.', use_fuzzy: 'Approximate search (typos)', use_fuzzy_hint: 'Shows similar results after the exact matches',
  use_synonyms: 'Synonym search', use_synonyms_hint: 'Includes global synonym groups; per-item synonyms are always searched', version: 'Version', worker: 'Worker', worker_mode: 'Worker mode', worker_mode_hint: 'Hides catalog editing and management (not password protected)',
  worker_name: 'My name (appears on files I send)', worker_ph: 'Worker name', zoom: 'Zoom image', welcome: 'Welcome', your_name: 'What is your name?', continue: 'Continue', brand: 'Stock Count & Orders', lang_he: 'עברית', lang_en: 'English', lang_tr: 'ABC', install: 'Install', installed: 'App installed', skip_now: 'Later', wa_image: 'WhatsApp – picture (with item photos)', wa_text: 'WhatsApp – text message'
};
const D = { he: HE, en: EN };
export const getLang = () => S.cfg.lang;
const ui = () => (S.cfg.lang === 'he' ? 'he' : 'en');
export const dir = () => (ui() === 'he' ? 'rtl' : 'ltr');
export function t(k, v) {
  let s = D[ui()][k] ?? EN[k] ?? k;
  if (v) for (const [a, b] of Object.entries(v)) s = s.replaceAll('{' + a + '}', b);
  return s;
}
export function applyDir() { const h = document.documentElement; h.lang = ui(); h.dir = dir(); h.dataset.mode = S.cfg.lang; h.dataset.theme = S.cfg.theme || 'auto'; document.title = t('brand'); try { localStorage.setItem(LS_PREFIX + 'lang', S.cfg.lang); } catch (e) { /* storage may be blocked */ } }
export async function setLang(l) { await setCfg({ lang: l }); applyDir(); window.dispatchEvent(new Event('sc-rerender')); }
