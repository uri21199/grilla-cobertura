import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { AdminGate } from './components/AdminGate';
import { NavBar } from './components/NavBar';
import { Resumen } from './pages/Resumen';
import { Admin } from './pages/Admin';
import { Confirmar } from './pages/Confirmar';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: llega desde el mail, sin clave de acceso ni gate. */}
        <Route path="/confirmar/:token" element={<Confirmar />} />

        {/* Todo lo demás es interno, protegido por la clave compartida. */}
        <Route
          path="/*"
          element={
            <AuthGate>
              <Routes>
                <Route path="/" element={<Resumen />} />
                <Route
                  path="/admin"
                  element={
                    <AdminGate>
                      <Admin />
                    </AdminGate>
                  }
                />
              </Routes>
              <NavBar />
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
