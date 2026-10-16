function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <header className="v-header">
      {eyebrow && <p className="v-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <p className="v-sub">{subtitle}</p>}
    </header>
  );
}

export default PageHeader;
