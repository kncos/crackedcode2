import { Selector } from "../selector";
import { EditorConfigSchema, EditorConfigSchemaType } from "./editor-config";
import { createTextEditorConfigContext } from "./editor-config-context-factory";

type UseTextEditorConfigHookType = ReturnType<
  typeof createTextEditorConfigContext
>["useEditorConfig"];

interface EditorConfigFormProps {
  className?: string;
}

type createEditorConfigFormParams = {
  name: string;
  useEditorConfig: UseTextEditorConfigHookType;
};

export const createEditorConfigForm = (
  params: createEditorConfigFormParams,
) => {
  const { name, useEditorConfig } = params;

  const EditorConfigForm = (props: EditorConfigFormProps) => {
    const { className } = props;
    const {
      config,
      setLanguage,
      setKeyBindings,
      setFontSizePx,
      setLineWrap,
      resetConfig,
    } = useEditorConfig();

    return (
      <div>
        <div className="flex w-full flex-row items-center justify-center">
          <span className="text-primary text-xl font-medium tracking-wide">
            {name}
          </span>
        </div>
        <div
          className={`grid grid-cols-2 grid-rows-5 items-center gap-2 ${className}`}
        >
          <label className="label">
            <span className="label-text">Language</span>
          </label>
          <Selector
            classNames={{
              select: "select select-sm justify-self-end",
            }}
            value={config.language}
            onChange={(v) =>
              setLanguage(v as EditorConfigSchemaType["language"])
            }
            possValues={
              EditorConfigSchema.shape.language.unwrap().unwrap().options
            }
          />
          <label className="label">
            <span className="label-text">Font Size</span>
          </label>
          <select
            className="select select-sm justify-self-end"
            value={config.fontSizePx}
            onChange={(e) => setFontSizePx(Number(e.target.value))}
          >
            {(() => {
              const min =
                EditorConfigSchema.shape.fontSizePx.unwrap().unwrap()
                  .minValue ?? 12;
              const max =
                EditorConfigSchema.shape.fontSizePx.unwrap().unwrap()
                  .maxValue ?? 24;
              const fontSizeOptions = [];
              for (let i = min; i <= max; i++) {
                fontSizeOptions.push(i);
              }
              return fontSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ));
            })()}
          </select>
          <label className="label">
            <span className="label-text">Line Wrap</span>
          </label>
          <input
            type="checkbox"
            className="checkbox justify-self-end"
            checked={config.lineWrap}
            onChange={(e) => setLineWrap(e.target.checked)}
          />
          <label className="label">
            <span className="label-text">Vim Keybindings</span>
          </label>
          <input
            type="checkbox"
            className="checkbox justify-self-end"
            checked={config.keyBindings === "vim"}
            onChange={(e) =>
              setKeyBindings(e.target.checked ? "vim" : "default")
            }
          />
          <label className="label">
            <span className="label-text">Reset</span>
          </label>
          <button
            className="btn btn-error btn-sm justify-self-end"
            onClick={() => resetConfig()}
          >
            Reset
          </button>
        </div>
      </div>
    );
  };

  return EditorConfigForm;
};
