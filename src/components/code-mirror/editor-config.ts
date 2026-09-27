'use client';

import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { vim } from '@replit/codemirror-vim';
import { EditorView } from '@uiw/react-codemirror';
import { useCallback, useMemo, useReducer } from 'react';
import z from 'zod';

export const EditorConfigSchema = z.object({
  language: z
    .enum(['Markdown', 'Python', 'JavaScript', 'C++'])
    .optional()
    .default('Python'),
  keyBindings: z.enum(['default', 'vim']).optional().default('default'),
  fontSizePx: z.number().min(12).max(24).optional().default(16),
  lineWrap: z.boolean().optional().default(false),
});

export type EditorConfigSchemaType = z.infer<typeof EditorConfigSchema>;
export type EditorConfigInputType = z.input<typeof EditorConfigSchema>;

// the idea with making the props optional here is that they can be
// omitted to reset any specific prop back to defaults
type EditorConfigAction =
  | { type: 'setLanguage'; language?: EditorConfigSchemaType['language'] }
  | {
      type: 'setKeyBindings';
      keyBindings?: EditorConfigSchemaType['keyBindings'];
    }
  | { type: 'setFontSizePx'; fontSizePx?: EditorConfigSchemaType['fontSizePx'] }
  | { type: 'setLineWrap'; lineWrap?: EditorConfigSchemaType['lineWrap'] }
  | { type: 'reset' };

const editorConfigReducer = (
  state: EditorConfigSchemaType,
  action: EditorConfigAction,
): EditorConfigSchemaType => {
  switch (action.type) {
    case 'setLanguage':
      return EditorConfigSchema.parse({ ...state, language: action.language });
    case 'setKeyBindings':
      return EditorConfigSchema.parse({
        ...state,
        keyBindings: action.keyBindings,
      });
    case 'setFontSizePx':
      return EditorConfigSchema.parse({
        ...state,
        fontSizePx: action.fontSizePx,
      });
    case 'setLineWrap':
      return EditorConfigSchema.parse({ ...state, lineWrap: action.lineWrap });
    case 'reset':
      return EditorConfigSchema.parse({});
    default:
      return state;
  }
};

export const useEditorConfigReducer = (
  initialConfig?: EditorConfigInputType,
) => {
  const [state, dispatch] = useReducer(
    editorConfigReducer,
    EditorConfigSchema.parse(initialConfig || {}),
  );

  const extensions = useMemo(() => editorConfigToExtensions(state), [state]);

  const setLanguage = useCallback(
    (language?: EditorConfigSchemaType['language']) =>
      dispatch({ type: 'setLanguage', language }),
    [],
  );

  const setKeyBindings = useCallback(
    (keyBindings?: EditorConfigSchemaType['keyBindings']) =>
      dispatch({ type: 'setKeyBindings', keyBindings }),
    [],
  );

  const setFontSizePx = useCallback(
    (fontSizePx?: EditorConfigSchemaType['fontSizePx']) =>
      dispatch({ type: 'setFontSizePx', fontSizePx }),
    [],
  );

  const setLineWrap = useCallback(
    (lineWrap?: EditorConfigSchemaType['lineWrap']) =>
      dispatch({ type: 'setLineWrap', lineWrap }),
    [],
  );

  const resetConfig = useCallback(() => dispatch({ type: 'reset' }), []);

  return {
    config: state,
    extensions,
    setLanguage,
    setKeyBindings,
    setFontSizePx,
    setLineWrap,
    resetConfig,
  };
};

export const editorConfigToExtensions = (input?: EditorConfigInputType) => {
  // if no input provided, parsing an empty
  // object will just use default values
  if (!input) input = {};
  const config = EditorConfigSchema.parse(input);

  // build up extensions array based on config
  const extensions = [];
  // we'll always have font size
  extensions.push(
    EditorView.theme({
      '&': {
        fontSize: `${config.fontSizePx}px`,
      },
    }),
  );

  // apply line wrapping if needed
  if (config.lineWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  // apply vim keybindings if enabled
  if (config.keyBindings === 'vim') {
    extensions.push(vim());
  }

  // finally, language
  switch (config.language) {
    case 'Markdown':
      extensions.push(markdown());
      break;
    case 'Python':
      extensions.push(python());
      break;
    case 'JavaScript':
      extensions.push(javascript());
      break;
    case 'C++':
      extensions.push(cpp());
      break;
  }

  return extensions;
};
