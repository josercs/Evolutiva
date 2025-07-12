import { useState, useMemo, useCallback } from 'react';
import {
  Home, Calendar, BookOpen, ListChecks, Layers, User, ChevronDown,
  ChevronRight, FolderOpen, Target, MessageCircle, ClipboardList, Menu as MenuIcon, X as XIcon, Award,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from "../../contexts/UserContext";
import { useOnboarding } from '../../contexts/OnboardingContext'; // Importa o hook de onboarding global
// --- Tipos e Estrutura de Dados ---
interface MenuItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  path?: string;
  action?: (navigate: ReturnType<typeof useNavigate>) => void;
  badge?: string | number;
  children?: MenuItem[];
  isTitle?: boolean;
  defaultOpen?: boolean;
  isSubItem?: boolean; // Adicionado para controle de estilo de subitem
}

const menuData: MenuItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: Home,
    path: '/',  
  },
  {
    id: 'painel',
    label: 'Painel',
    icon: Award,
    path: '/painel',
  },
  /*{ id: 'planejamentoTitle', label: 'Planejamento', isTitle: true },
  {
    id: 'planejamento',
    label: 'Planejamento',
    icon: Calendar,
    defaultOpen: true,
    children: [
      { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/agenda', isSubItem: true },
      { id: 'cronograma', label: 'Cronograma', icon: ListChecks, path: '/cronograma', isSubItem: true },
      { id: 'metas', label: 'Metas', icon: Target, path: '/metas', isSubItem: true },
    ],
  },**/
  { id: 'estudoTitle', label: 'Estudo', isTitle: true },
  {
    id: 'materias',
    label: 'Matérias',
    icon: BookOpen,
    path: '/cursos/1/materias', // <-- igual à página de matérias
  },
  { id: 'questoes', label: 'Questões', icon: Layers, path: '/questoes', badge: "+5" },
 /* {
    id: 'flashcards',
    label: 'Flashcards',
    icon: FolderOpen,
    defaultOpen: false,
    children: [
      { id: 'flashcardsMeus', label: 'Meus Flashcards', icon: FolderOpen, path: '/flashcards/meus', isSubItem: true },
      { id: 'flashcardsExplorar', label: 'Explorar', icon: FolderOpen, path: '/flashcards/explorar', isSubItem: true },
    ],
  },*/
  { id: 'simuladosTitle', label: 'Simulados', isTitle: true },
  {
    id: 'simuladosRoot',
    label: 'Simulados',
    icon: ClipboardList,
    defaultOpen: false,
    children: [
      { id: 'simuladosIfrs', label: 'IFRS', path: '/simulados/ifrs', isSubItem: true },
      { id: 'simuladosCetism', label: 'CETISM', path: '/simulados/cetism', isSubItem: true },
      { id: 'simuladosEnem', label: 'ENEM', path: '/simulados/enem', isSubItem: true },
      {
        id: 'simuladosColegios',
        label: 'Colégios Militares',
        icon: ChevronRight, // Pode ser usado para indicar subnível visualmente se desejado
        defaultOpen: false,
        isSubItem: true, // Marcando como subitem para estilização
        children: [
          { id: 'colegiosCmpa', label: 'Colégio Militar de Porto Alegre (CMPA)', path: '/simulados/colegios-militares/cmpa', isSubItem: true },
          { id: 'colegiosTiradentes', label: 'Colégio Tiradentes', path: '/simulados/colegios-militares/tiradentes', isSubItem: true },
        ]
      }
    ]
  },
  { id: 'chatTutorTitle', label: 'ChatTutor', isTitle: true },
  {
    id: 'chatTutorRoot',
    label: 'ChatTutor',
    icon: MessageCircle,
    defaultOpen: false,
    children: [
      { id: 'chatMatematica', label: 'Matemática', path: '/chat-tutor/matematica', isSubItem: true },
      { id: 'chatPortugues', label: 'Português', path: '/chat-tutor/portugues', isSubItem: true },
      { id: 'chatRedacao', label: 'Redação', path: '/chat-tutor/redacao', isSubItem: true },
      { id: 'chatFisica', label: 'Física', path: '/chat-tutor/fisica', isSubItem: true },
    ]
  }
];

// --- Componente Link/Botão Genérico ---
interface SidebarNavigationItemProps {
  item: MenuItem;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

const SidebarNavigationItem: React.FC<SidebarNavigationItemProps> = ({
  item,
  isActive,
  onClick,
  className = '',
}) => {
  const { label, icon: Icon, path, badge, isSubItem } = item;
  const navigate = useNavigate();

  const baseClasses = `flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 w-full text-left`;
  const activeClasses = "bg-white text-blue-700 shadow";
  // SUGESTÃO: Hover com leve fundo, sombra e transição suave
  const inactiveClasses = "text-white hover:bg-blue-700/80 hover:shadow-md hover:scale-[1.03] focus:bg-blue-700/90 focus:text-white"; 
  const subItemPaddingClass = isSubItem ? "pl-8" : ""; // Padding maior para subitens

  const effectiveIconSize = isSubItem ? "h-4 w-4" : "h-5 w-5";

  const content = (
    <>
      {Icon && <Icon className={effectiveIconSize} />}
      <span>{label}</span>
      {badge && (
        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
          path === '/questoes' ? 'bg-blue-600 text-white' : 'bg-white/20 text-white'
        }`}>
          {badge}
        </span>
      )}
    </>
  );

  const handleClick = () => {
    if (onClick) onClick();
    if (item.action) item.action(navigate);
  };

  if (path) {
    return (
      <Link
        to={path}
        className={`${baseClasses} ${subItemPaddingClass} ${isActive ? activeClasses : inactiveClasses} ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2`}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined} // SUGESTÃO: acessibilidade
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClasses} ${subItemPaddingClass} ${isActive ? activeClasses : inactiveClasses} ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2`}
    >
      {content}
    </button>
  );
};

// --- Componente de Menu Expansível Refatorado ---
interface ExpandableMenuProps {
  item: MenuItem;
  currentPath: string;
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick?: () => void; // Para fechar menu mobile
  depth?: number; // Para controlar o nível de aninhamento e estilo
}

const ExpandableMenuItem: React.FC<ExpandableMenuProps> = ({
  item,
  currentPath,
  isOpen,
  onToggle,
  onLinkClick,
  depth = 0,
}) => {
  const Icon = item.icon;
  // Um menu expansível é considerado ativo se ele próprio estiver aberto E um de seus filhos for o path atual.
  // Ou, se ele não tiver filhos diretos que são paths, mas sub-menus expansíveis ativos.
  const isActive = isOpen && (item.children?.some(child =>
    child.path === currentPath || (child.children && child.children.some(subChild => subChild.path === currentPath))
  ) ?? false);

  const subItemPaddingClass = item.isSubItem || depth > 0 ? "pl-8" : "";
  const effectiveIconSize = item.isSubItem || depth > 0 ? "h-4 w-4" : "h-5 w-5";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`submenu-${item.id}`}
        className={`flex items-center justify-between gap-1 px-1 py-1 rounded-lg font-medium text-sm transition-all duration-200 w-full text-left
                    ${subItemPaddingClass}
                    ${isActive ? "bg-white text-blue-700 shadow" : "text-white hover:bg-blue-700/80 hover:shadow-md"}
                    focus:outline-none focus:ring-2 focus:ring-blue-300`}
      >
        <span className="flex items-center gap-3">
          {Icon && <Icon className={effectiveIconSize} />}
          {item.label}
        </span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && (
        <div id={`submenu-${item.id}`} className="mt-1 space-y-1">
          {item.children?.map(child => (
            <RenderMenuItemComponent
              key={child.id}
              item={child}
              currentPath={currentPath}
              onLinkClick={onLinkClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Componente para Renderizar Itens (Recursivo) ---
// Usando um estado global simulado para openMenus (ou poderia ser Context/Zustand para apps maiores)
// Para este exemplo, vamos passar o estado e o toggle para baixo.
let openMenusState: Record<string, boolean> = {};
let setOpenMenusState: React.Dispatch<React.SetStateAction<Record<string, boolean>>> = () => {};


interface RenderMenuItemProps {
  item: MenuItem;
  currentPath: string;
  onLinkClick?: () => void; // Para fechar menu mobile
  depth?: number;
}

const RenderMenuItemComponent: React.FC<RenderMenuItemProps> = ({ item, currentPath, onLinkClick, depth = 0 }) => {
  if (item.isTitle) {
    return (
      <div className="pt-4 first:pt-0">
        <h3 className="text-xs font-semibold tracking-wider text-blue-300 uppercase px-3 mb-1 select-none">
          {item.label}
        </h3>
      </div>
    );
  }

  if (item.children) {
    return (
      <ExpandableMenuItem
        item={item}
        currentPath={currentPath}
        isOpen={!!openMenusState[item.id]}
        onToggle={() => setOpenMenusState(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
        onLinkClick={onLinkClick}
        depth={depth}
      />
    );
  }

  return (
    <SidebarNavigationItem
      item={item}
      isActive={currentPath === item.path}
      onClick={onLinkClick} // Passa o onLinkClick para fechar mobile
    />
  );
};


// --- Componente Sidebar Principal ---
const Sidebar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, avatarUrl } = useUser();
  const initialOpenMenus = useMemo(() => {
    const state: Record<string, boolean> = {};
    const processItems = (items: MenuItem[], currentDepth = 0) => {
      items.forEach(item => {
        if (item.children) {
          // Abre o primeiro nível de "Planejamento" por padrão, ou qualquer item com defaultOpen=true
          state[item.id] = item.id === 'planejamento' ? true : (item.defaultOpen ?? false);
          // Adiciona a propriedade isSubItem dinamicamente se não estiver definida para filhos de expansíveis
          item.children.forEach(child => {
            if (child.isSubItem === undefined) child.isSubItem = true;
            if (child.children) processItems(child.children, currentDepth + 1);
          });
        }
      });
    };
    // Cria uma cópia profunda de menuData para não modificar o original com isSubItem
    const menuDataCopy = JSON.parse(JSON.stringify(menuData));
    processItems(menuDataCopy);
    return state;
  }, []);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(initialOpenMenus);

  // Atualiza as variáveis globais simuladas (idealmente usar Context ou Zustand)
  openMenusState = openMenus;
  setOpenMenusState = setOpenMenus;


  const handleLinkClick = useCallback(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, [mobileOpen]);

  function logout() {
    // Remove user token/session (example: localStorage)
    localStorage.removeItem('authToken');
    // Optionally clear other user data if needed
    // Redirect to login page
    window.location.href = '/login';
  }

  return (
    <>
      {/* Overlay para menu mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botão de Toggle Mobile (fora do <aside> para posicionamento) */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 text-blue-800 bg-white rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-navigation"
      >
        {mobileOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>

      <aside
        id="sidebar-navigation"
        className={`
          fixed z-40 top-0 left-0 h-full 
          w-56 md:w-52 lg:w-48 xl:w-44 2xl:w-44
          bg-gradient-to-b from-blue-800 to-blue-900 shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
        aria-label="Menu de navegação principal"
        style={{ fontFamily: "'Inter', 'Poppins', sans-serif" }}
      >
        <div className="px-4 py-3 border-b border-blue-700/50">
          {/* Logo com SVG */}
          <Link to="/painel" className="flex items-center gap-2" onClick={handleLinkClick}>
            <span
              className="flex items-center justify-center rounded-full shadow-md bg-gradient-to-br from-cyan-400 to-blue-500 mr-2"
              style={{ width: "36px", height: "36px" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </span>
            <span className="text-white text-xl font-bold">Evolutiva</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto sidebar-scrollable px-3 py-4 space-y-1.5">
          <nav aria-label="Navegação principal nos módulos">
            {menuData.map(item => (
              <RenderMenuItemComponent
                key={item.id}
                item={item}
                currentPath={location.pathname}
                onLinkClick={handleLinkClick}
              />
            ))}
          </nav>
        </div>

        {/* Seção do Usuário */}
        <div className="px-3 py-3 border-t border-blue-700/50">
          <SidebarNavigationItem
            item={{ id: 'perfil', label: 'Meu Perfil', icon: User, path: '/perfil' }}
            isActive={location.pathname === '/perfil'}
            onClick={handleLinkClick}
          />
          <SidebarNavigationItem
            item={{
              id: 'sair',
              label: 'Sair',
              icon: Layers,
              action: () => {
                logout(); // <-- chama o logout global, que faz o mesmo que o Navbar
              }
            }}
            isActive={false}
            onClick={handleLinkClick}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

/* SUGESTÃO: CSS para scrollbar e separador visual */
/*
.sidebar-scrollable::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.sidebar-scrollable::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
}
.sidebar-scrollable::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.45);
  transition: background-color 0.2s ease;
}
.sidebar-scrollable::-webkit-scrollbar-track {
  background: transparent;
}
*/