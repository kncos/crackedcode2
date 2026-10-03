import { PropsWithChildren } from "react";

function Middle(props: PropsWithChildren) {
  const { children } = props;
  return (
    <div className="justify-self-center flex flex-row gap-2">{children}</div>
  );
}

function Right(props: PropsWithChildren) {
  const { children } = props;
  return <div className="justify-self-end flex flex-row gap-2">{children}</div>;
}

function NavBar(props: PropsWithChildren) {
  const { children } = props;
  return (
    <nav className="navbar bg-neutral shadow-sm px-4 grid grid-cols-3">
      <div className="justify-self-start flex flex-row gap-2">CrackedCode</div>
      {children}
    </nav>
  );
}

NavBar.Middle = Middle;
NavBar.Right = Right;

export { NavBar };
