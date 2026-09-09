import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

interface MonacoEditorProps {
  code: string;
  language: string;
  onChange: (value: string) => void;
  options?: {
    minimap?: { enabled: boolean };
    scrollBeyondLastLine?: boolean;
    fontSize?: number;
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    automaticLayout?: boolean;
    [key: string]: any;
  };
}

export function MonacoEditor({ code, language, onChange, options = {} }: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Default options
    const defaultOptions = {
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      wordWrap: 'on' as const,
      automaticLayout: true,
      theme: 'vs-dark',
      padding: { top: 16, bottom: 16 },
      lineNumbers: 'on' as const,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      ...options
    };

    // Create Monaco Editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value: code,
      language: mapLanguageToMonaco(language),
      ...defaultOptions
    });

    editorRef.current = editor;

    // Handle content changes
    const disposable = editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      onChange(value);
    });

    return () => {
      disposable.dispose();
      editor.dispose();
    };
  }, []);

  // Update language when it changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoLanguage = mapLanguageToMonaco(language);
        monaco.editor.setModelLanguage(model, monacoLanguage);
      }
    }
  }, [language]);

  // Update code when it changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== code) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  return (
    <div className="h-full rounded-md overflow-hidden bg-[hsl(240,10%,5%)]">
      <div className="h-full flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-3 bg-[hsl(240,10%,8%)] border-b border-border/20">
          <span className="text-xs text-muted-foreground">{
            (() => {
              const map: Record<string, string> = {
                javascript: 'main.js',
                python: 'main.py',
                java: 'Main.java',
                cpp: 'main.cpp',
                c: 'main.c',
                typescript: 'main.ts',
              };
              return map[language] || 'main.txt';
            })()
          }</span>
          <div className="flex space-x-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>
        </div>
        
        {/* Editor Content */}
        <div ref={containerRef} className="flex-1" data-testid="monaco-editor-container" />
      </div>
    </div>
  );
}

// Map our language names to Monaco's language identifiers
function mapLanguageToMonaco(language: string): string {
  const languageMap: Record<string, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c'
  };
  return languageMap[language] || 'plaintext';
}
