import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/estim8-header-logo.png';

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="app-header">
      <Link to="/dashboard">
        <img src={logo} alt="estim8.com" className="brand-logo" />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && <span>{user.displayName}</span>}
        <button className="btn btn-secondary btn-small" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
