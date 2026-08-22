import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Resumen' },
  { to: '/admin', label: 'Admin' },
];

export function NavBar() {
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-slate-200 bg-white">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) =>
            `flex-1 py-2 text-center text-sm font-medium ${
              isActive ? 'text-blue-600' : 'text-slate-500'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
