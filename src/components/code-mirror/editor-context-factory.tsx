"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type TextEditorContextType = {
  value: string;
  onChange: (val: string) => void;
};

export type TextEditorProviderProps = {
  children: React.ReactNode;
};

export function createTextEditorContext(name: string) {
  const Ctx = createContext<TextEditorContextType | undefined>(undefined);

  const EditorProvider = (props: TextEditorProviderProps) => {
    const [value, setValue] = useState("");
    const onChange = useCallback((val: string) => setValue(val), []);
    return (
      <Ctx.Provider value={{ value, onChange }}>{props.children}</Ctx.Provider>
    );
  };

  const useEditor = () => {
    const ctx = useContext(Ctx);
    if (!ctx) {
      throw new Error(
        `use${name}Editor msut be used within a ${name}EditorProvider`,
      );
    }
    return ctx;
  };

  return { EditorProvider, useEditor };
}
