/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ben: '#d32f2f', // 本命 - 紅
        da: '#757575',  // 大限 - 灰
        liu: '#0288d1', // 流年 - 藍
        xiao: '#2e7d32',// 小限 - 綠
        paper: '#f5f5f5', // 背景
      }
    },
  },
  plugins: [],
}