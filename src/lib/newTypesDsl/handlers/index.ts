export type NodeHandlerResult = {
  typeRef: string;

  emit?: string;
  internal?: string;

  user_emit?: string;
  driver_emit?: string;

  user_internal?: string;
  driver_internal?: string;
};

export type CodeGen = {
  user: string;
  driver: string;
};

export const produceCode = (results: NodeHandlerResult[]): CodeGen => {
  const userLines: string[] = [];
  const driverLines: string[] = [];

  // handle all defs and docs
  for (const r of results) {
    if (r.emit) {
      userLines.push(r.emit);
      driverLines.push(r.emit);
    }
  }

  for (const r of results) {
    if (r.user_emit) {
      userLines.push(r.user_emit);
    }
    if (r.driver_emit) {
      driverLines.push(r.driver_emit);
    }
  }

  return {
    user: userLines.join("\n"),
    driver: driverLines.join("\n"),
  };
};
