function PageHeader({ title, subtitle, children }) {
  return (
    <header className="v-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children && <div className="v-header-badges">{children}</div>}
    </header>
  );
}

export default PageHeader;
