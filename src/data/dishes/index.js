// Gom mọi dishes/*.json (Vite import.meta.glob — vitest cũng hiểu). Thêm món = thêm file, không sửa đây.
const mods = import.meta.glob('./*.json', { eager: true, import: 'default' });
/** @type {Record<string, object>} id → dish.json */
export const DISHES = Object.fromEntries(Object.values(mods).map((d) => [d.id, d]));
export const DISH_IDS = Object.keys(DISHES);
