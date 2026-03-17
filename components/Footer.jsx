
const Footer = () => (
  <footer color="white" light expand="md" className="bg-light p-3 text-center" data-testid="footer">
    
    <img
      src="https://myjmangalinextjs.blob.core.windows.net/assets/3_yellow_umbrella_logo.svg"  // CDN image URL
      alt="Footer Logo"
      className="logo"
      data-testid="footer-logo"
      style={{ width: '100px', height: '100px' }}
    />
    <p data-testid="footer-text">
      Lovingly changed by <a href="https://connect.fg.rbc.com/groups/identity-and-access-management-to/pages/meet-the-smt">RBC Cyber Heroes</a> from <a href="https://auth0.com">Auth0</a>
    </p>
  </footer>
);

export default Footer;
