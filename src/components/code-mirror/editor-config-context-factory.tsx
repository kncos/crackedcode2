'use client';

import { createContext, useContext } from 'react';
import { EditorConfigInputType, useEditorConfigReducer } from './editor-config';

type TextEditorConfigContextType = ReturnType<typeof useEditorConfigReducer>;

export type TextEditorConfigProviderProps = {
  initialConfig?: EditorConfigInputType;
  children: React.ReactNode;
};

export const createTextEditorConfigContext = (name: string) => {
  const EditorConfigContext = createContext<
    TextEditorConfigContextType | undefined
  >(undefined);

  const EditorConfigProvider = (props: TextEditorConfigProviderProps) => {
    const { initialConfig, children } = props;

    const parsedConfig = useEditorConfigReducer(initialConfig);

    return (
      <EditorConfigContext.Provider value={parsedConfig}>
        {children}
      </EditorConfigContext.Provider>
    );
  };

  const useEditorConfig = () => {
    const context = useContext(EditorConfigContext);
    if (!context) {
      throw new Error(
        `use${name}EditorConfig must be used within a ${name}EditorConfigProvider`,
      );
    }
    return context;
  };

  const useEditorConfigOptional = () => {
    const context = useContext(EditorConfigContext);
    return context;
  };

  return {
    EditorConfigProvider,
    useEditorConfig,
    useEditorConfigOptional,
  };
};
