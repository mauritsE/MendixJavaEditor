import { IComponent, getStudioProApi, ComponentContext } from "@mendix/extensions-api";

interface ContextMenuActionArg {
    documentId: string;
}

interface DocumentInfo {
    documentId: string;
    documentName: string;
    moduleName: string;
}

let studioPro: ReturnType<typeof getStudioProApi>;

/**
 * Find document info (name and module) by document ID.
 * Searches through all modules and their folders to find the document.
 */
async function findDocumentById(documentId: string): Promise<DocumentInfo | null> {
    const modules = await studioPro.app.model.projects.getModules();
    
    for (const module of modules) {
        // Search in module root
        const rootDocs = await studioPro.app.model.projects.getDocumentsInfo(module.$ID);
        const rootMatch = rootDocs.find(doc => doc.$ID === documentId);
        if (rootMatch && rootMatch.name) {
            return {
                documentId: documentId,
                documentName: rootMatch.name,
                moduleName: module.name
            };
        }
        
        // Search in folders (recursive)
        const found = await searchFoldersForDocument(module.$ID, module.name, documentId);
        if (found) {
            return found;
        }
    }
    
    return null;
}

/**
 * Recursively search folders for a document by ID
 */
async function searchFoldersForDocument(containerId: string, moduleName: string, documentId: string): Promise<DocumentInfo | null> {
    const folders = await studioPro.app.model.projects.getFolders(containerId);
    
    for (const folder of folders) {
        // Check documents in this folder
        const docs = await studioPro.app.model.projects.getDocumentsInfo(folder.$ID);
        const match = docs.find(doc => doc.$ID === documentId);
        if (match && match.name) {
            return {
                documentId: documentId,
                documentName: match.name,
                moduleName: moduleName
            };
        }
        
        // Search subfolders
        const found = await searchFoldersForDocument(folder.$ID, moduleName, documentId);
        if (found) {
            return found;
        }
    }
    
    return null;
}

export const component: IComponent = {
    async loaded(componentContext: ComponentContext) {
        studioPro = getStudioProApi(componentContext);

        // Add context menu item to Java Actions in the App Explorer
        await studioPro.ui.appExplorer.addContextMenu(
            {
                menuId: "JavaEditor.OpenEditor",
                caption: "Edit Java Source",
                action: async (arg: ContextMenuActionArg) => {
                    if (!arg || !arg.documentId) {
                        await studioPro.ui.messageBoxes.show(
                            "warning",
                            "Could not determine Java Action",
                            "No document ID was provided by the context menu."
                        );
                        return;
                    }
                    
                    // Look up document info by ID
                    const docInfo = await findDocumentById(arg.documentId);
                    
                    if (docInfo) {
                        await openJavaEditorTab(docInfo.documentName, docInfo.moduleName);
                    } else {
                        await studioPro.ui.messageBoxes.show(
                            "warning",
                            "Could not find Java Action",
                            `Unable to find document with ID: ${arg.documentId}`
                        );
                    }
                }
            } as any,
            "JavaActions$JavaAction"
        );

        // Also add menu item to the Extensions menu for convenience
        await studioPro.ui.extensionsMenu.add({
            menuId: "JavaEditor.MainMenu",
            caption: "Java Editor",
            subMenus: [
                { menuId: "JavaEditor.OpenCurrentAction", caption: "Edit Current Java Action" },
            ],
        });

        // Handle extensions menu clicks
        studioPro.ui.extensionsMenu.addEventListener(
            "menuItemActivated",
            async (args) => {
                if (args.menuId === "JavaEditor.OpenCurrentAction") {
                    const activeDoc = await studioPro.ui.editors.getActiveDocument();
                    if (activeDoc && activeDoc.documentType === "JavaActions$JavaAction" && activeDoc.documentName && activeDoc.moduleName) {
                        await openJavaEditorTab(activeDoc.documentName, activeDoc.moduleName);
                    } else {
                        await studioPro.ui.messageBoxes.show(
                            "warning",
                            "No Java Action Selected",
                            "Please open a Java Action document first."
                        );
                    }
                }
            }
        );
    }
};

async function openJavaEditorTab(javaActionName: string, moduleName: string): Promise<void> {
    // Java action source files are located at javasource/<ModuleName>/actions/<ActionName>.java
    const javaFilePath = `javasource/${moduleName}/actions/${javaActionName}.java`;
    
    await studioPro.ui.tabs.open(
        {
            title: `${javaActionName}.java`,
            icon: "☕"
        },
        {
            componentName: "extension/JavaEditor",
            uiEntrypoint: "tab",
            queryParams: {
                filePath: javaFilePath,
                actionName: javaActionName,
                moduleName: moduleName
            }
        }
    );
}

