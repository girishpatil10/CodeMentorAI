import { spawn, ChildProcess } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import os from "os";
import * as esbuild from "esbuild";

export interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
  memoryUsage?: number;
}

export class CodeExecutionService {
  private tempDir = join(os.tmpdir(), "codementor");

  constructor() {
    // Ensure temp directory exists
    try {
      mkdirSync(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async executeCode(code: string, language: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const id = randomUUID();
    
    try {
      switch (language.toLowerCase()) {
        case "javascript":
        case "js":
          return await this.executeJavaScript(code, id, stdin);
        case "python":
        case "py":
          return await this.executePython(code, id, stdin);
        case "java":
          return await this.executeJava(code, id, stdin);
        case "cpp":
        case "c++":
          return await this.executeCpp(code, id, stdin);
        case "c":
          return await this.executeC(code, id, stdin);
        case "typescript":
        case "ts":
          return await this.executeTypeScript(code, id, stdin);
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
    } catch (error) {
      return {
        output: "",
        error: (error as Error).message,
        exitCode: 1,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executeJavaScript(code: string, id: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const file = join(this.tempDir, `${id}.js`);
    writeFileSync(file, code);
    const result = await this.runCommand("node", [file], id, stdin);
    this.cleanup(file);
    return { ...result, executionTime: Date.now() - startTime };
  }

  private async executePython(code: string, id: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const file = join(this.tempDir, `${id}.py`);
    writeFileSync(file, code);
    let result = await this.runCommand("python", [file], id, stdin);
    if (result.exitCode !== 0 && /not found|not recognized/i.test(result.error)) {
      result = await this.runCommand("python3", [file], id, stdin);
    }
    this.cleanup(file);
    return { ...result, executionTime: Date.now() - startTime };
  }

  private async executeJava(code: string, id: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Check if the code contains a public class
      const publicClassMatch = code.match(/public\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      let className: string;
      let javaCode: string;
      
      if (publicClassMatch) {
        // If there's a public class, use its name for the file
        className = publicClassMatch[1];
        javaCode = code;
      } else {
        // Otherwise, use a generated class name and wrap the code
        className = `Main_${id.replace(/[^a-zA-Z0-9_]/g, '')}`;
        javaCode = `public class ${className} {
    public static void main(String[] args) {
        ${code}
    }
}`;
      }
      
      const srcFile = join(this.tempDir, `${className}.java`);
      
      writeFileSync(srcFile, javaCode);
      
      // Compile the Java code
      const compile = await this.runCommand("javac", [srcFile], id, stdin);
      if (compile.exitCode !== 0) {
        return { 
          ...compile, 
          executionTime: Date.now() - startTime,
          error: `Compilation Error:\n${compile.error || compile.output}`
        };
      }
      
      // Run the compiled Java program
      const run = await this.runCommand(
        "java", 
        ["-cp", this.tempDir, className], 
        id, 
        stdin
      );
      
      // Clean up
      this.cleanup(srcFile);
      this.cleanup(join(this.tempDir, `${className}.class`));
      
      return { 
        ...run, 
        executionTime: Date.now() - startTime 
      };
    } catch (error) {
      return {
        output: "",
        error: `Java execution failed: ${(error as Error).message}`,
        exitCode: 1,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executeCpp(code: string, id: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const srcFile = join(this.tempDir, `${id}.cpp`);
    const outFile = join(this.tempDir, process.platform === 'win32' ? `${id}.exe` : `${id}_a.out`);
    writeFileSync(srcFile, code);
    const compile = await this.runCommand("g++", ["-O2", srcFile, "-o", outFile], id, stdin);
    if (compile.exitCode !== 0) {
      this.cleanup(srcFile);
      return { ...compile, executionTime: Date.now() - startTime };
    }
    const run = await this.runCommand(outFile, [], id, stdin);
    this.cleanup(srcFile);
    this.cleanup(outFile);
    return { ...run, executionTime: Date.now() - startTime };
  }

  private async executeTypeScript(code: string, id: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const transpiled = await esbuild.transform(code, { loader: "ts", format: "cjs" });
      const file = join(this.tempDir, `${id}.js`);
      writeFileSync(file, transpiled.code);
      const result = await this.runCommand("node", [file], id, stdin);
      this.cleanup(file);
      return { ...result, executionTime: Date.now() - startTime };
    } catch (err: any) {
      return {
        output: "",
        error: String(err?.message || err),
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async executeC(code: string, id: string, stdin?: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const srcFile = join(this.tempDir, `${id}.c`);
    const outFile = join(this.tempDir, process.platform === 'win32' ? `${id}.exe` : `${id}_a.out`);
    writeFileSync(srcFile, code);
    const compile = await this.runCommand("gcc", ["-O2", srcFile, "-o", outFile], id, stdin);
    if (compile.exitCode !== 0) {
      this.cleanup(srcFile);
      return { ...compile, executionTime: Date.now() - startTime };
    }
    const run = await this.runCommand(outFile, [], id, stdin);
    this.cleanup(srcFile);
    this.cleanup(outFile);
    return { ...run, executionTime: Date.now() - startTime };
  }

  private runCommand(command: string, args: string[], id: string, stdin?: string): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = "";
      let stderr = "";
      
      const process = spawn(command, args, {
        timeout: 30000, // Increased timeout to 30 seconds for interactive programs
        stdio: ["pipe", "pipe", "pipe"]
      });

      // Handle stdin more robustly for interactive programs
      if (stdin && process.stdin) {
        try {
          // Split stdin into lines and send them when program is ready for input
          const lines = stdin.split('\n').filter(line => line.trim() !== '');
          let lineIndex = 0;
          
          // Send all inputs at once but with proper newlines
          const inputText = lines.join('\n') + '\n';
          
          // Wait a moment for the program to start, then send input
          setTimeout(() => {
            if (process.stdin && !process.stdin.destroyed) {
              process.stdin.write(inputText);
              process.stdin.end();
            }
          }, 1000); // Increased delay to ensure program is ready for input
          
        } catch (error) {
          console.error('Error writing to stdin:', error);
          try {
            process.stdin.end();
          } catch {}
        }
      } else {
        // Close stdin immediately if no input provided
        try {
          process.stdin.end();
        } catch {}
      }

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        const executionTime = Date.now() - startTime;
        resolve({
          output: stdout.trim(),
          error: stderr.trim(),
          exitCode: code || 0,
          executionTime
        });
      });

      process.on("error", (error) => {
        const executionTime = Date.now() - startTime;
        resolve({
          output: "",
          error: error.message,
          exitCode: 1,
          executionTime
        });
      });
    });
  }

  private cleanup(filepath: string): void {
    try {
      if (existsSync(filepath)) {
        unlinkSync(filepath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Get language-specific template code
  getTemplate(language: string): string {
    switch (language.toLowerCase()) {
      case "javascript":
        return `// JavaScript Code
console.log("Hello, CodeMentor AI!");

// Example: Calculate factorial
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

console.log("Factorial of 5:", factorial(5));`;

      case "python":
        return `# Python Code
print("Hello, CodeMentor AI!")

# Example: Calculate factorial
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print("Factorial of 5:", factorial(5))`;

      case "java":
        return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeMentor AI!");
        
        // Example: Calculate factorial
        System.out.println("Factorial of 5: " + factorial(5));
    }
    
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}`;

      case "cpp":
        return `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, CodeMentor AI!" << endl;
    
    // Example: Simple calculator
    int a, b;
    char op;
    
    cout << "Enter first number: ";
    cin >> a;
    cout << "Enter operator (+, -, *, /): ";
    cin >> op;
    cout << "Enter second number: ";
    cin >> b;
    
    switch(op) {
        case '+': cout << "Result: " << a + b << endl; break;
        case '-': cout << "Result: " << a - b << endl; break;
        case '*': cout << "Result: " << a * b << endl; break;
        case '/': cout << "Result: " << a / b << endl; break;
        default: cout << "Invalid operator!" << endl;
    }
    
    return 0;
}`;

      case "c":
        return `#include <stdio.h>

int main() {
    printf("Hello, CodeMentor AI!\\n");
    
    // Example: Simple calculator
    int a, b;
    char op;
    
    printf("Enter first number: ");
    scanf("%d", &a);
    printf("Enter operator (+, -, *, /): ");
    scanf(" %c", &op);
    printf("Enter second number: ");
    scanf("%d", &b);
    
    switch(op) {
        case '+': printf("Result: %d\\n", a + b); break;
        case '-': printf("Result: %d\\n", a - b); break;
        case '*': printf("Result: %d\\n", a * b); break;
        case '/': printf("Result: %d\\n", a / b); break;
        default: printf("Invalid operator!\\n");
    }
    
    return 0;
}`;

      case "typescript":
        return `// TypeScript Code
console.log("Hello, CodeMentor AI!");

// Example: Calculate factorial with types
function factorial(n: number): number {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

console.log("Factorial of 5:", factorial(5));

// Example: Interactive input (Node.js)
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your name: ', (name) => {
    console.log(\`Hello, \${name}!\`);
    rl.close();
});`;

      default:
        return `// Write your code here
console.log("Hello, CodeMentor AI!");`;
    }
  }
}

export const codeExecutionService = new CodeExecutionService();