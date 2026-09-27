type SelectorParams = {
  possValues: string[];
  onChange: (input: string) => void;
  classNames?:
    | {
        select?: string | undefined;
        option?: string | undefined;
      }
    | undefined;
  value?: string | undefined;
};

export const Selector = (params: SelectorParams) => {
  const { classNames, value, possValues, onChange } = params;

  return (
    <select
      className={classNames?.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {possValues.map((v, i) => {
        return (
          <option key={i} value={v} className={classNames?.option}>
            {v}
          </option>
        );
      })}
    </select>
  );
};
