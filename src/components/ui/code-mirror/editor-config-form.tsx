import z from "zod";
import { Selector } from "../selector";
import { EDITOR_LANGS, useEditorConfig, zEditorConfig } from "./editor-config";

interface EditorConfigFormProps {
  className?: string;
}

export const EditorConfigForm = (props: EditorConfigFormProps) => {
  const { className } = props;
  const { config, setConfig } = useEditorConfig();

  return (
    <div className="card card-border border-base-200 bg-neutral shadow-md">
      <div className="card-body items-center text-center">
        <div className="card-title text-primary">Configure Editor</div>
        <div
          className={`card-actions grid grid-cols-2 grid-rows-5 items-center gap-2`}
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
              setConfig({
                ...config,
                language: v as z.infer<typeof zEditorConfig>["language"],
              })
            }
            possValues={EDITOR_LANGS}
          />
          <label className="label">
            <span className="label-text">Font Size</span>
          </label>
          <select
            className="select select-sm justify-self-end"
            value={config.fontSizePx}
            onChange={(e) =>
              setConfig({
                ...config,
                fontSizePx: Number(e.target.value),
              })
            }
          >
            {(() => {
              const min = 12;
              const max = 24;
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
            onChange={(e) =>
              setConfig({
                ...config,
                lineWrap: e.target.checked ?? false,
              })
            }
          />
          <label className="label">
            <span className="label-text">Vim Keybindings</span>
          </label>
          <input
            type="checkbox"
            className="checkbox justify-self-end"
            checked={config.keyBindings === "vim"}
            onChange={(e) =>
              setConfig({
                ...config,
                keyBindings: e.target.checked ? "vim" : "default",
              })
            }
          />
          <label className="label">
            <span className="label-text">Reset</span>
          </label>
          <button
            className="btn btn-error btn-sm justify-self-end"
            onClick={() => setConfig({})}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
