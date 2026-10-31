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
    font-size: 11px;
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
  button,
  .account-trigger {
    min-width: 44px;
    height: 44px;
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
  button:hover,
  .account-trigger:hover {
    background: var(--mint);
  }
  .account-trigger[aria-current='page'] {
    border-color: var(--ink);
  }
  .account-trigger .avatar {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--yellow);
    color: var(--ink);
    font-size: 13px;
    font-weight: 800;
  }
  .account-trigger:has(.avatar) {
    padding: 0 7px;
  }
  .menu-trigger {
    display: none;
  }

  /* On a Pokémon's page the dark field world runs up under the header:
     ink bar, light type, translucent controls. */
  body:has(.pokemon-page) & {
    background: var(--ink);
    border-bottom-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  /* the ball's outline is currentColor: keep it ink so it reads on the bar */
  body:has(.pokemon-page) & .brand > svg {
    color: var(--ink);
    filter: drop-shadow(0 0 0 1.5px #fff) drop-shadow(0 0 1px #fff);
  }
  body:has(.pokemon-page) & .brand,
  body:has(.pokemon-page) & nav a:hover,
  body:has(.pokemon-page) & nav a[aria-current='page'] {
    color: #fff;
  }
  body:has(.pokemon-page) & nav a {
    color: rgba(255, 255, 255, 0.72);
  }
  body:has(.pokemon-page) & button,
  body:has(.pokemon-page) & .account-trigger {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
    color: #fff;
  }
  body:has(.pokemon-page) & button:hover,
  body:has(.pokemon-page) & .account-trigger:hover {
    background: rgba(255, 255, 255, 0.16);
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
    /* the menu carries the account on phones: no room at 320px */
    .account-trigger {
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
