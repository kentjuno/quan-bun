// M5 — nguyên liệu / hành động / nhãn CHỈ CÓ Ở GAME CHÍNH (món chung không có trong bếp quán). sim-data.js là dữ liệu quán của Kent, KHÔNG sửa; dishlib gộp file này vào nguồn 'game'.
export const GAME_EXTRAS = {
  "items": {
    "mi-quang": {
      "name": "Mì Quảng",
      "icon": "🍜"
    },
    "cao-lau": {
      "name": "Sợi cao lầu",
      "icon": "🍜"
    },
    "hu-tieu": {
      "name": "Hủ tiếu",
      "icon": "🍜"
    },
    "cot-mi-quang": {
      "name": "Nước cốt mì Quảng",
      "icon": "🥘"
    },
    "cot-hu-tieu": {
      "name": "Nước cốt hủ tiếu",
      "icon": "🥘"
    }
  },
  "actions": {
    "pour-mi-quang": {
      "name": "Chan nước mì Quảng",
      "icon": "🍲",
      "duration": 3
    },
    "pour-hu-tieu": {
      "name": "Chan nước hủ tiếu",
      "icon": "🍲",
      "duration": 3
    }
  },
  "labels": {
    "mi-quang-broth-ready": "Nước mì Quảng đã nóng",
    "hu-tieu-broth-ready": "Nước hủ tiếu đã nóng"
  }
};
export default GAME_EXTRAS;
