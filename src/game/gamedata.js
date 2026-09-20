// Dữ liệu GAME CHÍNH = sim-data (items/actions) + công thức chung từ dishes/*.json (P6). Tách khỏi dishlib để scripts/add_dish.mjs chạy được bằng node thuần.
import { DISHES } from '../data/dishes/index.js';
import { buildGameData } from './dishlib.js';
export const GAME_DATA = buildGameData(DISHES);
