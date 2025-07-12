import React from 'react';

// Define a structure for MindMapNode if not globally available
interface MindMapNode {
    id: string;
    label: string;
    children?: MindMapNode[];
}

// Define a structure for MindMapData if not globally available
interface MindMapData {
    root: MindMapNode;
}

interface MindMapViewerProps {
    show: boolean; // Whether the viewer/modal is visible
    data: MindMapData | null;
    isLoading: boolean;
    isAdvancedMode: boolean;
    onClose: () => void;
    onToggleMode: () => void; // Function to switch between simple/advanced
    onRegenerate?: () => void; // Optional: Function to trigger regeneration
}

/**
 * Component to display the Mind Map.
 *
 * This is a basic placeholder. In a real application, this would integrate
 * with a library like React Flow, Vis Network, or use SVG/Canvas for rendering.
 * It shows loading/error states and provides controls to close or switch modes.
 */
export const MindMapViewer: React.FC<MindMapViewerProps> = ({
    show,
    data,
    isLoading,
    isAdvancedMode,
    onClose,
    onToggleMode,
    onRegenerate
}) => {

    if (!show) {
        return null;
    }

    // Basic recursive function to render nodes as a nested list (placeholder)
    const renderNode = (node: MindMapNode, level: number = 0) => (
        <li key={node.id} style={{ marginLeft: `${level * 20}px` }} className="mt-1">
            <span className={`p-1 rounded ${level === 0 ? 'font-bold text-indigo-700 bg-indigo-100' : 'bg-gray-100'}`}>{node.label}</span>
            {node.children && node.children.length > 0 && (
                <ul className="mt-1 pl-4 border-l border-gray-300">
                    {node.children.map(child => renderNode(child, level + 1))}
                </ul>
            )}
        </li>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4">
            <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-3xl max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-bold text-gray-800">Mapa Mental {isAdvancedMode ? '(Avançado - IA)' : '(Básico - Extraído)'}</h2>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onToggleMode}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isLoading ? 'Carregando...' : (isAdvancedMode ? 'Ver Básico' : 'Gerar Avançado (IA)')}
                        </button>
                        {onRegenerate && (
                             <button
                                onClick={onRegenerate}
                                disabled={isLoading}
                                title="Gerar novamente o mapa atual"
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-wait"
                            >
                                Regenerar
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="text-center p-10">
                            <p className="text-gray-600">{isAdvancedMode ? 'Gerando mapa mental avançado...' : 'Extraindo mapa mental...'}</p>
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500 mx-auto mt-3"></div>
                        </div>
                    ) : data && data.root ? (
                        // Render the mind map using the basic list structure
                        <ul className="list-none p-0">
                            {renderNode(data.root)}
                        </ul>
                        // In a real app, replace the above <ul> with:
                        // <ActualMindMapLibraryComponent data={data} />
                    ) : (
                        <p className="text-center text-red-500 p-10">Não foi possível carregar ou gerar o mapa mental.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

