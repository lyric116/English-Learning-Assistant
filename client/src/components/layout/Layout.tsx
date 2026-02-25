import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="app-main">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
