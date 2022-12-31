import { python } from "@codemirror/lang-python";
import { indentUnit } from "@codemirror/language";
import { ViewUpdate } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import raw from "raw.macro";
import React, { useEffect, useRef, useState } from "react";
import { BrowserRuntime, onErrorType } from "./BrowserRuntime";
import { ObjectFFI } from "./interpreter/ffi";
import { MontyCallable } from "./interpreter/MontyCallable";
import { MontyError } from "./interpreter/MontyError";
import { Token } from "./interpreter/Token";

type RunState = "running" | "stopped" | "paused" | MontyError;

function App() {
  const [runState, setRunState] = useState("stopped" as RunState);
  const [consoleText, setConsoleText] = useState("");
  const [canvasRef, setCanvasRef] = useState(
    undefined as React.RefObject<HTMLCanvasElement> | undefined
  );
  const setError = (error: MontyError | undefined) => {
    if (error) {
      setConsoleText(
        `${consoleText}\n[Line ${getLine(error.token)}] Error: ${error.message}`
      );
      setRunState(error);
    }
  };

  useEffect(() => {
    print.setText = setConsoleText;
  }, [setConsoleText]);

  return (
    <div id="app" className="grid grid-cols-2 grid-rows-3">
      <div className="row-span-3">
        <Editor
          state={runState}
          onRun={async (v) => {
            if (runState === "paused") {
              runtime.resume();
              setRunState("running");
            } else {
              resetRuntime(canvasRef, setError);
              setRunState("running");
              await runtime.run(v);
              setRunState("stopped");
            }
          }}
          onStop={() => {
            resetRuntime(canvasRef, setError);
            setRunState("stopped");
          }}
          onPause={() => {
            setRunState("paused");
            runtime.stop();
          }}
        />
      </div>
      <div className="row-span-2">
        <Canvas onRef={setCanvasRef} state={runState} />
      </div>
      <div>
        <Console text={consoleText} />
      </div>
    </div>
  );
}

const borderColor = "border-slate-300";

function Editor(p: {
  onRun(text: string): void;
  onPause(): void;
  onStop(): void;
  state: RunState;
}) {
  const [text, setText] = useState("");
  const onChange = (value: string, _viewUpdate: ViewUpdate) => {
    setText(value);
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#hello") {
      setText(raw("./hello.py"));
    } else if (hash === "#tetris") {
      setText(raw("./tetris.py"));
    }
  }, []);

  return (
    <div className={`flex flex-col h-full border-r ${borderColor}`}>
      <SectionHeader>
        <div className="flex justify-between">
          <div>Editor</div>
          <div>
            {(p.state === "running" || p.state === "paused") && (
              <button onClick={() => p.onStop()}>
                <span className="text-red-600 font-bold">■ Stop</span>
              </button>
            )}
            {(p.state === "stopped" ||
              p.state === "paused" ||
              p.state instanceof MontyError) && (
              <button onClick={() => p.onRun(text)}>
                <span className="text-green-600 font-bold pl-2">
                  ▶ {p.state === "stopped" ? "Run" : "Resume"}
                </span>
              </button>
            )}
            {p.state === "running" && (
              <button onClick={() => p.onPause()}>
                <span className=" text-yellow-500 pl-2 text-sm align-top">
                  ▍▍
                </span>
                <span className="text-yellow-500 font-bold">Pause</span>
              </button>
            )}
          </div>
        </div>
      </SectionHeader>
      <div className="grow overflow-y-scroll flex flex-col">
        <CodeMirror
          className="grow"
          height="100%"
          extensions={[python(), indentUnit.of("    ")]}
          onChange={onChange}
          value={text}
        />
      </div>
    </div>
  );
}

function Canvas(p: {
  state: RunState;
  onRef: (r: React.RefObject<HTMLCanvasElement>) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => p.onRef(ref));

  return (
    <div className={`h-full border-b ${borderColor} flex flex-col`}>
      <SectionHeader>Canvas</SectionHeader>
      <canvas className="grow" ref={ref} />
    </div>
  );
}

function Console(p: { text: string }) {
  const lines = p.text.split("\n");
  const lastLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastLineRef.current?.scrollIntoView();
  });

  return (
    <div className="h-full flex flex-col">
      <SectionHeader>Console</SectionHeader>
      <div className="grow pl-5 pr-5 pt-2 pb-1 overflow-y-scroll">
        {lines.slice(0, -1).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div ref={lastLineRef}>{lines[lines.length - 1]}</div>
      </div>
    </div>
  );
}

function SectionHeader(p: React.PropsWithChildren) {
  return <h4 className={`p-2 pl-5 border-b ${borderColor}`}>{p.children}</h4>;
}

let runtime = new BrowserRuntime((error) => undefined);

function resetRuntime(
  canvasRef: React.RefObject<HTMLCanvasElement> | undefined,
  setError: onErrorType
) {
  setError(undefined); // clear any errors from last run
  const canvas = canvasRef?.current;
  if (!canvas) return;
  canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);

  runtime.stop();
  print.clear();
  runtime = new BrowserRuntime(setError);
  runtime.ffi("print", print);
  runtime.ffi("canvas", new ObjectFFI(canvasRef.current));
  runtime.ffi("document", new ObjectFFI(document));
  runtime.ffi("window", new ObjectFFI(window));
}

const print = new (class implements MontyCallable {
  isMontyCallable: true = true;
  text: string;
  setText: (a: string) => void = (a) => undefined;

  constructor() {
    this.text = "";
  }

  call(arguments_: any[]) {
    this.text += arguments_[0] + "\n";
    this.setText(this.text);
  }

  arity(): number {
    return 1;
  }

  clear() {
    this.text = "";
    this.setText(this.text);
  }
})();

function getLine(x: number | Token) {
  return typeof x === "number" ? x : x.line;
}

export default App;
