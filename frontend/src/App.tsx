import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DocumentScreen from './pages/Document';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/document" 
          element={
            <ProtectedRoute>
              <DocumentScreen />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/document" />} />
        <Route path="*" element={<Navigate to="/document" />} />
      </Routes>
    </Router>
  );
}

export default App;
