import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { editorConfigToExtensions } from './editor-config';
import { createTextEditorConfigContext } from './editor-config-context-factory';

type CreateEditorComponentParams = {
  useEditorConfigOptional: ReturnType<
    typeof createTextEditorConfigContext
  >['useEditorConfigOptional'];
};

export const createEditorComponent = (params: CreateEditorComponentParams) => {
  const { useEditorConfigOptional } = params;

  const Editor = (props: ReactCodeMirrorProps) => {
    const providerContext = useEditorConfigOptional();
    const extensions =
      providerContext?.extensions || editorConfigToExtensions();

    return (
      <CodeMirror
        {...props}
        height={props.height || '100%'}
        theme={props.theme || vscodeDark}
        extensions={[...(props.extensions || []), ...extensions]}
      />
    );
  };

  return Editor;
};
