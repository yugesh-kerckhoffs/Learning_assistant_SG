import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import twemoji from 'twemoji';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { apiCheckMaintenance } from "./lib/api";
import MaintenancePage from "./pages/MaintenancePage";
import { AppProvider } from "./contexts/AppContext";
import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import EnterprisePage from "./pages/EnterprisePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AppLayout from "./pages/app/AppLayout";
import ChatPage from "./pages/app/ChatPage";
import GalleryPage from "./pages/app/GalleryPage";
import CalmBreathingPage from "./pages/app/CalmBreathingPage";
import FeelingsHelperPage from "./pages/app/FeelingsHelperPage";
import MemoryGamePage from "./pages/app/MemoryGamePage";
import ColorsShapesPage from "./pages/app/ColorsShapesPage";
import SocialStoriesPage from "./pages/app/SocialStoriesPage";
import AccountPage from "./pages/app/AccountPage";
import GamesHubPage from "./pages/app/GamesHubPage";
import ColorsGamePage from "./pages/app/ColorsGamePage";
import ShapesGamePage from "./pages/app/ShapesGamePage";
import PatternCompletionPage from "./pages/app/PatternCompletionPage";
import OddOneOutPage from "./pages/app/OddOneOutPage";
import WordBuilderPage from "./pages/app/WordBuilderPage";
import NotFound from "./pages/NotFound";
import TermsModal from "./components/TermsModal";
import EmailConfirmationGate from "./components/EmailConfirmationGate";
import CharacterSelectionModal from "./components/CharacterSelectionModal";

// Initialize React Query client
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, termsAccepted, showTermsModal, emailConfirmed, selectedCharacter, selectCharacter } = useAuth();
  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', color: '#fff' }}>Loading...</div>;
  if (!currentUser) return <Navigate to="/" replace />;
  if (showTermsModal) return <TermsModal />;
  if (!emailConfirmed) return <EmailConfirmationGate />;
  if (!selectedCharacter) return <CharacterSelectionModal onSelect={selectCharacter} />;
  return <>{children}</>;
}

// Detect recovery tokens on any route and redirect to /reset-password
function RecoveryRedirect() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const { pathname, hash, search } = window.location;
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const searchParams = new URLSearchParams(search);

    const hasRecoveryInHash =
      hashParams.get('type') === 'recovery' ||
      !!(hashParams.get('access_token') && (hashParams.get('refresh_token') || hashParams.get('type') === 'recovery'));

    const hasRecoveryInQuery =
      searchParams.get('type') === 'recovery' ||
      !!(searchParams.get('access_token') && searchParams.get('refresh_token'));

    if (pathname !== '/reset-password' && (hasRecoveryInHash || hasRecoveryInQuery)) {
      const tokenPayload = hash && hash.length > 1 ? hash : search;
      navigate(`/reset-password${tokenPayload}`, { replace: true });
    }
  }, [navigate]);

  return null;
}

// Parse emojis to Twemoji on non-Windows platforms for consistency
function TwemojiParser() {
  useEffect(() => {
    const isWindows = navigator.platform?.toLowerCase().includes('win') ||
      navigator.userAgent?.toLowerCase().includes('windows');
    if (isWindows) return;

    const parseEmojis = () => {
      twemoji.parse(document.body, {
        folder: 'svg',
        ext: '.svg',
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
      });
    };

    // Parse on load
    parseEmojis();

    // Observe DOM changes to parse new emojis
    const observer = new MutationObserver(() => {
      parseEmojis();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

const App = () => {
  const [isMaintenance, setIsMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      setIsMaintenance(false);
      return;
    }

    apiCheckMaintenance().then(setIsMaintenance);
    const interval = setInterval(() => {
      apiCheckMaintenance().then(setIsMaintenance);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Still loading
  if (isMaintenance === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', color: '#fff' }}>
        Loading...
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <TwemojiParser />
            <BrowserRouter>
              <RecoveryRedirect />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="/enterprise" element={<EnterprisePage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/app/chat" replace />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="gallery" element={<GalleryPage />} />
                  <Route path="calm-breathing" element={<CalmBreathingPage />} />
                  <Route path="feelings" element={<FeelingsHelperPage />} />
                  <Route path="memory-game" element={<MemoryGamePage />} />
                  <Route path="colors-shapes" element={<ColorsShapesPage />} />
                  <Route path="social-stories" element={<SocialStoriesPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="games" element={<GamesHubPage />} />
                  <Route path="games/colors" element={<ColorsGamePage />} />
                  <Route path="games/shapes" element={<ShapesGamePage />} />
                  <Route path="games/memory" element={<MemoryGamePage />} />
                  <Route path="games/pattern" element={<PatternCompletionPage />} />
                  <Route path="games/odd-one-out" element={<OddOneOutPage />} />
                  <Route path="games/word-builder" element={<WordBuilderPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
