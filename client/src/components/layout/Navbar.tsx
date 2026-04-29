import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="hidden md:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-xl font-bold text-amber-700">
            CafeMatch
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/discover" className="text-gray-600 hover:text-amber-700 text-sm">
              Discover
            </Link>
            <Link to="/trending" className="text-gray-600 hover:text-amber-700 text-sm">
              Trending
            </Link>
            {user ? (
              <>
                <Link
                  to="/bookmarks"
                  className="text-gray-600 hover:text-amber-700 text-sm"
                >
                  Bookmarks
                </Link>
                <Link
                  to="/favorites"
                  className="text-gray-600 hover:text-amber-700 text-sm"
                >
                  Favorites
                </Link>
                <span className="text-sm text-gray-500">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-amber-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
