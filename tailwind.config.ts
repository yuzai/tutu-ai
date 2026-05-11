import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cartoon: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      colors: {
        tutu: {
          sky: "#a8dadc",
          grass: "#b8e0a0",
          road: "#e8d8b0",
          wall: "#7a5c3e",
          accent: "#ff8b6b",
          pop: "#ffd166",
        },
      },
      boxShadow: {
        bubble: "0 2px 0 rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
