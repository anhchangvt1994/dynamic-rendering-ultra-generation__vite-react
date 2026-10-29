export const HeaderStyle = styled.header`
  flex: 0 0 auto;
  position: relative;
  z-index: 30;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  .header-inner {
    height: 76px;
    max-width: 1240px;
    padding: 0 40px;
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--ink);
    flex: none;
  }
  .brand > svg {
    width: 37px;
    height: 37px;
  }
  .brand > span {
    font-weight: 800;
    font-size: 25px;
    letter-spacing: -1.5px;
    line-height: 1.1 !important;
  }
  .brand-light {
    font-weight: 500;
  }
  .brand i {
    display: block;
    font-size: 7px;
    font-style: normal;
    font-weight: 700;
    letter-spacing: 3px;
    margin-top: 4px;
  }
  nav {
    display: flex;
    gap: 34px;
    align-self: stretch;
  }
  nav a {
    display: flex;
    align-items: center;
    position: relative;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  nav a:hover,
  nav a[aria-current='page'] {
    color: var(--ink);
  }
  nav a[aria-current='page']::after {
    content: '';
    position: absolute;
    height: 3px;
    border-radius: 3px;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--red);
  }
  .header-actions {
    display: flex;
    gap: 8px;
  }
  button {
    min-width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--canvas);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 600;
    transition: background 160ms;
  }
  button:hover {
    background: var(--mint);
  }
  .menu-trigger {
    display: none;
  }
  @media (max-width: 680px) {
    .header-inner {
      height: 64px;
      padding: 0 20px;
      gap: 12px;
    }
    .brand > span {
      font-size: 23px;
    }
    .brand > svg {
      width: 33px;
      height: 33px;
    }
    nav {
      display: none;
    }
    .search-trigger span {
      display: none;
    }
    button {
      padding: 0;
    }
    .menu-trigger {
      display: inline-flex;
    }
  }
`
