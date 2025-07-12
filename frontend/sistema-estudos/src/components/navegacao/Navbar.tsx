import { useEffect, useState, useRef, useCallback, memo } from "react";
import {
  Menu, X, User, BarChart2, Bookmark, Award, Settings, LogOut, ChevronDown, Home,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { useUserAvatar } from "../../hooks/useUserAvatar";

// --- Funções utilitárias e constantes ---
const API_BASE_URL = "http://localhost:5000";

// --- Sistema de notificações ---
import { useNotification } from "../notificacoes/NotificationProvider";

// --- Definições de tipos ---
interface NavLinkItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  isActive: boolean;
  onClick: () => void;
  description: string;
}

interface UserMenuProps {
  onAvatarChange: (file: File) => Promise<void>;
  isUploadingAvatar: boolean;
}

interface MobileMenuProps {
  navLinks: NavLinkItemProps[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  onAvatarChange: (file: File) => Promise<void>;
  isUploadingAvatar: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  // avatarUrl removido daqui!
  // outras propriedades do usuário
}

// --- Subcomponente: Logo ---
const Logo = memo(() => (
  <Link
    to="/"
    aria-label="Ir para a página inicial da Evolutiva"
    className="flex items-center group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-yellow-400 rounded-lg p-1 -ml-1"
  >
    <span
      className="flex items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg] bg-gradient-to-br from-cyan-400 to-blue-500 mr-2"
      style={{ width: "36px", height: "36px" }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        aria-hidden="true"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>
    </span>
    <span
      className="text-2xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors duration-300"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      Evolutiva
    </span>
  </Link>
));

// --- Subcomponente: NavLinkItem ---
const NavLinkItem = memo(
  ({ to, label, icon, badge, isActive, onClick, description }: NavLinkItemProps) => (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out
      ${
        isActive
          ? "bg-white text-blue-700 shadow-sm"
          : "text-blue-100 hover:bg-blue-700 hover:text-white focus:bg-blue-700 focus:text-white"
      }
      focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 focus:ring-offset-blue-800`}
      aria-label={description || label}
      aria-current={isActive ? "page" : undefined}
      title={description || label}
    >
      <span className={`${isActive ? "text-blue-600" : "text-blue-300 group-hover:text-white"}`}>
        {icon}
      </span>
      <span className="hidden sm:inline-block">{label}</span>
      <span className="sm:hidden">{label}</span>
      {badge && (
        <span className="ml-auto bg-yellow-400 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
);

// --- Subcomponente: UserAvatarDisplay ---
const UserAvatarDisplay = ({ avatarSrc }: { avatarSrc: string }) => {
  return avatarSrc ? (
    <img
      src={avatarSrc}
      alt="Avatar do usuário"
      className="w-9 h-9 rounded-full border-2 border-blue-300 group-hover:border-white object-cover transition-colors duration-200"
      loading="lazy"
    />
  ) : (
    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center border-2 border-blue-300 group-hover:border-white transition-colors duration-200">
      <User className="h-5 w-5 text-white" />
    </div>
  );
};

// --- Subcomponente: UserMenu ---
const UserMenu = ({ onAvatarChange, isUploadingAvatar }: UserMenuProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { avatarUrl, user, logout } = useUser();
  const { notify } = useNotification();

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await onAvatarChange(file);
        notify("Avatar atualizado com sucesso!", "success");
      } catch (err) {
        notify("Erro ao atualizar avatar.", "error");
      }
      setIsDropdownOpen(false);
    }
  };

  // Use avatarUrl do contexto global
  const formattedAvatarSrc = avatarUrl
    ? avatarUrl.startsWith("http")
      ? avatarUrl
      : `${API_BASE_URL}${avatarUrl}`
    : "";

  // Hook para fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative ml-3" ref={menuRef}>
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center text-sm rounded-full group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-yellow-400 transition-transform duration-200 ease-out hover:scale-105"
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
        aria-label="Abrir menu do usuário"
      >
        <UserAvatarDisplay avatarSrc={formattedAvatarSrc} />
        <ChevronDown
          className={`h-4 w-4 ml-1 text-blue-200 group-hover:text-white transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isDropdownOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-52 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in-down"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          tabIndex={-1}
        >
          <label className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
            <User className="h-4 w-4 text-gray-500" />
            Alterar foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
              disabled={isUploadingAvatar}
              aria-label="Upload de nova foto de perfil"
            />
            {isUploadingAvatar && (
              <span className="ml-2 text-xs text-blue-500">Enviando...</span>
            )}
          </label>
          <Link
            to="/perfil"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsDropdownOpen(false)}
          >
            <User className="h-4 w-4 text-gray-500" />
            Meu Perfil
          </Link>
          <Link
            to="/configuracoes"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsDropdownOpen(false)}
          >
            <Settings className="h-4 w-4 text-gray-500" />
            Configurações
          </Link>
          <button
            onClick={() => {
              logout();
              setIsDropdownOpen(false);
            }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            role="menuitem"
            tabIndex={0}
          >
            <LogOut className="h-4 w-4 text-red-500" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

// --- Subcomponente: MobileMenu ---
const MobileMenu = ({
  navLinks,
  isOpen,
  setIsOpen,
  onLogout,
  onAvatarChange,
  isUploadingAvatar,
}: MobileMenuProps) => {
  const { avatarUrl } = useUser();
  const location = useLocation();
  const isActive = useCallback(
    (path: string) => location.pathname.startsWith(path),
    [location.pathname]
  );

  return (
    <div className={`md:hidden ${isOpen ? "block" : "hidden"}`}>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>
      <div
        className={`fixed top-0 right-0 bottom-0 w-64 bg-gradient-to-b from-blue-700 to-blue-800 shadow-xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
      >
        <div className="flex justify-between items-center p-4 border-b border-blue-600/50">
          <span className="font-semibold text-white">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-blue-200 hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="px-2 py-3 space-y-1">
          {navLinks.map((link) => (
            <NavLinkItem
              key={link.to}
              to={link.to}
              label={link.label}
              icon={link.icon}
              badge={link.badge}
              isActive={isActive(link.to)}
              onClick={() => setIsOpen(false)}
              description={link.description}
            />
          ))}
          <div className="pt-4 mt-4 border-t border-blue-600/50">
            <NavLinkItem
              to="/perfil"
              label="Meu Perfil"
              icon={
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-5 h-5 rounded-full border border-blue-300 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )
              }
              isActive={isActive("/perfil")}
              onClick={() => setIsOpen(false)}
              description="Acessar seu perfil"
            />
            <NavLinkItem
              to="/configuracoes"
              label="Configurações"
              icon={<Settings className="h-5 w-5" />}
              isActive={isActive("/configuracoes")}
              onClick={() => setIsOpen(false)}
              description="Acessar configurações"
            />
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/50 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 focus:ring-offset-blue-800 transition-colors duration-200 ease-out"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

// --- Componente principal Navbar ---
const NavbarModernized = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { user, avatarUrl, setAvatarUrl, logout } = useUser();
  const { notify } = useNotification();
  const { isLoadingAvatar, avatarError } = useUserAvatar();

  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname.startsWith(path),
    [location.pathname]
  );

  const handleAvatarUpload = useCallback(async (file: File) => {
    setIsUploadingAvatar(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("email", user.email);

    try {
      const res = await fetch(`${API_BASE_URL}/api/usuarios/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao enviar avatar.");
      }
      // Atualiza avatar no contexto global
      const data = await res.json();
      setAvatarUrl(data.avatarUrl || "");
      notify("Avatar atualizado com sucesso!", "success");
    } catch (err) {
      notify("Erro ao enviar avatar.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [setAvatarUrl, notify]);

  const navLinks = [
    // Removido o botão "Início"
    {
      to: "/painel",
      label: "Painel",
      icon: <Award className="h-5 w-5" />,
      description: "Acompanhe seu desenvolvimento e conquistas",
      badge: undefined,
    },
    {
      to: "/cursos",
      label: "Cursos",
      icon: <Bookmark className="h-5 w-5" />,
      description: "Explore nossos cursos disponíveis",
      badge: undefined,
    },
    {
      to: "/trilhas",
      label: "Trilhas",
      icon: <BarChart2 className="h-5 w-5" />,
      description: "Siga suas trilhas de aprendizado personalizadas",
      badge: undefined,
    },
  ];

  // Para acessar o avatar do usuário de forma segura:
  const formattedAvatarSrc = avatarUrl
    ? avatarUrl.startsWith("http")
      ? avatarUrl
      : `${API_BASE_URL}${avatarUrl}`
    : "";

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md h-16 border-b border-blue-500/50"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex-shrink-0">
            <Logo />
          </div>
          <div className="hidden md:flex md:ml-6 md:items-center md:space-x-2 lg:space-x-4">
            {navLinks.map((link) => (
              <NavLinkItem
                key={link.to}
                to={link.to}
                label={link.label}
                icon={link.icon}
                badge={link.badge}
                isActive={isActive(link.to)}
                description={link.description}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            ))}
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
              <UserMenu
                onAvatarChange={handleAvatarUpload}
                isUploadingAvatar={isUploadingAvatar}
              />
            </div>
            <div className="md:hidden ml-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-blue-200 hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-400"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                aria-label={
                  isMobileMenuOpen ? "Fechar menu principal" : "Abrir menu principal"
                }
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <MobileMenu
        navLinks={navLinks.map(link => ({
          ...link,
          isActive: isActive(link.to),
          onClick: () => setIsMobileMenuOpen(false),
        }))}
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        onLogout={logout}
        onAvatarChange={handleAvatarUpload}
        isUploadingAvatar={isUploadingAvatar}
      />
      <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default NavbarModernized;
