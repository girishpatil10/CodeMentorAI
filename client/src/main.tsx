import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Setup Monaco Editor workers
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import editorWorkerService from "monaco-editor/esm/vs/editor/editor.worker?worker";

// Setup worker self
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorkerService();
  },
};

// Register supported languages
monaco.languages.register({ id: "java" });
monaco.languages.register({ id: "cpp" });
monaco.languages.register({ id: "c" });

createRoot(document.getElementById("root")!).render(<App />);
