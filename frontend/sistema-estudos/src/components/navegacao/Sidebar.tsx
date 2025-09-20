import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Home, BookOpen, Layers, User, ChevronDown,
  ChevronRight, MessageCircle, ClipboardList, Menu as MenuIcon, X as XIcon, Award,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { useUser } from "../../contexts/UserContext";
// import { useOnboarding } from '../../contexts/OnboardingContext'; // Importa o hook de onboarding global
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
  collapsed?: boolean;
}

const activeClasses = "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]";
const inactiveClasses = "text-white/80 hover:bg-white/10";

const SidebarNavigationItem: React.FC<SidebarNavigationItemProps> = ({
  item,
  isActive,
  onClick,
  className = '',
  collapsed,
}) => {
  const { icon: Icon, label, path, badge } = item;
  const effectiveIconSize = "h-5 w-5";
  const content = (
    <>
      {Icon && <Icon className={effectiveIconSize} />}
      <span className={collapsed ? "sr-only" : ""}>{label}</span>
      {badge && (
        <span
          className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
            path === "/questoes" ? "bg-sky-600 text-white" : "bg-white/20 text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </>
  );

  function baseClasses(collapsed: boolean | undefined) {
    return [
      "flex items-center gap-3 px-2 py-2 rounded-lg font-medium text-sm transition-all duration-200 w-full",
      collapsed ? "justify-center" : "",
    ].join(" ");
  }

  return path ? (
    <Link
      to={path}
      onClick={onClick}
      className={`${baseClasses(collapsed)} ${isActive ? activeClasses : inactiveClasses} ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
      title={label}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses(collapsed)} ${isActive ? activeClasses : inactiveClasses} ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
      title={label}
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
  onLinkClick?: () => void;
  depth?: number;
  collapsed?: boolean;
}

const ExpandableMenuItem: React.FC<ExpandableMenuProps> = ({
  item, currentPath, isOpen, onToggle, onLinkClick, depth = 0, collapsed
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
        aria-expanded={isOpen ? true : false}
        aria-controls={`submenu-${item.id}`}
        className={`flex items-center justify-between gap-1 px-1 py-1 rounded-lg font-medium text-sm transition-all duration-200 w-full text-left
                    ${subItemPaddingClass}
                    ${isActive ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]" : "text-white/80 hover:bg-white/10"}
                    focus:outline-none focus:ring-2 focus:ring-sky-400`}
        title={item.label}
      >
        <span className="flex items-center gap-3">
          {Icon && <Icon className={effectiveIconSize} />}
          <span className={collapsed && depth === 0 ? "sr-only" : ""}>{item.label}</span>
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
              collapsed={collapsed}
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
let setOpenMenusState: React.Dispatch<React.SetStateAction<Record<string, boolean>>> = () => { };


interface RenderMenuItemProps {
  item: MenuItem;
  currentPath: string;
  onLinkClick?: () => void; // Para fechar menu mobile
  depth?: number;
  collapsed?: boolean;
}

const RenderMenuItemComponent: React.FC<RenderMenuItemProps> = ({ item, currentPath, onLinkClick, depth = 0, collapsed }) => {
  if (item.isTitle) {
    return (
      <div className="pt-4 first:pt-0">
        <h3 className={`text-xs font-semibold tracking-wider text-white/70 uppercase px-3 mb-1 select-none ${collapsed ? "sr-only" : ""}`}>
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
        collapsed={collapsed}
      />
    );
  }

  return (
    <SidebarNavigationItem
      item={item}
      isActive={currentPath === item.path}
      onClick={onLinkClick} // Passa o onLinkClick para fechar mobile
      collapsed={collapsed}
    />
  );
};


// --- Componente Sidebar Principal ---
const Sidebar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  // const { user, avatarUrl } = useUser();
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

  // Evita scroll do conteúdo quando o menu móvel está aberto
  useEffect(() => {
    const original = document.body.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
  document.body.setAttribute('data-sidebar-mobile', 'open');
    } else {
      document.body.style.overflow = original || '';
  document.body.setAttribute('data-sidebar-mobile', 'closed');
    }
    return () => {
      document.body.style.overflow = original || '';
  document.body.setAttribute('data-sidebar-mobile', 'closed');
    };
  }, [mobileOpen]);

  function logout() {
    // Remove user token/session (example: localStorage)
    localStorage.removeItem('authToken');
    // Optionally clear other user data if needed
    // Redirect to login page
    window.location.href = '/login';
  }

  // novo: lembrar estado colapsado
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sb_collapsed") === "true"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("sb_collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  // Constantes de largura
  const W_EXPANDED = "w-[var(--sidebar-w)]";
  const W_COLLAPSED = "w-[72px]"; // rail só-ícone

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
        className="md:hidden fixed top-4 left-4 z-50 p-2 text-blue-800 bg-white rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-navigation"
      >
        {mobileOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>

    <aside
        aria-label="Menu de navegação principal"
        className={[
      "fixed inset-y-0 left-0 z-40 h-full",
          collapsed ? W_COLLAPSED : W_EXPANDED,
      // Fundo premium com gradiente vertical da marca
      "bg-gradient-to-b from-[var(--brand-700)] to-[var(--brand-600)]/95",
      "text-white/90 backdrop-blur-md border-r border-white/15 shadow-xl",
          // animação e comportamento off-canvas no mobile
          "transition-transform duration-200 will-change-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // em telas md+ sempre visível e posicionado
          "md:translate-x-0",
        ].join(" ")}
        aria-hidden={!mobileOpen && window.innerWidth < 768 ? true : undefined}
      >
        {/* Header + toggle colapse */}
        <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between">
          <Link to="/painel" className="flex items-center gap-2 min-w-0" onClick={handleLinkClick} title="Painel">
            <span
              className="flex items-center justify-center rounded-full shadow-md bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)] mr-2 shrink-0 w-9 h-9"
            >
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </span>
            <span className={`text-white/95 text-xl font-extrabold truncate ${collapsed ? "sr-only" : ""}`}>
              Evolutiva
            </span>
          </Link>

          <button
            onClick={() => setCollapsed(v => !v)}
            className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            title={collapsed ? "Expandir menu" : "Colapsar menu"}
            aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
          </button>
        </div>

        {/* Lista de itens */}
  <div className="flex-1 overflow-y-auto sidebar-scrollable px-3 py-4 space-y-1.5">
          <nav aria-label="Navegação principal nos módulos">
            {menuData.map(item => (
              <RenderMenuItemComponent
                key={item.id}
                item={item}
                currentPath={location.pathname}
                onLinkClick={handleLinkClick}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>

        {/* Seção do Usuário */}
        <div className="px-3 py-3 border-t border-white/15">
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
              action: () => { logout(); }
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