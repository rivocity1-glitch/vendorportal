
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  // @ts-ignore: allow side-effect CSS import without type declarations
  import "./styles/index.css";
  import './i18n';

  createRoot(document.getElementById("root")!).render(<App />);
  