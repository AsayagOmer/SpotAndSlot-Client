

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">
          <span className="text-secondary">Spot</span>
          <span className="text-primary">&</span>
          <span className="text-secondary">Slot</span>
        </h1>


      </div>
    </header>
  );
};

export default Header;
